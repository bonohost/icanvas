'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FurnitureInstance, RoomSettings, WallSettings, FurnitureSpec } from '../types/furniture';
import { buildFurniture } from '../lib/three-builders';

interface ViewportProps {
  room: RoomSettings;
  furniture: FurnitureInstance[];
  onSelect: (uid: number | null) => void;
  selectedUid: number | null;
  onUpdatePosition: (uid: number, x: number, z: number, by?: number, rot?: number) => void;
  onDropFurniture?: (spec: FurnitureSpec, position: { x: number; z: number; by?: number; rot?: number }) => void;
  showGrid: boolean;
  snapOn: boolean;
  collisionOn: boolean;
  cameraSettings: { x: number; y: number; z: number; fov: number };
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
  onUpdatePosition,
  onDropFurniture,
  showGrid,
  snapOn,
  collisionOn,
  cameraSettings,
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

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
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

      // Dynamic wall transparency based on camera angle
      if (cameraRef.current && wallsGroupRef.current) {
        wallsGroupRef.current.children.forEach((w: any) => {
          if (w.material) {
            const wallNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(w.quaternion);
            const camToWall = new THREE.Vector3().subVectors(w.position, cameraRef.current!.position).normalize();
            const dot = wallNormal.dot(camToWall);
            const isBehind = dot > 0.05;
            w.material.opacity = isBehind ? 0.15 : 1.0;
            w.material.depthWrite = !isBehind;
            w.castShadow = false;
          }
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
      y: number,
      z: number,
      ry: number,
      id: keyof RoomSettings['walls']
    ) => {
      const geo = new THREE.BoxGeometry(w, h, WALL_THICKNESS);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(room.walls[id].color),
        roughness: 0.85,
        metalness: 0.05,
        transparent: true,
        opacity: 1.0,
      });
      applyTexture(mat, room.walls[id].textureUrl, room.walls[id].tileX, room.walls[id].tileY);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.rotation.y = ry;
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      mesh.userData = { isWall: true, wallId: id, w, h };
      wallsGroupRef.current.add(mesh);
    };

    const hw = room.width / 2;
    const hd = room.depth / 2;
    const hh = room.height / 2;

    buildWall(room.width + WALL_THICKNESS * 2, room.height, 0, hh, -hd - HALF_WALL, 0, 'back');
    buildWall(room.width + WALL_THICKNESS * 2, room.height, 0, hh, hd + HALF_WALL, Math.PI, 'front');
    buildWall(room.depth, room.height, -hw - HALF_WALL, hh, 0, Math.PI / 2, 'left');
    buildWall(room.depth, room.height, hw + HALF_WALL, hh, 0, -Math.PI / 2, 'right');

    if (floorRef.current) sceneRef.current.remove(floorRef.current);
    const floorGeo = new THREE.PlaneGeometry(room.width + 4, room.depth + 4);
    const floorMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(room.floorColor),
      roughness: 0.45,
      metalness: 0.05,
    });
    applyTexture(floorMat, room.floorTextureUrl, room.floorTileX, room.floorTileY);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.userData = { isFloor: true };
    sceneRef.current.add(floor);
    floorRef.current = floor;

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
          const boxHelper = new THREE.BoxHelper(selectedObj, '#3b82f6');
          sceneRef.current?.add(boxHelper);
          selectionHelperRef.current = boxHelper;
          updateRulers(selectedObj);
        }
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
  }, [furniture, selectedUid, updateRulers]);

  // Real-time Interactive Dragging & Repositioning System
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const mouse = new THREE.Vector2();
    let isDragging = false;
    let dragObject: THREE.Object3D | null = null;
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
      const intersects = raycaster.intersectObjects(furnitureGroupRef.current.children, true);

      if (intersects.length > 0) {
        let top = intersects[0].object;
        while (top.parent && top.parent !== furnitureGroupRef.current) {
          top = top.parent;
        }

        if (top.userData?.uid) {
          onSelect(top.userData.uid);
          dragObject = top;
          isDragging = true;
          if (controlsRef.current) controlsRef.current.enabled = false;

          raycaster.ray.intersectPlane(plane, intersection);
          offset.copy(top.position).sub(intersection);

          // Immediately update box helper and rulers on click
          if (selectionHelperRef.current) sceneRef.current?.remove(selectionHelperRef.current);
          const boxHelper = new THREE.BoxHelper(top, '#3b82f6');
          sceneRef.current?.add(boxHelper);
          selectionHelperRef.current = boxHelper;
          updateRulers(top);
        }
      } else {
        onSelect(null);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging || !dragObject || !cameraRef.current) return;

      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, cameraRef.current);

      const isWallItem = dragObject.userData.behavior === 'wall';
      const itemW = (dragObject.userData.width || 0.8) * dragObject.scale.x;
      const itemH = (dragObject.userData.height || 0.8) * dragObject.scale.y;
      const itemD = (dragObject.userData.depth || 0.6) * dragObject.scale.z;
      const otherObjects = furnitureGroupRef.current.children.filter((o) => o !== dragObject);

      const checkCollision3D = (targetPos: THREE.Vector3, currentW = itemW, currentD = itemD) => {
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

      if (isWallItem) {
        const wallIntersects = raycaster.intersectObjects(wallsGroupRef.current.children);
        const validHit = wallIntersects.find(
          (hit) => ((hit.object as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity > 0.5
        );

        if (validHit) {
          const wall = validHit.object as THREE.Mesh;
          const wallW = wall.userData.w || room.width;
          const localHit = wall.worldToLocal(validHit.point.clone());

          let targetLocalX = Math.max(-wallW / 2 + itemW / 2, Math.min(wallW / 2 - itemW / 2, localHit.x));
          let targetLocalY = Math.max(itemH / 2, Math.min(room.height - itemH / 2, localHit.y));

          if (snapOn) {
            otherObjects.forEach((other) => {
              if (other.userData.behavior === 'wall') {
                const oLocal = wall.worldToLocal(other.position.clone());
                const oW = (other.userData.width || 0.8) * other.scale.x;
                const oH = (other.userData.height || 0.8) * other.scale.y;

                if (Math.abs(oLocal.z - (itemD / 2 + HALF_WALL)) < 0.1) {
                  const myTop = targetLocalY + itemH / 2;
                  const oTop = oLocal.y + oH / 2;
                  if (Math.abs(myTop - oTop) < SNAP_THRESHOLD) targetLocalY = oTop - itemH / 2;

                  const myLeft = targetLocalX - itemW / 2;
                  const myRight = targetLocalX + itemW / 2;
                  const oLeft = oLocal.x - oW / 2;
                  const oRight = oLocal.x + oW / 2;

                  if (Math.abs(myRight - oLeft) < SNAP_THRESHOLD) targetLocalX = oLeft - itemW / 2;
                  else if (Math.abs(myLeft - oRight) < SNAP_THRESHOLD) targetLocalX = oRight + itemW / 2;
                }
              }
            });
          }

          const localPos = new THREE.Vector3(targetLocalX, targetLocalY, itemD / 2 + HALF_WALL);
          const worldPos = wall.localToWorld(localPos.clone());

          if (!checkCollision3D(worldPos)) {
            dragObject.position.copy(worldPos);
            dragObject.rotation.y = wall.rotation.y;
          }
        }
      } else {
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
          const ROT_ZONE = 0.85; // Distance threshold to align with the nearest wall

          if (minWallDist < ROT_ZONE) {
            if (minWallDist === dBack) {
              targetRot = 0; // Back against back wall, front faces forward (+Z)
            } else if (minWallDist === dLeft) {
              targetRot = Math.PI / 2; // Back against left wall, front faces right (+X)
            } else if (minWallDist === dRight) {
              targetRot = -Math.PI / 2; // Back against right wall, front faces left (-X)
            } else if (minWallDist === dFront) {
              targetRot = Math.PI; // Back against front wall, front faces inward (-Z)
            }
          }

          // Compute effective width/depth based on rotation
          const isRotated90 = Math.abs(Math.sin(targetRot)) > 0.5;
          const effW = isRotated90 ? itemD : itemW;
          const effD = isRotated90 ? itemW : itemD;

          let tx = Math.max(
            -room.width / 2 + effW / 2,
            Math.min(room.width / 2 - effW / 2, rawX)
          );
          let tz = Math.max(
            -room.depth / 2 + effD / 2,
            Math.min(room.depth / 2 - effD / 2, rawZ)
          );

          // Wall and item snapping for Floor items
          if (snapOn) {
            const distLeft = Math.abs(tx - (-room.width / 2 + effW / 2));
            const distRight = Math.abs(tx - (room.width / 2 - effW / 2));
            const distBack = Math.abs(tz - (-room.depth / 2 + effD / 2));
            const distFront = Math.abs(tz - (room.depth / 2 - effD / 2));

            if (distBack < SNAP_THRESHOLD) {
              tz = -room.depth / 2 + effD / 2;
              targetRot = 0;
            } else if (distLeft < SNAP_THRESHOLD) {
              tx = -room.width / 2 + effW / 2;
              targetRot = Math.PI / 2;
            } else if (distRight < SNAP_THRESHOLD) {
              tx = room.width / 2 - effW / 2;
              targetRot = -Math.PI / 2;
            } else if (distFront < SNAP_THRESHOLD) {
              tz = room.depth / 2 - effD / 2;
              targetRot = Math.PI;
            }

            // Side-by-side snapping to neighboring floor objects along the walls
            otherObjects.forEach((other) => {
              if (other.userData.behavior !== 'wall') {
                const oW = (other.userData.width || 0.8) * other.scale.x;
                const oD = (other.userData.depth || 0.6) * other.scale.z;
                const oIsRot90 = Math.abs(Math.sin(other.rotation.y)) > 0.5;
                const oEffW = oIsRot90 ? oD : oW;
                const oEffD = oIsRot90 ? oW : oD;

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
              }
            });
          }

          const targetPos = new THREE.Vector3(tx, dragObject.position.y, tz);
          if (!checkCollision3D(targetPos, effW, effD)) {
            dragObject.position.x = tx;
            dragObject.position.z = tz;
            dragObject.rotation.y = targetRot;
          }
        }
      }

      updateRulers(dragObject);
      if (selectionHelperRef.current) selectionHelperRef.current.update();
    };

    const handlePointerUp = () => {
      if (isDragging && dragObject) {
        onUpdatePosition(
          dragObject.userData.uid,
          dragObject.position.x,
          dragObject.position.z,
          dragObject.position.y,
          dragObject.rotation.y
        );
      }
      isDragging = false;
      dragObject = null;
      if (controlsRef.current) controlsRef.current.enabled = true;
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      if (!onDropFurniture || !cameraRef.current) return;

      const raw = e.dataTransfer?.getData('application/json');
      if (!raw) return;
      const spec = JSON.parse(raw) as FurnitureSpec;

      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, cameraRef.current);

      if (spec.pr === 'wall') {
        const wallIntersects = raycaster.intersectObjects(wallsGroupRef.current.children);
        const validHit = wallIntersects.find(
          (hit) => ((hit.object as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity > 0.5
        );
        if (validHit) {
          const wall = validHit.object as THREE.Mesh;
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

          const isRot90 = Math.abs(Math.sin(rot)) > 0.5;
          const effW = isRot90 ? spec.d : spec.w;
          const effD = isRot90 ? spec.w : spec.d;

          const x = Math.max(-room.width / 2 + effW / 2, Math.min(room.width / 2 - effW / 2, rawX));
          const z = Math.max(-room.depth / 2 + effD / 2, Math.min(room.depth / 2 - effD / 2, rawZ));

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
  }, [room, snapOn, collisionOn, onSelect, onUpdatePosition, onDropFurniture, updateRulers]);

  return <div ref={containerRef} className="w-full h-full relative select-none overflow-hidden" />;
}
