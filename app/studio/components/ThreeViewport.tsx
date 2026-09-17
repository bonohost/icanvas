'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { RectAreaLightHelper } from 'three/examples/jsm/helpers/RectAreaLightHelper.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { FurnitureInstance, RoomSettings, WallSettings, FurnitureSpec, WallOpening, WallSide } from '../types/furniture';
import { buildFurniture } from '../lib/three-builders';
import { buildParametricWallGroup, buildOpening3D } from '../lib/wall-builders';
import { ShoppingCart } from 'lucide-react';

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
  gizmoEnabled?: boolean;
  gizmoMode?: 'translate' | 'rotate_y' | 'rotate_full';
  onDragStart?: () => void;
  showProductPins?: boolean;
  onOpenCart?: () => void;
  isObjectLocked?: boolean;
}

const SNAP_THRESHOLD = 0.15;
const WALL_THICKNESS = 0.1;
const HALF_WALL = WALL_THICKNESS / 2;
const COLLISION_EPSILON = 0.001;

const LAYER_DEFAULT = 0;
const LAYER_TECHNICAL = 1;

const createDaylightGradientTexture = (): THREE.Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0.0, '#0284c7');   // Azul profundo do céu (topo)
  gradient.addColorStop(0.18, '#0ea5e9');  // Azul céu luminoso
  //gradient.addColorStop(0.32, '#38bdf8');  // Azul celeste suave
  //gradient.addColorStop(0.44, '#bae6fd');  // Bruma e horizonte elevado (visível atrás da sala)
  gradient.addColorStop(0.32, '#e0f2fe');  // Linha de luz do horizonte
  gradient.addColorStop(0.44, '#fef3c7');  // Brilho solar quente/dourado na transição de solo
  gradient.addColorStop(0.60, '#e2e8f0');  // Solo claro natural
  gradient.addColorStop(1.0, '#cbd5e1');   // Base de solo suave
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 16, 512);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
};

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
  gizmoEnabled = false,
  gizmoMode = 'translate',
  onDragStart,
  showProductPins = true,
  onOpenCart,
  isObjectLocked = false,
}: ViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const transformControlsRef = useRef<TransformControls | null>(null);
  const furnitureGroupRef = useRef<THREE.Group>(new THREE.Group());
  const wallsGroupRef = useRef<THREE.Group>(new THREE.Group());
  const floorGroupRef = useRef<THREE.Group>(new THREE.Group());
  const floorMeshRef = useRef<THREE.Mesh | null>(null);
  const floorMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const outdoorMeshRef = useRef<THREE.Mesh | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const selectionHelperRef = useRef<THREE.BoxHelper | null>(null);
  const rulersGroupRef = useRef<THREE.Group>(new THREE.Group());
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const textureLoaderRef = useRef<THREE.TextureLoader>(new THREE.TextureLoader().setCrossOrigin('anonymous'));
  const textureCacheRef = useRef<Map<string, THREE.Texture>>(new Map());
  const daylightTextureRef = useRef<THREE.Texture | null>(null);
  const rectLightRef = useRef<THREE.RectAreaLight | null>(null);
  const rectLightHelperRef = useRef<RectAreaLightHelper | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const topLightRef = useRef<THREE.DirectionalLight | null>(null);
  const fillLightRef = useRef<THREE.DirectionalLight | null>(null);
  const exrLoaderRef = useRef<EXRLoader | null>(null);
  const hdrTextureCacheRef = useRef<Map<string, { raw: THREE.DataTexture; pmrem: THREE.Texture }>>(new Map());
  const defaultEnvTextureRef = useRef<THREE.Texture | null>(null);

  const isObjectLockedRef = useRef(isObjectLocked);
  useEffect(() => {
    isObjectLockedRef.current = isObjectLocked;
  }, [isObjectLocked]);

  const onUpdatePositionRef = useRef(onUpdatePosition);
  useEffect(() => {
    onUpdatePositionRef.current = onUpdatePosition;
  }, [onUpdatePosition]);

  const onDragStartRef = useRef(onDragStart);
  useEffect(() => {
    onDragStartRef.current = onDragStart;
  }, [onDragStart]);

  const roomRef = useRef(room);
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  const snapOnRef = useRef(snapOn);
  useEffect(() => {
    snapOnRef.current = snapOn;
  }, [snapOn]);

  const collisionOnRef = useRef(collisionOn);
  useEffect(() => {
    collisionOnRef.current = collisionOn;
  }, [collisionOn]);

  const furnitureRef = useRef(furniture);
  useEffect(() => {
    furnitureRef.current = furniture;
  }, [furniture]);

  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const onSelectOpeningRef = useRef(onSelectOpening);
  useEffect(() => {
    onSelectOpeningRef.current = onSelectOpening;
  }, [onSelectOpening]);

  const onUpdateOpeningPositionRef = useRef(onUpdateOpeningPosition);
  useEffect(() => {
    onUpdateOpeningPositionRef.current = onUpdateOpeningPosition;
  }, [onUpdateOpeningPosition]);

  const onDropFurnitureRef = useRef(onDropFurniture);
  useEffect(() => {
    onDropFurnitureRef.current = onDropFurniture;
  }, [onDropFurniture]);

  const onDropOpeningRef = useRef(onDropOpening);
  useEffect(() => {
    onDropOpeningRef.current = onDropOpening;
  }, [onDropOpening]);

  // Texture helper with synchronous cache retrieval and async callback support to eliminate screen flicker
  const getOrLoadTexture = useCallback((url?: string, tx = 1, ty = 1, onLoaded?: (tex: THREE.Texture) => void): THREE.Texture | null => {
    if (!url) return null;
    const key = `${url}_${tx}_${ty}`;
    const cached = textureCacheRef.current.get(key);
    if (cached) {
      return cached;
    }
    textureLoaderRef.current.load(
      url,
      (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(tx, ty);
        tex.colorSpace = THREE.SRGBColorSpace;
        textureCacheRef.current.set(key, tex);
        if (onLoaded) onLoaded(tex);
      },
      undefined,
      (err) => {
        console.warn('Texture load error:', err);
      }
    );
    return null;
  }, []);

  const autoTransparencyRef = useRef(autoTransparency);
  useEffect(() => {
    autoTransparencyRef.current = autoTransparency;
  }, [autoTransparency]);

  const isWallTransparent = useCallback((wallGroup: any): boolean => {
    if (!wallGroup || !autoTransparencyRef.current || !cameraRef.current) return false;
    if (typeof wallGroup.userData?.isTransparent === 'boolean') {
      return wallGroup.userData.isTransparent;
    }
    const wallNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(wallGroup.quaternion);
    const camToWall = new THREE.Vector3().subVectors(wallGroup.position, cameraRef.current.position).normalize();
    return wallNormal.dot(camToWall) > 0.05;
  }, []);

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
      const rectPrev = rectLightHelperRef.current?.visible ?? false;
      const gizmoPrev = transformControlsRef.current?.getHelper().visible ?? false;

      // Hide non-photorealistic guides
      if (gridHelperRef.current) gridHelperRef.current.visible = false;
      if (selectionHelperRef.current) selectionHelperRef.current.visible = false;
      if (rulersGroupRef.current) rulersGroupRef.current.visible = false;
      if (rectLightHelperRef.current) rectLightHelperRef.current.visible = false;
      if (transformControlsRef.current) transformControlsRef.current.getHelper().visible = false;

      // Render clean frame
      renderer.render(scene, camera);
      const dataUrl = renderer.domElement.toDataURL('image/jpeg', 0.95);

      // Restore guides
      if (gridHelperRef.current) gridHelperRef.current.visible = gridPrev;
      if (selectionHelperRef.current) selectionHelperRef.current.visible = selectPrev;
      if (rulersGroupRef.current) rulersGroupRef.current.visible = rulersPrev;
      if (rectLightHelperRef.current) rectLightHelperRef.current.visible = rectPrev;
      if (transformControlsRef.current) transformControlsRef.current.getHelper().visible = gizmoPrev;

      return dataUrl;
    };

    onRegisterCapture(captureSnapshot);
  }, [onRegisterCapture]);

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
        ...floorGroupRef.current.children,
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
    const initialPreset = room.environmentPreset || 'dark_studio';
    if (initialPreset === 'daylight') {
      daylightTextureRef.current = createDaylightGradientTexture();
      scene.background = daylightTextureRef.current;
    } else if (initialPreset === 'clean_studio') {
      scene.background = new THREE.Color('#dbeafe');
    } else {
      scene.background = new THREE.Color('#141923');
    }
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
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = room.exposure ?? 1.0;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // PBR Studio Environment Map (Realistic reflections for metals, glass and glossy surfaces)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const roomEnv = new RoomEnvironment();
    const envTexture = pmremGenerator.fromScene(roomEnv, 0.04).texture;
    defaultEnvTextureRef.current = envTexture;
    scene.environment = envTexture;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, room.height * 0.4, 0);
    controls.update();
    controlsRef.current = controls;

    // Ambient and Hemisphere Lighting with natural floor bounce
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.6);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const hemiLight = new THREE.HemisphereLight('#ffffff', '#334155', 0.5);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    // Directional Sunlight with full architectural shadows
    const topLight = new THREE.DirectionalLight('#ffffff', 1.3);
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

    const fillLight = new THREE.DirectionalLight('#bfdbfe', 0.4);
    fillLight.position.set(-6, 8, -6);
    scene.add(fillLight);
    fillLightRef.current = fillLight;

    // Initialize RectAreaLight Uniforms for PBR materials
    RectAreaLightUniformsLib.init();

    // Architectural Area Light (Ceiling Plafon / LED Softbox)
    const initialArea = room.areaLight || {
      enabled: true,
      intensity: 2.0,
      width: 2.2,
      height: 1.6,
      color: '#ffffff',
      showHelper: true,
    };
    const rectLight = new THREE.RectAreaLight(
      initialArea.color,
      initialArea.enabled ? initialArea.intensity : 0,
      initialArea.width,
      initialArea.height
    );
    const initialY = initialArea.posY ?? (room.height - 0.05);
    rectLight.position.set(0, initialY, 0);
    rectLight.rotation.x = -Math.PI / 2; // Point down towards floor
    scene.add(rectLight);
    rectLightRef.current = rectLight;

    const rectHelper = new RectAreaLightHelper(rectLight);
    rectHelper.visible = !!(initialArea.enabled && initialArea.showHelper);
    scene.add(rectHelper);
    rectLightHelperRef.current = rectHelper;

    scene.add(floorGroupRef.current);
    scene.add(furnitureGroupRef.current);
    scene.add(wallsGroupRef.current);
    scene.add(rulersGroupRef.current);

    // TransformControls Gizmo for free XYZ object translation/rotation
    const transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.size = 0.85;
    transformControls.space = 'world';
    transformControls.setMode(gizmoMode === 'translate' ? 'translate' : 'rotate');
    const gizmoRoot = transformControls.getHelper();
    gizmoRoot.visible = false;
    scene.add(gizmoRoot);
    transformControlsRef.current = transformControls;

    transformControls.addEventListener('dragging-changed', (event: any) => {
      if (controlsRef.current) {
        controlsRef.current.enabled = !event.value;
      }
      if (event.value) {
        onDragStartRef.current?.();
      }
    });

    transformControls.addEventListener('change', () => {
      if (selectionHelperRef.current) {
        selectionHelperRef.current.update();
      }
      if (transformControls.object) {
        updateRulers(transformControls.object);
      }
    });

    transformControls.addEventListener('objectChange', () => {
      const obj = transformControls.object;
      if (obj && obj.userData?.uid) {
        const uid = obj.userData.uid;
        onUpdatePositionRef.current(
          uid,
          obj.position.x,
          obj.position.z,
          obj.position.y,
          obj.rotation.y
        );
      }
    });

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
          wallGroup.userData.isTransparent = isBehind;

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

      // Update 2D Shoppable Product Pins on screen
      if (cameraRef.current && containerRef.current) {
        const container = containerRef.current;
        const w = container.clientWidth;
        const h = container.clientHeight;
        const pinElements = container.querySelectorAll<HTMLElement>('[data-product-pin-uid]');

        pinElements.forEach((pinEl) => {
          const uidStr = pinEl.getAttribute('data-product-pin-uid');
          if (!uidStr) return;
          const uid = parseInt(uidStr, 10);
          const item = furnitureRef.current.find((f) => f.uid === uid);
          if (!item) {
            pinEl.style.opacity = '0';
            pinEl.style.pointerEvents = 'none';
            return;
          }

          const pos = new THREE.Vector3(item.x, (item.by || 0) + item.h + 0.15, item.z);
          pos.project(cameraRef.current!);

          // Check if behind camera or far off screen
          if (pos.z > 1.0 || pos.z < -1.0) {
            pinEl.style.opacity = '0';
            pinEl.style.pointerEvents = 'none';
          } else {
            const screenX = (pos.x * 0.5 + 0.5) * w;
            const screenY = (-(pos.y * 0.5) + 0.5) * h;
            pinEl.style.opacity = '1';
            pinEl.style.pointerEvents = 'auto';
            pinEl.style.transform = `translate3d(${screenX}px, ${screenY}px, 0) translate(-50%, -100%)`;
          }
        });
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
      transformControls.dispose();
      pmremGenerator.dispose();
      roomEnv.dispose();
      envTexture.dispose();
      if (daylightTextureRef.current) {
        daylightTextureRef.current.dispose();
        daylightTextureRef.current = null;
      }
      renderer.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      floorGroupRef.current.clear();
      wallsGroupRef.current.clear();
      furnitureGroupRef.current.clear();
      rulersGroupRef.current.clear();
      floorMeshRef.current = null;
      floorMatRef.current = null;
      outdoorMeshRef.current = null;
      sceneRef.current = null;
    };
  }, []);

  // 1. Lighting, Exposure & Environment / HDR Preset Synchronization
  useEffect(() => {
    const preset = room.environmentPreset || 'dark_studio';
    const exposure = room.exposure ?? 1.0;
    const intensity = room.lightIntensity ?? 1.0;
    const hdr = room.hdrSettings || {};
    const hdrIntensity = hdr.intensity ?? 1.0;
    const hdrRotationRad = ((hdr.rotation ?? 0) * Math.PI) / 180;
    const showHdrBg = hdr.showBackground ?? false;
    const hdrBlur = hdr.backgroundBlur ?? 0.0;
    const disableManualLights = hdr.disableManualLights ?? false;

    if (rendererRef.current) {
      rendererRef.current.toneMappingExposure = exposure;
    }

    const isHdrPreset = preset === 'hdr_144' || preset === 'hdr_185';
    const hdrUrl = isHdrPreset
      ? (preset === 'hdr_144'
          ? '/textures/hdr/144_hdrmaps_com_free_2K.exr'
          : '/textures/hdr/185_hdrmaps_com_free_1K.exr')
      : null;

    if (sceneRef.current && rendererRef.current) {
      // Rotation
      if ('environmentRotation' in sceneRef.current) {
        (sceneRef.current as any).environmentRotation.set(0, hdrRotationRad, 0);
      }
      if ('backgroundRotation' in sceneRef.current) {
        (sceneRef.current as any).backgroundRotation.set(0, hdrRotationRad, 0);
      }
      if ('backgroundBlurriness' in sceneRef.current) {
        (sceneRef.current as any).backgroundBlurriness = isHdrPreset && showHdrBg ? hdrBlur : 0;
      }

      if (isHdrPreset && hdrUrl) {
        if (!exrLoaderRef.current) {
          exrLoaderRef.current = new EXRLoader();
        }

        const cached = hdrTextureCacheRef.current.get(hdrUrl);
        if (cached) {
          sceneRef.current.environment = cached.pmrem;
          if ('environmentIntensity' in sceneRef.current) {
            (sceneRef.current as any).environmentIntensity = hdrIntensity;
          }
          if (showHdrBg) {
            sceneRef.current.background = cached.raw;
          } else {
            sceneRef.current.background = new THREE.Color('#141923');
          }
        } else {
          exrLoaderRef.current.load(
            hdrUrl,
            (rawTexture) => {
              rawTexture.mapping = THREE.EquirectangularReflectionMapping;
              if (rendererRef.current && sceneRef.current) {
                const pmremGen = new THREE.PMREMGenerator(rendererRef.current);
                pmremGen.compileEquirectangularShader();
                const pmremTex = pmremGen.fromEquirectangular(rawTexture).texture;
                hdrTextureCacheRef.current.set(hdrUrl, { raw: rawTexture, pmrem: pmremTex });

                if ((roomRef.current.environmentPreset || 'dark_studio') === preset) {
                  sceneRef.current.environment = pmremTex;
                  if ('environmentIntensity' in sceneRef.current) {
                    (sceneRef.current as any).environmentIntensity = hdrIntensity;
                  }
                  if (roomRef.current.hdrSettings?.showBackground) {
                    sceneRef.current.background = rawTexture;
                  }
                }
              }
            },
            undefined,
            (err) => {
              console.error('Error loading EXR HDR texture:', err);
            }
          );
        }
      } else {
        // Standard studio environment
        if (defaultEnvTextureRef.current) {
          sceneRef.current.environment = defaultEnvTextureRef.current;
        }
        if ('environmentIntensity' in sceneRef.current) {
          (sceneRef.current as any).environmentIntensity = 1.0;
        }

        if (preset === 'clean_studio') {
          sceneRef.current.background = new THREE.Color('#dbeafe');
        } else if (preset === 'daylight') {
          if (!daylightTextureRef.current) {
            daylightTextureRef.current = createDaylightGradientTexture();
          }
          sceneRef.current.background = daylightTextureRef.current;
        } else {
          sceneRef.current.background = new THREE.Color('#141923');
        }
      }
    }

    if (outdoorMeshRef.current) {
      const mat = outdoorMeshRef.current.material as THREE.MeshStandardMaterial;
      if (mat) {
        if (isHdrPreset) {
          mat.color.set('#0f172a');
        } else if (preset === 'clean_studio') {
          mat.color.set('#f1f5f9');
        } else if (preset === 'daylight') {
          mat.color.set('#cbd5e1');
        } else {
          mat.color.set('#1e2738');
        }
      }
    }

    // Manual Lights (can be turned off when testing pure 100% HDR IBL)
    const manualIntensityMultiplier = (isHdrPreset && disableManualLights) ? 0.0 : 1.0;

    if (ambientLightRef.current) {
      ambientLightRef.current.intensity =
        intensity * manualIntensityMultiplier * (preset === 'clean_studio' ? 0.75 : preset === 'daylight' ? 0.7 : isHdrPreset ? 0.2 : 0.6);
    }

    if (hemiLightRef.current) {
      if (preset === 'clean_studio') {
        hemiLightRef.current.color.set('#ffffff');
        hemiLightRef.current.groundColor.set('#cbd5e1');
        hemiLightRef.current.intensity = intensity * manualIntensityMultiplier * 0.65;
      } else if (preset === 'daylight') {
        hemiLightRef.current.color.set('#e0f2fe');
        hemiLightRef.current.groundColor.set('#334155');
        hemiLightRef.current.intensity = intensity * manualIntensityMultiplier * 0.75;
      } else if (isHdrPreset) {
        hemiLightRef.current.color.set('#ffffff');
        hemiLightRef.current.groundColor.set('#1e293b');
        hemiLightRef.current.intensity = intensity * manualIntensityMultiplier * 0.25;
      } else {
        hemiLightRef.current.color.set('#ffffff');
        hemiLightRef.current.groundColor.set('#334155');
        hemiLightRef.current.intensity = intensity * manualIntensityMultiplier * 0.5;
      }
    }

    if (topLightRef.current) {
      if (preset === 'daylight') {
        topLightRef.current.color.set('#fffbeb');
        topLightRef.current.intensity = intensity * manualIntensityMultiplier * 1.5;
      } else if (preset === 'clean_studio') {
        topLightRef.current.color.set('#ffffff');
        topLightRef.current.intensity = intensity * manualIntensityMultiplier * 1.1;
      } else if (isHdrPreset) {
        topLightRef.current.color.set('#ffffff');
        topLightRef.current.intensity = intensity * manualIntensityMultiplier * 0.8;
      } else {
        topLightRef.current.color.set('#ffffff');
        topLightRef.current.intensity = intensity * manualIntensityMultiplier * 1.3;
      }
      const maxRoomDim = Math.max(room.width, room.depth, room.height) * 1.6 + 4;
      topLightRef.current.shadow.camera.left = -maxRoomDim;
      topLightRef.current.shadow.camera.right = maxRoomDim;
      topLightRef.current.shadow.camera.top = maxRoomDim;
      topLightRef.current.shadow.camera.bottom = -maxRoomDim;
      topLightRef.current.shadow.camera.updateProjectionMatrix();
    }

    if (fillLightRef.current) {
      fillLightRef.current.intensity = 0.4 * manualIntensityMultiplier;
    }
  }, [
    room.environmentPreset,
    room.exposure,
    room.lightIntensity,
    room.hdrSettings,
    room.width,
    room.depth,
    room.height,
  ]);

  // 1.5. RectAreaLight & Helper Real-Time Synchronization (Non-destructive)
  useEffect(() => {
    if (!rectLightRef.current) return;
    const al = room.areaLight || {
      enabled: false,
      intensity: 0,
      width: 2.2,
      height: 1.6,
      color: '#ffffff',
      showHelper: false,
    };

    rectLightRef.current.color.set(al.color || '#ffffff');
    rectLightRef.current.intensity = al.enabled ? (al.intensity ?? 2.0) : 0;
    rectLightRef.current.width = Math.max(0.2, al.width || 2.2);
    rectLightRef.current.height = Math.max(0.2, al.height || 1.6);

    const lightY = al.posY ?? (room.height - 0.05);
    rectLightRef.current.position.set(0, lightY, 0);
    rectLightRef.current.rotation.x = -Math.PI / 2;

    if (rectLightHelperRef.current && sceneRef.current) {
      sceneRef.current.remove(rectLightHelperRef.current);
      rectLightHelperRef.current.dispose?.();
      const newHelper = new RectAreaLightHelper(rectLightRef.current);
      newHelper.visible = !!(al.enabled && al.showHelper);
      sceneRef.current.add(newHelper);
      rectLightHelperRef.current = newHelper;
    }
  }, [room.areaLight, room.height]);

  // 2. Floor Geometry & Materials (smart in-place material update to eliminate flickering)
  useEffect(() => {
    if (!sceneRef.current) return;

    // Check if floor geometry exists with matching dimensions inside floorGroupRef
    const needsRebuild =
      !floorMeshRef.current ||
      floorGroupRef.current.children.length === 0 ||
      floorMeshRef.current.userData?.w !== room.width ||
      floorMeshRef.current.userData?.d !== room.depth;

    if (needsRebuild) {
      floorGroupRef.current.clear();

      const floorGeo = new THREE.PlaneGeometry(room.width, room.depth);
      const floorMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(room.floorColor),
        roughness: room.floorRoughness ?? 0.55,
        metalness: room.floorMetalness ?? 0.02,
      });
      floorMatRef.current = floorMat;

      const initialTex = getOrLoadTexture(
        room.floorTextureUrl,
        room.floorTileX || 4,
        room.floorTileY || 4,
        (tex) => {
          if (floorMatRef.current) {
            floorMatRef.current.map = tex;
            floorMatRef.current.needsUpdate = true;
          }
        }
      );
      if (initialTex) {
        floorMat.map = initialTex;
      }

      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      floor.userData = { isFloor: true, w: room.width, d: room.depth };
      floorMeshRef.current = floor;
      floorGroupRef.current.add(floor);

      const outdoorGeo = new THREE.PlaneGeometry(room.width + 50, room.depth + 50);
      const outdoorMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#1e2738'),
        roughness: 0.9,
        metalness: 0.05,
      });
      const outdoor = new THREE.Mesh(outdoorGeo, outdoorMat);
      outdoor.position.y = -0.005;
      outdoor.rotation.x = -Math.PI / 2;
      outdoor.receiveShadow = true;
      outdoorMeshRef.current = outdoor;
      floorGroupRef.current.add(outdoor);
    } else if (floorMatRef.current) {
      // In-place material updates without mesh re-instantiation or flickering
      floorMatRef.current.color.set(room.floorColor);
      floorMatRef.current.roughness = room.floorRoughness ?? 0.55;
      floorMatRef.current.metalness = room.floorMetalness ?? 0.02;

      const tex = getOrLoadTexture(
        room.floorTextureUrl,
        room.floorTileX || 4,
        room.floorTileY || 4,
        (loadedTex) => {
          if (floorMatRef.current) {
            floorMatRef.current.map = loadedTex;
            floorMatRef.current.needsUpdate = true;
          }
        }
      );
      floorMatRef.current.map = tex;
      floorMatRef.current.needsUpdate = true;
    }
  }, [
    room.width,
    room.depth,
    room.floorColor,
    room.floorRoughness,
    room.floorMetalness,
    room.floorTextureUrl,
    room.floorTileX,
    room.floorTileY,
    getOrLoadTexture,
  ]);

  // 3. Grid Helper (recreate only on room dimension resize, toggle visibility in place)
  useEffect(() => {
    if (!sceneRef.current) return;
    if (gridHelperRef.current) {
      sceneRef.current.remove(gridHelperRef.current);
    }
    const maxDim = Math.max(room.width, room.depth);
    const grid = new THREE.GridHelper(maxDim, maxDim * 2, '#3b82f6', '#334155');
    grid.position.y = 0.002;
    grid.visible = showGrid;
    sceneRef.current.add(grid);
    gridHelperRef.current = grid;
  }, [room.width, room.depth]);

  useEffect(() => {
    if (gridHelperRef.current) {
      gridHelperRef.current.visible = showGrid;
    }
  }, [showGrid]);

  // 4. Parametric Walls & Openings Smart Synchronization (Per Wall)
  useEffect(() => {
    if (!sceneRef.current) return;

    const hw = room.width / 2;
    const hd = room.depth / 2;

    const wallSpecs: Array<{
      id: keyof RoomSettings['walls'];
      w: number;
      h: number;
      x: number;
      z: number;
      ry: number;
    }> = [
        { id: 'back', w: room.width, h: room.height, x: 0, z: -hd - HALF_WALL, ry: 0 },
        { id: 'front', w: room.width, h: room.height, x: 0, z: hd + HALF_WALL, ry: Math.PI },
        { id: 'left', w: room.depth, h: room.height, x: -hw - HALF_WALL, z: 0, ry: Math.PI / 2 },
        { id: 'right', w: room.depth, h: room.height, x: hw + HALF_WALL, z: 0, ry: -Math.PI / 2 },
      ];

    let hasChanges = false;

    wallSpecs.forEach(({ id, w, h, x, z, ry }) => {
      const wallConfig = room.walls[id];
      const wallOpenings = (room.openings || []).filter((o) => o.wallSide === id);

      const fingerprint = JSON.stringify({
        w,
        h,
        x,
        z,
        ry,
        color: wallConfig.color,
        roughness: wallConfig.roughness ?? 0.85,
        metalness: wallConfig.metalness ?? 0.02,
        textureUrl: wallConfig.textureUrl || '',
        tileX: wallConfig.tileX || 1,
        tileY: wallConfig.tileY || 1,
        openings: wallOpenings.map((o) => ({
          id: o.id,
          pos: o.position,
          w: o.width,
          h: o.height,
          sill: o.sillHeight,
          type: o.type,
          frameColor: o.frameColor,
          frameMaterial: o.frameMaterial,
          glassType: o.glassType,
          glassColor: o.glassColor,
          glassOpacity: o.glassOpacity,
          glassRoughness: o.glassRoughness,
          mullionStyle: o.mullionStyle,
          leafOpenRatio: o.leafOpenRatio,
        })),
      });

      const existingWall = wallsGroupRef.current.children.find(
        (child) => child.userData?.wallId === id
      );

      // If wall fingerprint is identical, do NOT touch it!
      if (existingWall && existingWall.userData?.fingerprint === fingerprint) {
        return;
      }

      hasChanges = true;

      // Material creation with instant cached texture check
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(wallConfig.color),
        roughness: wallConfig.roughness ?? 0.85,
        metalness: wallConfig.metalness ?? 0.02,
        transparent: true,
        opacity: 1.0,
      });

      const tex = getOrLoadTexture(
        wallConfig.textureUrl,
        wallConfig.tileX || 1,
        wallConfig.tileY || 1,
        (loadedTex) => {
          mat.map = loadedTex;
          mat.needsUpdate = true;
        }
      );
      if (tex) {
        mat.map = tex;
      }

      const wallGroup = buildParametricWallGroup(w, h, WALL_THICKNESS, wallConfig, wallOpenings, mat);
      wallGroup.position.set(x, 0, z);
      wallGroup.rotation.y = ry;
      wallGroup.userData = { isWall: true, wallId: id, w, h, fingerprint };

      // Add 3D architectural doors / windows
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

      if (existingWall) {
        wallsGroupRef.current.remove(existingWall);
      }
      wallsGroupRef.current.add(wallGroup);
    });

    if (hasChanges) {
      wallsGroupRef.current.updateMatrixWorld(true);
    }
  }, [room, getOrLoadTexture]);

  const prevCamPosRef = useRef({ x: cameraSettings.x, y: cameraSettings.y, z: cameraSettings.z });

  // Update Camera Viewpoints and Lens FOV (15° to 60°)
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current) return;

    const posChanged =
      prevCamPosRef.current.x !== cameraSettings.x ||
      prevCamPosRef.current.y !== cameraSettings.y ||
      prevCamPosRef.current.z !== cameraSettings.z;

    if (posChanged) {
      cameraRef.current.position.set(cameraSettings.x, cameraSettings.y, cameraSettings.z);
      controlsRef.current.target.set(0, room.height * 0.4, 0);
      controlsRef.current.update();
      prevCamPosRef.current = { x: cameraSettings.x, y: cameraSettings.y, z: cameraSettings.z };
    }

    if (cameraRef.current.fov !== cameraSettings.fov) {
      cameraRef.current.fov = cameraSettings.fov;
      cameraRef.current.updateProjectionMatrix();
    }
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

  // Sync TransformControls attachment and mode
  useEffect(() => {
    const tc = transformControlsRef.current;
    if (!tc) return;

    tc.enabled = !!gizmoEnabled;

    if (gizmoMode === 'rotate_y') {
      tc.setMode('rotate');
      tc.showX = false;
      tc.showZ = false;
      tc.showY = true;
    } else if (gizmoMode === 'rotate_full') {
      tc.setMode('rotate');
      tc.showX = true;
      tc.showY = true;
      tc.showZ = true;
    } else {
      tc.setMode('translate');
      tc.showX = true;
      tc.showY = true;
      tc.showZ = true;
    }

    const helper = tc.getHelper();
    if (helper) {
      helper.visible = !!gizmoEnabled;
    }

    if (selectedUid && gizmoEnabled) {
      const selectedObj = furnitureGroupRef.current.children.find(
        (c) => c.userData?.uid === selectedUid
      );
      if (selectedObj) {
        tc.attach(selectedObj);
      } else {
        tc.detach();
      }
    } else {
      tc.detach();
    }
  }, [selectedUid, gizmoEnabled, gizmoMode, furniture]);

  // Real-time Interactive Dragging & Repositioning System (Permanent listeners on refs)
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

      // If user is actively dragging the TransformControls gizmo handles, let the gizmo handle it
      if (transformControlsRef.current?.dragging) {
        return;
      }

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
        if (!p?.userData?.isOpening) return false;
        let wallGroup: any = p.parent;
        while (wallGroup && !wallGroup.userData?.isWall && wallGroup.parent) {
          wallGroup = wallGroup.parent;
        }
        if (wallGroup && isWallTransparent(wallGroup)) return false;
        return true;
      });

      if (openingHit) {
        let top: any = openingHit.object;
        while (top && !top.userData?.isOpening && top.parent) top = top.parent;
        if (top?.userData?.openingId) {
          const opId = top.userData.openingId;
          onSelectOpeningRef.current?.(opId);
          onSelectRef.current?.(null);

          // Find wall parent
          let wallGroup: any = top.parent;
          while (wallGroup && !wallGroup.userData?.isWall && wallGroup.parent) {
            wallGroup = wallGroup.parent;
          }

          if (wallGroup) {
            onDragStartRef.current?.();
            dragOpening = {
              id: opId,
              wallSide: wallGroup.userData.wallId,
              wallGroup,
              wallLength: wallGroup.userData.w || roomRef.current.width,
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
          onSelectRef.current?.(top.userData.uid);
          onSelectOpeningRef.current?.(null);

          // Natural direct dragging of furniture across floor/walls (only when not locked)
          if (!isObjectLockedRef.current) {
            onDragStartRef.current?.();
            dragObject = top;
            isDragging = true;
            if (controlsRef.current) controlsRef.current.enabled = false;
          }

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
        onSelectRef.current?.(null);
        onSelectOpeningRef.current?.(null);
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
          onUpdateOpeningPositionRef.current?.(dragOpening.id, newPos);
        }
        if (selectionHelperRef.current) selectionHelperRef.current.update();
        return;
      }

      if (!dragObject) return;

      const currentRoom = roomRef.current;
      const currentSnapOn = snapOnRef.current;
      const currentCollisionOn = collisionOnRef.current;

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
        if (!currentCollisionOn) return false;
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
            if (!p?.userData?.isWall) return false;
            if (isWallTransparent(p)) return false;
            return true;
          }
        );

        if (validHit) {
          let wall: any = validHit.object;
          while (wall && !wall.userData?.isWall && wall.parent) wall = wall.parent;
          const wallW = wall.userData.w || currentRoom.width;
          const localHit = wall.worldToLocal(validHit.point.clone());

          let targetLocalX = Math.max(-wallW / 2 + itemW / 2, Math.min(wallW / 2 - itemW / 2, localHit.x));
          const targetElevation = dragObject.userData.spec?.by ?? 1.5;
          let targetLocalY = Math.max(itemH / 2, Math.min(currentRoom.height - itemH / 2, targetElevation));

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
          const dLeft = rawX - (-currentRoom.width / 2);
          const dRight = currentRoom.width / 2 - rawX;
          const dBack = rawZ - (-currentRoom.depth / 2);
          const dFront = currentRoom.depth / 2 - rawZ;

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
          let minX = -currentRoom.width / 2 + effW / 2;
          let maxX = currentRoom.width / 2 - effW / 2;
          let minZ = -currentRoom.depth / 2 + effD / 2;
          let maxZ = currentRoom.depth / 2 - effD / 2;

          let tx = Math.max(minX, Math.min(maxX, rawX));
          let tz = Math.max(minZ, Math.min(maxZ, rawZ));

          // Magnetic snapping to walls with dual-axis corner support
          if (currentSnapOn) {
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
        onUpdatePositionRef.current?.(
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

      const currentRoom = roomRef.current;
      const currentSnapOn = snapOnRef.current;

      // Handle Door / Window Opening Drop
      if (parsed.isOpening) {
        const wallIntersects = raycaster.intersectObjects(wallsGroupRef.current.children, true);
        const validHit = wallIntersects.find((hit) => {
          let p: any = hit.object;
          while (p && !p.userData?.isWall && p.parent) p = p.parent;
          if (!p?.userData?.isWall) return false;
          if (isWallTransparent(p)) return false;
          return true;
        }) || wallIntersects.find((hit) => {
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
            const wallLength = wallGroup.userData.w || currentRoom.width;
            const localHit = wallGroup.worldToLocal(validHit.point.clone());
            targetPos = Math.max(0.1, Math.min(0.9, localHit.x / wallLength + 0.5));
          }
        }
        onDropOpeningRef.current?.(parsed, targetWallSide, targetPos);
        return;
      }

      if (!onDropFurnitureRef.current) return;
      const spec = parsed as FurnitureSpec;

      if (spec.pr === 'wall') {
        const wallIntersects = raycaster.intersectObjects(wallsGroupRef.current.children, true);
        const validHit = wallIntersects.find((hit) => {
          let p: any = hit.object;
          while (p && !p.userData?.isWall && p.parent) p = p.parent;
          if (!p?.userData?.isWall) return false;
          if (isWallTransparent(p)) return false;
          return true;
        }) || wallIntersects.find((hit) => {
          let p: any = hit.object;
          while (p && !p.userData?.isWall && p.parent) p = p.parent;
          return p?.userData?.isWall;
        });

        if (validHit) {
          let wall: any = validHit.object;
          while (wall && !wall.userData?.isWall && wall.parent) wall = wall.parent;
          const localHit = wall.worldToLocal(validHit.point.clone());
          const worldPos = wall.localToWorld(new THREE.Vector3(localHit.x, localHit.y, spec.d / 2 + HALF_WALL));
          onDropFurnitureRef.current?.(spec, { x: worldPos.x, z: worldPos.z, by: worldPos.y, rot: wall.rotation.y });
        } else {
          onDropFurnitureRef.current?.(spec, { x: 0, z: -currentRoom.depth / 2 + spec.d / 2, by: spec.by ?? 1.5, rot: 0 });
        }
      } else {
        if (raycaster.ray.intersectPlane(plane, intersection)) {
          const rawX = intersection.x;
          const rawZ = intersection.z;

          const dLeft = rawX - (-currentRoom.width / 2);
          const dRight = currentRoom.width / 2 - rawX;
          const dBack = rawZ - (-currentRoom.depth / 2);
          const dFront = currentRoom.depth / 2 - rawZ;
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

          const minX = -currentRoom.width / 2 + effW / 2;
          const maxX = currentRoom.width / 2 - effW / 2;
          const minZ = -currentRoom.depth / 2 + effD / 2;
          const maxZ = currentRoom.depth / 2 - effD / 2;

          let x = Math.max(minX, Math.min(maxX, rawX));
          let z = Math.max(minZ, Math.min(maxZ, rawZ));

          // Snap to wall if close on drop
          if (currentSnapOn) {
            if (Math.abs(z - minZ) < SNAP_THRESHOLD) z = minZ;
            else if (Math.abs(z - maxZ) < SNAP_THRESHOLD) z = maxZ;

            if (Math.abs(x - minX) < SNAP_THRESHOLD) x = minX;
            else if (Math.abs(x - maxX) < SNAP_THRESHOLD) x = maxX;
          }

          onDropFurnitureRef.current?.(spec, { x, z, by: spec.by ?? 0, rot });
        } else {
          onDropFurnitureRef.current?.(spec, { x: 0, z: 0, by: spec.by ?? 0, rot: 0 });
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
  }, [updateRulers]);

  return (
    <div ref={containerRef} className="w-full h-full relative select-none overflow-hidden">
      {/* 2D Shoppable Product Hotspots Overlay */}
      {showProductPins && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
          {furniture
            .filter(
              (item) =>
                item.product &&
                item.product.stores &&
                item.product.stores.length > 0 &&
                item.product.showPin !== false
            )
            .map((item) => {
              const product = item.product!;
              const primaryStore = product.stores[0];
              const isSelected = selectedUid === item.uid;

              return (
                <div
                  key={item.uid}
                  data-product-pin-uid={item.uid}
                  className="absolute top-0 left-0 transition-opacity duration-150 pointer-events-auto"
                  style={{ opacity: 0 }}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(item.uid);
                      if (onOpenCart) onOpenCart();
                    }}
                    className={`group relative w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md shadow-2xl transition-all duration-300 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500 text-white shadow-emerald-500/60 ring-2 ring-white scale-110'
                        : 'bg-zinc-900/90 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-400/50 hover:border-emerald-300 shadow-black/90 hover:scale-110'
                    }`}
                    title={`${product.title || item.name} • Clique para ver no Carrinho`}
                  >
                    {/* Pulsing Radar Ring */}
                    <span className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping pointer-events-none" />
                    
                    {/* Center Icon */}
                    <ShoppingCart className="w-4 h-4 transition-transform group-hover:scale-110" />
                  </button>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
