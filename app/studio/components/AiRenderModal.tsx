'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Download,
  Copy,
  Check,
  RefreshCw,
  Key,
  Sun,
  Sunset,
  Moon,
  Lamp,
  Layers,
  Sliders,
  Maximize2,
  Info,
  AlertCircle,
  Palette,
  Eye,
  Compass,
  Camera,
  ExternalLink,
} from 'lucide-react';
import { RoomSettings, FurnitureInstance } from '../types/furniture';
import { normalizeEquirectangularPanorama } from '../lib/equirectangularExporter';

interface AiRenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptureSnapshot: () => string;
  onCapturePanorama?: (options: { eyeHeight?: number; width?: number; height?: number }) => string;
  onOpenPanoramaViewer?: (customUrl: string) => void;
  room: RoomSettings;
  furniture: FurnitureInstance[];
  projectName: string;
}

const RENDER_STYLES = [
  {
    id: 'luxury-modern',
    name: 'Moderno de Luxo',
    desc: 'Mármores nobres, iluminação linear LED e acabamento italiano',
    icon: '💎',
    badge: 'Popular',
  },
  {
    id: 'scandinavian',
    name: 'Escandinavo Japandi',
    desc: 'Madeiras claras, tecidos bouclé, luz natural suave e plantas',
    icon: '🌿',
  },
  {
    id: 'industrial-loft',
    name: 'Industrial Loft',
    desc: 'Paredes de pedra/concreto rústico, perfis pretos e couro',
    icon: '🧱',
  },
  {
    id: 'rustic-chic',
    name: 'Rústico Chic / Fazenda',
    desc: 'Pedras naturais texturizadas, madeira maciça e aconchego',
    icon: '🌾',
  },
  {
    id: 'classic',
    name: 'Clássico Elegante',
    desc: 'Boiseries, piso espinha de peixe e lustres sofisticados',
    icon: '🏛️',
  },
  {
    id: 'minimalist',
    name: 'Minimalismo Puro',
    desc: 'Linhas puras, armários ocultos e blocos monolíticos',
    icon: '✨',
  },
];

const LIGHTING_OPTIONS = [
  {
    id: 'daylight',
    name: 'Luz do Dia Ensolarada',
    desc: 'Luz matinal nítida e arejada',
    icon: Sun,
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour (Pôr do Sol)',
    desc: 'Tons âmbar quentes e acolhedores',
    icon: Sunset,
  },
  {
    id: 'night-moody',
    name: 'Noturno Cênico',
    desc: 'Fitas LED embutidas e spots acolhedores',
    icon: Moon,
  },
  {
    id: 'studio-soft',
    name: 'Estúdio Difuso',
    desc: 'Iluminação técnica de catálogo de arquitetura',
    icon: Lamp,
  },
];

export default function AiRenderModal({
  isOpen,
  onClose,
  onCaptureSnapshot,
  onCapturePanorama,
  onOpenPanoramaViewer,
  room,
  furniture,
  projectName,
}: AiRenderModalProps) {
  const [renderType, setRenderType] = useState<'normal' | '360'>('normal');
  const [selectedEngine, setSelectedEngine] = useState<'openai' | 'gemini'>('openai');
  const [snapshotUrl, setSnapshotUrl] = useState<string>('');
  const [renderedUrl, setRenderedUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [selectedStyle, setSelectedStyle] = useState<string>('luxury-modern');
  const [selectedLighting, setSelectedLighting] = useState<string>('daylight');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [userApiKey, setUserApiKey] = useState<string>('');
  const [showKeyConfig, setShowKeyConfig] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [sliderPos, setSliderPos] = useState<number>(50); // Split-screen slider (0 to 100%)
  const isDraggingSlider = useRef(false);
  const [engineUsed, setEngineUsed] = useState<string | null>(null);

  // Load saved API Key from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('icanvas_openai_api_key') || localStorage.getItem('icanvas_gemini_api_key');
    if (saved) setUserApiKey(saved);
  }, []);

  // Capture current scene snapshot or panorama
  const captureCurrentView = (type: 'normal' | '360') => {
    setErrorMessage(null);
    setRenderedUrl(null);
    try {
      if (type === '360' && onCapturePanorama) {
        const panShot = onCapturePanorama({ width: 2048, height: 1024 });
        if (panShot) {
          setSnapshotUrl(panShot);
          return panShot;
        }
      }
      const shot = onCaptureSnapshot();
      if (shot) {
        setSnapshotUrl(shot);
        return shot;
      }
    } catch (e) {
      console.error('Failed to capture view:', e);
    }
    return '';
  };

  // Capture on modal open or renderType switch
  useEffect(() => {
    if (isOpen) {
      captureCurrentView(renderType);
    }
  }, [isOpen, renderType]);

  const handleSaveApiKey = (key: string) => {
    setUserApiKey(key);
    localStorage.setItem('icanvas_openai_api_key', key.trim());
  };

  const handleRecapture = () => {
    captureCurrentView(renderType);
  };

  const handleGenerate = async () => {
    let currentShot = snapshotUrl;
    if (!currentShot) {
      currentShot = captureCurrentView(renderType);
    }

    if (!currentShot) {
      setErrorMessage(
        'Não foi possível capturar a imagem da cena 3D. Tente mover a câmera e clicar em Recapturar Ângulo.'
      );
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    // Build structured Scene JSON describing dimensions, room and all furniture
    const sceneJson = {
      project: projectName || 'Ambiente iCanvas 3D',
      renderType,
      room: {
        width: room.width,
        depth: room.depth,
        height: room.height,
        floorColor: room.floorColor,
        floorTexture: room.floorTextureUrl ? 'textured porcelain/wood' : 'solid',
        walls: {
          back: room.walls.back.color,
          front: room.walls.front.color,
          left: room.walls.left.color,
          right: room.walls.right.color,
        },
        openings: room.openings?.map((o) => ({
          type: o.type,
          wallSide: o.wallSide,
          width: o.width,
          height: o.height,
        })) || [],
      },
      furniture: furniture.map((f) => ({
        id: f.id,
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
      const response = await fetch('/api/render-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: currentShot,
          renderType,
          engine: selectedEngine,
          styleId: selectedStyle,
          lightingId: selectedLighting,
          customPrompt,
          sceneJson,
          userApiKey: userApiKey.trim() || undefined,
          model: 'gpt-image-1.5',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.needsApiKey) {
          setShowKeyConfig(true);
        }
        throw new Error(data.error || data.message || 'Erro ao gerar imagem.');
      }

      if (data.renderedImageUrl) {
        const finalUrl = data.renderedImageUrl;
        setRenderedUrl(finalUrl);
        setEngineUsed(data.engine || (selectedEngine === 'gemini' ? 'Google Gemini 2.0' : 'OpenAI gpt-image-1.5'));
        setSliderPos(50);
      } else {
        throw new Error('Nenhuma imagem foi retornada pelo motor de IA.');
      }
    } catch (err: any) {
      console.error('Render error:', err);
      setErrorMessage(err.message || 'Falha na comunicação com a API de Render IA.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!renderedUrl) return;
    const link = document.createElement('a');
    link.href = renderedUrl;
    const typeLabel = renderType === '360' ? '360_Panorama' : 'Render_Normal';
    link.download = `iCanvas_${typeLabel}_${projectName.replace(/\s+/g, '_')}_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopy = async () => {
    if (!renderedUrl) return;
    try {
      const res = await fetch(renderedUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Could not copy image blob to clipboard, copying URL instead', e);
      await navigator.clipboard.writeText(renderedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Slider dragging handlers
  const handleSliderMove = (clientX: number, containerRect: DOMRect) => {
    const x = clientX - containerRect.left;
    const percentage = Math.max(0, Math.min(100, (x / containerRect.width) * 100));
    setSliderPos(percentage);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 overflow-hidden animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-6xl h-[92vh] max-h-[900px] bg-[#0c1220] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-indigo-500 p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-[#0c1220] rounded-[10px] flex items-center justify-center">
                <Sparkles className="size-5 text-emerald-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Render IA Fotorrealista OpenAI
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-widest">
                  gpt-image-1.5
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Gere renders profissionais de arquitetura em perspectiva normal ou 360° panorâmico equirretangular
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Engine Switcher (OpenAI vs Gemini) */}
            <div className="flex items-center bg-black/50 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setSelectedEngine('gemini')}
                disabled={isGenerating}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  selectedEngine === 'gemini'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Usar Google Gemini 2.0 / Imagen 3 para renderização"
              >
                <span>⚡ Gemini 2.0</span>
              </button>
              <button
                onClick={() => setSelectedEngine('openai')}
                disabled={isGenerating}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  selectedEngine === 'openai'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Usar OpenAI gpt-image-1.5 para renderização"
              >
                <span>✨ OpenAI</span>
              </button>
            </div>

            {/* Render Type Switcher Tabs */}
            <div className="flex items-center bg-black/50 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => {
                  setRenderType('normal');
                }}
                disabled={isGenerating}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  renderType === 'normal'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Camera className="size-3.5" />
                <span>Foto Normal</span>
              </button>
              <button
                onClick={() => {
                  setRenderType('360');
                }}
                disabled={isGenerating}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  renderType === '360'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Compass className="size-3.5 text-amber-300" />
                <span>Render 360°</span>
              </button>
            </div>

            <button
              onClick={() => setShowKeyConfig(!showKeyConfig)}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition-all border ${
                userApiKey
                  ? 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                  : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30'
              }`}
              title="Configurar Chave da API OpenAI"
            >
              <Key className="size-3.5 text-emerald-400" />
              <span>{userApiKey ? 'OpenAI Conectada' : 'API Key'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* API Key Config (Collapsible) */}
        {showKeyConfig && (
          <div className="px-6 py-3 bg-emerald-950/40 border-b border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-emerald-200">
              <Info className="size-4 text-emerald-400 flex-shrink-0" />
              <span>
                Chave da <strong>OpenAI (OPENAI_API_KEY)</strong>:
              </span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="password"
                placeholder="sk-proj-..."
                value={userApiKey}
                onChange={(e) => handleSaveApiKey(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-black/40 border border-emerald-500/30 text-white placeholder-white/30 text-xs w-full sm:w-80 focus:outline-none focus:border-emerald-400 font-mono"
              />
              <button
                onClick={() => setShowKeyConfig(false)}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        )}

        {/* Main Content (Split Preview & Controls) */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Left / Center: Preview Canvas / Interactive Split Screen */}
          <div className="flex-1 bg-[#060a12] p-5 flex flex-col justify-between items-center relative overflow-hidden">
            <div className="w-full flex justify-between items-center mb-3 z-10">
              <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono">
                {renderType === '360' ? (
                  <>
                    <Compass className="size-3.5 text-purple-400" />
                    <span>Captura Equirretangular 360° (2:1)</span>
                  </>
                ) : (
                  <>
                    <Eye className="size-3.5 text-blue-400" />
                    <span>Perspectiva Câmera 3D</span>
                  </>
                )}
                {renderedUrl && renderType === 'normal' && (
                  <span className="text-emerald-400 font-bold ml-2">
                    (Arraste o divisor para comparar Antes / Depois)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRecapture}
                  disabled={isGenerating}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs flex items-center gap-1.5 border border-white/10 transition-colors disabled:opacity-50"
                  title="Atualizar captura da cena 3D atual"
                >
                  <RefreshCw className={`size-3 ${isGenerating ? 'animate-spin' : ''}`} />
                  Recapturar Cena
                </button>
              </div>
            </div>

            {/* Visualizer Area */}
            <div className="relative w-full flex-1 max-h-[62vh] rounded-2xl overflow-hidden border border-white/10 bg-black/60 flex items-center justify-center select-none shadow-inner">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center gap-4 text-center p-6 z-20">
                  <div className="relative size-20">
                    <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                    <div className="relative w-full h-full rounded-full border-2 border-emerald-500/40 border-t-emerald-400 animate-spin flex items-center justify-center">
                      <Sparkles className="size-8 text-emerald-400 animate-pulse" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-wide">
                      {renderType === '360'
                        ? 'Renderizando Panorama 360° Equirretangular...'
                        : 'Gerando Render Fotorrealista OpenAI (gpt-image-1.5)...'}
                    </h3>
                    <p className="text-xs text-neutral-400 mt-1 max-w-sm">
                      {renderType === '360'
                        ? 'Processando projeção esférica 360° contínua com preservação geométrica e iluminação global.'
                        : 'Preservando enquadramento da câmera, paredes e aplicando texturas reais nos móveis.'}
                    </p>
                  </div>
                </div>
              ) : renderedUrl ? (
                renderType === 'normal' ? (
                  /* Interactive Split Screen Comparator (For Normal Render) */
                  <div
                    className="relative w-full h-full overflow-hidden cursor-ew-resize flex items-center justify-center group"
                    onMouseDown={(e) => {
                      isDraggingSlider.current = true;
                      handleSliderMove(e.clientX, e.currentTarget.getBoundingClientRect());
                    }}
                    onMouseMove={(e) => {
                      if (isDraggingSlider.current) {
                        handleSliderMove(e.clientX, e.currentTarget.getBoundingClientRect());
                      }
                    }}
                    onMouseUp={() => {
                      isDraggingSlider.current = false;
                    }}
                    onMouseLeave={() => {
                      isDraggingSlider.current = false;
                    }}
                    onTouchMove={(e) => {
                      if (e.touches[0]) {
                        handleSliderMove(
                          e.touches[0].clientX,
                          e.currentTarget.getBoundingClientRect()
                        );
                      }
                    }}
                  >
                    {/* Base Original 3D snapshot (Underneath) */}
                    <img
                      src={snapshotUrl}
                      alt="3D Original"
                      className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                    />

                    {/* Rendered AI Image (Clipped on top with clipPath) */}
                    <img
                      src={renderedUrl}
                      alt="Render IA"
                      className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                      style={{
                        clipPath: `inset(0 ${100 - sliderPos}% 0 0)`,
                      }}
                    />

                    {/* Divider Line */}
                    <div
                      className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_15px_rgba(16,185,129,0.8)] z-10 pointer-events-none flex items-center justify-center"
                      style={{ left: `${sliderPos}%` }}
                    >
                      <div className="size-8 rounded-full bg-emerald-600 border-2 border-white shadow-xl flex items-center justify-center text-white text-[10px] font-bold">
                        ↔
                      </div>
                    </div>

                    {/* Badges on preview */}
                    <div className="absolute top-3 left-3 px-2 py-1 rounded bg-emerald-600/80 backdrop-blur-md text-[10px] font-bold tracking-wider uppercase border border-emerald-400/40 z-10 pointer-events-none">
                      ✨ OpenAI gpt-image-1.5
                    </div>
                    <div className="absolute top-3 right-3 px-2 py-1 rounded bg-black/70 backdrop-blur-md text-[10px] font-bold tracking-wider uppercase border border-white/20 z-10 pointer-events-none">
                      📐 3D Original
                    </div>
                  </div>
                ) : (
                  /* 360 Rendered Image Preview with Direct 360 Viewer Launch Button */
                  <div className="relative w-full h-full flex flex-col items-center justify-center group overflow-hidden">
                    <img
                      src={renderedUrl}
                      alt="Render 360 IA"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                    <div className="absolute bottom-5 flex items-center gap-3 z-20">
                      {onOpenPanoramaViewer && (
                        <button
                          onClick={() => onOpenPanoramaViewer(renderedUrl)}
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-2xl shadow-indigo-500/40 active:scale-95 transition-all cursor-pointer border border-white/20"
                        >
                          <Compass className="size-4 text-amber-300 animate-spin-slow" />
                          <span>Abrir no Visualizador 360° Interativo</span>
                          <ExternalLink className="size-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-bold tracking-wider uppercase border border-white/20 z-10">
                      🌐 Panorama 360° Equirretangular
                    </div>
                  </div>
                )
              ) : snapshotUrl ? (
                /* Simple Snapshot Preview */
                <img
                  src={snapshotUrl}
                  alt="Prévia da Cena 3D"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-xs text-neutral-400">Carregando visualização 3D...</div>
              )}
            </div>

            {/* Error Display */}
            {errorMessage && (
              <div className="w-full mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-300">
                <AlertCircle className="size-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold">Atenção:</span> {errorMessage}
                </div>
              </div>
            )}

            {/* Post Render Action Bar */}
            {renderedUrl && (
              <div className="w-full flex items-center justify-between mt-3 pt-3 border-t border-white/10 z-10">
                <div className="flex items-center gap-2">
                  <div className="text-xs text-emerald-400 flex items-center gap-1.5 font-semibold">
                    <Check className="size-4" /> Render finalizado com sucesso!
                  </div>
                  {engineUsed && (
                    <span className="text-[10px] text-emerald-300 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-mono">
                      {engineUsed}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-colors"
                  >
                    {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                    <span>{copied ? 'Copiado!' : 'Copiar Imagem'}</span>
                  </button>

                  <button
                    onClick={handleDownload}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                  >
                    <Download className="size-3.5" />
                    <span>{renderType === '360' ? 'Baixar 360° PNG' : 'Baixar Render HD'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Controls & Parameters Sidebar */}
          <div className="w-88 flex-shrink-0 border-l border-white/10 bg-white/[0.01] p-5 overflow-y-auto flex flex-col justify-between gap-5">
            <div className="space-y-4">
              {/* Style Selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5 mb-2">
                  <Palette className="size-3.5 text-emerald-400" /> Estilo de Decoração
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {RENDER_STYLES.map((st) => {
                    const isSelected = selectedStyle === st.id;
                    return (
                      <button
                        key={st.id}
                        onClick={() => setSelectedStyle(st.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                          isSelected
                            ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                            : 'bg-white/[0.02] border-white/5 text-neutral-400 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        {st.badge && (
                          <span className="absolute top-1.5 right-1.5 px-1.5 py-0.2 rounded text-[8px] font-bold bg-emerald-500 text-black">
                            {st.badge}
                          </span>
                        )}
                        <div className="text-lg mb-1">{st.icon}</div>
                        <div>
                          <div className="text-xs font-bold leading-tight">{st.name}</div>
                          <div className="text-[9px] text-white/50 leading-tight mt-0.5 line-clamp-2">
                            {st.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Lighting Selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5 mb-2">
                  <Sun className="size-3.5 text-amber-400" /> Iluminação &amp; Atmosfera
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {LIGHTING_OPTIONS.map((lt) => {
                    const Icon = lt.icon;
                    const isSelected = selectedLighting === lt.id;
                    return (
                      <button
                        key={lt.id}
                        onClick={() => setSelectedLighting(lt.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-500/60 text-white shadow-sm'
                            : 'bg-white/[0.02] border-white/5 text-neutral-400 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        <Icon className={`size-4 ${isSelected ? 'text-amber-400' : 'text-white/40'}`} />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate leading-tight">{lt.name}</div>
                          <div className="text-[9px] text-white/50 truncate leading-tight">{lt.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Prompt Instructions */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5 mb-1.5">
                  <Sliders className="size-3.5 text-blue-400" /> Instruções Especiais (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Ex: Iluminação quente sob os armários, plantas na bancada, taças de cristal..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                />
              </div>

              {/* Openings & Doorways Tip Box */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-200/90 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <AlertCircle className="size-3.5 text-amber-400 shrink-0" />
                  <span>Dica para Portas, Vãos e Janelas:</span>
                </div>
                <p className="text-[10px] leading-relaxed text-amber-100/80">
                  Para evitar fundos escuros, a IA projeta continuações de ambientes ou jardins externos. Mantenha os vãos direcionados para áreas abertas com boa iluminação.
                </p>
              </div>

              {/* Scene Summary Info */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-neutral-400 space-y-1 font-mono">
                <div className="flex justify-between">
                  <span>Móveis na Cena:</span>
                  <span className="text-white font-bold">{furniture.length} itens</span>
                </div>
                <div className="flex justify-between">
                  <span>Modo Ativo:</span>
                  <span className="text-emerald-400 font-bold">
                    {renderType === '360' ? 'Panorama 360° (2:1)' : 'Foto Normal (16:9)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Engine:</span>
                  <span className="text-purple-300 font-bold">
                    {selectedEngine === 'gemini' ? '⚡ Google Gemini 2.0' : '✨ OpenAI gpt-image-1.5'}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Render Button */}
            <div className="pt-3 border-t border-white/10">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs tracking-wider uppercase transition-all shadow-xl flex items-center justify-center gap-2 ${
                  isGenerating
                    ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-500/30 cursor-wait'
                    : renderType === '360'
                    ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 text-white shadow-indigo-600/30 active:scale-98 hover:shadow-2xl cursor-pointer'
                    : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white shadow-emerald-600/30 active:scale-98 hover:shadow-2xl cursor-pointer'
                }`}
              >
                <Sparkles className={`size-4 ${isGenerating ? 'animate-spin' : 'animate-bounce'}`} />
                <span>
                  {isGenerating
                    ? 'Gerando Fotorrealismo...'
                    : renderType === '360'
                    ? '✨ Gerar Render 360° IA'
                    : '✨ Gerar Render Normal IA'}
                </span>
              </button>
              <span className="text-[10px] text-center block text-white/40 mt-1.5 font-mono">
                Preserva 100% da geometria e layout 3D
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
