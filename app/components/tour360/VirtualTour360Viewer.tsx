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
  Sliders
} from 'lucide-react';
import {
  INITIAL_TOUR_SCENES,
  VirtualTourScene,
  NavigationHotspot,
  ObjectAnnotation,
  SphericalPosition
} from '@/app/data/virtualTourData';

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
        const v = parseFloat(hit.uv.y.toFixed(3));
        const yaw = parseFloat(((hit.uv.x - 0.5) * 360).toFixed(1));
        const pitch = parseFloat(((0.5 - hit.uv.y) * 180).toFixed(1));

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

    setScenes((prev) => {
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
                transition: 'opacity 0.25s ease-out',
              }}
              className="group pointer-events-auto flex flex-col items-center cursor-pointer"
              onClick={() => transitionToScene(hotspot.targetSceneId, hotspot.targetEntryView)}
              onMouseEnter={() => setHoveredHotspot(hotspot)}
              onMouseLeave={() => setHoveredHotspot(null)}
            >
              {/* Destination Hover Preview Thumbnail */}
              {target && (
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

              {/* Pulsing Beacon Button */}
              <div className="relative flex items-center justify-center">
                <span className="absolute w-12 h-12 rounded-full bg-cyan-400/20 animate-ping" />
                <span className="absolute w-10 h-10 rounded-full bg-cyan-500/30 animate-pulse" />
                <div className="relative w-11 h-11 rounded-full bg-slate-900/85 backdrop-blur-xl border border-cyan-400/70 shadow-[0_0_20px_rgba(6,182,212,0.6)] flex items-center justify-center transition-all duration-300 group-hover:scale-115 group-hover:border-cyan-300 group-hover:bg-cyan-950">
                  {renderHotspotIcon(hotspot.icon)}
                </div>
              </div>

              {/* Label Badge */}
              <div className="mt-1.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/15 shadow-lg group-hover:border-cyan-400/60 transition-all">
                <span className="text-xs font-semibold text-white tracking-wide whitespace-nowrap drop-shadow">
                  {hotspot.label}
                </span>
              </div>
            </div>
          );
        })}

        {/* Object Annotations (POIs) */}
        {showAnnotations &&
          currentScene.objectAnnotations?.map((obj) => (
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
                transition: 'opacity 0.25s ease-out',
              }}
              className="group pointer-events-auto flex flex-col items-center cursor-pointer"
              onClick={() => focusOnAnnotation(obj)}
            >
              {/* Pulsing Pin */}
              <div className="relative flex items-center justify-center">
                <span className="absolute w-8 h-8 rounded-full bg-amber-400/20 animate-ping" />
                <div className="relative w-8 h-8 rounded-full bg-slate-900/90 backdrop-blur-lg border border-amber-400/70 shadow-[0_0_15px_rgba(251,191,36,0.6)] flex items-center justify-center transition-all duration-300 group-hover:scale-120 group-hover:border-amber-300 group-hover:bg-amber-950">
                  <Tag className="w-4 h-4 text-amber-300" />
                </div>
              </div>

              {/* Object Quick Title */}
              <div className="mt-1 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-white/10 shadow group-hover:border-amber-400/50 transition-all max-w-[150px] truncate">
                <span className="text-[11px] font-medium text-amber-100 truncate block">
                  {obj.title}
                </span>
              </div>
            </div>
          ))}
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
