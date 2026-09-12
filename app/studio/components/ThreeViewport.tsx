'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FurnitureInstance, RoomSettings, WallSettings, FurnitureSpec, WallOpening, WallSide } from '../types/furniture';
import { buildFurniture } from '../lib/three-builders';
import { buildParametricWallGroup, buildOpening3D } from '../lib/wall-builders';

interface ViewportProps {
  room: RoomSettings;
  furniture: FurnitureInstance[];
  onSelect: (uid: number | null) => void;
  selectedUid: number | null;
  selectedOpeningId?: string | null;
  onSelectOpening?: (id: string | null) => void;
  onUpdatePosition: (uid: number, x: number, z: number, by?: number, rot?: number) => void;
  onUpdateOpeningPosition?: (id: string, newPos: number) => void;
  onDropFurniture?: (spec: FurnitureSpec, position: { x: number; z: number; by?: number; rot?: number }) => void;
  onDropOpening?: (preset: any, wallSide: WallSide, position: number) => void;
  showGrid: boolean;
  snapOn: boolean;
  collisionOn: boolean;
  autoTransparency?: boolean;
  cameraSettings: { x: number; y: number; z: number; fov: number };
  onRegisterCapture?: (captureFn: () => string) => void;
}

const SNAP_THRESHOLD = 0.15;
const WALL_THICKNESS = 0.1;
const HALF_WALL = WALL_THICKNESS / 2;
const COLLISION_EPSILON = 0.001;

const LAYER_DEFAULT = 0;
const LAYER_TECHNICAL = 1;

export default function ThreeViewport({
  room,
  furniture,
  onSelect,
  selectedUid,
  selectedOpeningId,
  onSelectOpening,
  onUpdatePosition,
  onUpdateOpeningPosition,
  onDropFurniture,
  onDropOpening,
  showGrid,
  snapOn,
  collisionOn,
  autoTransparency = true,
  cameraSettings,
  onRegisterCapture,
}: ViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const furnitureGroupRef = useRef<THREE.Group>(new THREE.Group());
  const wallsGroupRef = useRef<THREE.Group>(new THREE.Group());
  const floorRef = useRef<THREE.Mesh | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const selectionHelperRef = useRef<THREE.BoxHelper | null>(null);
  const rulersGroupRef = useRef<THREE.Group>(new THREE.Group());
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const textureLoaderRef = useRef<THREE.TextureLoader>(new THREE.TextureLoader().setCrossOrigin('anonymous'));

  const autoTransparencyRef = useRef(autoTransparency);
  useEffect(() => {
    autoTransparencyRef.current = autoTransparency;
  }, [autoTransparency]);

  // Expose clean snapshot capture function for AI Renderer
  useEffect(() => {
    if (!onRegisterCapture) return;

    const captureSnapshot = () => {
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const camera = cameraRef.current;
      if (!renderer || !scene || !camera) return '';

      const gridPrev = gridHelperRef.current?.visible ?? false;
      const selectPrev = selectionHelperRef.current?.visible ?? false;
      const rulersPrev = rulersGroupRef.current?.visible ?? false;

      // Hide non-photorealistic guides
      if (gridHelperRef.current) gridHelperRef.current.visible = false;
      if (selectionHelperRef.current) selectionHelperRef.current.visible = false;
      if (rulersGroupRef.current) rulersGroupRef.current.visible = false;

      // Render clean frame
      renderer.render(scene, camera);
      const dataUrl = renderer.domElement.toDataURL('image/jpeg', 0.95);

      // Restore guides
      if (gridHelperRef.current) gridHelperRef.current.visible = gridPrev;
      if (selectionHelperRef.current) selectionHelperRef.current.visible = selectPrev;
      if (rulersGroupRef.current) rulersGroupRef.current.visible = rulersPrev;

      return dataUrl;
    };

    onRegisterCapture(captureSnapshot);
  }, [onRegisterCapture]);

  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const topLightRef = useRef<THREE.DirectionalLight | null>(null);

  const createTextSprite = (message: string) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 64;
    context.fillStyle = 'rgba(15, 23, 42, 0.95)';
    context.fillRect(0, 0, 256, 64);
    context.strokeStyle = '#2563eb';
    context.lineWidth = 4;
    context.strokeRect(0, 0, 256, 64);
    context.font = 'bold 34px "Inter", sans-serif';
    context.fillStyle = '#ffffff';
    context.textAlign = 'center';
    context.fillText(message, 128, 45);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(0.5, 0.12, 1);
    sprite.layers.set(LAYER_TECHNICAL);
    return sprite;
  };

  const updateRulers = useCallback((selectedObj: THREE.Object3D) => {
    rulersGroupRef.current.clear();
    selectedObj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(selectedObj);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const checkDirs = [
      { dir: new THREE.Vector3(1, 0, 0), start: new THREE.Vector3(box.max.x, center.y, center.z) },
      { dir: new THREE.Vector3(-1, 0, 0), start: new THREE.Vector3(box.min.x, center.y, center.z) },
      { dir: new THREE.Vector3(0, 0, 1), start: new THREE.Vector3(center.x, center.y, box.max.z) },
      { dir: new THREE.Vector3(0, 0, -1), start: new THREE.Vector3(center.x, center.y, box.min.z) },
      { dir: new THREE.Vector3(0, -1, 0), start: new THREE.Vector3(center.x, box.min.y, center.z) },
    ];

    checkDirs.forEach(({ dir, start }) => {
      const otherObjects = [
        ...furnitureGroupRef.current.children,
        ...wallsGroupRef.current.children,
        floorRef.current!,
      ].filter((c) => c && c !== selectedObj);
      raycasterRef.current.set(start, dir);
      const intersects = raycasterRef.current.intersectObjects(otherObjects, true);

      let endPos = new THREE.Vector3();
      if (intersects.length > 0) {
        endPos.copy(intersects[0].point);
      } else {
        if (dir.y < 0) endPos.set(start.x, 0, start.z);
        else return;
      }

      const distance = start.distanceTo(endPos);
      if (distance < 0.01) return;

      const geometry = new THREE.BufferGeometry().setFromPoints([start, endPos]);
      const material = new THREE.LineBasicMaterial({
        color: '#3b82f6',
        depthTest: false,
        transparent: true,
        opacity: 0.7,
      });
      const line = new THREE.Line(geometry, material);
      line.layers.set(LAYER_TECHNICAL);
      rulersGroupRef.current.add(line);

      const cm = (distance * 100).toFixed(0) + ' cm';
      const sprite = createTextSprite(cm);
      sprite.position.copy(start.clone().lerp(endPos, 0.5));
      sprite.position.y += 0.05;
      rulersGroupRef.current.add(sprite);
    });
  }, []);

  // Initialize Scene, Camera, Renderer, Lights, Controls
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b0f19');
    sceneRef.current = scene;

    const width = Math.max(container.clientWidth, 400);
    const height = Math.max(container.clientHeight, 300);

    const camera = new THREE.PerspectiveCamera(cameraSettings.fov, width / height, 0.1, 1000);
    camera.position.set(cameraSettings.x, cameraSettings.y, cameraSettings.z);
    camera.layers.enable(LAYER_DEFAULT);
    camera.layers.enable(LAYER_TECHNICAL);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, room.height * 0.4, 0);
    controls.update();
    controlsRef.current = controls;

    // Ambient and Hemisphere Lighting
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.85);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const hemiLight = new THREE.HemisphereLight('#ffffff', '#1e293b', 0.6);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    // Directional Sunlight with full architectural shadows
    const topLight = new THREE.DirectionalLight('#ffffff', 1.8);
    topLight.position.set(6, 12, 5);
    topLight.castShadow = true;
    topLight.shadow.mapSize.set(2048, 2048);
    topLight.shadow.radius = 3;
    topLight.shadow.bias = -0.0001;
    topLight.shadow.normalBias = 0.02;

    const d = 12;
    topLight.shadow.camera.left = -d;
    topLight.shadow.camera.right = d;
    topLight.shadow.camera.top = d;
    topLight.shadow.camera.bottom = -d;
    topLight.shadow.camera.near = 0.5;
    topLight.shadow.camera.far = 40;
    topLight.shadow.camera.updateProjectionMatrix();

    topLight.target.position.set(0, 0, 0);
    scene.add(topLight.target);
    scene.add(topLight);
    topLightRef.current = topLight;

    const fillLight = new THREE.DirectionalLight('#93c5fd', 0.4);
    fillLight.position.set(-6, 8, -6);
    scene.add(fillLight);

    scene.add(furnitureGroupRef.current);
    scene.add(wallsGroupRef.current);
    scene.add(rulersGroupRef.current);

    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (controlsRef.current) controlsRef.current.update();

      // Dynamic selection bounding box update
      if (selectionHelperRef.current) {
        selectionHelperRef.current.update();
      }

      // Dynamic wall transparency based on camera angle
      if (cameraRef.current && wallsGroupRef.current) {
        wallsGroupRef.current.children.forEach((wallGroup: any) => {
          const wallNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(wallGroup.quaternion);
          const camToWall = new THREE.Vector3().subVectors(wallGroup.position, cameraRef.current!.position).normalize();
          const dot = wallNormal.dot(camToWall);
          const isBehind = autoTransparencyRef.current ? dot > 0.05 : false;

          wallGroup.traverse((child: any) => {
            if (child.isMesh && child.material && !child.userData?.isOpening) {
              if (Array.isArray(child.material)) {
                child.material.forEach((m: any) => {
                  m.transparent = true;
                  m.opacity = isBehind ? 0.15 : 1.0;
                  m.depthWrite = !isBehind;
                });
              } else {
                child.material.transparent = true;
                child.material.opacity = isBehind ? 0.15 : 1.0;
                child.material.depthWrite = !isBehind;
              }
            }
          });
        });
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Auto-Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0 && cameraRef.current && rendererRef.current) {
          cameraRef.current.aspect = w / h;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      renderer.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update Room geometry, walls, floor, grid & shadow camera bounds
  useEffect(() => {
    if (!sceneRef.current) return;

    if (ambientLightRef.current) ambientLightRef.current.intensity = room.lightIntensity * 0.85;
    if (hemiLightRef.current) hemiLightRef.current.intensity = room.lightIntensity * 0.6;
    if (topLightRef.current) {
      topLightRef.current.intensity = room.lightIntensity * 1.8;
      const maxRoomDim = Math.max(room.width, room.depth, room.height) * 1.6 + 4;
      topLightRef.current.shadow.camera.left = -maxRoomDim;
      topLightRef.current.shadow.camera.right = maxRoomDim;
      topLightRef.current.shadow.camera.top = maxRoomDim;
      topLightRef.current.shadow.camera.bottom = -maxRoomDim;
      topLightRef.current.shadow.camera.updateProjectionMatrix();
    }

    wallsGroupRef.current.clear();

    const applyTexture = (mat: THREE.MeshStandardMaterial, url?: string, tx = 1, ty = 1) => {
      if (url) {
        textureLoaderRef.current.load(url, (tex) => {
          tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
          tex.repeat.set(tx, ty);
          tex.colorSpace = THREE.SRGBColorSpace;
          mat.map = tex;
          mat.needsUpdate = true;
        });
      } else {
        mat.map = null;
        mat.needsUpdate = true;
      }
    };

    const buildWall = (
      w: number,
      h: number,
      x: number,
      z: number,
      ry: number,
      id: keyof RoomSettings['walls']
    ) => {
      const wallConfig = room.walls[id];
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(wallConfig.color),
        roughness: wallConfig.roughness ?? 0.85,
        metalness: wallConfig.metalness ?? 0.02,
        transparent: true,
        opacity: 1.0,
      });
      applyTexture(mat, wallConfig.textureUrl, wallConfig.tileX || 1, wallConfig.tileY || 1);

      const wallOpenings = (room.openings || []).filter((o) => o.wallSide === id);
      const wallGroup = buildParametricWallGroup(w, h, WALL_THICKNESS, wallConfig, wallOpenings, mat);
      wallGroup.position.set(x, 0, z);
      wallGroup.rotation.y = ry;
      wallGroup.userData = { isWall: true, wallId: id, w, h };

      // Add 3D architectural doors / windows belonging to this wall
      wallOpenings.forEach((opening) => {
        const openingGroup = buildOpening3D(opening, WALL_THICKNESS);
        const localX = (opening.position - 0.5) * w;
        const localY = opening.sillHeight || 0;
        openingGroup.position.set(localX, localY, 0);
        openingGroup.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = false;
          }
        });
        wallGroup.add(openingGroup);
      });

      wallsGroupRef.current.add(wallGroup);
    };

    const hw = room.width / 2;
    const hd = room.depth / 2;

    buildWall(room.width, room.height, 0, -hd - HALF_WALL, 0, 'back');
    buildWall(room.width, room.height, 0, hd + HALF_WALL, Math.PI, 'front');
    buildWall(room.depth, room.height, -hw - HALF_WALL, 0, Math.PI / 2, 'left');
    buildWall(room.depth, room.height, hw + HALF_WALL, 0, -Math.PI / 2, 'right');

    wallsGroupRef.current.updateMatrixWorld(true);

    if (floorRef.current) sceneRef.current.remove(floorRef.current);
    const floorGroup = new THREE.Group();

    // Interior Room Floor
    const floorGeo = new THREE.PlaneGeometry(room.width, room.depth);
    const floorMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(room.floorColor),
      roughness: room.floorRoughness ?? 0.55,
      metalness: room.floorMetalness ?? 0.02,
    });
    applyTexture(floorMat, room.floorTextureUrl, room.floorTileX || 4, room.floorTileY || 4);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.userData = { isFloor: true };
    floorGroup.add(floor);

    // Exterior Outdoor Patio / Horizon Plane (visible through clear glass windows)
    const outdoorGeo = new THREE.PlaneGeometry(room.width + 50, room.depth + 50);
    const outdoorMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#182234'),
      roughness: 0.92,
      metalness: 0.05,
    });
    const outdoor = new THREE.Mesh(outdoorGeo, outdoorMat);
    outdoor.position.y = -0.005;
    outdoor.rotation.x = -Math.PI / 2;
    outdoor.receiveShadow = true;
    floorGroup.add(outdoor);

    sceneRef.current.add(floorGroup);
    floorRef.current = floorGroup as any;

    if (gridHelperRef.current) sceneRef.current.remove(gridHelperRef.current);
    const maxDim = Math.max(room.width, room.depth);
    const grid = new THREE.GridHelper(maxDim, maxDim * 2, '#3b82f6', '#334155');
    grid.position.y = 0.002;
    grid.visible = showGrid;
    sceneRef.current.add(grid);
    gridHelperRef.current = grid;
  }, [room, showGrid]);

  // Update Camera Viewpoints
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    cameraRef.current.position.set(cameraSettings.x, cameraSettings.y, cameraSettings.z);
    cameraRef.current.fov = cameraSettings.fov;
    cameraRef.current.updateProjectionMatrix();
    controlsRef.current.target.set(0, room.height * 0.4, 0);
    controlsRef.current.update();
  }, [cameraSettings, room.height]);

  // Sync Furniture Group efficiently without recreating unchanged meshes on selection/render
  useEffect(() => {
    let active = true;

    const syncFurniture = async () => {
      const currentUids = new Set(furniture.map((f) => f.uid));

      // 1. Remove objects that are no longer in state
      const toRemove = furnitureGroupRef.current.children.filter(
        (c) => !currentUids.has(c.userData?.uid)
      );
      toRemove.forEach((c) => {
        furnitureGroupRef.current.remove(c);
      });

      // 2. Add or update objects
      for (const f of furniture) {
        if (!active) return;
        const existing = furnitureGroupRef.current.children.find(
          (c) => c.userData?.uid === f.uid
        );

        const currentFingerprint = existing?.userData?.fingerprint;
        const newFingerprint = `${f.id}_${f.modelUrl || ''}_${f.w}_${f.h}_${f.d}_${f.pr}_${f.dm?.t}_${f.dm?.c}`;

        if (!existing || currentFingerprint !== newFingerprint) {
          if (existing) {
            furnitureGroupRef.current.remove(existing);
          }
          const group = await buildFurniture(f);
          if (!active) return;

          group.position.set(f.x, f.by, f.z);
          group.rotation.y = f.rot;
          group.scale.setScalar(f.scl);
          group.userData = {
            uid: f.uid,
            spec: f,
            width: f.w,
            height: f.h,
            depth: f.d,
            behavior: f.pr,
            fingerprint: newFingerprint,
          };
          furnitureGroupRef.current.add(group);
        } else {
          // Object already exists and geometry/materials are identical; just update transforms and metadata
          existing.position.set(f.x, f.by, f.z);
          existing.rotation.y = f.rot;
          existing.scale.setScalar(f.scl);
          existing.userData.spec = f;
          existing.userData.width = f.w;
          existing.userData.height = f.h;
          existing.userData.depth = f.d;
          existing.userData.behavior = f.pr;
        }
      }

      // 3. Update selection box helper & rulers
      if (selectedUid) {
        const selectedObj = furnitureGroupRef.current.children.find(
          (c) => c.userData?.uid === selectedUid
        );
        if (selectedObj) {
          if (selectionHelperRef.current) sceneRef.current?.remove(selectionHelperRef.current);
          furnitureGroupRef.current.updateMatrixWorld(true);
          selectedObj.updateWorldMatrix(true, true);
          const boxHelper = new THREE.BoxHelper(selectedObj, '#3b82f6');
          sceneRef.current?.add(boxHelper);
          selectionHelperRef.current = boxHelper;
          updateRulers(selectedObj);
        }
      } else if (selectedOpeningId) {
        let selectedOpeningObj: THREE.Object3D | null = null;
        wallsGroupRef.current.traverse((child) => {
          if (child.userData?.openingId === selectedOpeningId) {
            selectedOpeningObj = child;
          }
        });
        if (selectedOpeningObj) {
          if (selectionHelperRef.current) sceneRef.current?.remove(selectionHelperRef.current);
          wallsGroupRef.current.updateMatrixWorld(true);
          (selectedOpeningObj as THREE.Object3D).updateWorldMatrix(true, true);
          const boxHelper = new THREE.BoxHelper(selectedOpeningObj, '#f59e0b');
          sceneRef.current?.add(boxHelper);
          selectionHelperRef.current = boxHelper;
        }
        rulersGroupRef.current.clear();
      } else {
        if (selectionHelperRef.current) {
          sceneRef.current?.remove(selectionHelperRef.current);
          selectionHelperRef.current = null;
        }
        rulersGroupRef.current.clear();
      }
    };

    syncFurniture();

    return () => {
      active = false;
    };
  }, [furniture, selectedUid, selectedOpeningId, room.openings, updateRulers]);

  // Real-time Interactive Dragging & Repositioning System
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const mouse = new THREE.Vector2();
    let isDragging = false;
    let dragObject: THREE.Object3D | null = null;
    let dragOpening: { id: string; wallSide: WallSide; wallGroup: THREE.Object3D; wallLength: number } | null = null;

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersection = new THREE.Vector3();
    const offset = new THREE.Vector3();

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0 || !cameraRef.current) return;

      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, cameraRef.current);

      // 1. Check if user clicked on a Door / Window opening
      const openingIntersects = raycaster.intersectObjects(wallsGroupRef.current.children, true);
      const openingHit = openingIntersects.find((hit) => {
        let p: any = hit.object;
        while (p && !p.userData?.isOpening && p.parent && p.parent !== wallsGroupRef.current) {
          p = p.parent;
        }
        return p?.userData?.isOpening;
      });

      if (openingHit) {
        let top: any = openingHit.object;
        while (top && !top.userData?.isOpening && top.parent) top = top.parent;
        if (top?.userData?.openingId) {
          const opId = top.userData.openingId;
          onSelectOpening?.(opId);
          onSelect(null);

          // Find wall parent
          let wallGroup: any = top.parent;
          while (wallGroup && !wallGroup.userData?.isWall && wallGroup.parent) {
            wallGroup = wallGroup.parent;
          }

          if (wallGroup) {
            dragOpening = {
              id: opId,
              wallSide: wallGroup.userData.wallId,
              wallGroup,
              wallLength: wallGroup.userData.w || room.width,
            };
            isDragging = true;
            if (controlsRef.current) controlsRef.current.enabled = false;
          }

          if (selectionHelperRef.current) sceneRef.current?.remove(selectionHelperRef.current);
          wallsGroupRef.current.updateMatrixWorld(true);
          top.updateWorldMatrix(true, true);
          const boxHelper = new THREE.BoxHelper(top, '#f59e0b');
          sceneRef.current?.add(boxHelper);
          selectionHelperRef.current = boxHelper;
          return;
        }
      }

      // 2. Check if user clicked on Furniture
      const intersects = raycaster.intersectObjects(furnitureGroupRef.current.children, true);

      if (intersects.length > 0) {
        let top = intersects[0].object;
        while (top.parent && top.parent !== furnitureGroupRef.current) {
          top = top.parent;
        }

        if (top.userData?.uid) {
          onSelect(top.userData.uid);
          onSelectOpening?.(null);
          dragObject = top;
          isDragging = true;
          if (controlsRef.current) controlsRef.current.enabled = false;

          const objBaseY = top.userData?.spec?.by ?? top.position.y ?? 0;
          plane.set(new THREE.Vector3(0, 1, 0), -objBaseY);

          raycaster.ray.intersectPlane(plane, intersection);
          offset.copy(top.position).sub(intersection);

          // Immediately update box helper and rulers on click
          if (selectionHelperRef.current) sceneRef.current?.remove(selectionHelperRef.current);
          furnitureGroupRef.current.updateMatrixWorld(true);
          top.updateWorldMatrix(true, true);
          const boxHelper = new THREE.BoxHelper(top, '#3b82f6');
          sceneRef.current?.add(boxHelper);
          selectionHelperRef.current = boxHelper;
          updateRulers(top);
        }
      } else {
        onSelect(null);
        onSelectOpening?.(null);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging || !cameraRef.current) return;

      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, cameraRef.current);

      // Dragging a door / window along its wall
      if (dragOpening) {
        const wallIntersects = raycaster.intersectObject(dragOpening.wallGroup, true);
        if (wallIntersects.length > 0) {
          const hit = wallIntersects[0];
          const localHit = dragOpening.wallGroup.worldToLocal(hit.point.clone());
          const newPos = Math.max(0.08, Math.min(0.92, localHit.x / dragOpening.wallLength + 0.5));
          onUpdateOpeningPosition?.(dragOpening.id, newPos);
        }
        if (selectionHelperRef.current) selectionHelperRef.current.update();
        return;
      }

      if (!dragObject) return;

      // Exact trigonometric Axis-Aligned Bounding Box (AABB) for any arbitrary rotation
      const getRotatedBounds = (w: number, d: number, rotY: number) => {
        const cos = Math.abs(Math.cos(rotY));
        const sin = Math.abs(Math.sin(rotY));
        return {
          effW: w * cos + d * sin,
          effD: w * sin + d * cos,
        };
      };

      const isWallHangingItem = dragObject.userData.behavior === 'wall' && (dragObject.userData.spec?.by || 0) > 0;
      const itemW = (dragObject.userData.width || 0.8) * dragObject.scale.x;
      const itemH = (dragObject.userData.height || 0.8) * dragObject.scale.y;
      const itemD = (dragObject.userData.depth || 0.6) * dragObject.scale.z;
      const otherObjects = furnitureGroupRef.current.children.filter((o) => o !== dragObject);

      const checkCollision3D = (targetPos: THREE.Vector3, currentW: number, currentD: number) => {
        if (!collisionOn) return false;
        const testBox = new THREE.Box3().setFromCenterAndSize(
          targetPos.clone().add(new THREE.Vector3(0, itemH / 2, 0)),
          new THREE.Vector3(currentW, itemH, currentD).subScalar(COLLISION_EPSILON)
        );
        for (const other of otherObjects) {
          const otherBox = new THREE.Box3().setFromObject(other);
          if (testBox.intersectsBox(otherBox)) return true;
        }
        return false;
      };

      if (isWallHangingItem) {
        const wallIntersects = raycaster.intersectObjects(wallsGroupRef.current.children, true);
        const validHit = wallIntersects.find(
          (hit) => {
            let p: any = hit.object;
            while (p && !p.userData?.isWall && p.parent) p = p.parent;
            return p?.userData?.isWall;
          }
        );

        if (validHit) {
          let wall: any = validHit.object;
          while (wall && !wall.userData?.isWall && wall.parent) wall = wall.parent;
          const wallW = wall.userData.w || room.width;
          const localHit = wall.worldToLocal(validHit.point.clone());

          let targetLocalX = Math.max(-wallW / 2 + itemW / 2, Math.min(wallW / 2 - itemW / 2, localHit.x));
          const targetElevation = dragObject.userData.spec?.by ?? 1.5;
          let targetLocalY = Math.max(itemH / 2, Math.min(room.height - itemH / 2, targetElevation));

          const localPos = new THREE.Vector3(targetLocalX, targetLocalY, itemD / 2 + HALF_WALL);
          const worldPos = wall.localToWorld(localPos.clone());

          if (!checkCollision3D(worldPos, itemW, itemD)) {
            dragObject.position.copy(worldPos);
            dragObject.rotation.y = wall.rotation.y;
          }
        }
      } else {
        const targetBaseY = dragObject.userData.spec?.by ?? 0;
        plane.set(new THREE.Vector3(0, 1, 0), -targetBaseY);

        if (raycaster.ray.intersectPlane(plane, intersection)) {
          const rawX = intersection.x + offset.x;
          const rawZ = intersection.z + offset.z;

          // Distance from raw center to the 4 room walls
          const dLeft = rawX - (-room.width / 2);
          const dRight = room.width / 2 - rawX;
          const dBack = rawZ - (-room.depth / 2);
          const dFront = room.depth / 2 - rawZ;

          const minWallDist = Math.min(dLeft, dRight, dBack, dFront);

          let targetRot = dragObject.rotation.y;
          const ROT_ZONE = 0.7; // Distance threshold to orient towards nearest wall

          if (minWallDist < ROT_ZONE) {
            if (minWallDist === dBack) {
              targetRot = 0; // Back against back wall, front faces forward (+Z)
            } else if (minWallDist === dLeft) {
              targetRot = Math.PI / 2; // Back against left wall, front faces right (+X)
            } else if (minWallDist === dRight) {
              targetRot = -Math.PI / 2; // Back against right wall, front faces left (-X)
            } else if (minWallDist === dFront) {
              targetRot = Math.PI; // Back against front wall, front faces back (-Z)
            }
          }

          // Exact bounding dimensions under current rotation
          let { effW, effD } = getRotatedBounds(itemW, itemD, targetRot);

          // Room clamping bounds
          let minX = -room.width / 2 + effW / 2;
          let maxX = room.width / 2 - effW / 2;
          let minZ = -room.depth / 2 + effD / 2;
          let maxZ = room.depth / 2 - effD / 2;

          let tx = Math.max(minX, Math.min(maxX, rawX));
          let tz = Math.max(minZ, Math.min(maxZ, rawZ));

          // Magnetic snapping to walls with dual-axis corner support
          if (snapOn) {
            const distBack = Math.abs(tz - minZ);
            const distFront = Math.abs(tz - maxZ);
            const distLeft = Math.abs(tx - minX);
            const distRight = Math.abs(tx - maxX);

            // Z-axis wall snapping (Back / Front)
            if (distBack < SNAP_THRESHOLD) {
              tz = minZ;
            } else if (distFront < SNAP_THRESHOLD) {
              tz = maxZ;
            }

            // X-axis wall snapping (Left / Right) - evaluated independently for corners!
            if (distLeft < SNAP_THRESHOLD) {
              tx = minX;
            } else if (distRight < SNAP_THRESHOLD) {
              tx = maxX;
            }

            // Side-by-side snapping to neighboring floor objects along the walls
            otherObjects.forEach((other) => {
              const oW = (other.userData.width || 0.8) * other.scale.x;
              const oD = (other.userData.depth || 0.6) * other.scale.z;
              const { effW: oEffW, effD: oEffD } = getRotatedBounds(oW, oD, other.rotation.y);

              // If on same wall along Z (back or front)
              if (Math.abs(tz - other.position.z) < SNAP_THRESHOLD) {
                const snapLeftToRight = Math.abs(tx - effW / 2 - (other.position.x + oEffW / 2));
                const snapRightToLeft = Math.abs(tx + effW / 2 - (other.position.x - oEffW / 2));
                if (snapLeftToRight < SNAP_THRESHOLD) tx = other.position.x + oEffW / 2 + effW / 2;
                else if (snapRightToLeft < SNAP_THRESHOLD) tx = other.position.x - oEffW / 2 - effW / 2;
              }
              // If on same wall along X (left or right)
              if (Math.abs(tx - other.position.x) < SNAP_THRESHOLD) {
                const snapBackToFront = Math.abs(tz - effD / 2 - (other.position.z + oEffD / 2));
                const snapFrontToBack = Math.abs(tz + effD / 2 - (other.position.z - oEffD / 2));
                if (snapBackToFront < SNAP_THRESHOLD) tz = other.position.z + oEffD / 2 + effD / 2;
                else if (snapFrontToBack < SNAP_THRESHOLD) tz = other.position.z - oEffD / 2 - effD / 2;
              }
            });
          }

          // Strict final boundary re-clamp after all snapping calculations
          tx = Math.max(minX, Math.min(maxX, tx));
          tz = Math.max(minZ, Math.min(maxZ, tz));

          const targetPos = new THREE.Vector3(tx, targetBaseY, tz);
          if (!checkCollision3D(targetPos, effW, effD)) {
            dragObject.position.x = tx;
            dragObject.position.z = tz;
            dragObject.position.y = targetBaseY;
            dragObject.rotation.y = targetRot;
          }
        }
      }

      updateRulers(dragObject);
      if (selectionHelperRef.current) selectionHelperRef.current.update();
    };

    const handlePointerUp = () => {
      if (isDragging && dragObject) {
        const fixedY = dragObject.userData.spec?.by ?? (dragObject.userData.behavior === 'wall' ? dragObject.position.y : 0);
        onUpdatePosition(
          dragObject.userData.uid,
          dragObject.position.x,
          dragObject.position.z,
          fixedY,
          dragObject.rotation.y
        );
      }
      isDragging = false;
      dragObject = null;
      dragOpening = null;
      if (controlsRef.current) controlsRef.current.enabled = true;
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      if (!cameraRef.current) return;

      const raw = e.dataTransfer?.getData('application/json');
      if (!raw) return;
      const parsed = JSON.parse(raw);

      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, cameraRef.current);

      // Handle Door / Window Opening Drop
      if (parsed.isOpening) {
        const wallIntersects = raycaster.intersectObjects(wallsGroupRef.current.children, true);
        const validHit = wallIntersects.find((hit) => {
          let p: any = hit.object;
          while (p && !p.userData?.isWall && p.parent) p = p.parent;
          return p?.userData?.isWall;
        });

        let targetWallSide: WallSide = 'back';
        let targetPos = 0.5;

        if (validHit) {
          let wallGroup: any = validHit.object;
          while (wallGroup && !wallGroup.userData?.isWall && wallGroup.parent) {
            wallGroup = wallGroup.parent;
          }
          if (wallGroup) {
            targetWallSide = wallGroup.userData.wallId;
            const wallLength = wallGroup.userData.w || room.width;
            const localHit = wallGroup.worldToLocal(validHit.point.clone());
            targetPos = Math.max(0.1, Math.min(0.9, localHit.x / wallLength + 0.5));
          }
        }
        onDropOpening?.(parsed, targetWallSide, targetPos);
        return;
      }

      if (!onDropFurniture) return;
      const spec = parsed as FurnitureSpec;

      if (spec.pr === 'wall') {
        const wallIntersects = raycaster.intersectObjects(wallsGroupRef.current.children, true);
        const validHit = wallIntersects.find((hit) => {
          let p: any = hit.object;
          while (p && !p.userData?.isWall && p.parent) p = p.parent;
          return p?.userData?.isWall;
        });

        if (validHit) {
          let wall: any = validHit.object;
          while (wall && !wall.userData?.isWall && wall.parent) wall = wall.parent;
          const localHit = wall.worldToLocal(validHit.point.clone());
          const worldPos = wall.localToWorld(new THREE.Vector3(localHit.x, localHit.y, spec.d / 2 + HALF_WALL));
          onDropFurniture(spec, { x: worldPos.x, z: worldPos.z, by: worldPos.y, rot: wall.rotation.y });
        } else {
          onDropFurniture(spec, { x: 0, z: -room.depth / 2 + spec.d / 2, by: spec.by ?? 1.5, rot: 0 });
        }
      } else {
        if (raycaster.ray.intersectPlane(plane, intersection)) {
          const rawX = intersection.x;
          const rawZ = intersection.z;

          const dLeft = rawX - (-room.width / 2);
          const dRight = room.width / 2 - rawX;
          const dBack = rawZ - (-room.depth / 2);
          const dFront = room.depth / 2 - rawZ;
          const minWallDist = Math.min(dLeft, dRight, dBack, dFront);

          let rot = 0;
          if (minWallDist === dBack) rot = 0;
          else if (minWallDist === dLeft) rot = Math.PI / 2;
          else if (minWallDist === dRight) rot = -Math.PI / 2;
          else if (minWallDist === dFront) rot = Math.PI;

          const cos = Math.abs(Math.cos(rot));
          const sin = Math.abs(Math.sin(rot));
          const effW = spec.w * cos + spec.d * sin;
          const effD = spec.w * sin + spec.d * cos;

          const minX = -room.width / 2 + effW / 2;
          const maxX = room.width / 2 - effW / 2;
          const minZ = -room.depth / 2 + effD / 2;
          const maxZ = room.depth / 2 - effD / 2;

          let x = Math.max(minX, Math.min(maxX, rawX));
          let z = Math.max(minZ, Math.min(maxZ, rawZ));

          // Snap to wall if close on drop
          if (snapOn) {
            if (Math.abs(z - minZ) < SNAP_THRESHOLD) z = minZ;
            else if (Math.abs(z - maxZ) < SNAP_THRESHOLD) z = maxZ;

            if (Math.abs(x - minX) < SNAP_THRESHOLD) x = minX;
            else if (Math.abs(x - maxX) < SNAP_THRESHOLD) x = maxX;
          }

          onDropFurniture(spec, { x, z, by: spec.by ?? 0, rot });
        } else {
          onDropFurniture(spec, { x: 0, z: 0, by: spec.by ?? 0, rot: 0 });
        }
      }
    };
    container.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('drop', handleDrop);

    return () => {
      container.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      container.removeEventListener('dragover', handleDragOver);
      container.removeEventListener('drop', handleDrop);
    };
  }, [
    room,
    snapOn,
    collisionOn,
    onSelect,
    onSelectOpening,
    onUpdatePosition,
    onUpdateOpeningPosition,
    onDropFurniture,
    onDropOpening,
    updateRulers,
  ]);

  return <div ref={containerRef} className="w-full h-full relative select-none overflow-hidden" />;
}
