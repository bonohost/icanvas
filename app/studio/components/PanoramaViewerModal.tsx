'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Compass,
  Download,
  Upload,
  FolderOpen,
  Maximize2,
  Minimize2,
  RotateCw,
  Play,
  Pause,
  Eye,
  ZoomIn,
  ZoomOut,
  Layers,
  Sparkles,
  Image as ImageIcon,
  Box,
} from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface PanoramaViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapturePanorama: (options: { eyeHeight?: number; width?: number; height?: number }) => string;
  projectName?: string;
  roomHeight?: number;
}

export default function PanoramaViewerModal({
  isOpen,
  onClose,
  onCapturePanorama,
  projectName = 'Projeto',
  roomHeight = 2.8,
}: PanoramaViewerModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const sphereMeshRef = useRef<THREE.Mesh | null>(null);
  const textureRef = useRef<THREE.Texture | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [panoramaUrl, setPanoramaUrl] = useState<string>('');
  const [isCustomImage, setIsCustomImage] = useState<boolean>(false);
  const [customImageName, setCustomImageName] = useState<string>('');
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isAutoRotate, setIsAutoRotate] = useState<boolean>(true);
  const [selectedHeight, setSelectedHeight] = useState<number>(1.55);
  const [selectedResolution, setSelectedResolution] = useState<{ w: number; h: number; label: string }>({
    w: 4096,
    h: 2048,
    label: '4K Ultra (4096×2048)',
  });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const modalWrapperRef = useRef<HTMLDivElement>(null);
  const panoramaUrlRef = useRef<string>('');

  const applyTextureToSphere = useCallback((url: string) => {
    if (!url || !sphereMeshRef.current) return;

    const loader = new THREE.TextureLoader();
    loader.load(url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;

      if (textureRef.current) textureRef.current.dispose();
      textureRef.current = tex;

      if (sphereMeshRef.current) {
        const mat = sphereMeshRef.current.material as THREE.MeshBasicMaterial;
        mat.map = tex;
        mat.side = THREE.DoubleSide;
        mat.needsUpdate = true;
      }
    });
  }, []);

  // Generate / Capture Panorama from current 3D Scene
  const handleGeneratePanorama = (heightVal = selectedHeight, res = selectedResolution) => {
    setIsGenerating(true);
    setIsCustomImage(false);
    setCustomImageName('');
    setTimeout(() => {
      try {
        const url = onCapturePanorama({
          eyeHeight: heightVal,
          width: res.w,
          height: res.h,
        });
        if (url) {
          panoramaUrlRef.current = url;
          setPanoramaUrl(url);
          applyTextureToSphere(url);
        }
      } catch (err) {
        console.error('Erro ao gerar panorama 360:', err);
      } finally {
        setIsGenerating(false);
      }
    }, 60);
  };

  // Handle Local Custom Image File Upload
  const handleLoadCustomImage = (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;

    setIsGenerating(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      if (url) {
        panoramaUrlRef.current = url;
        setPanoramaUrl(url);
        setIsCustomImage(true);
        setCustomImageName(file.name);
        applyTextureToSphere(url);
      }
      setIsGenerating(false);
    };
    reader.onerror = () => {
      console.error('Erro ao carregar arquivo de imagem 360');
      setIsGenerating(false);
    };
    reader.readAsDataURL(file);
  };

  // Initial capture when opened
  useEffect(() => {
    if (isOpen) {
      handleGeneratePanorama(selectedHeight, selectedResolution);
    } else {
      panoramaUrlRef.current = '';
      setPanoramaUrl('');
      setIsCustomImage(false);
    }
  }, [isOpen]);

  // Setup Three.js 360 Viewer
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 0, 0.1);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.rotateSpeed = -0.35;
    controls.autoRotate = isAutoRotate;
    controls.autoRotateSpeed = 0.6;
    controls.minDistance = 0.05;
    controls.maxDistance = 1.0;
    controlsRef.current = controls;

    const sphereGeo = new THREE.SphereGeometry(500, 64, 40);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
    });
    const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
    scene.add(sphereMesh);
    sphereMeshRef.current = sphereMesh;

    if (panoramaUrlRef.current) {
      applyTextureToSphere(panoramaUrlRef.current);
    }

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (controlsRef.current) controlsRef.current.update();
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    const handleResize = () => {
      if (!container || !cameraRef.current || !rendererRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      sphereGeo.dispose();
      sphereMat.dispose();
      if (textureRef.current) textureRef.current.dispose();
    };
  }, [isOpen, applyTextureToSphere]);

  // Update sphere texture when panoramaUrl state changes
  useEffect(() => {
    if (panoramaUrl) {
      applyTextureToSphere(panoramaUrl);
    }
  }, [panoramaUrl, applyTextureToSphere]);

  // Update auto-rotate
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = isAutoRotate;
    }
  }, [isAutoRotate]);

  // Close modal on ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Listen to native browser fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!modalWrapperRef.current) return;
    if (!document.fullscreenElement) {
      modalWrapperRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Zoom helpers
  const handleZoom = (deltaFov: number) => {
    if (!cameraRef.current) return;
    cameraRef.current.fov = THREE.MathUtils.clamp(cameraRef.current.fov + deltaFov, 35, 95);
    cameraRef.current.updateProjectionMatrix();
  };

  // Download 360 image
  const handleDownload = () => {
    if (!panoramaUrl) return;
    const a = document.createElement('a');
    a.href = panoramaUrl;
    const filename = isCustomImage && customImageName
      ? `360_${customImageName}`
      : `${projectName.toLowerCase().replace(/\s+/g, '_')}_panorama_360_${selectedResolution.w}x${selectedResolution.h}.jpg`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleLoadCustomImage(files[0]);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={modalWrapperRef}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md transition-all duration-200 ${
        isFullscreen ? 'p-0' : 'p-2 sm:p-4'
      }`}
    >
      {/* Hidden File Input for Custom Image Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleLoadCustomImage(e.target.files[0]);
          }
        }}
      />

      <div
        className={`relative w-full flex flex-col overflow-hidden text-white bg-slate-900 transition-all duration-200 ${
          isFullscreen
            ? 'h-full w-full max-w-none max-h-none rounded-none border-0'
            : 'max-w-6xl h-[90vh] max-h-[860px] border border-white/10 rounded-2xl shadow-2xl'
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-slate-950/70 backdrop-blur-lg">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Compass className="size-5 text-white animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight text-white">Visualizador Panorâmico 360°</h3>
                {isCustomImage ? (
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 max-w-[280px]"
                    title={customImageName}
                  >
                    <ImageIcon className="size-3 shrink-0 text-amber-400" />
                    <span className="truncate">
                      Imagem ({customImageName.length > 24 ? `${customImageName.slice(0, 24)}...` : customImageName})
                    </span>
                  </span>
                ) : (
                  <>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {selectedResolution.w >= 4096 ? '4K UHD' : '2K HD'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Cena 3D iCanvas
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs text-white/50">Navegue em 360° pelo ambiente ou abra fotos panorâmicas do seu computador</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Open / Upload Custom Image Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5 border border-white/15 transition-all active:scale-95 cursor-pointer shadow-sm"
              title="Carregar uma foto equirretangular 360° do seu computador (JPG, PNG, WEBP)"
            >
              <FolderOpen className="size-3.5 text-amber-400" />
              <span>Abrir Imagem 360°</span>
            </button>

            {/* If Custom image is loaded, show button to restore 3D scene */}
            {isCustomImage && (
              <button
                onClick={() => handleGeneratePanorama()}
                className="px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 text-purple-200 text-xs font-semibold flex items-center gap-1.5 border border-purple-500/40 transition-all active:scale-95 cursor-pointer"
                title="Voltar para a visualização 360° da cena 3D atual"
              >
                <Box className="size-3.5" />
                <span>Voltar ao 3D</span>
              </button>
            )}

            {/* Download Button */}
            <button
              onClick={handleDownload}
              disabled={!panoramaUrl || isGenerating}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 border border-indigo-400/30 transition-all active:scale-95 cursor-pointer"
              title="Baixar imagem 360° em alta definição"
            >
              <Download className="size-3.5" />
              <span className="hidden sm:inline">Baixar 360°</span>
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition-colors cursor-pointer"
              title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            >
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 text-white/80 border border-white/10 transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Main 360 Viewport Area (Supports Drag and Drop) */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="relative flex-1 bg-black overflow-hidden select-none"
        >
          <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

          {/* Drag & Drop Visual Hint Overlay */}
          {isDraggingFile && (
            <div className="absolute inset-0 bg-indigo-950/85 backdrop-blur-md flex flex-col items-center justify-center gap-3 z-30 border-2 border-dashed border-indigo-400 m-4 rounded-xl">
              <Upload className="size-12 text-indigo-300 animate-bounce" />
              <p className="text-base font-bold text-white">Solte a imagem 360° aqui</p>
              <p className="text-xs text-indigo-200">Suporta JPG, PNG e WEBP equirretangulares</p>
            </div>
          )}

          {/* Loading Overlay */}
          {isGenerating && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-20">
              <div className="w-12 h-12 rounded-full border-3 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              <p className="text-sm font-semibold text-white tracking-wide">
                Processando Panorama 360°...
              </p>
              <p className="text-xs text-white/50">Carregando projeção e mapeamento esférico</p>
            </div>
          )}

          {/* On-Screen Quick Control Floating Pill */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/85 backdrop-blur-md border border-white/15 shadow-xl">
            {/* Auto-Rotate Toggle */}
            <button
              onClick={() => setIsAutoRotate(!isAutoRotate)}
              className={`p-2 rounded-full text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                isAutoRotate
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-white/5 hover:bg-white/10 text-white/70'
              }`}
              title={isAutoRotate ? 'Pausar rotação automática' : 'Iniciar rotação automática'}
            >
              {isAutoRotate ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              <span className="text-[11px] pr-1">{isAutoRotate ? 'Girando' : 'Girar'}</span>
            </button>

            <div className="h-4 w-px bg-white/15 mx-0.5" />

            {/* Zoom Controls */}
            <button
              onClick={() => handleZoom(-10)}
              className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/80 transition-colors cursor-pointer"
              title="Aproximar Zoom"
            >
              <ZoomIn className="size-3.5" />
            </button>
            <button
              onClick={() => handleZoom(10)}
              className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/80 transition-colors cursor-pointer"
              title="Afastar Zoom"
            >
              <ZoomOut className="size-3.5" />
            </button>

            <div className="h-4 w-px bg-white/15 mx-0.5" />

            {/* Hint */}
            <div className="flex items-center gap-1 text-[11px] text-white/60 px-1">
              <RotateCw className="size-3 text-indigo-400" />
              <span>Arraste com o mouse para navegar em 360°</span>
            </div>
          </div>
        </div>

        {/* Bottom Options & Configuration Bar */}
        <div className="px-5 py-3 bg-slate-950/80 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs">
          {/* Height Selection */}
          <div className="flex items-center gap-2">
            <span className="text-white/60 font-medium flex items-center gap-1">
              <Eye className="size-3.5 text-indigo-400" />
              Altura da Câmera:
            </span>
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-white/10">
              {[
                { label: 'Em Pé (1.60m)', val: 1.6 },
                { label: 'Sentado (1.15m)', val: 1.15 },
                { label: 'Centro da Sala', val: roomHeight / 2 },
              ].map((opt) => (
                <button
                  key={opt.label}
                  disabled={isCustomImage}
                  onClick={() => {
                    setSelectedHeight(opt.val);
                    handleGeneratePanorama(opt.val, selectedResolution);
                  }}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all disabled:opacity-40 cursor-pointer ${
                    !isCustomImage && Math.abs(selectedHeight - opt.val) < 0.05
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Resolution Selection */}
          <div className="flex items-center gap-2">
            <span className="text-white/60 font-medium flex items-center gap-1">
              <Layers className="size-3.5 text-purple-400" />
              Resolução:
            </span>
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-white/10">
              {[
                { w: 4096, h: 2048, label: '4K Ultra (4096×2048)' },
                { w: 2048, h: 1024, label: '2K HD (2048×1024)' },
              ].map((res) => (
                <button
                  key={res.label}
                  disabled={isCustomImage}
                  onClick={() => {
                    setSelectedResolution(res);
                    handleGeneratePanorama(selectedHeight, res);
                  }}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all disabled:opacity-40 cursor-pointer ${
                    !isCustomImage && selectedResolution.w === res.w
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {res.w >= 4096 ? '4K (4096×2048)' : '2K (2048×1024)'}
                </button>
              ))}
            </div>

            {/* Recapture Button */}
            <button
              onClick={() => handleGeneratePanorama()}
              disabled={isGenerating}
              className="ml-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium flex items-center gap-1.5 transition-all border border-white/10 active:scale-95 cursor-pointer"
              title="Recapturar panorama com alterações atuais do ambiente"
            >
              <RotateCw className={`size-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>Recapturar 3D</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
