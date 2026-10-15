'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import {
  Compass,
  Maximize,
  Minimize,
  Glasses,
  RotateCcw,
  Sparkles,
  Info,
  Tag,
  DoorOpen,
  ArrowUpCircle,
  Footprints,
  Eye,
  EyeOff,
  Edit3,
  Check,
  Copy,
  Plus,
  X,
  ChevronRight,
  ExternalLink,
  Layers,
  MapPin,
  Crosshair,
  Sliders,
  Trash2,
  Save,
  Download,
  UploadCloud,
  FolderOpen,
  RefreshCw,
  FileJson,
  AlertTriangle,
  Move
} from 'lucide-react';
import {
  INITIAL_TOUR_SCENES,
  VirtualTourScene,
  NavigationHotspot,
  ObjectAnnotation,
  SphericalPosition
} from '@/app/data/virtualTourData';

export interface TourSimulation {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  totalHotspots: number;
  totalAnnotations: number;
  scenes: Record<string, VirtualTourScene>;
}

// Helper: Convert spherical position to Cartesian coordinates on inverted equirectangular sphere
function sphericalToCartesian(pos: SphericalPosition, radius = 480): THREE.Vector3 {
  // If UV coordinates are provided, use exact sphere UV parametrization:
  // On THREE.SphereGeometry(R, 64, 48) with scale(-1, 1, 1):
  if (pos.u !== undefined && pos.v !== undefined) {
    const phi = pos.v * Math.PI;
    const theta = pos.u * 2 * Math.PI;
    return new THREE.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  // If only yaw & pitch are provided:
  // u = yaw / 360 + 0.5, v = 0.5 - pitch / 180
  const pitchRad = THREE.MathUtils.degToRad(pos.pitch);
  const yawRad = THREE.MathUtils.degToRad(pos.yaw);
  const phi = Math.PI / 2 - pitchRad;
  const theta = yawRad + Math.PI;

  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(pitchRad),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// Helper: Shortest angular distance to prevent 360-degree spins
function shortestAngleDiff(target: number, current: number): number {
  let diff = (target - current) % 360;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
}

interface VirtualTour360ViewerProps {
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

export default function VirtualTour360Viewer({ onFullscreenChange }: VirtualTour360ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Tour State
  const [scenes, setScenes] = useState<Record<string, VirtualTourScene>>(INITIAL_TOUR_SCENES);
  const [currentSceneId, setCurrentSceneId] = useState<string>('kitchen');
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [showAnnotations, setShowAnnotations] = useState<boolean>(true);
  const [isEditorMode, setIsEditorMode] = useState<boolean>(false);
  const [selectedAnnotation, setSelectedAnnotation] = useState<ObjectAnnotation | null>(null);
  const [hoveredHotspot, setHoveredHotspot] = useState<NavigationHotspot | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isGyroActive, setIsGyroActive] = useState<boolean>(false);
  const [isAutoRotate, setIsAutoRotate] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // Editor Modal State
  const [editorModalOpen, setEditorModalOpen] = useState<boolean>(false);
  const [editorPoint, setEditorPoint] = useState<{
    yaw: number;
    pitch: number;
    u: number;
    v: number;
  } | null>(null);
  const [editorItemType, setEditorItemType] = useState<'hotspot' | 'annotation'>('hotspot');
  const [editorFormData, setEditorFormData] = useState({
    targetSceneId: 'living_room',
    label: '',
    icon: 'door' as 'door' | 'arrow' | 'stairs' | 'sparkles',
    title: '',
    category: 'Mobiliário',
    description: '',
    price: '',
  });

  // Simulations & Local Storage State
  const [simulations, setSimulations] = useState<TourSimulation[]>([]);
  const [simulationsModalOpen, setSimulationsModalOpen] = useState<boolean>(false);
  const [simulationsTab, setSimulationsTab] = useState<'simulations' | 'scene_points' | 'import_export'>('simulations');
  const [newSimName, setNewSimName] = useState<string>('');
  const [importJsonText, setImportJsonText] = useState<string>('');

  // 3D Hotspot & Annotation Interactive Dragging State
  const [draggingItem, setDraggingItem] = useState<{ id: string; type: 'hotspot' | 'annotation' } | null>(null);
  const dragStateRef = useRef<{ id: string; type: 'hotspot' | 'annotation'; isDragging: boolean } | null>(null);
  const wasJustDraggingRef = useRef<boolean>(false);

  // Current Scene Data
  const currentScene = useMemo(() => scenes[currentSceneId] || scenes.kitchen, [scenes, currentSceneId]);

  // Active Scene & UI State Refs (to avoid stale closures inside the Three.js animate loop!)
  const currentSceneRef = useRef(currentScene);
  currentSceneRef.current = currentScene;

  const showAnnotationsRef = useRef(showAnnotations);
  showAnnotationsRef.current = showAnnotations;

  const isAutoRotateRef = useRef(isAutoRotate);
  isAutoRotateRef.current = isAutoRotate;

  // DOM Refs for 60 FPS transform updating without React re-renders
  const hotspotDomRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const annotationDomRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Three.js References
  const threeRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    sphere1: THREE.Mesh;
    sphere2: THREE.Mesh;
    mat1: THREE.MeshBasicMaterial;
    mat2: THREE.MeshBasicMaterial;
    textureLoader: THREE.TextureLoader;
    textureCache: Map<string, THREE.Texture>;
    animationId?: number;
    lon: number;
    lat: number;
    targetLon: number;
    targetLat: number;
    targetFov: number;
    isUserInteracting: boolean;
    pointerDownX: number;
    pointerDownY: number;
    pointerDownLon: number;
    pointerDownLat: number;
    deviceOrientation?: {
      alpha: number;
      beta: number;
      gamma: number;
      orient: number;
    };
  } | null>(null);

  // Toast Notification
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  }, []);

  // Helper: Texture Loader with cache and SRGB space
  const getOrLoadTexture = useCallback((url: string, onLoaded?: (tex: THREE.Texture) => void): THREE.Texture | null => {
    if (!threeRef.current) return null;
    const { textureCache, textureLoader } = threeRef.current;

    if (textureCache.has(url)) {
      const cached = textureCache.get(url)!;
      if (onLoaded) onLoaded(cached);
      return cached;
    }

    const texture = textureLoader.load(
      url,
      (loaded) => {
        loaded.minFilter = THREE.LinearFilter;
        loaded.magFilter = THREE.LinearFilter;
        loaded.colorSpace = THREE.SRGBColorSpace;
        textureCache.set(url, loaded);
        if (onLoaded) onLoaded(loaded);
      },
      undefined,
      (err) => {
        console.error('Erro ao carregar panorama:', url, err);
        showToast('Erro ao carregar textura 360.');
      }
    );
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, [showToast]);

  // Transition to a Scene (Dual-Sphere Crossfade + Dolly Zoom)
  const transitionToScene = useCallback(
    (targetSceneId: string, targetEntryView?: { yaw: number; pitch: number; fov?: number }) => {
      const state = threeRef.current;
      if (!state || isTransitioning) return;

      const nextScene = scenes[targetSceneId];
      if (!nextScene) return;

      setIsTransitioning(true);
      setSelectedAnnotation(null);

      // 1. Preload target texture onto Sphere 2
      getOrLoadTexture(nextScene.panoramaUrl, (loadedTex) => {
        state.mat2.map = loadedTex;
        state.mat2.needsUpdate = true;

        // 2. Animate: Dolly Zoom (FOV reduction) + Crossfade (mat2.opacity 0 -> 1)
        const duration = 750; // ms
        const startTime = performance.now();
        const startFov = state.camera.fov;
        const targetZoomFov = 46; // Dolly zoom walk-in effect

        const step = (now: number) => {
          const elapsed = now - startTime;
          const progress = Math.min(1, elapsed / duration);
          // Ease-in-out curve
          const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

          // Dolly zoom and opacity interpolation
          state.camera.fov = startFov + (targetZoomFov - startFov) * ease;
          state.camera.updateProjectionMatrix();
          state.mat2.opacity = ease;

          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            // 3. Swap: Assign next texture to Sphere 1, reset Sphere 2
            state.mat1.map = loadedTex;
            state.mat1.needsUpdate = true;
            state.mat2.opacity = 0;

            // Restore FOV smoothly
            state.camera.fov = targetEntryView?.fov ?? nextScene.initialView.fov ?? 75;
            state.targetFov = state.camera.fov;
            state.camera.updateProjectionMatrix();

            // Orient camera to entry view
            const destYaw = targetEntryView?.yaw ?? nextScene.initialView.yaw;
            const destPitch = targetEntryView?.pitch ?? nextScene.initialView.pitch;
            state.lon = destYaw;
            state.lat = destPitch;
            state.targetLon = destYaw;
            state.targetLat = destPitch;

            setCurrentSceneId(targetSceneId);
            setIsTransitioning(false);
            showToast(`Ambiente: ${nextScene.title}`);
          }
        };

        requestAnimationFrame(step);
      });
    },
    [isTransitioning, scenes, getOrLoadTexture, showToast]
  );

  // Smoothly Center Camera on Object Annotation
  const focusOnAnnotation = useCallback((annotation: ObjectAnnotation) => {
    const state = threeRef.current;
    if (!state) return;

    setSelectedAnnotation(annotation);
    const targetLon = annotation.position.yaw;
    const targetLat = annotation.position.pitch;

    const startLon = state.lon;
    const startLat = state.lat;
    const diffLon = shortestAngleDiff(targetLon, startLon);
    const diffLat = targetLat - startLat;

    const duration = 600;
    const startTime = performance.now();

    const tween = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = progress * (2 - progress); // ease-out

      state.lon = startLon + diffLon * ease;
      state.lat = startLat + diffLat * ease;

      if (progress < 1) {
        requestAnimationFrame(tween);
      }
    };

    requestAnimationFrame(tween);
  }, []);

  // Initialize Three.js WebGL Scene
  useEffect(() => {
    if (!canvasMountRef.current) return;
    const mount = canvasMountRef.current;
    const width = mount.clientWidth || 800;
    const height = mount.clientHeight || 600;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 1, 1100);
    const cameraTarget = new THREE.Vector3(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.xr.enabled = true;
    mount.appendChild(renderer.domElement);

    // Placeholder generator canvas
    const createPlaceholderCanvas = (title: string) => {
      const c = document.createElement('canvas');
      c.width = 1024;
      c.height = 512;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, 1024, 512);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 40px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('iCanvas Tour 360', 512, 230);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '24px sans-serif';
        ctx.fillText(`Carregando: ${title}...`, 512, 280);
      }
      return c;
    };

    // Sphere 1 (Base Layer - Current Scene)
    const geo1 = new THREE.SphereGeometry(500, 64, 48);
    geo1.scale(-1, 1, 1);
    const tex1 = new THREE.CanvasTexture(createPlaceholderCanvas(currentScene.title));
    const mat1 = new THREE.MeshBasicMaterial({ map: tex1, transparent: false, opacity: 1 });
    const sphere1 = new THREE.Mesh(geo1, mat1);
    scene.add(sphere1);

    // Sphere 2 (Transition Layer - Next Scene)
    const geo2 = new THREE.SphereGeometry(499, 64, 48);
    geo2.scale(-1, 1, 1);
    const tex2 = new THREE.CanvasTexture(createPlaceholderCanvas('Carregando transição...'));
    const mat2 = new THREE.MeshBasicMaterial({
      map: tex2,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const sphere2 = new THREE.Mesh(geo2, mat2);
    scene.add(sphere2);

    const textureLoader = new THREE.TextureLoader();
    const textureCache = new Map<string, THREE.Texture>();

    // Initial angles from scene
    const initialYaw = currentScene.initialView.yaw;
    const initialPitch = currentScene.initialView.pitch;
    const initialFov = currentScene.initialView.fov ?? 75;
    camera.fov = initialFov;
    camera.updateProjectionMatrix();

    threeRef.current = {
      scene,
      camera,
      renderer,
      sphere1,
      sphere2,
      mat1,
      mat2,
      textureLoader,
      textureCache,
      lon: initialYaw,
      lat: initialPitch,
      targetLon: initialYaw,
      targetLat: initialPitch,
      targetFov: initialFov,
      isUserInteracting: false,
      pointerDownX: 0,
      pointerDownY: 0,
      pointerDownLon: 0,
      pointerDownLat: 0,
    };

    // Load initial scene texture
    textureLoader.load(currentScene.panoramaUrl, (loaded) => {
      loaded.minFilter = THREE.LinearFilter;
      loaded.magFilter = THREE.LinearFilter;
      loaded.colorSpace = THREE.SRGBColorSpace;
      textureCache.set(currentScene.panoramaUrl, loaded);
      mat1.map = loaded;
      mat1.needsUpdate = true;
    });

    // Pointer Interaction (Mouse & Touch)
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const state = threeRef.current;
      if (!state) return;
      if (dragStateRef.current?.isDragging) return;
      state.isUserInteracting = true;

      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

      state.pointerDownX = clientX;
      state.pointerDownY = clientY;
      state.pointerDownLon = state.lon;
      state.pointerDownLat = state.lat;
    };

    const onPointerMove = (event: MouseEvent | TouchEvent) => {
      const state = threeRef.current;
      if (!state || !state.isUserInteracting) return;

      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

      state.lon = (state.pointerDownX - clientX) * 0.12 + state.pointerDownLon;
      state.lat = (clientY - state.pointerDownY) * 0.12 + state.pointerDownLat;
    };

    const onPointerUp = () => {
      if (threeRef.current) {
        threeRef.current.isUserInteracting = false;
      }
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (!threeRef.current) return;
      threeRef.current.targetFov = Math.max(30, Math.min(95, threeRef.current.targetFov + event.deltaY * 0.05));
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousedown', onPointerDown);
    domElement.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    domElement.addEventListener('touchstart', onPointerDown, { passive: true });
    domElement.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);

    domElement.addEventListener('wheel', onWheel, { passive: false });

    // Handle Window Resize
    const handleResize = () => {
      if (!mount || !threeRef.current) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(mount);
    window.addEventListener('resize', handleResize);

    // Orientation Math Helpers
    const zee = new THREE.Vector3(0, 0, 1);
    const euler = new THREE.Euler();
    const q0 = new THREE.Quaternion();
    const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));

    const setOrientationQuaternion = (quaternion: THREE.Quaternion, alpha: number, beta: number, gamma: number, orient: number) => {
      euler.set(beta, alpha, -gamma, 'YXZ');
      quaternion.setFromEuler(euler);
      quaternion.multiply(q1);
      quaternion.multiply(q0.setFromAxisAngle(zee, -orient));
    };

    // Render Animation Loop (with 60 FPS DOM Projections)
    const animate = () => {
      const state = threeRef.current;
      if (!state) return;
      state.animationId = requestAnimationFrame(animate);

      // Smooth FOV zoom interpolation
      if (Math.abs(camera.fov - state.targetFov) > 0.05) {
        camera.fov += (state.targetFov - camera.fov) * 0.1;
        camera.updateProjectionMatrix();
      }

      // Gyroscope Control
      if (state.deviceOrientation) {
        const { alpha, beta, gamma, orient } = state.deviceOrientation;
        setOrientationQuaternion(camera.quaternion, alpha, beta, gamma, orient);
      } else {
        // Idle Auto-rotation
        if (!state.isUserInteracting && isAutoRotate) {
          state.lon += 0.04;
        }

        // Clamp latitude and compute camera target
        state.lat = Math.max(-85, Math.min(85, state.lat));
        const pitchRad = THREE.MathUtils.degToRad(state.lat);
        const yawRad = THREE.MathUtils.degToRad(state.lon);
        const phi = Math.PI / 2 - pitchRad;
        const theta = yawRad + Math.PI;

        cameraTarget.x = 500 * Math.sin(phi) * Math.cos(theta);
        cameraTarget.y = 500 * Math.sin(pitchRad);
        cameraTarget.z = 500 * Math.sin(phi) * Math.sin(theta);
        camera.lookAt(cameraTarget);
      }

      renderer.render(scene, camera);

      // -------------------------------------------------------------
      // High Performance DOM Projection: Hotspots & Annotations
      // Direct ref transform update without triggering React re-renders!
      // -------------------------------------------------------------
      const mountW = mount.clientWidth;
      const mountH = mount.clientHeight;
      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);

      const activeScene = currentSceneRef.current;
      const shouldShowAnnotations = showAnnotationsRef.current;

      // Project Hotspots
      if (activeScene?.navigationHotspots) {
        activeScene.navigationHotspots.forEach((hs) => {
          const el = hotspotDomRefs.current[hs.id];
          if (!el) return;

          const worldPos = sphericalToCartesian(hs.position, hs.position.distance || 480);
          const dot = camDir.dot(worldPos.clone().normalize());

          if (dot > 0.05) {
            const projected = worldPos.clone().project(camera);
            const screenX = ((projected.x + 1) * mountW) / 2;
            const screenY = ((-projected.y + 1) * mountH) / 2;
            el.style.transform = `translate3d(${screenX}px, ${screenY}px, 0) translate(-50%, -50%)`;
            el.style.opacity = '1';
            el.style.display = 'flex';
            el.style.pointerEvents = 'auto';
          } else {
            el.style.opacity = '0';
            el.style.display = 'none';
            el.style.pointerEvents = 'none';
          }
        });
      }

      // Project Object Annotations
      if (activeScene?.objectAnnotations) {
        activeScene.objectAnnotations.forEach((obj) => {
          const el = annotationDomRefs.current[obj.id];
          if (!el) return;

          if (!shouldShowAnnotations) {
            el.style.opacity = '0';
            el.style.display = 'none';
            el.style.pointerEvents = 'none';
            return;
          }

          const worldPos = sphericalToCartesian(obj.position, obj.position.distance || 480);
          const dot = camDir.dot(worldPos.clone().normalize());

          if (dot > 0.05) {
            const projected = worldPos.clone().project(camera);
            const screenX = ((projected.x + 1) * mountW) / 2;
            const screenY = ((-projected.y + 1) * mountH) / 2;
            el.style.transform = `translate3d(${screenX}px, ${screenY}px, 0) translate(-50%, -50%)`;
            el.style.opacity = '1';
            el.style.display = 'flex';
            el.style.pointerEvents = 'auto';
          } else {
            el.style.opacity = '0';
            el.style.display = 'none';
            el.style.pointerEvents = 'none';
          }
        });
      }
    };

    animate();

    return () => {
      if (threeRef.current?.animationId) {
        cancelAnimationFrame(threeRef.current.animationId);
      }
      domElement.removeEventListener('mousedown', onPointerDown);
      domElement.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      domElement.removeEventListener('touchstart', onPointerDown);
      domElement.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
      domElement.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();

      // Dispose resources
      geo1.dispose();
      geo2.dispose();
      mat1.dispose();
      mat2.dispose();
      textureCache.forEach((t) => t.dispose());
      renderer.dispose();
      if (mount.contains(domElement)) {
        mount.removeChild(domElement);
      }
      threeRef.current = null;
    };
  }, []);

  // Raycasting for Editor Mode (Clicking 3D Sphere to capture Yaw, Pitch, U, V)
  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditorMode || !threeRef.current || !canvasMountRef.current) return;
    if (dragStateRef.current?.isDragging || wasJustDraggingRef.current) return;

    const state = threeRef.current;
    // Check if user was dragging or just clicking
    const dx = Math.abs(event.clientX - state.pointerDownX);
    const dy = Math.abs(event.clientY - state.pointerDownY);
    if (dx > 5 || dy > 5) return;

    const rect = canvasMountRef.current.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, state.camera);
    const intersects = raycaster.intersectObject(state.sphere1);

    if (intersects.length > 0) {
      const hit = intersects[0];
      if (hit.uv) {
        const u = parseFloat(hit.uv.x.toFixed(3));
        const v = parseFloat((1 - hit.uv.y).toFixed(3));
        const yaw = parseFloat(((hit.uv.x - 0.5) * 360).toFixed(1));
        const pitch = parseFloat(((0.5 - v) * 180).toFixed(1));

        setEditorPoint({ yaw, pitch, u, v });
        setEditorFormData({
          targetSceneId: Object.keys(scenes).find((id) => id !== currentSceneId) || 'living_room',
          label: '',
          icon: 'door',
          title: '',
          category: 'Mobiliário',
          description: '',
          price: '',
        });
        setEditorModalOpen(true);
      }
    }
  };

  // Synchronized Scene Updater with LocalStorage persistence
  const updateScenes = useCallback(
    (newScenes: Record<string, VirtualTourScene> | ((prev: Record<string, VirtualTourScene>) => Record<string, VirtualTourScene>)) => {
      setScenes((prev) => {
        const next = typeof newScenes === 'function' ? newScenes(prev) : newScenes;
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('icanvas_active_tour_draft_v5', JSON.stringify(next));
          }
        } catch (e) {
          console.warn('Erro ao salvar no localStorage:', e);
        }
        return next;
      });
    },
    []
  );

  // Load saved simulations and active draft from localStorage on mount
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const savedSimsStr = localStorage.getItem('icanvas_tour_simulations');
        if (savedSimsStr) {
          setSimulations(JSON.parse(savedSimsStr));
        }
        const activeDraftStr = localStorage.getItem('icanvas_active_tour_draft_v5');
        if (activeDraftStr) {
          const parsed = JSON.parse(activeDraftStr);
          if (parsed && typeof parsed === 'object' && parsed.kitchen) {
            setScenes(parsed);
          }
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar dados do localStorage:', e);
    }
  }, []);

  // Delete individual hotspot
  const handleDeleteHotspot = useCallback(
    (hotspotId: string) => {
      updateScenes((prev) => {
        const active = { ...prev[currentSceneId] };
        active.navigationHotspots = active.navigationHotspots.filter((h) => h.id !== hotspotId);
        return { ...prev, [currentSceneId]: active };
      });
      showToast('Portal de navegação excluído.');
    },
    [currentSceneId, updateScenes, showToast]
  );

  // Delete individual annotation
  const handleDeleteAnnotation = useCallback(
    (annotationId: string) => {
      updateScenes((prev) => {
        const active = { ...prev[currentSceneId] };
        active.objectAnnotations = active.objectAnnotations.filter((a) => a.id !== annotationId);
        return { ...prev, [currentSceneId]: active };
      });
      setSelectedAnnotation((curr) => (curr?.id === annotationId ? null : curr));
      showToast('Anotação de objeto excluída.');
    },
    [currentSceneId, updateScenes, showToast]
  );

  // -------------------------------------------------------------
  // 3D Spherical Dragging Handlers (Interactive Repositioning)
  // -------------------------------------------------------------
  const handleStartDrag = useCallback(
    (e: React.PointerEvent, id: string, type: 'hotspot' | 'annotation') => {
      e.stopPropagation();
      e.preventDefault();

      if (threeRef.current) {
        threeRef.current.isUserInteracting = false;
      }

      dragStateRef.current = { id, type, isDragging: true };
      setDraggingItem({ id, type });
    },
    []
  );

  const onDragPointerMove = useCallback(
    (event: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag || !drag.isDragging || !threeRef.current || !canvasMountRef.current) return;

      const rect = canvasMountRef.current.getBoundingClientRect();
      const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), threeRef.current.camera);

      const intersects = raycaster.intersectObject(threeRef.current.sphere1);
      if (intersects.length > 0 && intersects[0].uv) {
        const uv = intersects[0].uv;
        const u = parseFloat(uv.x.toFixed(3));
        const v = parseFloat((1 - uv.y).toFixed(3));
        const yaw = parseFloat(((uv.x - 0.5) * 360).toFixed(1));
        const pitch = parseFloat(((0.5 - v) * 180).toFixed(1));

        const newPos: SphericalPosition = {
          u,
          v,
          yaw,
          pitch,
          distance: 480,
        };

        setScenes((prev) => {
          const active = { ...prev[currentSceneId] };
          if (drag.type === 'hotspot') {
            active.navigationHotspots = active.navigationHotspots.map((h) =>
              h.id === drag.id ? { ...h, position: newPos } : h
            );
          } else {
            active.objectAnnotations = active.objectAnnotations.map((a) =>
              a.id === drag.id ? { ...a, position: newPos } : a
            );
          }
          return { ...prev, [currentSceneId]: active };
        });
      }
    },
    [currentSceneId]
  );

  const onDragPointerUp = useCallback(() => {
    if (dragStateRef.current?.isDragging) {
      wasJustDraggingRef.current = true;
      setTimeout(() => {
        wasJustDraggingRef.current = false;
      }, 200);

      dragStateRef.current = null;
      setDraggingItem(null);

      // Persist to localStorage draft
      try {
        if (typeof window !== 'undefined') {
          setScenes((latest) => {
            localStorage.setItem('icanvas_active_tour_draft_v5', JSON.stringify(latest));
            return latest;
          });
        }
      } catch (e) {
        console.warn('Erro ao salvar nova posição no localStorage:', e);
      }

      showToast('Posição 3D atualizada e salva!');
    }
  }, [showToast]);

  // Window pointer listeners for smooth 3D dragging
  useEffect(() => {
    const handleMove = (e: PointerEvent) => onDragPointerMove(e);
    const handleUp = () => onDragPointerUp();

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [onDragPointerMove, onDragPointerUp]);

  // Clear all points of current scene
  const handleClearCurrentScenePoints = useCallback(() => {
    if (!window.confirm(`Deseja realmente limpar todos os portais e objetos da cena "${currentScene.title}"?`)) {
      return;
    }
    updateScenes((prev) => {
      const active = { ...prev[currentSceneId] };
      active.navigationHotspots = [];
      active.objectAnnotations = [];
      return { ...prev, [currentSceneId]: active };
    });
    setSelectedAnnotation(null);
    showToast(`Pontos da cena "${currentScene.title}" foram limpos.`);
  }, [currentScene.title, currentSceneId, updateScenes, showToast]);

  // Clear all points of the entire tour (all 6 scenes)
  const handleClearEntireTourPoints = useCallback(() => {
    if (!window.confirm('ATENÇÃO: Deseja apagar todos os portais e objetos de TODOS os 6 cômodos para começar o mapeamento do zero?')) {
      return;
    }
    updateScenes((prev) => {
      const next: Record<string, VirtualTourScene> = {};
      Object.keys(prev).forEach((key) => {
        next[key] = {
          ...prev[key],
          navigationHotspots: [],
          objectAnnotations: [],
        };
      });
      return next;
    });
    setSelectedAnnotation(null);
    showToast('Todos os pontos do passeio foram apagados. Pronto para novo mapeamento!');
  }, [updateScenes, showToast]);

  // Reset tour to original factory settings
  const handleResetToInitialTour = useCallback(() => {
    if (!window.confirm('Deseja restaurar as configurações e pontos originais de fábrica do Passeio Virtual?')) {
      return;
    }
    updateScenes(INITIAL_TOUR_SCENES);
    setSelectedAnnotation(null);
    showToast('Passeio restaurado para o padrão original!');
  }, [updateScenes, showToast]);

  // Save current simulation to list
  const handleSaveSimulation = useCallback(
    (customName?: string) => {
      const totalH = Object.values(scenes).reduce((acc, s) => acc + s.navigationHotspots.length, 0);
      const totalA = Object.values(scenes).reduce((acc, s) => acc + s.objectAnnotations.length, 0);
      const name =
        (customName || newSimName).trim() ||
        `Simulação ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

      const newSim: TourSimulation = {
        id: `sim_${Date.now()}`,
        name,
        createdAt: new Date().toLocaleString('pt-BR'),
        updatedAt: new Date().toLocaleString('pt-BR'),
        totalHotspots: totalH,
        totalAnnotations: totalA,
        scenes,
      };

      const nextSims = [newSim, ...simulations];
      setSimulations(nextSims);
      try {
        localStorage.setItem('icanvas_tour_simulations', JSON.stringify(nextSims));
      } catch (e) {
        console.warn('Erro ao salvar no localStorage:', e);
      }
      setNewSimName('');
      showToast(`Simulação "${name}" salva no LocalStorage!`);
    },
    [scenes, newSimName, simulations, showToast]
  );

  // Load a saved simulation
  const handleLoadSimulation = useCallback(
    (sim: TourSimulation) => {
      updateScenes(sim.scenes);
      setSelectedAnnotation(null);
      showToast(`Simulação "${sim.name}" carregada!`);
    },
    [updateScenes, showToast]
  );

  // Delete a simulation from list
  const handleDeleteSimulation = useCallback(
    (simId: string) => {
      const nextSims = simulations.filter((s) => s.id !== simId);
      setSimulations(nextSims);
      try {
        localStorage.setItem('icanvas_tour_simulations', JSON.stringify(nextSims));
      } catch (e) {
        console.warn('Erro ao atualizar localStorage:', e);
      }
      showToast('Simulação removida da lista local.');
    },
    [simulations, showToast]
  );

  // Download complete JSON file
  const handleDownloadJSON = useCallback(() => {
    const jsonStr = JSON.stringify(scenes, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tour360_simulacao_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Download do arquivo JSON iniciado!');
  }, [scenes, showToast]);

  // Import JSON code
  const handleImportJSON = useCallback(() => {
    try {
      const parsed = JSON.parse(importJsonText);
      if (typeof parsed !== 'object' || !parsed.kitchen) {
        showToast('JSON inválido ou formato incompatível.');
        return;
      }
      updateScenes(parsed);
      setImportJsonText('');
      setSimulationsModalOpen(false);
      showToast('Passeio importado e aplicado com sucesso!');
    } catch (e) {
      showToast('Erro de sintaxe no JSON colado.');
    }
  }, [importJsonText, updateScenes, showToast]);

  // Add Item in Editor Mode
  const handleSaveEditorItem = () => {
    if (!editorPoint) return;

    const position: SphericalPosition = {
      yaw: editorPoint.yaw,
      pitch: editorPoint.pitch,
      u: editorPoint.u,
      v: editorPoint.v,
      distance: 480,
    };

    updateScenes((prev) => {
      const activeScene = { ...prev[currentSceneId] };

      if (editorItemType === 'hotspot') {
        const newHotspot: NavigationHotspot = {
          id: `hs_${Date.now()}`,
          targetSceneId: editorFormData.targetSceneId,
          label: editorFormData.label || `Ir para ${scenes[editorFormData.targetSceneId]?.title || 'Ambiente'}`,
          icon: editorFormData.icon,
          position,
        };
        activeScene.navigationHotspots = [...activeScene.navigationHotspots, newHotspot];
        showToast('Novo portal de navegação criado com sucesso!');
      } else {
        const newAnnotation: ObjectAnnotation = {
          id: `obj_${Date.now()}`,
          title: editorFormData.title || 'Novo Objeto Interativo',
          category: editorFormData.category || 'Mobiliário',
          description: editorFormData.description || 'Descrição detalhada do elemento.',
          price: editorFormData.price || undefined,
          position,
        };
        activeScene.objectAnnotations = [...activeScene.objectAnnotations, newAnnotation];
        showToast('Nova anotação de objeto adicionada!');
      }

      return {
        ...prev,
        [currentSceneId]: activeScene,
      };
    });

    setEditorModalOpen(false);
    setEditorPoint(null);
  };

  // Copy Updated Tour JSON to Clipboard
  const handleCopyTourJSON = () => {
    const jsonStr = JSON.stringify(scenes, null, 2);
    navigator.clipboard.writeText(jsonStr).then(() => {
      setCopySuccess(true);
      showToast('Código JSON do Tour copiado para a área de transferência!');
      setTimeout(() => setCopySuccess(false), 3000);
    });
  };

  // Reset Camera View
  const handleResetCamera = useCallback(() => {
    if (!threeRef.current) return;
    const initial = currentScene.initialView;
    threeRef.current.lon = initial.yaw;
    threeRef.current.lat = initial.pitch;
    threeRef.current.targetFov = initial.fov ?? 75;
    threeRef.current.camera.fov = initial.fov ?? 75;
    threeRef.current.camera.updateProjectionMatrix();
    showToast('Posição da câmera reiniciada.');
  }, [currentScene, showToast]);

  // Fullscreen Toggle
  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    if (!document.fullscreenElement) {
      el.requestFullscreen()
        .then(() => {
          setIsFullscreen(true);
          if (onFullscreenChange) onFullscreenChange(true);
        })
        .catch(() => showToast('Tela cheia bloqueada pelo navegador.'));
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
        if (onFullscreenChange) onFullscreenChange(false);
      });
    }
  }, [onFullscreenChange, showToast]);

  // Gyroscope Toggle with iOS 13+ support
  const toggleGyroscope = useCallback(async () => {
    if (isGyroActive) {
      if (threeRef.current) threeRef.current.deviceOrientation = undefined;
      setIsGyroActive(false);
      showToast('Giroscópio desativado.');
      return;
    }

    const start = () => {
      const handler = (e: DeviceOrientationEvent) => {
        if (!threeRef.current) return;
        const alpha = e.alpha ? THREE.MathUtils.degToRad(e.alpha) : 0;
        const beta = e.beta ? THREE.MathUtils.degToRad(e.beta) : 0;
        const gamma = e.gamma ? THREE.MathUtils.degToRad(e.gamma) : 0;
        const orient = window.screen.orientation ? THREE.MathUtils.degToRad(window.screen.orientation.angle) : 0;
        threeRef.current.deviceOrientation = { alpha, beta, gamma, orient };
      };
      window.addEventListener('deviceorientation', handler, true);
      setIsGyroActive(true);
      showToast('Giroscópio ativado! Mova seu aparelho.');
    };

    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      try {
        const res = await (DeviceOrientationEvent as any).requestPermission();
        if (res === 'granted') start();
        else showToast('Permissão do giroscópio negada.');
      } catch (err) {
        showToast('Erro ao solicitar giroscópio.');
      }
    } else {
      start();
    }
  }, [isGyroActive, showToast]);

  // Render Hotspot Icon
  const renderHotspotIcon = (icon?: string) => {
    switch (icon) {
      case 'arrow':
        return <ArrowUpCircle className="w-5 h-5 text-cyan-300" />;
      case 'stairs':
        return <Footprints className="w-5 h-5 text-amber-300" />;
      case 'sparkles':
        return <Sparkles className="w-5 h-5 text-indigo-300" />;
      case 'door':
      default:
        return <DoorOpen className="w-5 h-5 text-emerald-300" />;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex flex-col items-center justify-between overflow-hidden bg-slate-950 select-none ${
        isEditorMode ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
      }`}
    >
      {/* 3D WebGL Canvas Mount */}
      <div
        ref={canvasMountRef}
        onClick={handleCanvasClick}
        className="absolute inset-0 w-full h-full z-0 pointer-events-auto"
      />

      {/* ------------------------------------------------------------- */}
      {/* 2D HTML/Tailwind High Performance Overlay for 3D Markers       */}
      {/* ------------------------------------------------------------- */}
      <div ref={overlayRef} className="absolute inset-0 w-full h-full z-10 pointer-events-none overflow-hidden">
        {/* Navigation Hotspots */}
        {currentScene.navigationHotspots?.map((hotspot) => {
          const target = scenes[hotspot.targetSceneId];
          const isBeingDragged = draggingItem?.id === hotspot.id;

          return (
            <div
              key={hotspot.id}
              ref={(el) => {
                hotspotDomRefs.current[hotspot.id] = el;
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                willChange: 'transform, opacity',
                opacity: 0,
                transition: isBeingDragged ? 'none' : 'opacity 0.25s ease-out',
                zIndex: isBeingDragged ? 50 : 20,
              }}
              className="group pointer-events-auto flex flex-col items-center cursor-pointer"
              onClick={() => {
                if (wasJustDraggingRef.current) return;
                transitionToScene(hotspot.targetSceneId, hotspot.targetEntryView);
              }}
              onMouseEnter={() => setHoveredHotspot(hotspot)}
              onMouseLeave={() => setHoveredHotspot(null)}
            >
              {/* Destination Hover Preview Thumbnail */}
              {target && !isEditorMode && !isBeingDragged && (
                <div className="absolute bottom-full mb-3 hidden group-hover:flex flex-col items-center p-1.5 bg-slate-950/90 backdrop-blur-xl border border-cyan-400/40 rounded-xl shadow-[0_10px_30px_rgba(6,182,212,0.35)] w-48 transition-all animate-in fade-in zoom-in-95 duration-200">
                  <div className="relative w-full h-24 rounded-lg overflow-hidden mb-1.5">
                    <img src={target.thumbnailUrl} alt={target.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1.5">
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                        {target.title}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-cyan-300 flex items-center gap-1">
                    Toque para entrar <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              )}

              {/* Pulsing Beacon Button & Edit Badges */}
              <div className="relative flex items-center justify-center">
                <span className="absolute w-12 h-12 rounded-full bg-cyan-400/20 animate-ping" />
                <span className="absolute w-10 h-10 rounded-full bg-cyan-500/30 animate-pulse" />
                
                <div
                  className={`relative w-11 h-11 rounded-full bg-slate-900/85 backdrop-blur-xl border flex items-center justify-center transition-all duration-300 ${
                    isBeingDragged
                      ? 'scale-125 border-cyan-300 bg-cyan-950 ring-4 ring-cyan-400/60 shadow-[0_0_25px_rgba(6,182,212,0.9)]'
                      : isEditorMode
                      ? 'border-cyan-400/90 shadow-[0_0_20px_rgba(6,182,212,0.7)] ring-2 ring-cyan-500/40 group-hover:scale-110'
                      : 'border-cyan-400/70 shadow-[0_0_20px_rgba(6,182,212,0.6)] group-hover:scale-115 group-hover:border-cyan-300 group-hover:bg-cyan-950'
                  }`}
                >
                  {renderHotspotIcon(hotspot.icon)}
                </div>

                {/* Top-Left Badge: Delete with Trash Icon (Lixeira) */}
                {isEditorMode && (
                  <button
                    type="button"
                    title="Excluir este portal"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleDeleteHotspot(hotspot.id);
                    }}
                    className="absolute -top-2.5 -left-2.5 z-30 w-6 h-6 rounded-full bg-red-600 hover:bg-red-500 border-2 border-white shadow-[0_0_12px_rgba(239,68,68,0.9)] flex items-center justify-center text-white transition-all transform hover:scale-125 active:scale-95 cursor-pointer pointer-events-auto"
                  >
                    <Trash2 className="w-3 h-3 text-white" />
                  </button>
                )}

                {/* Bottom-Right Badge: 3D Drag / Reposition (Arrastar tridimensional) */}
                {isEditorMode && (
                  <button
                    type="button"
                    title="Arrastar tridimensionalmente na cena 3D"
                    onPointerDown={(e) => handleStartDrag(e, hotspot.id, 'hotspot')}
                    className={`absolute -bottom-2.5 -right-2.5 z-30 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-slate-950 transition-all transform hover:scale-125 active:scale-95 cursor-grab active:cursor-grabbing pointer-events-auto ${
                      isBeingDragged
                        ? 'bg-cyan-300 ring-4 ring-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,1)] scale-110'
                        : 'bg-cyan-400 hover:bg-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.9)]'
                    }`}
                  >
                    <Move className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
                  </button>
                )}
              </div>

              {/* Live Coordinates Pill while dragging */}
              {isBeingDragged && (
                <div className="mt-1 px-2.5 py-0.5 rounded-full bg-cyan-950/95 border border-cyan-400 text-[10px] font-mono text-cyan-200 shadow-xl font-bold whitespace-nowrap">
                  U: {hotspot.position.u} | V: {hotspot.position.v} ({hotspot.position.yaw}°, {hotspot.position.pitch}°)
                </div>
              )}

              {/* Label Badge */}
              {!isBeingDragged && (
                <div className="mt-1.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/15 shadow-lg group-hover:border-cyan-400/60 transition-all">
                  <span className="text-xs font-semibold text-white tracking-wide whitespace-nowrap drop-shadow">
                    {hotspot.label}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {/* Object Annotations (POIs) */}
        {showAnnotations &&
          currentScene.objectAnnotations?.map((obj) => {
            const isBeingDragged = draggingItem?.id === obj.id;

            return (
              <div
                key={obj.id}
                ref={(el) => {
                  annotationDomRefs.current[obj.id] = el;
                }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  willChange: 'transform, opacity',
                  opacity: 0,
                  transition: isBeingDragged ? 'none' : 'opacity 0.25s ease-out',
                  zIndex: isBeingDragged ? 50 : 20,
                }}
                className="group pointer-events-auto flex flex-col items-center cursor-pointer"
                onClick={() => {
                  if (wasJustDraggingRef.current) return;
                  focusOnAnnotation(obj);
                }}
              >
                {/* Pulsing Pin & Edit Badges */}
                <div className="relative flex items-center justify-center">
                  <span className="absolute w-8 h-8 rounded-full bg-amber-400/20 animate-ping" />
                  <div
                    className={`relative w-8 h-8 rounded-full bg-slate-900/90 backdrop-blur-lg border flex items-center justify-center transition-all duration-300 ${
                      isBeingDragged
                        ? 'scale-125 border-amber-300 bg-amber-950 ring-4 ring-amber-400/60 shadow-[0_0_20px_rgba(251,191,36,0.9)]'
                        : isEditorMode
                        ? 'border-amber-400/90 shadow-[0_0_15px_rgba(251,191,36,0.7)] ring-2 ring-amber-500/40 group-hover:scale-110'
                        : 'border-amber-400/70 shadow-[0_0_15px_rgba(251,191,36,0.6)] group-hover:scale-120 group-hover:border-amber-300 group-hover:bg-amber-950'
                    }`}
                  >
                    <Tag className="w-4 h-4 text-amber-300" />
                  </div>

                  {/* Top-Left Badge: Delete with Trash Icon (Lixeira) */}
                  {isEditorMode && (
                    <button
                      type="button"
                      title="Excluir este objeto"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleDeleteAnnotation(obj.id);
                      }}
                      className="absolute -top-2 -left-2 z-30 w-5 h-5 rounded-full bg-red-600 hover:bg-red-500 border border-white shadow-[0_0_10px_rgba(239,68,68,0.9)] flex items-center justify-center text-white transition-all transform hover:scale-125 active:scale-95 cursor-pointer pointer-events-auto"
                    >
                      <Trash2 className="w-2.5 h-2.5 text-white" />
                    </button>
                  )}

                  {/* Bottom-Right Badge: 3D Drag / Reposition (Arrastar tridimensional) */}
                  {isEditorMode && (
                    <button
                      type="button"
                      title="Arrastar tridimensionalmente na cena 3D"
                      onPointerDown={(e) => handleStartDrag(e, obj.id, 'annotation')}
                      className={`absolute -bottom-2 -right-2 z-30 w-5 h-5 rounded-full border border-white flex items-center justify-center text-slate-950 transition-all transform hover:scale-125 active:scale-95 cursor-grab active:cursor-grabbing pointer-events-auto ${
                        isBeingDragged
                          ? 'bg-amber-300 ring-4 ring-amber-400/80 shadow-[0_0_12px_rgba(251,191,36,1)] scale-110'
                          : 'bg-amber-400 hover:bg-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.9)]'
                      }`}
                    >
                      <Move className="w-3 h-3 text-slate-950 stroke-[2.5]" />
                    </button>
                  )}
                </div>

                {/* Live Coordinates Pill while dragging */}
                {isBeingDragged && (
                  <div className="mt-1 px-2.5 py-0.5 rounded-full bg-amber-950/95 border border-amber-400 text-[10px] font-mono text-amber-200 shadow-xl font-bold whitespace-nowrap">
                    U: {obj.position.u} | V: {obj.position.v} ({obj.position.yaw}°, {obj.position.pitch}°)
                  </div>
                )}

                {/* Object Quick Title */}
                {!isBeingDragged && (
                  <div className="mt-1 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-white/10 shadow group-hover:border-amber-400/50 transition-all max-w-[150px] truncate">
                    <span className="text-[11px] font-medium text-amber-100 truncate block">
                      {obj.title}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Top Floating Header Dock                                      */}
      {/* ------------------------------------------------------------- */}
      <header className="relative z-20 w-full max-w-7xl mx-auto p-3 sm:p-5 flex items-center justify-between gap-3 pointer-events-auto">
        {/* Room Title & Status */}
        <div className="flex items-center gap-3 bg-slate-950/80 backdrop-blur-2xl border border-white/15 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl shadow-xl">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse ring-4 ring-cyan-500/20" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
                {currentScene.title}
              </h1>
              {currentScene.subtitle && (
                <span className="hidden md:inline text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-cyan-200">
                  {currentScene.subtitle}
                </span>
              )}
            </div>
            <span className="text-[10px] text-gray-400 flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5 text-cyan-400" />
              {currentScene.navigationHotspots.length} portais • {currentScene.objectAnnotations.length} objetos
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-950/80 backdrop-blur-2xl border border-white/15 p-1.5 rounded-2xl shadow-xl">
          {/* Simulations & Points Manager Button */}
          <button
            onClick={() => {
              setSimulationsTab('simulations');
              setSimulationsModalOpen(true);
            }}
            title="Gerenciar Simulações Locais & Versões do Passeio"
            className="px-2.5 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/35 text-cyan-300 border border-cyan-400/30 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow"
          >
            <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Simulações</span>
            {simulations.length > 0 && (
              <span className="bg-cyan-500 text-[10px] font-bold text-slate-950 px-1.5 py-0.2 rounded-full">
                {simulations.length}
              </span>
            )}
          </button>

          {/* Quick Clear Points Menu Button */}
          <button
            onClick={() => {
              setSimulationsTab('scene_points');
              setSimulationsModalOpen(true);
            }}
            title="Limpar ou Gerenciar Pontos Desta Cena"
            className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-300 transition-all active:scale-95"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Editor Mode Toggle */}
          <button
            onClick={() => {
              setIsEditorMode((v) => !v);
              showToast(!isEditorMode ? 'Modo Editor ativado! Clique na esfera para marcar.' : 'Modo Visualizador ativado.');
            }}
            title={isEditorMode ? 'Sair do Modo Editor' : 'Ativar Modo Editor (Mapeamento 3D)'}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 ${
              isEditorMode
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isEditorMode ? 'Modo Editor' : 'Editor'}</span>
          </button>

          {/* Export JSON Button (In Editor Mode) */}
          {isEditorMode && (
            <button
              onClick={handleCopyTourJSON}
              title="Copiar JSON do Tour Mapeado"
              className="px-2.5 py-1.5 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-400/40 text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95"
            >
              {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">Exportar JSON</span>
            </button>
          )}

          {/* Toggle Annotations Visibility */}
          <button
            onClick={() => setShowAnnotations((v) => !v)}
            title={showAnnotations ? 'Ocultar Marcadores de Objetos' : 'Mostrar Marcadores de Objetos'}
            className={`p-2 rounded-xl text-xs font-medium transition-all ${
              showAnnotations
                ? 'bg-white/10 text-amber-300 hover:bg-white/15'
                : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            {showAnnotations ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          {/* Gyroscope Button (Mobile) */}
          <button
            onClick={toggleGyroscope}
            title={isGyroActive ? 'Desativar Giroscópio' : 'Ativar Giroscópio'}
            className={`p-2 rounded-xl text-xs font-medium transition-all ${
              isGyroActive
                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/40 animate-pulse'
                : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'
            }`}
          >
            <Compass className="w-4 h-4" />
          </button>

          {/* Reset Camera View */}
          <button
            onClick={handleResetCamera}
            title="Resetar Posição da Câmera"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all active:scale-95"
          >
            {isFullscreen ? <Minimize className="w-4 h-4 text-red-300" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Editor Active Banner */}
      {isEditorMode && (
        <div className="relative z-20 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-medium flex items-center gap-2 backdrop-blur-xl animate-in fade-in">
          <Crosshair className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
          <span>Modo Mapeamento: Clique em qualquer ponto da cena para capturar coordenadas e adicionar Hotspot ou Objeto.</span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Object Annotation Detail Drawer / Modal                       */}
      {/* ------------------------------------------------------------- */}
      {selectedAnnotation && (
        <aside className="absolute right-4 top-20 z-30 w-[92%] sm:w-96 max-w-sm bg-slate-950/85 backdrop-blur-2xl border border-white/15 rounded-3xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col gap-3.5 animate-in slide-in-from-right-4 duration-300">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
              {selectedAnnotation.category}
            </span>
            <button
              onClick={() => setSelectedAnnotation(null)}
              className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
              {selectedAnnotation.title}
            </h2>
            {selectedAnnotation.price && (
              <span className="text-sm font-extrabold text-emerald-400 block mt-1">
                {selectedAnnotation.price}
              </span>
            )}
          </div>

          {selectedAnnotation.description && (
            <p className="text-xs text-gray-300 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">
              {selectedAnnotation.description}
            </p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => focusOnAnnotation(selectedAnnotation)}
              className="flex-1 py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow transition-all active:scale-95"
            >
              <Crosshair className="w-3.5 h-3.5" />
              Centralizar Câmera
            </button>
            <button
              onClick={() => showToast('Solicitação de orçamento enviada!')}
              className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Info className="w-3.5 h-3.5 text-amber-400" />
              Detalhes
            </button>
            <button
              onClick={() => handleDeleteAnnotation(selectedAnnotation.id)}
              title="Excluir este objeto permanentemente"
              className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/40 text-red-300 transition-all flex items-center justify-center active:scale-95 border border-red-500/30"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </aside>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Editor Modal: Create Hotspot or Annotation                    */}
      {/* ------------------------------------------------------------- */}
      {editorModalOpen && editorPoint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-slate-950/95 border border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-[0_25px_70px_rgba(0,0,0,0.9)] flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                <Edit3 className="w-4 h-4" />
                Mapear Ponto 3D Capturado
              </div>
              <button
                onClick={() => setEditorModalOpen(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Captured Coords Badges */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-gray-300 bg-white/5 p-2.5 rounded-xl border border-white/10">
              <div>Yaw: <span className="text-cyan-300 font-bold">{editorPoint.yaw}°</span></div>
              <div>Pitch: <span className="text-cyan-300 font-bold">{editorPoint.pitch}°</span></div>
              <div>U: <span className="text-amber-300 font-bold">{editorPoint.u}</span></div>
              <div>V: <span className="text-amber-300 font-bold">{editorPoint.v}</span></div>
            </div>

            {/* Type Selector Tab */}
            <div className="flex p-1 bg-white/5 rounded-xl border border-white/10">
              <button
                onClick={() => setEditorItemType('hotspot')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  editorItemType === 'hotspot'
                    ? 'bg-cyan-600 text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Portal de Navegação
              </button>
              <button
                onClick={() => setEditorItemType('annotation')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  editorItemType === 'annotation'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Objeto / POI
              </button>
            </div>

            {/* Form Fields */}
            {editorItemType === 'hotspot' ? (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-300 uppercase block mb-1">
                    Cômodo de Destino
                  </label>
                  <select
                    value={editorFormData.targetSceneId}
                    onChange={(e) => setEditorFormData({ ...editorFormData, targetSceneId: e.target.value })}
                    className="w-full bg-slate-900 border border-white/15 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    {Object.values(scenes).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title} ({s.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-300 uppercase block mb-1">
                    Rótulo / Texto do Portal
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Ir para a Suíte Master"
                    value={editorFormData.label}
                    onChange={(e) => setEditorFormData({ ...editorFormData, label: e.target.value })}
                    className="w-full bg-slate-900 border border-white/15 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-300 uppercase block mb-1">
                    Ícone do Marcador
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['door', 'arrow', 'stairs', 'sparkles'] as const).map((ic) => (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => setEditorFormData({ ...editorFormData, icon: ic })}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-[10px] font-medium transition-all ${
                          editorFormData.icon === ic
                            ? 'bg-cyan-600/30 border-cyan-400 text-cyan-200'
                            : 'bg-white/5 border-white/10 text-gray-400'
                        }`}
                      >
                        {renderHotspotIcon(ic)}
                        <span className="capitalize">{ic}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-300 uppercase block mb-1">
                    Título do Objeto
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Poltrona de Couro Legítimo"
                    value={editorFormData.title}
                    onChange={(e) => setEditorFormData({ ...editorFormData, title: e.target.value })}
                    className="w-full bg-slate-900 border border-white/15 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-gray-300 uppercase block mb-1">
                      Categoria
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Mobiliário"
                      value={editorFormData.category}
                      onChange={(e) => setEditorFormData({ ...editorFormData, category: e.target.value })}
                      className="w-full bg-slate-900 border border-white/15 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-300 uppercase block mb-1">
                      Preço (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: R$ 14.500"
                      value={editorFormData.price}
                      onChange={(e) => setEditorFormData({ ...editorFormData, price: e.target.value })}
                      className="w-full bg-slate-900 border border-white/15 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-300 uppercase block mb-1">
                    Descrição
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Detalhes sobre acabamento, dimensões ou especificações..."
                    value={editorFormData.description}
                    onChange={(e) => setEditorFormData({ ...editorFormData, description: e.target.value })}
                    className="w-full bg-slate-900 border border-white/15 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-amber-400 resize-none"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setEditorModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEditorItem}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-xs font-bold shadow-lg transition-all active:scale-95"
              >
                Salvar Ponto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Simulations & Point Management Modal                          */}
      {/* ------------------------------------------------------------- */}
      {simulationsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-3xl max-h-[88vh] bg-slate-950/95 border border-cyan-500/40 rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden text-white">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    Simulações & Gestão de Pontos 360°
                  </h2>
                  <p className="text-[11px] text-gray-400">
                    Limpe pontos em tempo real, salve versões locais no navegador e exporte o JSON.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSimulationsModalOpen(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs Navigation */}
            <div className="flex border-b border-white/10 bg-slate-900/40 px-4 pt-2 gap-2">
              <button
                onClick={() => setSimulationsTab('simulations')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  simulationsTab === 'simulations'
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Simulações Salvas ({simulations.length})
              </button>
              <button
                onClick={() => setSimulationsTab('scene_points')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  simulationsTab === 'scene_points'
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                Limpar & Gerenciar Pontos
              </button>
              <button
                onClick={() => setSimulationsTab('import_export')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  simulationsTab === 'import_export'
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <FileJson className="w-3.5 h-3.5" />
                Exportar / Importar JSON
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 scrollbar-thin scrollbar-thumb-white/20 flex-1">
              {/* TAB 1: Minhas Simulações Salvas */}
              {simulationsTab === 'simulations' && (
                <div className="space-y-5">
                  {/* Save current state card */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 to-slate-900/80 border border-cyan-500/30 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                    <div className="flex-1">
                      <label className="text-[11px] font-bold text-cyan-300 uppercase block mb-1">
                        Salvar Nova Simulação Local
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Opção A - Decorado Sem Portais Cozinha"
                        value={newSimName}
                        onChange={(e) => setNewSimName(e.target.value)}
                        className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveSimulation();
                        }}
                      />
                    </div>
                    <button
                      onClick={() => handleSaveSimulation()}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all active:scale-95 shrink-0"
                    >
                      <Save className="w-4 h-4" />
                      Salvar Simulação
                    </button>
                  </div>

                  {/* List of saved simulations */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-gray-400 px-1">
                      <span className="font-semibold text-gray-300">Simulações no LocalStorage</span>
                      <span>Total: {simulations.length}</span>
                    </div>

                    {simulations.length === 0 ? (
                      <div className="p-8 text-center rounded-2xl border border-dashed border-white/10 bg-slate-900/30 space-y-2">
                        <FolderOpen className="w-8 h-8 text-gray-500 mx-auto" />
                        <p className="text-xs text-gray-400">
                          Nenhuma simulação salva ainda.
                        </p>
                        <p className="text-[11px] text-gray-500 max-w-md mx-auto">
                          Faça alterações nos pontos (adicione ou remova portais e objetos) e salve uma versão acima para restaurá-la a qualquer momento!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {simulations.map((sim) => (
                          <div
                            key={sim.id}
                            className="p-3.5 rounded-2xl bg-slate-900/70 border border-white/10 hover:border-cyan-500/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-white">{sim.name}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-mono">
                                  {sim.totalHotspots} portais • {sim.totalAnnotations} objetos
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-400">
                                Salvo em: {sim.createdAt}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                              <button
                                onClick={() => {
                                  handleLoadSimulation(sim);
                                  setSimulationsModalOpen(false);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-400/30 text-xs font-semibold flex items-center gap-1 transition-all active:scale-95"
                                title="Carregar esta simulação no Passeio 360"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Carregar
                              </button>
                              <button
                                onClick={() => {
                                  const jsonStr = JSON.stringify(sim.scenes, null, 2);
                                  navigator.clipboard.writeText(jsonStr);
                                  showToast(`JSON da simulação "${sim.name}" copiado!`);
                                }}
                                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs transition-all"
                                title="Copiar código JSON desta simulação"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteSimulation(sim.id)}
                                className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/25 text-red-400 text-xs transition-all"
                                title="Excluir simulação do armazenamento local"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: Limpar & Gerenciar Pontos em Tempo Real */}
              {simulationsTab === 'scene_points' && (
                <div className="space-y-6">
                  {/* Bulk Clear Actions Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl bg-red-950/20 border border-red-500/30 flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-red-300">
                          <Trash2 className="w-3.5 h-3.5" />
                          Limpar Cena Atual
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">
                          Remove todos os portais e objetos de <strong>{currentScene.title}</strong>.
                        </p>
                      </div>
                      <button
                        onClick={handleClearCurrentScenePoints}
                        className="w-full py-2 rounded-xl bg-red-600/30 hover:bg-red-600/50 text-red-200 border border-red-500/40 text-xs font-semibold transition-all active:scale-95"
                      >
                        Limpar Esta Cena
                      </button>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Limpar Todo o Passeio
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">
                          Zera todos os pontos dos 6 cômodos para começar o mapeamento do zero.
                        </p>
                      </div>
                      <button
                        onClick={handleClearEntireTourPoints}
                        className="w-full py-2 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/40 text-xs font-semibold transition-all active:scale-95"
                      >
                        Zerar Todos os 6 Cômodos
                      </button>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                          <RefreshCw className="w-3.5 h-3.5" />
                          Restaurar Padrão
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">
                          Recarrega a calibragem padrão original de fábrica de todos os ambientes.
                        </p>
                      </div>
                      <button
                        onClick={handleResetToInitialTour}
                        className="w-full py-2 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-400/40 text-xs font-semibold transition-all active:scale-95"
                      >
                        Restaurar Fábrica
                      </button>
                    </div>
                  </div>

                  {/* Active Scene Hotspots Listing */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-300 px-1">
                      <span className="flex items-center gap-1.5">
                        <DoorOpen className="w-4 h-4 text-cyan-400" />
                        Portais de Navegação em "{currentScene.title}" ({currentScene.navigationHotspots.length})
                      </span>
                    </div>

                    {currentScene.navigationHotspots.length === 0 ? (
                      <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5 text-[11px] text-gray-400 italic text-center">
                        Nenhum portal nesta cena. Use o "Modo Editor" para adicionar portais clicando na esfera 360°.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {currentScene.navigationHotspots.map((hs) => {
                          const targetScene = scenes[hs.targetSceneId];
                          return (
                            <div
                              key={hs.id}
                              className="p-3 rounded-xl bg-slate-900/60 border border-white/10 flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                                  {renderHotspotIcon(hs.icon)}
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-white">{hs.label}</div>
                                  <div className="text-[10px] text-gray-400">
                                    Destino: <span className="text-cyan-300 font-medium">{targetScene?.title || hs.targetSceneId}</span> • Coords: U={hs.position.u} V={hs.position.v}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeleteHotspot(hs.id)}
                                className="p-2 rounded-lg bg-red-500/15 hover:bg-red-500/30 text-red-300 transition-all"
                                title="Excluir este portal"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Active Scene Annotations Listing */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-300 px-1">
                      <span className="flex items-center gap-1.5">
                        <Tag className="w-4 h-4 text-amber-400" />
                        Objetos & Mobiliário em "{currentScene.title}" ({currentScene.objectAnnotations.length})
                      </span>
                    </div>

                    {currentScene.objectAnnotations.length === 0 ? (
                      <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5 text-[11px] text-gray-400 italic text-center">
                        Nenhum objeto marcado nesta cena. Ative o "Modo Editor" e clique nos móveis para marcar especificações e preços.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {currentScene.objectAnnotations.map((obj) => (
                          <div
                            key={obj.id}
                            className="p-3 rounded-xl bg-slate-900/60 border border-white/10 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                                <Tag className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-white flex items-center gap-2">
                                  {obj.title}
                                  {obj.price && (
                                    <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                                      {obj.price}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-gray-400">
                                  Categoria: <span className="text-amber-200">{obj.category}</span> • U={obj.position.u} V={obj.position.v}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  setSimulationsModalOpen(false);
                                  focusOnAnnotation(obj);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 text-xs font-medium"
                              >
                                Ver no 3D
                              </button>
                              <button
                                onClick={() => handleDeleteAnnotation(obj.id)}
                                className="p-2 rounded-lg bg-red-500/15 hover:bg-red-500/30 text-red-300 transition-all"
                                title="Excluir este objeto"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: Exportar / Importar JSON */}
              {simulationsTab === 'import_export' && (
                <div className="space-y-6">
                  {/* Export Options */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-300 uppercase block">
                      Exportar Configuração Atual
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={handleDownloadJSON}
                        className="p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-cyan-500/40 hover:border-cyan-400 transition-all flex items-center gap-3 text-left group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/20 group-hover:bg-cyan-500/30 text-cyan-300 flex items-center justify-center shrink-0">
                          <Download className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white group-hover:text-cyan-200">
                            Baixar Arquivo .JSON
                          </div>
                          <div className="text-[10px] text-gray-400">
                            Download direto do arquivo com todas as 6 cenas e coordenadas.
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={handleCopyTourJSON}
                        className="p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-white/15 hover:border-cyan-400 transition-all flex items-center gap-3 text-left group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-white/10 group-hover:bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0">
                          {copySuccess ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white group-hover:text-cyan-200">
                            Copiar para Área de Transferência
                          </div>
                          <div className="text-[10px] text-gray-400">
                            Copia o código JSON formatado para colar em arquivos ou no chat.
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Import Option */}
                  <div className="space-y-3 pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-300 uppercase block">
                        Importar Código JSON de um Passeio
                      </label>
                      <span className="text-[10px] text-gray-400">Substitui a configuração ativa</span>
                    </div>

                    <textarea
                      rows={6}
                      value={importJsonText}
                      onChange={(e) => setImportJsonText(e.target.value)}
                      placeholder='Cole aqui o JSON gerado (deve conter as chaves dos ambientes como "kitchen", "living_room", etc.)...'
                      className="w-full bg-slate-950 border border-white/15 rounded-2xl p-3 text-xs font-mono text-cyan-200 focus:outline-none focus:border-cyan-400 resize-none"
                    />

                    <button
                      onClick={handleImportJSON}
                      disabled={!importJsonText.trim()}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
                    >
                      <UploadCloud className="w-4 h-4" />
                      Importar e Aplicar Passeio em Tempo Real
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Bottom Floating Dock: Room Selector (Mini-Map)                */}
      {/* ------------------------------------------------------------- */}
      <footer className="relative z-20 w-full max-w-5xl mx-auto p-3 sm:p-5 flex flex-col items-center gap-2 pointer-events-auto">
        <div className="w-full bg-slate-950/85 backdrop-blur-2xl border border-white/15 rounded-2xl p-2 sm:p-3 shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col gap-2">
          <div className="flex items-center justify-between px-2 text-[11px] text-gray-400">
            <span className="font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              Ambientes do Passeio (6 Cenas 360°)
            </span>
            <span className="hidden sm:inline">Toque em qualquer ambiente para navegar diretamente</span>
          </div>

          {/* Horizontal Carousel */}
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/20">
            {Object.values(scenes).map((scene) => {
              const isActive = scene.id === currentSceneId;
              return (
                <div
                  key={scene.id}
                  onClick={() => transitionToScene(scene.id)}
                  className={`group relative shrink-0 w-28 sm:w-36 h-20 sm:h-22 rounded-xl overflow-hidden border cursor-pointer transition-all duration-300 hover:scale-[1.03] ${
                    isActive
                      ? 'border-cyan-400 ring-2 ring-cyan-400/50 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                      : 'border-white/10 hover:border-white/30 bg-slate-900/60'
                  }`}
                >
                  <img
                    src={scene.thumbnailUrl}
                    alt={scene.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-75 group-hover:opacity-100"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2 flex flex-col justify-end">
                    <span className="text-[10px] sm:text-xs font-bold text-white drop-shadow truncate">
                      {scene.title}
                    </span>
                    <span className="text-[9px] text-cyan-300 font-mono flex items-center gap-1">
                      {isActive ? '● Atual' : `${scene.navigationHotspots.length} portais`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </footer>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-slate-900/95 border border-cyan-500/40 text-cyan-200 text-xs font-semibold shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-200">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
