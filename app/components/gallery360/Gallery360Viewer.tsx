'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  Image as ImageIcon,
  Layers,
  Compass,
  Maximize,
  Minimize,
  Glasses,
  Play,
  Pause,
  ArrowLeftRight,
  RotateCcw,
  Upload,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react';

export interface GalleryItem {
  id: string;
  title: string;
  category: string;
  url: string;
  thumbnail: string;
}

export const GALLERY_ITEMS: GalleryItem[] = [
  // Left 5 Items
  {
    id: 'vibe1',
    title: 'Rave Lounge 1',
    category: 'Living',
    url: '/images/gallery360/vibe1.jpg',
    thumbnail: '/images/gallery360/vibe1.jpg',
  },
  {
    id: 'vibe2',
    title: 'Rave Lounge 2',
    category: 'Varanda',
    url: '/images/gallery360/vibe2.jpg',
    thumbnail: '/images/gallery360/vibe2.jpg',
  },
  {
    id: 'arch1',
    title: 'Arquitetura Luxo',
    category: 'Residencial',
    url: '/images/gallery360/arch1.jpg',
    thumbnail: '/images/gallery360/arch1.jpg',
  },
  {
    id: 'arch2',
    title: 'Living Integrado',
    category: 'Interior',
    url: '/images/gallery360/arch2.jpg',
    thumbnail: '/images/gallery360/arch2.jpg',
  },
  {
    id: 'arch3',
    title: 'Suíte Master',
    category: 'Interior',
    url: '/images/gallery360/arch3.jpg',
    thumbnail: '/images/gallery360/arch3.jpg',
  },

  // Right 5 Items
  {
    id: 'arch4',
    title: 'Espaço Gourmet',
    category: 'Lazer',
    url: '/images/gallery360/arch4.jpg',
    thumbnail: '/images/gallery360/arch4.jpg',
  },
  {
    id: 'arch5',
    title: 'Hall & Jardim',
    category: 'Paisagismo',
    url: '/images/gallery360/arch5.jpg',
    thumbnail: '/images/gallery360/arch5.jpg',
  },
  {
    id: 'escritorio',
    title: 'Corporativo Premium',
    category: 'Comercial',
    url: '/images/gallery360/escritorio.jpg',
    thumbnail: '/images/gallery360/escritorio.jpg',
  },
  {
    id: 'escritorio3',
    title: 'Studio Executivo',
    category: 'Office',
    url: '/images/gallery360/escritorio3.jpg',
    thumbnail: '/images/gallery360/escritorio3.jpg',
  },
  {
    id: 'agro',
    title: 'Panorama Agro',
    category: 'Exterior',
    url: '/images/gallery360/agro.jpg',
    thumbnail: '/images/gallery360/agro.jpg',
  },
];

interface Gallery360ViewerProps {
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

export default function Gallery360Viewer({ onFullscreenChange }: Gallery360ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const fileInput1Ref = useRef<HTMLInputElement>(null);
  const fileInput2Ref = useRef<HTMLInputElement>(null);

  const defaultPhoto1 = GALLERY_ITEMS.find((item) => item.id === 'vibe1') || GALLERY_ITEMS[0];
  const defaultPhoto2 = GALLERY_ITEMS.find((item) => item.id === 'vibe2') || GALLERY_ITEMS[1];

  // Slots State
  const [photo1, setPhoto1] = useState<{ title: string; url: string; id?: string }>({
    title: defaultPhoto1.title,
    url: defaultPhoto1.url,
    id: defaultPhoto1.id,
  });

  const [photo2, setPhoto2] = useState<{ title: string; url: string; id?: string }>({
    title: defaultPhoto2.title,
    url: defaultPhoto2.url,
    id: defaultPhoto2.id,
  });

  const [targetSlot, setTargetSlot] = useState<1 | 2>(1);
  const [blendValue, setBlendValue] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isGyroActive, setIsGyroActive] = useState<boolean>(false);
  const [isAutoRotate, setIsAutoRotate] = useState<boolean>(true);
  const [isAutoTransition, setIsAutoTransition] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [stereoVrMode, setStereoVrMode] = useState<boolean>(false);

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
    animationId?: number;
    lon: number;
    lat: number;
    targetFov: number;
    isUserInteracting: boolean;
    onPointerDownMouseX: number;
    onPointerDownMouseY: number;
    onPointerDownLon: number;
    onPointerDownLat: number;
    autoTransitionDir: number;
    deviceOrientation?: {
      alpha: number;
      beta: number;
      gamma: number;
      orient: number;
    };
  } | null>(null);

  // Message Helper
  const showNotification = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => {
      setMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  }, []);

  // Texture Loader Helper
  const loadTextureOntoMaterial = useCallback(
    (url: string, material: THREE.MeshBasicMaterial, onComplete?: () => void) => {
      if (!threeRef.current) return;
      setIsLoading(true);
      const loader = threeRef.current.textureLoader;

      loader.load(
        url,
        (texture) => {
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.colorSpace = THREE.SRGBColorSpace;

          if (material.map) {
            material.map.dispose();
          }
          material.map = texture;
          material.needsUpdate = true;
          setIsLoading(false);
          if (onComplete) onComplete();
        },
        undefined,
        (err) => {
          console.error('Erro ao carregar textura 360:', err);
          setIsLoading(false);
          showNotification('Erro ao carregar textura da imagem.');
        }
      );
    },
    [showNotification]
  );

  // Initialize Three.js Scene
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
    renderer.xr.enabled = true; // WebXR support
    mount.appendChild(renderer.domElement);

    // Canvas placeholder generator
    const createPlaceholderCanvas = (label: string, bg1: string, bg2: string) => {
      const c = document.createElement('canvas');
      c.width = 1024;
      c.height = 512;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = bg1;
        ctx.fillRect(0, 0, 1024, 512);
        ctx.fillStyle = bg2;
        ctx.font = 'bold 44px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('iCanvas 360 Viewer', 512, 220);
        ctx.font = '28px sans-serif';
        ctx.fillText(label, 512, 280);
      }
      return c;
    };

    // Sphere 1 (Base - Foto 1)
    const geo1 = new THREE.SphereGeometry(500, 64, 40);
    geo1.scale(-1, 1, 1);
    const tex1 = new THREE.CanvasTexture(createPlaceholderCanvas('Carregando Foto 1...', '#0f172a', '#38bdf8'));
    const mat1 = new THREE.MeshBasicMaterial({ map: tex1 });
    const sphere1 = new THREE.Mesh(geo1, mat1);
    scene.add(sphere1);

    // Sphere 2 (Foreground Layer - Foto 2 with Transparency for Crossfade)
    const geo2 = new THREE.SphereGeometry(499, 64, 40);
    geo2.scale(-1, 1, 1);
    const tex2 = new THREE.CanvasTexture(createPlaceholderCanvas('Carregando Foto 2...', '#311042', '#c084fc'));
    const mat2 = new THREE.MeshBasicMaterial({
      map: tex2,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const sphere2 = new THREE.Mesh(geo2, mat2);
    scene.add(sphere2);

    const textureLoader = new THREE.TextureLoader();

    threeRef.current = {
      scene,
      camera,
      renderer,
      sphere1,
      sphere2,
      mat1,
      mat2,
      textureLoader,
      lon: 0,
      lat: 0,
      targetFov: 75,
      isUserInteracting: false,
      onPointerDownMouseX: 0,
      onPointerDownMouseY: 0,
      onPointerDownLon: 0,
      onPointerDownLat: 0,
      autoTransitionDir: 1,
    };

    // Initial textures load
    loadTextureOntoMaterial(photo1.url, mat1);
    loadTextureOntoMaterial(photo2.url, mat2);

    // Mouse and Touch Event Handlers
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const state = threeRef.current;
      if (!state) return;
      state.isUserInteracting = true;

      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

      state.onPointerDownMouseX = clientX;
      state.onPointerDownMouseY = clientY;
      state.onPointerDownLon = state.lon;
      state.onPointerDownLat = state.lat;
    };

    const onPointerMove = (event: MouseEvent | TouchEvent) => {
      const state = threeRef.current;
      if (!state || !state.isUserInteracting) return;

      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

      state.lon = (state.onPointerDownMouseX - clientX) * 0.12 + state.onPointerDownLon;
      state.lat = (clientY - state.onPointerDownMouseY) * 0.12 + state.onPointerDownLat;
    };

    const onPointerUp = () => {
      if (threeRef.current) {
        threeRef.current.isUserInteracting = false;
      }
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (!threeRef.current) return;
      threeRef.current.targetFov = Math.max(30, Math.min(100, threeRef.current.targetFov + event.deltaY * 0.05));
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousedown', onPointerDown);
    domElement.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    domElement.addEventListener('touchstart', onPointerDown, { passive: true });
    domElement.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);

    domElement.addEventListener('wheel', onWheel, { passive: false });

    // Handle Resize
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
    const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // -PI/2 on X

    const setOrientationQuaternion = (quaternion: THREE.Quaternion, alpha: number, beta: number, gamma: number, orient: number) => {
      euler.set(beta, alpha, -gamma, 'YXZ');
      quaternion.setFromEuler(euler);
      quaternion.multiply(q1);
      quaternion.multiply(q0.setFromAxisAngle(zee, -orient));
    };

    // Render Animation Loop
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
        const phi = THREE.MathUtils.degToRad(90 - state.lat);
        const theta = THREE.MathUtils.degToRad(state.lon);

        cameraTarget.x = 500 * Math.sin(phi) * Math.cos(theta);
        cameraTarget.y = 500 * Math.cos(phi);
        cameraTarget.z = 500 * Math.sin(phi) * Math.sin(theta);
        camera.lookAt(cameraTarget);
      }

      renderer.render(scene, camera);
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

      // Dispose Three resources
      geo1.dispose();
      geo2.dispose();
      mat1.dispose();
      mat2.dispose();
      renderer.dispose();
      if (mount.contains(domElement)) {
        mount.removeChild(domElement);
      }
      threeRef.current = null;
    };
  }, []);

  // Synchronize Blend Slider with Material 2 Opacity
  useEffect(() => {
    if (threeRef.current) {
      threeRef.current.mat2.opacity = blendValue;
    }
  }, [blendValue]);

  // Auto Transition Effect
  useEffect(() => {
    if (!isAutoTransition) return;
    const interval = setInterval(() => {
      setBlendValue((prev) => {
        const dir = threeRef.current?.autoTransitionDir ?? 1;
        let next = prev + 0.015 * dir;
        if (next >= 1) {
          next = 1;
          if (threeRef.current) threeRef.current.autoTransitionDir = -1;
        } else if (next <= 0) {
          next = 0;
          if (threeRef.current) threeRef.current.autoTransitionDir = 1;
        }
        return parseFloat(next.toFixed(3));
      });
    }, 40);

    return () => clearInterval(interval);
  }, [isAutoTransition]);

  // Handle Fullscreen Toggle
  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    if (!document.fullscreenElement) {
      el.requestFullscreen()
        .then(() => {
          setIsFullscreen(true);
          if (onFullscreenChange) onFullscreenChange(true);
        })
        .catch((err) => {
          console.error(err);
          showNotification('Modo tela cheia bloqueado pelo navegador.');
        });
    } else {
      document
        .exitFullscreen()
        .then(() => {
          setIsFullscreen(false);
          if (onFullscreenChange) onFullscreenChange(false);
        })
        .catch(console.error);
    }
  }, [onFullscreenChange, showNotification]);

  // Listen to Fullscreen Change events (e.g. user pressed Escape)
  useEffect(() => {
    const handleFsChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      if (onFullscreenChange) onFullscreenChange(active);
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, [onFullscreenChange]);

  // Handle Gyroscope Toggle
  const toggleGyroscope = useCallback(async () => {
    if (isGyroActive) {
      if (threeRef.current) {
        threeRef.current.deviceOrientation = undefined;
      }
      setIsGyroActive(false);
      showNotification('Giroscópio desativado.');
      return;
    }

    const startOrientation = () => {
      const onOrientation = (event: DeviceOrientationEvent) => {
        if (!threeRef.current) return;
        const alpha = event.alpha ? THREE.MathUtils.degToRad(event.alpha) : 0;
        const beta = event.beta ? THREE.MathUtils.degToRad(event.beta) : 0;
        const gamma = event.gamma ? THREE.MathUtils.degToRad(event.gamma) : 0;
        const orient = window.screen.orientation ? THREE.MathUtils.degToRad(window.screen.orientation.angle) : 0;

        threeRef.current.deviceOrientation = { alpha, beta, gamma, orient };
      };

      window.addEventListener('deviceorientation', onOrientation, true);
      setIsGyroActive(true);
      showNotification('Giroscópio ativado! Mova seu aparelho.');
    };

    // Check iOS 13+ permission
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      try {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        if (response === 'granted') {
          startOrientation();
        } else {
          showNotification('Permissão de giroscópio negada pelo usuário.');
        }
      } catch (err) {
        console.error(err);
        showNotification('Erro ao solicitar permissão do sensor.');
      }
    } else {
      startOrientation();
    }
  }, [isGyroActive, showNotification]);

  // Handle VR Mode
  const toggleVR = useCallback(async () => {
    if (!threeRef.current) return;
    const renderer = threeRef.current.renderer;

    if ('xr' in navigator && (navigator as any).xr) {
      try {
        const supported = await (navigator as any).xr.isSessionSupported('immersive-vr');
        if (supported) {
          const session = await (navigator as any).xr.requestSession('immersive-vr');
          renderer.xr.setSession(session);
          showNotification('Modo WebXR VR iniciado!');
          return;
        }
      } catch (e) {
        console.warn('WebXR VR not supported or canceled:', e);
      }
    }

    // Fallback: Stereo VR mode notification & Fullscreen immersion
    if (!isFullscreen) {
      toggleFullscreen();
    }
    setStereoVrMode((prev) => !prev);
    showNotification(
      stereoVrMode
        ? 'Modo imersivo padrão ativado.'
        : 'Modo VR imersivo ativado para óculos/headsets!'
    );
  }, [isFullscreen, stereoVrMode, toggleFullscreen, showNotification]);

  // Swap Foto 1 and Foto 2
  const handleSwapPhotos = useCallback(() => {
    if (!threeRef.current) return;
    const tempP1 = { ...photo1 };
    const tempP2 = { ...photo2 };

    setPhoto1(tempP2);
    setPhoto2(tempP1);

    // Swap materials
    loadTextureOntoMaterial(tempP2.url, threeRef.current.mat1);
    loadTextureOntoMaterial(tempP1.url, threeRef.current.mat2);

    // Invert slider to keep visual state natural
    setBlendValue((v) => parseFloat((1 - v).toFixed(2)));
    showNotification('Fotos invertidas com sucesso!');
  }, [photo1, photo2, loadTextureOntoMaterial, showNotification]);

  // Reset Camera View
  const handleResetCamera = useCallback(() => {
    if (!threeRef.current) return;
    threeRef.current.lon = 0;
    threeRef.current.lat = 0;
    threeRef.current.targetFov = 75;
    threeRef.current.camera.fov = 75;
    threeRef.current.camera.updateProjectionMatrix();
    showNotification('Ângulo de visão reiniciado.');
  }, [showNotification]);

  // Select item from gallery into a specific slot
  const selectGalleryItem = useCallback(
    (item: GalleryItem, slot: 1 | 2) => {
      if (!threeRef.current) return;

      if (slot === 1) {
        setPhoto1({ title: item.title, url: item.url, id: item.id });
        loadTextureOntoMaterial(item.url, threeRef.current.mat1, () => {
          showNotification(`Foto 1 atualizada: "${item.title}"`);
        });
      } else {
        setPhoto2({ title: item.title, url: item.url, id: item.id });
        loadTextureOntoMaterial(item.url, threeRef.current.mat2, () => {
          showNotification(`Foto 2 atualizada: "${item.title}"`);
        });
      }
    },
    [loadTextureOntoMaterial, showNotification]
  );

  // Handle custom file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, slot: 1 | 2) => {
    const file = e.target.files?.[0];
    if (!file || !threeRef.current) return;

    const objectUrl = URL.createObjectURL(file);
    const filename = file.name.replace(/\.[^/.]+$/, '');

    if (slot === 1) {
      setPhoto1({ title: filename, url: objectUrl });
      loadTextureOntoMaterial(objectUrl, threeRef.current.mat1, () => {
        showNotification(`Foto 1 carregada: "${filename}"`);
      });
    } else {
      setPhoto2({ title: filename, url: objectUrl });
      loadTextureOntoMaterial(objectUrl, threeRef.current.mat2, () => {
        showNotification(`Foto 2 carregada: "${filename}"`);
      });
    }
  };

  // Divide gallery into 5 left and 5 right
  const leftGallery = GALLERY_ITEMS.slice(0, 5);
  const rightGallery = GALLERY_ITEMS.slice(5, 10);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-2 sm:p-4 select-none">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInput1Ref}
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileUpload(e, 1)}
      />
      <input
        type="file"
        ref={fileInput2Ref}
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileUpload(e, 2)}
      />

      {/* Main Grid: Left 5 thumbnails | Center Viewer | Right 5 thumbnails */}
      <div
        className={`w-full h-full flex flex-row items-center justify-between gap-3 lg:gap-5 transition-all duration-300 ${isFullscreen ? 'p-0' : 'max-w-[1720px] mx-auto'
          }`}
      >
        {/* Left Column: 5 Gallery Thumbnails (Only visible when NOT fullscreen) */}
        {!isFullscreen && (
          <aside className="hidden xl:flex flex-col gap-2.5 w-[210px] 2xl:w-[240px] shrink-0 h-[calc(100vh-140px)] max-h-[820px] overflow-y-auto pr-1">
            <div className="flex items-center justify-between px-2 py-1 bg-white/5 rounded-lg border border-white/5 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                Galeria Esquerda
              </span>
              <span className="text-[10px] text-gray-400 font-mono">1 - 5</span>
            </div>

            {leftGallery.map((item, idx) => {
              const isSelected1 = photo1.id === item.id;
              const isSelected2 = photo2.id === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => selectGalleryItem(item, targetSlot)}
                  className={`group relative rounded-xl overflow-hidden border cursor-pointer transition-all duration-300 hover:scale-[1.02] shadow-md flex-1 min-h-[96px] ${isSelected1
                      ? 'border-blue-500 ring-2 ring-blue-500/40 bg-blue-950/30'
                      : isSelected2
                        ? 'border-purple-500 ring-2 ring-purple-500/40 bg-purple-950/30'
                        : 'border-white/10 hover:border-blue-400/40 bg-slate-900/60'
                    }`}
                >
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-75 group-hover:opacity-100"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2.5 flex flex-col justify-end">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-[10px] font-mono text-gray-300 bg-white/10 px-1.5 py-0.5 rounded backdrop-blur-sm">
                        0{idx + 1}
                      </span>
                      <div className="flex gap-1">
                        {isSelected1 && (
                          <span className="bg-blue-600 text-[9px] font-bold text-white px-1.5 py-0.5 rounded shadow">
                            Foto 1
                          </span>
                        )}
                        {isSelected2 && (
                          <span className="bg-purple-600 text-[9px] font-bold text-white px-1.5 py-0.5 rounded shadow">
                            Foto 2
                          </span>
                        )}
                      </div>
                    </div>
                    <h3 className="text-xs font-semibold text-white drop-shadow truncate">{item.title}</h3>
                    <p className="text-[10px] text-gray-400 truncate">{item.category}</p>

                    {/* Quick Slot Buttons on Hover */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        title="Carregar como Foto 1"
                        onClick={(e) => {
                          e.stopPropagation();
                          selectGalleryItem(item, 1);
                        }}
                        className="bg-blue-600/90 hover:bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-sm shadow hover:scale-105 active:scale-95 transition-all"
                      >
                        1
                      </button>
                      <button
                        title="Carregar como Foto 2"
                        onClick={(e) => {
                          e.stopPropagation();
                          selectGalleryItem(item, 2);
                        }}
                        className="bg-purple-600/90 hover:bg-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-sm shadow hover:scale-105 active:scale-95 transition-all"
                      >
                        2
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </aside>
        )}

        {/* Center: Main 360 Viewer Canvas Container */}
        <div
          ref={containerRef}
          className={`relative flex-1 flex flex-col items-center justify-center transition-all duration-300 overflow-hidden ${isFullscreen
              ? 'fixed inset-0 z-50 w-screen h-screen rounded-none'
              : 'h-[calc(100vh-140px)] max-h-[820px] rounded-3xl border border-white/15 shadow-[0_0_50px_rgba(0,0,0,0.8)] bg-black'
            }`}
        >
          {/* WebGL Canvas */}
          <div
            ref={canvasMountRef}
            className="w-full h-full cursor-grab active:cursor-grabbing relative"
            style={{ touchAction: 'none' }}
          />

          {/* Loading Indicator */}
          {isLoading && (
            <div className="absolute top-6 left-6 z-20 flex items-center gap-2.5 bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 text-xs font-medium text-blue-300 shadow-lg">
              <span className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
              Carregando textura 360...
            </div>
          )}

          {/* Toast Notification Box */}
          {message && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 bg-slate-900/90 border border-blue-500/40 text-blue-200 text-xs sm:text-sm font-medium px-4 py-2 rounded-full shadow-2xl backdrop-blur-xl animate-fade-in flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {/* Top Info Bar inside Viewer */}
          <div className="absolute top-4 sm:top-6 right-4 sm:right-6 z-20 flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[11px] text-gray-300">
              <span className="flex items-center gap-1 text-blue-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                Foto 1: {photo1.title}
              </span>
              <span className="text-gray-500">•</span>
              <span className="flex items-center gap-1 text-purple-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                Foto 2: {photo2.title}
              </span>
            </div>

            <button
              onClick={handleResetCamera}
              title="Resetar Posição da Câmera"
              className="bg-black/60 hover:bg-black/80 text-gray-300 hover:text-white p-2 sm:px-3 sm:py-1.5 rounded-xl border border-white/10 backdrop-blur-md text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Resetar</span>
            </button>

            {isFullscreen && (
              <button
                onClick={toggleFullscreen}
                title="Sair da Tela Cheia"
                className="bg-red-500/20 hover:bg-red-500/40 text-red-300 border border-red-500/30 p-2 sm:px-3 sm:py-1.5 rounded-xl backdrop-blur-md text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Minimize className="w-3.5 h-3.5" />
                <span>Sair Fullscreen</span>
              </button>
            )}
          </div>

          {/* UI Controls Floating Dock (Centered at Bottom) */}
          <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 w-[94%] max-w-xl bg-slate-950/75 backdrop-blur-2xl border border-white/15 rounded-2xl p-3.5 sm:p-4 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col gap-3">
            {/* Row 1: Upload / Slot Selection Buttons */}
            <div className="flex w-full items-center gap-2 sm:gap-3">
              {/* Foto 1 Slot Button */}
              <div
                onClick={() => setTargetSlot(1)}
                className={`flex-1 rounded-xl p-2 sm:px-3.5 sm:py-2.5 flex items-center justify-between border cursor-pointer transition-all active:scale-98 ${targetSlot === 1
                    ? 'bg-blue-600/25 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                    : 'bg-white/5 hover:bg-white/10 border-white/10'
                  }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${targetSlot === 1 ? 'bg-blue-400 ring-2 ring-blue-300/50' : 'bg-gray-400'
                      }`}
                  />
                  <div className="flex flex-col text-left truncate">
                    <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">
                      Foto 1 {targetSlot === 1 && '(Ativo)'}
                    </span>
                    <span className="text-xs font-semibold text-white truncate max-w-[110px] sm:max-w-[140px]">
                      {photo1.title}
                    </span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInput1Ref.current?.click();
                  }}
                  title="Upload Imagem 360 para Foto 1"
                  className="p-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Swap Button */}
              <button
                onClick={handleSwapPhotos}
                title="Inverter Foto 1 e Foto 2"
                className="p-2 sm:p-2.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-gray-300 hover:text-white transition-all active:scale-90"
              >
                <ArrowLeftRight className="w-4 h-4 text-cyan-400" />
              </button>

              {/* Foto 2 Slot Button */}
              <div
                onClick={() => setTargetSlot(2)}
                className={`flex-1 rounded-xl p-2 sm:px-3.5 sm:py-2.5 flex items-center justify-between border cursor-pointer transition-all active:scale-98 ${targetSlot === 2
                    ? 'bg-purple-600/25 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                    : 'bg-white/5 hover:bg-white/10 border-white/10'
                  }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${targetSlot === 2 ? 'bg-purple-400 ring-2 ring-purple-300/50' : 'bg-gray-400'
                      }`}
                  />
                  <div className="flex flex-col text-left truncate">
                    <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">
                      Foto 2 {targetSlot === 2 && '(Ativo)'}
                    </span>
                    <span className="text-xs font-semibold text-white truncate max-w-[110px] sm:max-w-[140px]">
                      {photo2.title}
                    </span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInput2Ref.current?.click();
                  }}
                  title="Upload Imagem 360 para Foto 2"
                  className="p-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Row 2: Crossfade Transparency Slider */}
            <div className="flex items-center gap-3 bg-black/40 px-3 py-2 sm:py-2.5 rounded-xl border border-white/10">
              <button
                onClick={() => setBlendValue(0)}
                className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2 py-1 rounded transition-colors ${blendValue === 0
                    ? 'bg-blue-600/40 text-blue-300 font-extrabold'
                    : 'text-gray-400 hover:text-white'
                  }`}
              >
                Foto 1
              </button>

              <div className="relative flex-1 flex items-center">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={blendValue}
                  onChange={(e) => setBlendValue(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 rounded-lg appearance-none cursor-pointer focus:outline-none accent-white shadow-inner"
                />
              </div>

              <button
                onClick={() => setBlendValue(1)}
                className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2 py-1 rounded transition-colors ${blendValue === 1
                    ? 'bg-purple-600/40 text-purple-300 font-extrabold'
                    : 'text-gray-400 hover:text-white'
                  }`}
              >
                Foto 2
              </button>

              {/* Auto Crossfade Transition Button */}
              <button
                onClick={() => setIsAutoTransition((v) => !v)}
                title={isAutoTransition ? 'Pausar Transição Automática' : 'Iniciar Transição Suave Automática'}
                className={`p-1.5 rounded-lg border text-xs font-medium transition-all ${isAutoTransition
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                    : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border-white/10'
                  }`}
              >
                {isAutoTransition ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Row 3: Action Buttons (Gyro, Fullscreen, VR, Auto-Rotate) */}
            <div className="flex w-full items-center gap-2 sm:gap-2.5">
              {/* Giroscópio */}
              <button
                onClick={toggleGyroscope}
                className={`flex-1 py-2 px-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all active:scale-95 text-xs sm:text-sm font-medium ${isGyroActive
                    ? 'bg-amber-600/30 border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                    : 'bg-white/5 hover:bg-white/15 border-white/10 text-gray-200'
                  }`}
              >
                <Compass className={`w-4 h-4 ${isGyroActive ? 'text-amber-400 animate-spin' : 'text-amber-400'}`} />
                <span>Giroscópio</span>
              </button>

              {/* VR Suporte */}
              <button
                onClick={toggleVR}
                className={`flex-1 py-2 px-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all active:scale-95 text-xs sm:text-sm font-medium ${stereoVrMode
                    ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.3)]'
                    : 'bg-white/5 hover:bg-white/15 border-white/10 text-gray-200'
                  }`}
              >
                <Glasses className="w-4 h-4 text-cyan-400" />
                <span>Modo VR</span>
              </button>

              {/* Tela Cheia */}
              <button
                onClick={toggleFullscreen}
                className={`flex-1 py-2 px-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all active:scale-95 text-xs sm:text-sm font-medium ${isFullscreen
                    ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                    : 'bg-white/5 hover:bg-white/15 border-white/10 text-gray-200'
                  }`}
              >
                {isFullscreen ? (
                  <>
                    <Minimize className="w-4 h-4 text-emerald-400" />
                    <span>Reduzir</span>
                  </>
                ) : (
                  <>
                    <Maximize className="w-4 h-4 text-emerald-400" />
                    <span>Tela Cheia</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: 5 Gallery Thumbnails (Only visible when NOT fullscreen) */}
        {!isFullscreen && (
          <aside className="hidden xl:flex flex-col gap-2.5 w-[210px] 2xl:w-[240px] shrink-0 h-[calc(100vh-140px)] max-h-[820px] overflow-y-auto pl-1">
            <div className="flex items-center justify-between px-2 py-1 bg-white/5 rounded-lg border border-white/5 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                Galeria Direita
              </span>
              <span className="text-[10px] text-gray-400 font-mono">6 - 10</span>
            </div>

            {rightGallery.map((item, idx) => {
              const isSelected1 = photo1.id === item.id;
              const isSelected2 = photo2.id === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => selectGalleryItem(item, targetSlot)}
                  className={`group relative rounded-xl overflow-hidden border cursor-pointer transition-all duration-300 hover:scale-[1.02] shadow-md flex-1 min-h-[96px] ${isSelected1
                      ? 'border-blue-500 ring-2 ring-blue-500/40 bg-blue-950/30'
                      : isSelected2
                        ? 'border-purple-500 ring-2 ring-purple-500/40 bg-purple-950/30'
                        : 'border-white/10 hover:border-purple-400/40 bg-slate-900/60'
                    }`}
                >
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-75 group-hover:opacity-100"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2.5 flex flex-col justify-end">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-[10px] font-mono text-gray-300 bg-white/10 px-1.5 py-0.5 rounded backdrop-blur-sm">
                        0{idx + 6}
                      </span>
                      <div className="flex gap-1">
                        {isSelected1 && (
                          <span className="bg-blue-600 text-[9px] font-bold text-white px-1.5 py-0.5 rounded shadow">
                            Foto 1
                          </span>
                        )}
                        {isSelected2 && (
                          <span className="bg-purple-600 text-[9px] font-bold text-white px-1.5 py-0.5 rounded shadow">
                            Foto 2
                          </span>
                        )}
                      </div>
                    </div>
                    <h3 className="text-xs font-semibold text-white drop-shadow truncate">{item.title}</h3>
                    <p className="text-[10px] text-gray-400 truncate">{item.category}</p>

                    {/* Quick Slot Buttons on Hover */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        title="Carregar como Foto 1"
                        onClick={(e) => {
                          e.stopPropagation();
                          selectGalleryItem(item, 1);
                        }}
                        className="bg-blue-600/90 hover:bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-sm shadow hover:scale-105 active:scale-95 transition-all"
                      >
                        1
                      </button>
                      <button
                        title="Carregar como Foto 2"
                        onClick={(e) => {
                          e.stopPropagation();
                          selectGalleryItem(item, 2);
                        }}
                        className="bg-purple-600/90 hover:bg-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-sm shadow hover:scale-105 active:scale-95 transition-all"
                      >
                        2
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </aside>
        )}
      </div>

      {/* Mobile / Tablet Horizontal Gallery Drawer (When screen width < 1280px and NOT fullscreen) */}
      {!isFullscreen && (
        <div className="xl:hidden w-full max-w-xl mt-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-gray-400 px-1">
            <span className="font-semibold text-gray-200">Galeria 360 ({GALLERY_ITEMS.length} fotos)</span>
            <span>Toque para aplicar na {targetSlot === 1 ? 'Foto 1' : 'Foto 2'}</span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
            {GALLERY_ITEMS.map((item, idx) => {
              const isSelected1 = photo1.id === item.id;
              const isSelected2 = photo2.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => selectGalleryItem(item, targetSlot)}
                  className={`shrink-0 w-28 h-20 rounded-xl overflow-hidden relative border cursor-pointer ${isSelected1
                      ? 'border-blue-500 ring-2 ring-blue-500/50'
                      : isSelected2
                        ? 'border-purple-500 ring-2 ring-purple-500/50'
                        : 'border-white/10'
                    }`}
                >
                  <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-black/60 flex flex-col justify-end p-1.5">
                    <span className="text-[10px] font-semibold text-white truncate">{item.title}</span>
                    <span className="text-[8px] text-gray-300">
                      {isSelected1 ? 'Foto 1' : isSelected2 ? 'Foto 2' : `#0${idx + 1}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
