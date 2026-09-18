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
  Check,
  AlertCircle,
} from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomSettings, FurnitureInstance } from '../types/furniture';
import { normalizeEquirectangularPanorama } from '../lib/equirectangularExporter';

interface PanoramaViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapturePanorama: (options: { eyeHeight?: number; width?: number; height?: number }) => string;
  projectName?: string;
  roomHeight?: number;
  room?: RoomSettings;
  furniture?: FurnitureInstance[];
  initialPanoramaUrl?: string;
}

export default function PanoramaViewerModal({
  isOpen,
  onClose,
  onCapturePanorama,
  projectName = 'Projeto',
  roomHeight = 2.8,
  room,
  furniture = [],
  initialPanoramaUrl = '',
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
  const [raw3dPanoramaUrl, setRaw3dPanoramaUrl] = useState<string>('');
  const [ai3dPanoramaUrl, setAi3dPanoramaUrl] = useState<string>('');
  const [viewMode, setViewMode] = useState<'3d' | 'ai' | 'custom'>('3d');
  const [selectedEngine, setSelectedEngine] = useState<'openai' | 'gemini'>('gemini');

  const [isCustomImage, setIsCustomImage] = useState<boolean>(false);
  const [customImageName, setCustomImageName] = useState<string>('');
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
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
    setViewMode('3d');
    setTimeout(() => {
      try {
        const url = onCapturePanorama({
          eyeHeight: heightVal,
          width: res.w,
          height: res.h,
        });
        if (url) {
          panoramaUrlRef.current = url;
          setRaw3dPanoramaUrl(url);
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

  // AI 360 Render with OpenAI (gpt-image-1.5)
  const handleGenerateAiPanorama = async () => {
    let base360Shot = raw3dPanoramaUrl;
    if (!base360Shot) {
      try {
        base360Shot = onCapturePanorama({
          eyeHeight: selectedHeight,
          width: 2048,
          height: 1024,
        });
        if (base360Shot) {
          setRaw3dPanoramaUrl(base360Shot);
        }
      } catch (e) {
        console.error('Failed to capture base 360:', e);
      }
    }

    if (!base360Shot) {
      setAiError('Não foi possível capturar a imagem 360° da cena.');
      return;
    }

    setIsGeneratingAi(true);
    setAiError(null);

    const sceneJson = {
      project: projectName || 'Ambiente iCanvas 3D',
      renderType: '360',
      room: room
        ? {
            width: room.width,
            depth: room.depth,
            height: room.height,
            floorColor: room.floorColor,
          }
        : undefined,
      furniture: furniture.map((f) => ({
        name: f.name,
        placement: f.pr,
        position: [f.x, +(f.by || 0).toFixed(2), f.z],
        rotationDegrees: Math.round((((f.rot || 0) * 180) / Math.PI) % 360 + 360) % 360,
        dimensions: [f.w, f.h, f.d],
        finish: f.dm?.t || 'wood',
        color: f.dm?.c || '#ffffff',
      })),
    };

    try {
      const savedKey =
        typeof window !== 'undefined'
          ? localStorage.getItem('icanvas_openai_api_key') || undefined
          : undefined;

      const res = await fetch('/api/render-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base360Shot,
          renderType: '360',
          engine: selectedEngine,
          styleId: 'luxury-modern',
          lightingId: 'daylight',
          sceneJson,
          userApiKey: savedKey,
          model: 'gpt-image-1.5',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Falha ao gerar render 360° com IA.');
      }

      if (data.renderedImageUrl) {
        const finalUrl = data.renderedImageUrl;
        setAi3dPanoramaUrl(finalUrl);
        panoramaUrlRef.current = finalUrl;
        setPanoramaUrl(finalUrl);
        setViewMode('ai');
        setIsCustomImage(false);
        applyTextureToSphere(finalUrl);
      }
    } catch (err: any) {
      console.error('AI 360 error:', err);
      setAiError(err.message || 'Erro ao processar render 360° com IA.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Switch between 3D and AI 360 views
  const handleSwitchView = (mode: '3d' | 'ai') => {
    setViewMode(mode);
    if (mode === '3d' && raw3dPanoramaUrl) {
      panoramaUrlRef.current = raw3dPanoramaUrl;
      setPanoramaUrl(raw3dPanoramaUrl);
      applyTextureToSphere(raw3dPanoramaUrl);
    } else if (mode === 'ai' && ai3dPanoramaUrl) {
      panoramaUrlRef.current = ai3dPanoramaUrl;
      setPanoramaUrl(ai3dPanoramaUrl);
      applyTextureToSphere(ai3dPanoramaUrl);
    }
  };

  // Handle Local Custom Image File Upload
  const handleLoadCustomImage = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;

    setIsGenerating(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      if (url) {
        panoramaUrlRef.current = url;
        setPanoramaUrl(url);
        setIsCustomImage(true);
        setViewMode('custom');
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

  // Initial capture or load when opened
  useEffect(() => {
    if (isOpen) {
      if (initialPanoramaUrl) {
        setAi3dPanoramaUrl(initialPanoramaUrl);
        panoramaUrlRef.current = initialPanoramaUrl;
        setPanoramaUrl(initialPanoramaUrl);
        setViewMode('ai');
        setIsCustomImage(false);
        applyTextureToSphere(initialPanoramaUrl);
      } else {
        handleGeneratePanorama(selectedHeight, selectedResolution);
      }
    } else {
      panoramaUrlRef.current = '';
      setPanoramaUrl('');
      setIsCustomImage(false);
      setAiError(null);
    }
  }, [isOpen, initialPanoramaUrl]);

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
      : viewMode === 'ai'
      ? `${projectName.toLowerCase().replace(/\s+/g, '_')}_IA_360_panorama.png`
      : `${projectName.toLowerCase().replace(/\s+/g, '_')}_3D_panorama_${selectedResolution.w}x${selectedResolution.h}.jpg`;
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
            : 'max-w-6xl h-[92vh] max-h-[880px] border border-white/10 rounded-2xl shadow-2xl'
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-slate-950/80 backdrop-blur-lg">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
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
                      Arquivo ({customImageName.length > 20 ? `${customImageName.slice(0, 20)}...` : customImageName})
                    </span>
                  </span>
                ) : viewMode === 'ai' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-purple-500/30 via-indigo-500/30 to-emerald-500/30 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <Sparkles className="size-3 text-emerald-400" />
                    <span>{selectedEngine === 'gemini' ? '⚡ Google Gemini 2.0' : '✨ OpenAI gpt-image-1.5'}</span>
                  </span>
                ) : (
                  <>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {selectedResolution.w >= 4096 ? '4K UHD' : '2K HD'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      Cena 3D iCanvas
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs text-white/50">
                Navegue em 360° pelo ambiente ou gere o render fotorrealista com IA
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Engine Switcher (Gemini vs OpenAI) */}
            <div className="flex items-center bg-black/40 p-0.5 rounded-xl border border-white/15">
              <button
                onClick={() => setSelectedEngine('gemini')}
                disabled={isGeneratingAi}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  selectedEngine === 'gemini'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Google Gemini 2.0 Flash / Imagen 3 (Recomendado para 360° sem distorções)"
              >
                <span>⚡ Gemini 2.0</span>
              </button>
              <button
                onClick={() => setSelectedEngine('openai')}
                disabled={isGeneratingAi}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  selectedEngine === 'openai'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="OpenAI gpt-image-1.5"
              >
                <span>✨ OpenAI</span>
              </button>
            </div>

            {/* Toggle 3D Original vs IA Fotorrealista if AI is available */}
            {ai3dPanoramaUrl && (
              <div className="flex items-center bg-black/40 p-0.5 rounded-xl border border-white/15">
                <button
                  onClick={() => handleSwitchView('3d')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    viewMode === '3d'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  3D Original
                </button>
                <button
                  onClick={() => handleSwitchView('ai')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    viewMode === 'ai'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="size-3 text-emerald-300" />
                  <span>Render IA</span>
                </button>
              </div>
            )}

            {/* Direct AI 360 Render Button */}
            <button
              onClick={handleGenerateAiPanorama}
              disabled={isGeneratingAi || isGenerating}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer border ${
                isGeneratingAi
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                  : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 text-white border-white/20 shadow-indigo-600/30'
              }`}
              title={`Gerar render 360° com ${selectedEngine === 'gemini' ? 'Google Gemini 2.0' : 'OpenAI gpt-image-1.5'}`}
            >
              <Sparkles className={`size-3.5 ${isGeneratingAi ? 'animate-spin text-emerald-400' : 'text-amber-300'}`} />
              <span>{isGeneratingAi ? 'Renderizando IA...' : 'Render 360° IA'}</span>
            </button>

            {/* Open / Upload Custom Image Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5 border border-white/15 transition-all active:scale-95 cursor-pointer shadow-sm"
              title="Carregar uma foto equirretangular 360° do seu computador (JPG, PNG, WEBP)"
            >
              <FolderOpen className="size-3.5 text-amber-400" />
              <span>Abrir 360°</span>
            </button>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              disabled={!panoramaUrl || isGenerating || isGeneratingAi}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 border border-emerald-400/30 transition-all active:scale-95 cursor-pointer"
              title="Baixar imagem 360° em alta definição"
            >
              <Download className="size-3.5" />
              <span className="hidden sm:inline">Baixar</span>
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

          {/* AI Generation Loading Overlay */}
          {isGeneratingAi && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center gap-3 z-20">
              <div className="relative size-16">
                <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                <div className="relative w-full h-full rounded-full border-3 border-emerald-500/30 border-t-emerald-400 animate-spin flex items-center justify-center">
                  <Sparkles className="size-7 text-emerald-400 animate-pulse" />
                </div>
              </div>
              <p className="text-sm font-bold text-white tracking-wide">
                Renderizando Panorama 360° com {selectedEngine === 'gemini' ? 'Google Gemini' : 'OpenAI (gpt-image-1.5)'}...
              </p>
              <p className="text-xs text-neutral-400 max-w-sm text-center">
                Gerando projeção esférica 360° contínua, iluminação volumétrica e materiais fotorrealistas.
              </p>
            </div>
          )}

          {/* Normal Capture Loading Overlay */}
          {isGenerating && !isGeneratingAi && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-20">
              <div className="w-12 h-12 rounded-full border-3 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              <p className="text-sm font-semibold text-white tracking-wide">
                Processando Panorama 360°...
              </p>
              <p className="text-xs text-white/50">Carregando projeção e mapeamento esférico</p>
            </div>
          )}

          {/* AI Error Toast */}
          {aiError && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2.5 rounded-xl bg-rose-950/90 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2 shadow-2xl backdrop-blur-md animate-in fade-in">
              <AlertCircle className="size-4 text-rose-400 shrink-0" />
              <span>{aiError}</span>
              <button
                onClick={() => setAiError(null)}
                className="ml-2 p-1 hover:bg-white/10 rounded-lg"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}

          {/* Architectural Opening & Lighting Hint */}
          <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-white/10 text-[11px] text-amber-200/90 flex items-center gap-2 max-w-sm sm:max-w-md pointer-events-none shadow-lg">
            <AlertCircle className="size-3.5 text-amber-400 shrink-0" />
            <span>
              <strong>Dica de Portas e Vãos:</strong> A IA projeta continuações de ambientes iluminados ou áreas externas para evitar fundos pretos nos vãos.
            </span>
          </div>

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
              <span>Arraste na tela para orbitar em 360°</span>
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

          {/* Resolution Selection & Recapture */}
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
              disabled={isGenerating || isGeneratingAi}
              className="ml-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium flex items-center gap-1.5 transition-all border border-white/10 active:scale-95 cursor-pointer"
              title="Recapturar panorama com alterações atuais do ambiente 3D"
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
