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
import { captureEquirectangularPanorama } from '../lib/equirectangularExporter';
import { ShoppingCart } from 'lucide-react';

export interface CameraController {
  zoom: (factor: number) => void;
  orbit: (dTheta: number) => void;
  panY: (dY: number) => void;
  setPreset: (type: 'iso' | 'top' | 'front') => void;
}

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
  onRegisterPanoramaCapture?: (captureFn: (options: { eyeHeight?: number; width?: number; height?: number }) => string) => void;
  onRegisterCameraControl?: (controller: CameraController) => void;
  gizmoEnabled?: boolean;
  gizmoMode?: 'translate' | 'rotate_y' | 'rotate_full';
  onDragStart?: () => void;
  showProductPins?: boolean;
  onOpenCart?: (targetUid?: number) => void;
  isObjectLocked?: boolean;
  showRaycastLine?: boolean;
  onToggleRaycastLine?: () => void;
}

const SNAP_THRESHOLD = 0.22;
const WALL_THICKNESS = 0.1;
const HALF_WALL = WALL_THICKNESS / 2;
const COLLISION_EPSILON = 0.001;

const LAYER_DEFAULT = 0;
const LAYER_TECHNICAL = 1;

export interface RoomWallSegment {
  id: string;
  start: { x: number; z: number };
  end: { x: number; z: number };
  thickness: number;
  height: number;
  angle: number;
}

export function getRoomWallSegments(currentRoom: RoomSettings): RoomWallSegment[] {
  if (currentRoom.customWalls && currentRoom.customWalls.length > 0) {
    return currentRoom.customWalls.map((w, idx) => {
      const dx = w.end.x - w.start.x;
      const dz = w.end.y - w.start.y;
      const angle = Math.atan2(dz, dx);
      return {
        id: w.id || `w_${idx}`,
        start: { x: w.start.x, z: w.start.y },
        end: { x: w.end.x, z: w.end.y },
        thickness: w.thickness || WALL_THICKNESS,
        height: w.height || currentRoom.height || 2.6,
        angle: angle,
      };
    });
  }

  const hw = currentRoom.width / 2;
  const hd = currentRoom.depth / 2;
  const HALF_WALL = WALL_THICKNESS / 2;
  return [
    { id: 'back', start: { x: -hw, z: -hd - HALF_WALL }, end: { x: hw, z: -hd - HALF_WALL }, thickness: WALL_THICKNESS, height: currentRoom.height, angle: 0 },
    { id: 'front', start: { x: hw, z: hd + HALF_WALL }, end: { x: -hw, z: hd + HALF_WALL }, thickness: WALL_THICKNESS, height: currentRoom.height, angle: Math.PI },
    { id: 'left', start: { x: -hw - HALF_WALL, z: hd }, end: { x: -hw - HALF_WALL, z: -hd }, thickness: WALL_THICKNESS, height: currentRoom.height, angle: -Math.PI / 2 },
    { id: 'right', start: { x: hw + HALF_WALL, z: -hd }, end: { x: hw + HALF_WALL, z: hd }, thickness: WALL_THICKNESS, height: currentRoom.height, angle: Math.PI / 2 },
  ];
}

export interface WallProximityResult {
  segment: RoomWallSegment;
  closestPoint: { x: number; z: number };
  normal: { x: number; z: number };
  distanceToSurface: number;
  targetRotation: number;
}

export function findClosestWallSegment(
  px: number,
  pz: number,
  walls: RoomWallSegment[],
  roomCenter?: { x: number; z: number }
): WallProximityResult | null {
  if (!walls || walls.length === 0) return null;

  let bestResult: WallProximityResult | null = null;
  let minDistance = Infinity;

  const rcx = roomCenter?.x ?? 0;
  const rcz = roomCenter?.z ?? 0;

  for (const seg of walls) {
    const sx = seg.end.x - seg.start.x;
    const sz = seg.end.z - seg.start.z;
    const lenSq = sx * sx + sz * sz;
    if (lenSq < 0.00001) continue;

    const len = Math.sqrt(lenSq);
    const vx = px - seg.start.x;
    const vz = pz - seg.start.z;

    const u = Math.max(0, Math.min(1, (vx * sx + vz * sz) / lenSq));
    const cx = seg.start.x + u * sx;
    const cz = seg.start.z + u * sz;

    const dx = px - cx;
    const dz = pz - cz;
    const dist = Math.hypot(dx, dz);

    // True geometric perpendicular normal to the wall segment
    const perp1X = -sz / len;
    const perp1Z = sx / len;

    // Ensure normal always points towards the room interior
    let nx = perp1X;
    let nz = perp1Z;

    const dotCenter = (rcx - cx) * perp1X + (rcz - cz) * perp1Z;
    if (dotCenter < 0) {
      nx = -perp1X;
      nz = -perp1Z;
    }

    const distToSurface = Math.max(0, dist - seg.thickness / 2);

    if (distToSurface < minDistance) {
      minDistance = distToSurface;
      const targetRotation = Math.atan2(nx, nz);

      bestResult = {
        segment: seg,
        closestPoint: { x: cx, z: cz },
        normal: { x: nx, z: nz },
        distanceToSurface: distToSurface,
        targetRotation,
      };
    }
  }

  return bestResult;
}

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
  onRegisterPanoramaCapture,
  onRegisterCameraControl,
  gizmoEnabled = false,
  gizmoMode = 'translate',
  onDragStart,
  showProductPins = true,
  onOpenCart,
  isObjectLocked = false,
  showRaycastLine = false,
  onToggleRaycastLine,
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

  // Raycast visual helper refs
  const showRaycastLineRef = useRef(showRaycastLine);
  useEffect(() => {
    showRaycastLineRef.current = showRaycastLine;
    if (raycastHelperGroupRef.current) {
      raycastHelperGroupRef.current.visible = showRaycastLine;
    }
  }, [showRaycastLine]);

  const onToggleRaycastLineRef = useRef(onToggleRaycastLine);
  useEffect(() => {
    onToggleRaycastLineRef.current = onToggleRaycastLine;
  }, [onToggleRaycastLine]);

  const raycastHelperGroupRef = useRef<THREE.Group>(new THREE.Group());
  const raycastLineGeomRef = useRef<THREE.BufferGeometry | null>(null);
  const raycastBeamRef = useRef<THREE.Mesh | null>(null);
  const raycastMarkerRef = useRef<THREE.Mesh | null>(null);
  const raycastRingRef = useRef<THREE.Mesh | null>(null);
  const pointerPosRef = useRef<THREE.Vector2>(new THREE.Vector2(0, 0));

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

  // Strict First-Wall Raycaster: Finds only the first solid (non-transparent) vertical wall mesh hit in 3D
  const getFirstWallIntersection = useCallback((raycaster: THREE.Raycaster) => {
    if (!wallsGroupRef.current) return null;
    const wallIntersects = raycaster.intersectObjects(wallsGroupRef.current.children, true);
    if (!wallIntersects || wallIntersects.length === 0) return null;

    const isHitValidWall = (hit: THREE.Intersection, requireVerticalFace: boolean) => {
      // Must be a 3D Mesh (strictly ignore LineSegments edge wireframes, lines and helpers)
      if (!(hit.object as THREE.Mesh).isMesh) return false;
      if (!hit.face) return false;

      // Filter out door / window opening frames, glass, and hardware
      let cur: any = hit.object;
      while (cur && cur !== wallsGroupRef.current) {
        if (cur.userData?.isOpening) return false;
        cur = cur.parent;
      }

      // Find parent wallGroup
      let p: any = hit.object;
      while (p && !p.userData?.isWall && p.parent && p.parent !== wallsGroupRef.current) {
        p = p.parent;
      }
      if (!p?.userData?.isWall) return false;

      // 1. Direct material opacity check (transparent foreground walls have opacity 0.15)
      const mesh = hit.object as THREE.Mesh;
      if (mesh.material) {
        const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        if (mat.transparent && mat.opacity < 0.7) {
          return false;
        }
      }

      // 2. Wall group transparency flag
      if (isWallTransparent(p)) return false;

      // 3. Vertical face check: Filter out horizontal top/bottom box caps (where normal.y is near 1)
      if (requireVerticalFace) {
        const normalWorld = hit.face.normal.clone().applyQuaternion(hit.object.getWorldQuaternion(new THREE.Quaternion())).normalize();
        if (Math.abs(normalWorld.y) > 0.4) {
          return false; // Top or bottom cap of the wall box, not the vertical wall surface
        }
      }

      return true;
    };

    // Priority 1: First hit on a vertical solid wall face (where furniture hangs / aligns)
    const verticalHit = wallIntersects.find((hit) => isHitValidWall(hit, true));
    if (verticalHit) return verticalHit;

    // Priority 2: Any solid wall hit (e.g. if pointing directly at the top wall edge)
    const anySolidHit = wallIntersects.find((hit) => isHitValidWall(hit, false));
    return anySolidHit || null;
  }, [isWallTransparent]);

  const updateRaycastVisualLine = useCallback((pointerPos: THREE.Vector2) => {
    if (!showRaycastLineRef.current || !cameraRef.current || !raycastHelperGroupRef.current) {
      if (raycastHelperGroupRef.current) {
        raycastHelperGroupRef.current.visible = false;
      }
      return;
    }

    raycastHelperGroupRef.current.visible = true;
    const raycaster = raycasterRef.current;
    raycaster.setFromCamera(pointerPos, cameraRef.current);

    const firstHit = getFirstWallIntersection(raycaster);
    const camPos = cameraRef.current.position;

    const targetPoint = firstHit
      ? firstHit.point.clone()
      : raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(30));

    // Update 1px line
    const posAttr = raycastLineGeomRef.current?.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (posAttr) {
      posAttr.setXYZ(0, camPos.x, camPos.y, camPos.z);
      posAttr.setXYZ(1, targetPoint.x, targetPoint.y, targetPoint.z);
      posAttr.needsUpdate = true;
    }

    // Update 3D luminous cylinder beam
    if (raycastBeamRef.current) {
      const beam = raycastBeamRef.current;
      const distance = camPos.distanceTo(targetPoint);
      beam.position.copy(camPos);
      beam.lookAt(targetPoint);
      beam.scale.set(1, 1, distance);
      beam.visible = true;
    }

    if (firstHit) {
      if (raycastMarkerRef.current) {
        raycastMarkerRef.current.position.copy(firstHit.point);
        raycastMarkerRef.current.visible = true;
      }

      if (raycastRingRef.current) {
        raycastRingRef.current.position.copy(firstHit.point);
        if (firstHit.face) {
          const hitObj: THREE.Object3D = firstHit.object;
          const normalWorld = firstHit.face.normal.clone().applyQuaternion(hitObj.getWorldQuaternion(new THREE.Quaternion())).normalize();
          raycastRingRef.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normalWorld);
          raycastRingRef.current.position.addScaledVector(normalWorld, 0.008);
        }
        raycastRingRef.current.visible = true;
      }
    } else {
      if (raycastMarkerRef.current) raycastMarkerRef.current.visible = false;
      if (raycastRingRef.current) raycastRingRef.current.visible = false;
    }
  }, [getFirstWallIntersection]);

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
      const rectPrev = rectLightHelperRef.current?.visible ?? false;
      const gizmoPrev = transformControlsRef.current?.getHelper().visible ?? false;
      const raycastPrev = raycastHelperGroupRef.current?.visible ?? false;

      // Hide non-photorealistic guides
      if (gridHelperRef.current) gridHelperRef.current.visible = false;
      if (selectionHelperRef.current) selectionHelperRef.current.visible = false;
      if (rectLightHelperRef.current) rectLightHelperRef.current.visible = false;
      if (transformControlsRef.current) transformControlsRef.current.getHelper().visible = false;
      if (raycastHelperGroupRef.current) raycastHelperGroupRef.current.visible = false;

      // Render clean frame
      renderer.render(scene, camera);
      const dataUrl = renderer.domElement.toDataURL('image/jpeg', 0.95);

      // Restore guides
      if (gridHelperRef.current) gridHelperRef.current.visible = gridPrev;
      if (selectionHelperRef.current) selectionHelperRef.current.visible = selectPrev;
      if (rectLightHelperRef.current) rectLightHelperRef.current.visible = rectPrev;
      if (transformControlsRef.current) transformControlsRef.current.getHelper().visible = gizmoPrev;
      if (raycastHelperGroupRef.current) raycastHelperGroupRef.current.visible = raycastPrev;

      return dataUrl;
    };

    onRegisterCapture(captureSnapshot);
  }, [onRegisterCapture]);

  // Expose Equirectangular 360 Panorama Capture (4K / 2K)
  useEffect(() => {
    if (!onRegisterPanoramaCapture) return;

    const capturePanorama = (options: { eyeHeight?: number; width?: number; height?: number } = {}) => {
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      if (!renderer || !scene) return '';

      const width = options.width || 4096;
      const height = options.height || 2048;
      const eyeHeight = options.eyeHeight ?? 1.55;

      const gridPrev = gridHelperRef.current?.visible ?? false;
      const selectPrev = selectionHelperRef.current?.visible ?? false;
      const rectPrev = rectLightHelperRef.current?.visible ?? false;
      const gizmoPrev = transformControlsRef.current?.getHelper().visible ?? false;
      const raycastPrev = raycastHelperGroupRef.current?.visible ?? false;

      // Hide non-photorealistic guides
      if (gridHelperRef.current) gridHelperRef.current.visible = false;
      if (selectionHelperRef.current) selectionHelperRef.current.visible = false;
      if (rectLightHelperRef.current) rectLightHelperRef.current.visible = false;
      if (transformControlsRef.current) transformControlsRef.current.getHelper().visible = false;
      if (raycastHelperGroupRef.current) raycastHelperGroupRef.current.visible = false;

      // Make sure all walls are solid and visible for 360 interior view
      const wallsToRestore: { mat: any; transparent: boolean; opacity: number; depthWrite: boolean }[] = [];
      if (wallsGroupRef.current) {
        wallsGroupRef.current.children.forEach((wallGroup: any) => {
          wallGroup.traverse((child: any) => {
            if (child.isMesh && child.material && !child.userData?.isOpening) {
              const mats = Array.isArray(child.material) ? child.material : [child.material];
              mats.forEach((m: any) => {
                wallsToRestore.push({
                  mat: m,
                  transparent: m.transparent,
                  opacity: m.opacity,
                  depthWrite: m.depthWrite,
                });
                m.transparent = false;
                m.opacity = 1.0;
                m.depthWrite = true;
              });
            }
          });
        });
      }

      // Render 360 equirectangular image
      const dataUrl = captureEquirectangularPanorama(renderer, scene, {
        width,
        height,
        position: new THREE.Vector3(0, eyeHeight, 0),
        cubeSize: Math.min(width / 2, 2048),
        format: 'image/jpeg',
        quality: 0.95,
      });

      // Restore wall materials
      wallsToRestore.forEach((w) => {
        w.mat.transparent = w.transparent;
        w.mat.opacity = w.opacity;
        w.mat.depthWrite = w.depthWrite;
      });

      // Restore guides
      if (gridHelperRef.current) gridHelperRef.current.visible = gridPrev;
      if (selectionHelperRef.current) selectionHelperRef.current.visible = selectPrev;
      if (rectLightHelperRef.current) rectLightHelperRef.current.visible = rectPrev;
      if (transformControlsRef.current) transformControlsRef.current.getHelper().visible = gizmoPrev;

      return dataUrl;
    };

    onRegisterPanoramaCapture(capturePanorama);
  }, [onRegisterPanoramaCapture]);

  // Expose Real-Time Interactive Camera Controller (Zoom in/out, Orbit, Pan Y, Presets without jumping)
  useEffect(() => {
    if (!onRegisterCameraControl) return;

    const controller: CameraController = {
      zoom: (factor: number) => {
        const camera = cameraRef.current;
        const controls = controlsRef.current;
        if (!camera || !controls) return;

        const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
        const currentDistance = offset.length();
        const newDistance = currentDistance * factor;

        // Prevent zooming too close or too far
        if (newDistance < 0.3 && factor < 1) return;
        if (newDistance > 40 && factor > 1) return;

        offset.multiplyScalar(factor);
        camera.position.copy(controls.target).add(offset);
        controls.update();
      },

      orbit: (dTheta: number) => {
        const camera = cameraRef.current;
        const controls = controlsRef.current;
        if (!camera || !controls) return;

        const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), dTheta);
        camera.position.copy(controls.target).add(offset);
        camera.lookAt(controls.target);
        controls.update();
      },

      panY: (dY: number) => {
        const camera = cameraRef.current;
        const controls = controlsRef.current;
        if (!camera || !controls) return;

        camera.position.y = Math.max(0.2, camera.position.y + dY);
        controls.target.y = Math.max(0.1, controls.target.y + dY);
        controls.update();
      },

      setPreset: (type: 'iso' | 'top' | 'front') => {
        const camera = cameraRef.current;
        const controls = controlsRef.current;
        if (!camera || !controls) return;

        const currentRoom = roomRef.current;
        const targetY = currentRoom.height * 0.4;
        controls.target.set(0, targetY, 0);

        if (type === 'top') {
          const maxDim = Math.max(currentRoom.width, currentRoom.depth);
          camera.position.set(0, maxDim * 1.6, 0.01);
        } else if (type === 'front') {
          camera.position.set(0, 1.6, currentRoom.depth * 1.3);
        } else {
          // Iso 45° perspective
          const dist = Math.max(currentRoom.width, currentRoom.depth) * 1.1;
          camera.position.set(dist, dist * 0.8, dist);
        }
        camera.lookAt(controls.target);
        controls.update();
      },
    };

    onRegisterCameraControl(controller);
  }, [onRegisterCameraControl]);



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
    scene.background = new THREE.Color('#dbeafe'); // Soft bright daylight horizon for windows and doors

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

    // Raycast visual debug line helper group (Ctrl+Shift+L)
    const raycastGroup = raycastHelperGroupRef.current;
    raycastGroup.clear();
    raycastGroup.visible = showRaycastLineRef.current;

    const linePoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -10)];
    const lineGeom = new THREE.BufferGeometry().setFromPoints(linePoints);
    raycastLineGeomRef.current = lineGeom;

    const lineMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      linewidth: 3,
      transparent: true,
      opacity: 0.95,
      depthTest: false,
    });
    const rayLine = new THREE.Line(lineGeom, lineMat);
    rayLine.renderOrder = 9999;
    raycastGroup.add(rayLine);

    // 3D Luminous Cylinder Beam for visible 3D perspective
    const beamGeom = new THREE.CylinderGeometry(0.008, 0.008, 1, 12);
    beamGeom.translate(0, 0.5, 0);
    beamGeom.rotateX(Math.PI / 2);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.65,
      depthTest: false,
    });
    const beamMesh = new THREE.Mesh(beamGeom, beamMat);
    beamMesh.renderOrder = 9999;
    beamMesh.visible = false;
    raycastBeamRef.current = beamMesh;
    raycastGroup.add(beamMesh);

    const markerGeom = new THREE.SphereGeometry(0.045, 16, 16);
    const markerMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      depthTest: false,
      transparent: true,
      opacity: 0.95,
    });
    const marker = new THREE.Mesh(markerGeom, markerMat);
    marker.renderOrder = 10000;
    marker.visible = false;
    raycastMarkerRef.current = marker;
    raycastGroup.add(marker);

    const ringGeom = new THREE.RingGeometry(0.05, 0.085, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      depthTest: false,
      transparent: true,
      opacity: 0.85,
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.renderOrder = 10000;
    ring.visible = false;
    raycastRingRef.current = ring;
    raycastGroup.add(ring);

    scene.add(raycastGroup);

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

      // Dynamic raycast visual line update anchored to camera in real-time
      if (showRaycastLineRef.current) {
        updateRaycastVisualLine(pointerPosRef.current);
      }

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

    const hasCustomFloors = room.customFloors && room.customFloors.length > 0;
    if (hasCustomFloors) {
      floorGroupRef.current.clear();
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

      room.customFloors!.forEach((fl) => {
        if (!fl.points || fl.points.length < 3) return;
        const shape = new THREE.Shape();
        shape.moveTo(fl.points[0].x, -fl.points[0].y);
        for (let i = 1; i < fl.points.length; i++) {
          shape.lineTo(fl.points[i].x, -fl.points[i].y);
        }
        shape.closePath();

        const floorGeo = new THREE.ShapeGeometry(shape);
        const floorMesh = new THREE.Mesh(floorGeo, floorMat);
        floorMesh.rotation.x = -Math.PI / 2;
        floorMesh.position.y = 0.001;
        floorMesh.receiveShadow = true;
        floorMesh.userData = { isFloor: true, id: fl.id };
        floorGroupRef.current.add(floorMesh);
      });

      const maxDim = Math.max(room.width, room.depth);
      const outdoorGeo = new THREE.PlaneGeometry(maxDim + 50, maxDim + 50);
      const outdoorMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#cbd5e1'),
        roughness: 0.8,
        metalness: 0.05,
      });
      const outdoor = new THREE.Mesh(outdoorGeo, outdoorMat);
      outdoor.position.y = -0.005;
      outdoor.rotation.x = -Math.PI / 2;
      outdoor.receiveShadow = true;
      outdoorMeshRef.current = outdoor;
      floorGroupRef.current.add(outdoor);
      return;
    }

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
        color: new THREE.Color('#cbd5e1'), // Bright natural terrace stone
        roughness: 0.8,
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
    room.customFloors,
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

    const hasCustomWalls = room.customWalls && room.customWalls.length > 0;
    if (hasCustomWalls) {
      wallsGroupRef.current.clear();
      const wallConfig = room.walls.back || { color: '#f1f5f9', roughness: 0.85, metalness: 0.02 };
      const baseMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(wallConfig.color || '#f1f5f9'),
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
          baseMat.map = loadedTex;
          baseMat.needsUpdate = true;
        }
      );
      if (tex) {
        baseMat.map = tex;
      }

      const edgeMat = new THREE.LineBasicMaterial({ color: 0x94a3b8, linewidth: 1 });

      room.customWalls!.forEach((wall, idx) => {
        const dx = wall.end.x - wall.start.x;
        const dz = wall.end.y - wall.start.y;
        const len = Math.hypot(dx, dz);
        if (len < 0.01) return;

        const angle = Math.atan2(dz, dx);
        const centerX = (wall.start.x + wall.end.x) / 2;
        const centerZ = (wall.start.y + wall.end.y) / 2;
        const h = wall.height || room.height || 2.6;
        const t = wall.thickness || WALL_THICKNESS;

        const wallGeo = new THREE.BoxGeometry(len, h, t);
        const wallMat = baseMat.clone();
        const wallMesh = new THREE.Mesh(wallGeo, wallMat);
        wallMesh.position.set(0, h / 2, 0);
        wallMesh.castShadow = true;
        wallMesh.receiveShadow = true;
        wallMesh.userData = { isWall: true, type: 'wall' };

        const edgesGeo = new THREE.EdgesGeometry(wallGeo);
        const line = new THREE.LineSegments(edgesGeo, edgeMat);
        wallMesh.add(line);

        const wallGroup = new THREE.Group();
        wallGroup.position.set(centerX, 0, centerZ);
        wallGroup.rotation.y = -angle;
        wallGroup.userData = {
          isWall: true,
          wallId: wall.id || `w_${idx}`,
          w: len,
          h,
          thickness: t,
          wallAngle: -angle,
        };
        wallGroup.add(wallMesh);
        wallsGroupRef.current.add(wallGroup);
      });

      wallsGroupRef.current.updateMatrixWorld(true);
      return;
    }

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

    // Clean up any obsolete walls (e.g. custom walls w_0, w_1 from previous project)
    const validWallIds = new Set(['back', 'front', 'left', 'right']);
    const obsoleteWalls = wallsGroupRef.current.children.filter(
      (child) => !validWallIds.has(child.userData?.wallId)
    );
    if (obsoleteWalls.length > 0) {
      obsoleteWalls.forEach((w) => wallsGroupRef.current.remove(w));
      hasChanges = true;
    }

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

      // 3. Update selection box helper
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
      } else {
        if (selectionHelperRef.current) {
          sceneRef.current?.remove(selectionHelperRef.current);
          selectionHelperRef.current = null;
        }
      }
    };

    syncFurniture();

    return () => {
      active = false;
    };
  }, [furniture, selectedUid, selectedOpeningId, room.openings]);

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

          // Immediately update box helper on click
          if (selectionHelperRef.current) sceneRef.current?.remove(selectionHelperRef.current);
          furnitureGroupRef.current.updateMatrixWorld(true);
          top.updateWorldMatrix(true, true);
          const boxHelper = new THREE.BoxHelper(top, '#3b82f6');
          sceneRef.current?.add(boxHelper);
          selectionHelperRef.current = boxHelper;
        }
      } else {
        onSelectRef.current?.(null);
        onSelectOpeningRef.current?.(null);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!cameraRef.current) return;

      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      pointerPosRef.current.copy(mouse);

      // Always update real-time raycast visual line when active
      if (showRaycastLineRef.current) {
        updateRaycastVisualLine(mouse);
      }

      if (!isDragging) return;

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
          new THREE.Vector3(Math.max(0.1, currentW - 0.04), Math.max(0.1, itemH - 0.04), Math.max(0.1, currentD - 0.04))
        );
        for (const other of otherObjects) {
          const otherY = other.position.y || 0;
          const otherH = (other.userData.height || 0.8) * other.scale.y;
          const selfY = targetPos.y;
          const vertOverlap = Math.max(selfY, otherY) < Math.min(selfY + itemH, otherY + otherH) - 0.02;
          if (!vertOverlap) continue;

          const otherBox = new THREE.Box3().setFromObject(other);
          otherBox.min.addScalar(0.02);
          otherBox.max.subScalar(0.02);
          if (testBox.intersectsBox(otherBox)) return true;
        }
        return false;
      };

      if (isWallHangingItem) {
        const targetElevation = dragObject.userData.spec?.by ?? dragObject.position.y ?? 1.5;
        let targetWorldX = dragObject.position.x;
        let targetWorldZ = dragObject.position.z;
        let targetRot = dragObject.rotation.y;

        // A. Direct Raycast onto 3D Wall meshes (Strictly first wall hit)
        const hitWallObj = getFirstWallIntersection(raycaster);

        if (hitWallObj) {
          let wallGroup: any = hitWallObj.object;
          while (wallGroup && !wallGroup.userData?.isWall && wallGroup.parent) {
            wallGroup = wallGroup.parent;
          }

          if (wallGroup) {
            const wallW = wallGroup.userData.w || currentRoom.width;
            const wallT = wallGroup.userData.thickness || WALL_THICKNESS;
            const localHit = wallGroup.worldToLocal(hitWallObj.point.clone());
            const sideSign = localHit.z >= 0 ? 1 : -1;

            const cornerPadding = wallT + 0.02;
            const minLocalX = -wallW / 2 + itemW / 2 + cornerPadding;
            const maxLocalX = wallW / 2 - itemW / 2 - cornerPadding;
            let targetLocalX = minLocalX > maxLocalX ? 0 : Math.max(minLocalX, Math.min(maxLocalX, localHit.x));

            // Magnetic snap to neighbor wall units along this wall
            if (currentSnapOn) {
              otherObjects.forEach((other) => {
                const otherLocal = wallGroup.worldToLocal(other.position.clone());
                const isSimilarHeight = Math.abs(other.position.y - targetElevation) < 0.4;
                if (!isSimilarHeight) return;

                const oW = (other.userData.width || 0.8) * other.scale.x;
                const snapLeftToRight = Math.abs(targetLocalX - (otherLocal.x + oW / 2 + itemW / 2));
                const snapRightToLeft = Math.abs(targetLocalX - (otherLocal.x - oW / 2 - itemW / 2));

                if (snapLeftToRight < SNAP_THRESHOLD) {
                  targetLocalX = otherLocal.x + oW / 2 + itemW / 2;
                } else if (snapRightToLeft < SNAP_THRESHOLD) {
                  targetLocalX = otherLocal.x - oW / 2 - itemW / 2;
                }
              });
              targetLocalX = minLocalX > maxLocalX ? 0 : Math.max(minLocalX, Math.min(maxLocalX, targetLocalX));
            }

            const localPos = new THREE.Vector3(targetLocalX, targetElevation, sideSign * (itemD / 2 + wallT / 2 + 0.003));
            const worldPos = wallGroup.localToWorld(localPos);

            targetWorldX = worldPos.x;
            targetWorldZ = worldPos.z;
            targetRot = wallGroup.rotation.y + (sideSign < 0 ? Math.PI : 0);
          }
        } else {
          // B. Fallback: Raycast to horizontal plane and project onto closest wall segment
          plane.set(new THREE.Vector3(0, 1, 0), -targetElevation);
          if (raycaster.ray.intersectPlane(plane, intersection)) {
            const rawX = intersection.x;
            const rawZ = intersection.z;

            const wallSegments = getRoomWallSegments(currentRoom);
            const closest = findClosestWallSegment(rawX, rawZ, wallSegments);

            if (closest) {
              const seg = closest.segment;
              const sx = seg.end.x - seg.start.x;
              const sz = seg.end.z - seg.start.z;
              const segLen = Math.hypot(sx, sz);

              if (segLen > 0.01) {
                const wallT = seg.thickness || WALL_THICKNESS;
                const cornerPadding = wallT + 0.02;
                let u = ((rawX - seg.start.x) * sx + (rawZ - seg.start.z) * sz) / (segLen * segLen);
                const minU = (itemW / 2 + cornerPadding) / segLen;
                const maxU = 1 - (itemW / 2 + cornerPadding) / segLen;
                if (minU < maxU) {
                  u = Math.max(minU, Math.min(maxU, u));
                } else {
                  u = 0.5;
                }

                const cx = seg.start.x + u * sx;
                const cz = seg.start.z + u * sz;

                targetWorldX = cx + closest.normal.x * (itemD / 2 + wallT / 2 + 0.003);
                targetWorldZ = cz + closest.normal.z * (itemD / 2 + wallT / 2 + 0.003);
                targetRot = closest.targetRotation;
              }
            }
          }
        }

        const targetPos = new THREE.Vector3(targetWorldX, targetElevation, targetWorldZ);
        dragObject.position.copy(targetPos);
        dragObject.rotation.y = targetRot;
      } else {
        const targetBaseY = dragObject.userData.spec?.by ?? 0;
        let tx = dragObject.position.x;
        let tz = dragObject.position.z;
        let targetRot = dragObject.rotation.y;

        // Floor furniture positioning: intersects floor plane or wall surface
        plane.set(new THREE.Vector3(0, 1, 0), -targetBaseY);
        let hasHit = false;
        let rawX = tx;
        let rawZ = tz;

        if (raycaster.ray.intersectPlane(plane, intersection)) {
          // Check intersection is in front of camera
          const toHit = intersection.clone().sub(cameraRef.current.position);
          if (toHit.dot(raycaster.ray.direction) > 0) {
            rawX = intersection.x + offset.x;
            rawZ = intersection.z + offset.z;
            hasHit = true;
          }
        }

        if (!hasHit) {
          const hitWallObj = getFirstWallIntersection(raycaster);
          if (hitWallObj) {
            rawX = hitWallObj.point.x;
            rawZ = hitWallObj.point.z;
            hasHit = true;
          }
        }

        if (hasHit) {
          const wallSegments = getRoomWallSegments(currentRoom);
          const closestWall = findClosestWallSegment(rawX, rawZ, wallSegments);

          const ROT_ZONE = 1.35; // Generous zone to automatically orient towards nearest wall
          const SNAP_WALL_DISTANCE = itemD / 2 + 0.35; // Snap distance to wall surface
          tx = rawX;
          tz = rawZ;

          if (closestWall && closestWall.distanceToSurface <= ROT_ZONE) {
            targetRot = closestWall.targetRotation;

            if (currentSnapOn && closestWall.distanceToSurface <= SNAP_WALL_DISTANCE) {
              const seg = closestWall.segment;
              const sx = seg.end.x - seg.start.x;
              const sz = seg.end.z - seg.start.z;
              const segLen = Math.hypot(sx, sz);
              const wallT = seg.thickness || WALL_THICKNESS;
              const cornerPadding = wallT + 0.02;

              if (segLen > 0.01) {
                let u = ((rawX - seg.start.x) * sx + (rawZ - seg.start.z) * sz) / (segLen * segLen);
                const minU = (itemW / 2 + cornerPadding) / segLen;
                const maxU = 1 - (itemW / 2 + cornerPadding) / segLen;
                if (minU < maxU) {
                  u = Math.max(minU, Math.min(maxU, u));
                } else {
                  u = 0.5;
                }
                const cx = seg.start.x + u * sx;
                const cz = seg.start.z + u * sz;
                tx = cx + closestWall.normal.x * (itemD / 2 + wallT / 2 + 0.003);
                tz = cz + closestWall.normal.z * (itemD / 2 + wallT / 2 + 0.003);
              } else {
                tx = closestWall.closestPoint.x + closestWall.normal.x * (itemD / 2 + wallT / 2 + 0.003);
                tz = closestWall.closestPoint.z + closestWall.normal.z * (itemD / 2 + wallT / 2 + 0.003);
              }
            }
          }

          // Side-by-side snapping to neighboring floor objects
          if (currentSnapOn) {
            let { effW, effD } = getRotatedBounds(itemW, itemD, targetRot);
            otherObjects.forEach((other) => {
              const oW = (other.userData.width || 0.8) * other.scale.x;
              const oD = (other.userData.depth || 0.6) * other.scale.z;
              const { effW: oEffW, effD: oEffD } = getRotatedBounds(oW, oD, other.rotation.y);

              const sameElevation = Math.abs((dragObject?.position.y || 0) - (other.position.y || 0)) < 0.4;
              if (!sameElevation) return;

              // 1. Snapping along X
              if (Math.abs(tz - other.position.z) < SNAP_THRESHOLD + Math.abs(effD - oEffD) / 2) {
                const snapLeftToRight = Math.abs(tx - effW / 2 - (other.position.x + oEffW / 2));
                const snapRightToLeft = Math.abs(tx + effW / 2 - (other.position.x - oEffW / 2));
                if (snapLeftToRight < SNAP_THRESHOLD) {
                  tx = other.position.x + oEffW / 2 + effW / 2;
                  if (Math.abs(tz - other.position.z) < SNAP_THRESHOLD) tz = other.position.z;
                } else if (snapRightToLeft < SNAP_THRESHOLD) {
                  tx = other.position.x - oEffW / 2 - effW / 2;
                  if (Math.abs(tz - other.position.z) < SNAP_THRESHOLD) tz = other.position.z;
                }
              }

              // 2. Snapping along Z
              if (Math.abs(tx - other.position.x) < SNAP_THRESHOLD + Math.abs(effW - oEffW) / 2) {
                const snapBackToFront = Math.abs(tz - effD / 2 - (other.position.z + oEffD / 2));
                const snapFrontToBack = Math.abs(tz + effD / 2 - (other.position.z - oEffD / 2));
                if (snapBackToFront < SNAP_THRESHOLD) {
                  tz = other.position.z + oEffD / 2 + effD / 2;
                  if (Math.abs(tx - other.position.x) < SNAP_THRESHOLD) tx = other.position.x;
                } else if (snapFrontToBack < SNAP_THRESHOLD) {
                  tz = other.position.z - oEffD / 2 - effD / 2;
                  if (Math.abs(tx - other.position.x) < SNAP_THRESHOLD) tx = other.position.x;
                }
              }
            });
          }
        }

        // Exact bounding dimensions under current rotation
        let { effW, effD } = getRotatedBounds(itemW, itemD, targetRot);

        // Room clamping bounds (accounts for custom floorplan bounds with generous padding)
        let minX = -currentRoom.width / 2 + effW / 2;
        let maxX = currentRoom.width / 2 - effW / 2;
        let minZ = -currentRoom.depth / 2 + effD / 2;
        let maxZ = currentRoom.depth / 2 - effD / 2;

        if (currentRoom.customWalls && currentRoom.customWalls.length > 0) {
          const xs = currentRoom.customWalls.flatMap((w) => [w.start.x, w.end.x]);
          const zs = currentRoom.customWalls.flatMap((w) => [w.start.y, w.end.y]);
          minX = Math.min(...xs) - 4;
          maxX = Math.max(...xs) + 4;
          minZ = Math.min(...zs) - 4;
          maxZ = Math.max(...zs) + 4;
        } else if (currentRoom.customFloors && currentRoom.customFloors.length > 0) {
          const xs = currentRoom.customFloors.flatMap((f) => f.points.map((p) => p.x));
          const zs = currentRoom.customFloors.flatMap((f) => f.points.map((p) => p.y));
          minX = Math.min(...xs) - 4;
          maxX = Math.max(...xs) + 4;
          minZ = Math.min(...zs) - 4;
          maxZ = Math.max(...zs) + 4;
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
        } else {
          dragObject.position.x = tx;
          dragObject.position.z = tz;
          dragObject.position.y = targetBaseY;
          dragObject.rotation.y = targetRot;
        }
      }

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
        const validHit = getFirstWallIntersection(raycaster);

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
        const validHit = getFirstWallIntersection(raycaster);

        if (validHit) {
          let wall: any = validHit.object;
          while (wall && !wall.userData?.isWall && wall.parent) wall = wall.parent;
          const localHit = wall.worldToLocal(validHit.point.clone());
          const wallT = wall.userData?.thickness || WALL_THICKNESS;
          const wallW = wall.userData?.w || currentRoom.width;
          const sideSign = localHit.z >= 0 ? 1 : -1;
          const cornerPadding = wallT / 2 + 0.01;
          const minLocalX = -wallW / 2 + spec.w / 2 + cornerPadding;
          const maxLocalX = wallW / 2 - spec.w / 2 - cornerPadding;
          const targetLocalX = minLocalX > maxLocalX ? 0 : Math.max(minLocalX, Math.min(maxLocalX, localHit.x));
          const worldPos = wall.localToWorld(new THREE.Vector3(targetLocalX, localHit.y, sideSign * (spec.d / 2 + wallT / 2 + 0.002)));
          onDropFurnitureRef.current?.(spec, {
            x: worldPos.x,
            z: worldPos.z,
            by: worldPos.y,
            rot: wall.rotation.y + (sideSign < 0 ? Math.PI : 0),
          });
        } else {
          onDropFurnitureRef.current?.(spec, { x: 0, z: -currentRoom.depth / 2 + spec.d / 2, by: spec.by ?? 1.5, rot: 0 });
        }
      } else {
        if (raycaster.ray.intersectPlane(plane, intersection)) {
          const rawX = intersection.x;
          const rawZ = intersection.z;

          const wallSegments = getRoomWallSegments(currentRoom);
          const closestWall = findClosestWallSegment(rawX, rawZ, wallSegments);

          let rot = 0;
          let x = rawX;
          let z = rawZ;

          if (closestWall && closestWall.distanceToSurface <= 1.35) {
            rot = closestWall.targetRotation;
            if (currentSnapOn && closestWall.distanceToSurface <= spec.d / 2 + 0.35) {
              const seg = closestWall.segment;
              const sx = seg.end.x - seg.start.x;
              const sz = seg.end.z - seg.start.z;
              const segLen = Math.hypot(sx, sz);
              const wallT = seg.thickness || WALL_THICKNESS;
              const cornerPadding = wallT + 0.02;

              if (segLen > 0.01) {
                let u = ((rawX - seg.start.x) * sx + (rawZ - seg.start.z) * sz) / (segLen * segLen);
                const minU = (spec.w / 2 + cornerPadding) / segLen;
                const maxU = 1 - (spec.w / 2 + cornerPadding) / segLen;
                if (minU < maxU) {
                  u = Math.max(minU, Math.min(maxU, u));
                } else {
                  u = 0.5;
                }
                const cx = seg.start.x + u * sx;
                const cz = seg.start.z + u * sz;
                x = cx + closestWall.normal.x * (spec.d / 2 + wallT / 2 + 0.003);
                z = cz + closestWall.normal.z * (spec.d / 2 + wallT / 2 + 0.003);
              } else {
                x = closestWall.closestPoint.x + closestWall.normal.x * (spec.d / 2 + wallT / 2 + 0.003);
                z = closestWall.closestPoint.z + closestWall.normal.z * (spec.d / 2 + wallT / 2 + 0.003);
              }
            }
          }

          onDropFurnitureRef.current?.(spec, { x, z, by: spec.by ?? 0, rot });
        } else {
          onDropFurnitureRef.current?.(spec, { x: 0, z: 0, by: spec.by ?? 0, rot: 0 });
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Toggle Raycast Visual Line: Ctrl+Shift+L or Cmd+Shift+L
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        if (onToggleRaycastLineRef.current) {
          onToggleRaycastLineRef.current();
        } else {
          showRaycastLineRef.current = !showRaycastLineRef.current;
          if (raycastHelperGroupRef.current) {
            raycastHelperGroupRef.current.visible = showRaycastLineRef.current;
          }
          if (showRaycastLineRef.current) {
            updateRaycastVisualLine(pointerPosRef.current);
          }
        }
      }
    };

    container.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('drop', handleDrop);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      container.removeEventListener('dragover', handleDragOver);
      container.removeEventListener('drop', handleDrop);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
                      if (onOpenCart) onOpenCart(item.uid);
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
