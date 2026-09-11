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
} from 'lucide-react';
import { RoomSettings, FurnitureInstance } from '../types/furniture';

interface AiRenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptureSnapshot: () => string;
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
  room,
  furniture,
  projectName,
}: AiRenderModalProps) {
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

  // Load saved API Key from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('icanvas_gemini_api_key');
    if (saved) setUserApiKey(saved);
  }, []);

  // Capture snapshot on modal open
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      try {
        const shot = onCaptureSnapshot();
        if (shot) setSnapshotUrl(shot);
      } catch (e) {
        console.error('Failed to capture snapshot:', e);
      }
    }
  }, [isOpen, onCaptureSnapshot]);

  const handleSaveApiKey = (key: string) => {
    setUserApiKey(key);
    localStorage.setItem('icanvas_gemini_api_key', key.trim());
  };

  const handleRecapture = () => {
    setErrorMessage(null);
    const shot = onCaptureSnapshot();
    if (shot) setSnapshotUrl(shot);
  };

  const [engineUsed, setEngineUsed] = useState<string | null>(null);

  const handleGenerate = async () => {
    let currentShot = snapshotUrl;
    if (!currentShot) {
      currentShot = onCaptureSnapshot();
      if (currentShot) setSnapshotUrl(currentShot);
    }

    if (!currentShot) {
      setErrorMessage('Não foi possível capturar o snapshot da cena 3D. Tente mover a câmera e clicar em Recapturar Ângulo.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    // Build brief materials summary from current scene state
    const materialsSummary = [
      `Floor: ${room.floorTextureUrl ? 'textured porcelain/wood' : 'solid'} (${room.floorColor})`,
      `Walls: Back (${room.walls.back.color}), Front (${room.walls.front.color}), Left (${room.walls.left.color}), Right (${room.walls.right.color})`,
      `Furniture count: ${furniture.length} units with finishes (${Array.from(new Set(furniture.map((f) => f.dm.t))).join(', ')})`,
      room.openings?.length ? `Openings: ${room.openings.map((o) => `${o.type} on ${o.wallSide} wall`).join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('; ');

    try {
      const response = await fetch('/api/render-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: currentShot,
          styleId: selectedStyle,
          lightingId: selectedLighting,
          customPrompt,
          userApiKey: userApiKey.trim() || undefined,
          roomInfo: {
            roomType: projectName || 'Cozinha Gourmet & Living',
            width: room.width,
            depth: room.depth,
            materialsSummary,
          },
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
        setRenderedUrl(data.renderedImageUrl);
        setEngineUsed(data.engine || 'Gemini Multimodal AI');
        setSliderPos(50);
      } else {
        throw new Error('Nenhuma imagem foi retornada pelo motor de IA.');
      }
    } catch (err: any) {
      console.error('Render error:', err);
      setErrorMessage(err.message || 'Falha na comunicação com a API de IA.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!renderedUrl) return;
    const link = document.createElement('a');
    link.href = renderedUrl;
    link.download = `iCanvas_Render_${projectName.replace(/\s+/g, '_')}_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopy = async () => {
    if (!renderedUrl) return;
    try {
      // For base64 images
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 overflow-hidden animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-6xl h-[90vh] bg-[#0c1220] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-br from-purple-500 via-indigo-500 to-emerald-400 p-0.5 shadow-lg shadow-purple-500/20">
              <div className="w-full h-full bg-[#0c1220] rounded-[10px] flex items-center justify-center">
                <Sparkles className="size-5 text-purple-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Render IA Fotorrealista de Arquitetura
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-widest">
                  8K HDR
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">
                Transforme a geometria 3D do iCanvas em fotografia de arquitetura de alto padrão com 1 clique
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowKeyConfig(!showKeyConfig)}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all border ${userApiKey || process.env.NEXT_PUBLIC_HAS_GEMINI_KEY
                  ? 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                  : 'bg-amber-500/20 border-amber-500/30 text-amber-300 hover:bg-amber-500/30'
                }`}
              title="Configurar Chave da API Gemini"
            >
              <Key className="size-3.5 text-amber-400" />
              <span>{userApiKey ? 'Chave API Configurada' : 'Configurar API Key'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* API Key Banner Config (Collapsible) */}
        {showKeyConfig && (
          <div className="px-6 py-3 bg-purple-950/40 border-b border-purple-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-purple-200">
              <Info className="size-4 text-purple-400 flex-shrink-0" />
              <span>
                Insira sua chave gratuita do <strong>Google AI Studio (Gemini)</strong>:
              </span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="password"
                placeholder="AIzaSy..."
                value={userApiKey}
                onChange={(e) => handleSaveApiKey(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-black/40 border border-purple-500/30 text-white placeholder-white/30 text-xs w-full sm:w-64 focus:outline-none focus:border-purple-400"
              />
              <button
                onClick={() => setShowKeyConfig(false)}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors"
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
              <div className="flex items-center gap-2 text-xs text-on-surface-variant font-mono">
                <Eye className="size-3.5 text-primary" />
                <span>Ângulo da Câmera 3D</span>
                {renderedUrl && (
                  <span className="text-purple-400 font-bold ml-2">
                    (Arraste o divisor para comparar Antes / Depois)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRecapture}
                  disabled={isGenerating}
                  className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs flex items-center gap-1.5 border border-white/10 transition-colors disabled:opacity-50"
                  title="Atualizar com a posição atual da câmera do estúdio"
                >
                  <RefreshCw className={`size-3 ${isGenerating ? 'animate-spin' : ''}`} />
                  Recapturar Ângulo
                </button>
              </div>
            </div>

            {/* Visualizer Area */}
            <div className="relative w-full flex-1 max-h-[62vh] rounded-xl overflow-hidden border border-white/10 bg-black/60 flex items-center justify-center select-none shadow-inner">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center gap-4 text-center p-6 z-20">
                  <div className="relative size-20">
                    <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping" />
                    <div className="relative w-full h-full rounded-full border-2 border-purple-500/40 border-t-purple-400 animate-spin flex items-center justify-center">
                      <Sparkles className="size-8 text-purple-400 animate-pulse" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-wide">
                      Processando Render Fotorrealista...
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-1 max-w-xs">
                      Aplicando iluminação global volumétrica, reflexos de materiais nobres e acabamento de revista.
                    </p>
                  </div>
                </div>
              ) : renderedUrl ? (
                /* Interactive Split Screen Comparator */
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
                    className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_15px_rgba(168,85,247,0.8)] z-10 pointer-events-none flex items-center justify-center"
                    style={{ left: `${sliderPos}%` }}
                  >
                    <div className="size-8 rounded-full bg-purple-600 border-2 border-white shadow-xl flex items-center justify-center text-white text-[10px] font-bold">
                      ↔
                    </div>
                  </div>

                  {/* Badges on preview */}
                  <div className="absolute top-3 left-3 px-2 py-1 rounded bg-purple-600/80 backdrop-blur-md text-[10px] font-bold tracking-wider uppercase border border-purple-400/40 z-10 pointer-events-none">
                    ✨ Render IA
                  </div>
                  <div className="absolute top-3 right-3 px-2 py-1 rounded bg-black/70 backdrop-blur-md text-[10px] font-bold tracking-wider uppercase border border-white/20 z-10 pointer-events-none">
                    📐 3D Original
                  </div>
                </div>
              ) : snapshotUrl ? (
                /* Simple Snapshot Preview */
                <img
                  src={snapshotUrl}
                  alt="Prévia da Cena 3D"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-xs text-on-surface-variant">Carregando visualização 3D...</div>
              )}
            </div>

            {/* Error Display */}
            {errorMessage && (
              <div className="w-full mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-300">
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
                  <div className="text-xs text-green-400 flex items-center gap-1.5 font-semibold">
                    <Check className="size-4" /> Render finalizado!
                  </div>
                  {engineUsed && (
                    <span className="text-[10px] text-purple-300 bg-purple-900/40 px-2 py-0.5 rounded-full border border-purple-500/30 font-mono">
                      {engineUsed}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-colors"
                  >
                    {copied ? <Check className="size-3.5 text-green-400" /> : <Copy className="size-3.5" />}
                    <span>{copied ? 'Copiado!' : 'Copiar Imagem'}</span>
                  </button>

                  <button
                    onClick={handleDownload}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                  >
                    <Download className="size-3.5" />
                    <span>Baixar em Alta Resolução</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Controls & Parameters Sidebar */}
          <div className="w-88 flex-shrink-0 border-l border-white/10 bg-white/[0.01] p-5 overflow-y-auto flex flex-col justify-between gap-6">
            <div className="space-y-5">
              {/* Style Selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-on-surface flex items-center gap-1.5 mb-2.5">
                  <Palette className="size-3.5 text-purple-400" /> Estilo de Decoração
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {RENDER_STYLES.map((st) => {
                    const isSelected = selectedStyle === st.id;
                    return (
                      <button
                        key={st.id}
                        onClick={() => setSelectedStyle(st.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${isSelected
                            ? 'bg-purple-600/20 border-purple-500 text-white shadow-md shadow-purple-500/10'
                            : 'bg-white/[0.02] border-white/5 text-on-surface-variant hover:border-white/20 hover:text-white'
                          }`}
                      >
                        {st.badge && (
                          <span className="absolute top-1.5 right-1.5 px-1.5 py-0.2 rounded text-[8px] font-bold bg-purple-500 text-white">
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
                <label className="text-xs font-bold uppercase tracking-wider text-on-surface flex items-center gap-1.5 mb-2.5">
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
                        className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 ${isSelected
                            ? 'bg-amber-500/20 border-amber-500/60 text-white shadow-sm'
                            : 'bg-white/[0.02] border-white/5 text-on-surface-variant hover:border-white/20 hover:text-white'
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
                <label className="text-xs font-bold uppercase tracking-wider text-on-surface flex items-center gap-1.5 mb-1.5">
                  <Sliders className="size-3.5 text-primary" /> Instruções Especiais (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Ex: Adicionar iluminação quente sob os armários, plantas na bancada e copos de cristal..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-500 transition-colors resize-none"
                />
              </div>
            </div>

            {/* Action Render Button */}
            <div className="pt-4 border-t border-white/10">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className={`w-full py-3 px-4 rounded-xl font-bold text-xs tracking-wider uppercase transition-all shadow-xl flex items-center justify-center gap-2 ${isGenerating
                    ? 'bg-purple-900/50 text-purple-300 border border-purple-500/30 cursor-wait'
                    : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/30 active:scale-98 hover:shadow-2xl'
                  }`}
              >
                <Sparkles className={`size-4 ${isGenerating ? 'animate-spin' : 'animate-bounce'}`} />
                <span>{isGenerating ? 'Gerando Fotorrealismo...' : '✨ Gerar Render IA'}</span>
              </button>
              <span className="text-[10px] text-center block text-white/40 mt-2 font-mono">
                Mantém 100% da geometria e móveis do 3D
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
