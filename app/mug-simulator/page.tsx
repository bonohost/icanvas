'use client';

import { useRef, useState, useEffect, ChangeEvent, DragEvent } from 'react';
import { useMugStore } from '../stores/mugStore';

const COLOR_PALETTE = [
  { name: 'Branco', value: '#ffffff' },
  { name: 'Preto', value: '#18181b' },
  { name: 'Azul Marinho', value: '#1e3a8a' },
  { name: 'Vermelho', value: '#dc2626' },
  { name: 'Amarelo Ouro', value: '#eab308' },
  { name: 'Verde Floresta', value: '#15803d' },
  { name: 'Rosa Magenta', value: '#db2777' },
  { name: 'Laranja', value: '#ea580c' },
];

export default function MugSimulatorPage() {
  const {
    outerImage,
    useRender3Base,
    customText,
    useCanvasText,
    baseColor,
    alcaColor,
    interiorColor,
    roughness,
    metalness,
    autoRotate,
    setOuterImage,
    setUseRender3Base,
    setCustomText,
    setUseCanvasText,
    setBaseColor,
    setAlcaColor,
    setInteriorColor,
    setAllColors,
    setRoughness,
    setMetalness,
    setAutoRotate,
    reset,
  } = useMugStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'outer' | 'colors' | 'text'>('outer');
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [isZenMode, setIsZenMode] = useState(false);

  // Keyboard shortcut support (Tab, ], Ctrl+B, F, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        setIsMenuOpen((prev) => !prev);
      } else if (e.key === ']' || (e.ctrlKey && e.key.toLowerCase() === 'b')) {
        e.preventDefault();
        setIsMenuOpen((prev) => !prev);
      } else if (e.key.toLowerCase() === 'f') {
        setIsZenMode((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsZenMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setOuterImage(url);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setOuterImage(url);
    }
  };

  return (
    <main className="flex-1 flex mt-20 relative h-[calc(100vh-80px)] overflow-hidden pointer-events-none">
      {/* Active Canvas Area Overlay Info */}
      <div className="flex-1 relative w-full h-full pointer-events-none">
        {/* Floating Viewport Controls */}
        <div
          className={`absolute bottom-margin-mobile md:bottom-margin-desktop left-1/2 -translate-x-1/2 glass-panel rounded-full px-4 py-2 flex items-center gap-2.5 z-10 pointer-events-auto shadow-2xl backdrop-blur-xl border border-white/10 transition-all duration-300 ${
            isZenMode ? 'opacity-30 hover:opacity-100 scale-95 hover:scale-100' : 'opacity-100'
          }`}
        >
          {/* Auto Rotate Toggle */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-medium transition-colors ${
              autoRotate
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'text-on-surface-variant hover:text-primary hover:bg-white/5'
            }`}
            title="Alternar Auto Rotação"
          >
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 0" }}>
              360
            </span>
            <span>{autoRotate ? 'Girando' : 'Pausado'}</span>
          </button>

          <div className="h-4 w-[1px] bg-white/10" />

          {/* Reset View & Colors */}
          <button
            onClick={reset}
            className="px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary hover:bg-white/5 transition-colors"
            title="Centralizar Câmera / Reset"
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            <span>Reset</span>
          </button>

          <div className="h-4 w-[1px] bg-white/10" />

          {/* Zen / Focus Mode Button */}
          <button
            onClick={() => setIsZenMode(!isZenMode)}
            className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-medium transition-colors ${
              isZenMode
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'text-on-surface-variant hover:text-purple-400 hover:bg-white/5'
            }`}
            title="Modo Foco / Limpo (F)"
          >
            <span className="material-symbols-outlined text-[16px]">
              {isZenMode ? 'fullscreen_exit' : 'fullscreen'}
            </span>
            <span>{isZenMode ? 'Sair Foco' : 'Foco 3D'}</span>
          </button>

          <div className="h-4 w-[1px] bg-white/10" />

          {/* Menu Toggle Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-medium transition-colors ${
              isMenuOpen
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'text-on-surface-variant hover:text-white hover:bg-white/10'
            }`}
            title="Ocultar / Mostrar Menu Lateral (Tab)"
          >
            <span className="material-symbols-outlined text-[16px]">
              {isMenuOpen ? 'dock_to_right' : 'menu_open'}
            </span>
            <span>{isMenuOpen ? 'Ocultar Menu' : 'Abrir Menu'}</span>
          </button>
        </div>

        {/* Contextual Title */}
        <div
          className={`absolute top-8 left-8 z-10 pointer-events-none transition-opacity duration-300 ${
            isZenMode ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <h1 className="font-display-lg text-on-surface opacity-80 mix-blend-screen leading-tight">
            Simulador
            <br />
            de Canecas 3D
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-primary font-mono tracking-wide">
              Mapeamento UVW Multi-Zona (Exterior, Alça e Interior)
            </span>
          </div>
        </div>

        {/* Floating Open Sidebar Button on Right Edge when collapsed */}
        {!isMenuOpen && !isZenMode && (
          <button
            onClick={() => setIsMenuOpen(true)}
            className="absolute right-6 top-8 z-30 pointer-events-auto px-4 py-2.5 rounded-xl glass-panel border border-primary/40 bg-black/60 hover:bg-primary/20 text-white shadow-2xl backdrop-blur-xl flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95 group"
            title="Abrir Painel de Customização (Tab)"
          >
            <span className="material-symbols-outlined text-[18px] text-primary group-hover:rotate-12 transition-transform">
              tune
            </span>
            <span className="text-xs font-semibold">Personalizar Caneca</span>
            <kbd className="px-1.5 py-0.5 text-[10px] bg-white/10 rounded font-mono text-white/60">Tab</kbd>
          </button>
        )}
      </div>

      {/* Right Control Panel */}
      <aside
        className={`w-panel-width max-w-sm flex-shrink-0 glass-panel border-l border-white/10 h-full overflow-y-auto flex flex-col relative z-20 pointer-events-auto shadow-2xl backdrop-blur-xl transition-all duration-300 ease-in-out ${
          isMenuOpen && !isZenMode
            ? 'translate-x-0 opacity-100 mr-0'
            : 'translate-x-full opacity-0 -mr-[384px] pointer-events-none'
        }`}
      >
        <div className="p-6 flex flex-col gap-5 h-full">
          {/* Section Header with Close Button */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-headline-lg-mobile text-primary mb-1">Personalizador de Caneca</h2>
              <p className="font-body-md text-on-surface-variant text-xs">
                Estampe a área externa e alterne as cores da alça e do interior de forma independente.
              </p>
            </div>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="p-1.5 rounded-lg text-on-surface-variant hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center -mr-2 -mt-1"
              title="Ocultar Menu (Tab)"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>

          {/* Mode Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setActiveTab('outer')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'outer'
                  ? 'bg-primary text-white shadow'
                  : 'text-on-surface-variant hover:text-white'
              }`}
            >
              Estampa
            </button>
            <button
              onClick={() => setActiveTab('colors')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'colors'
                  ? 'bg-primary text-white shadow'
                  : 'text-on-surface-variant hover:text-white'
              }`}
            >
              Alça &amp; Interior
            </button>
            <button
              onClick={() => {
                setActiveTab('text');
                setUseCanvasText(true);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'text'
                  ? 'bg-primary text-white shadow'
                  : 'text-on-surface-variant hover:text-white'
              }`}
            >
              Texto
            </button>
          </div>

          {/* Tab 1: Outer Print (Exterior Area) */}
          {activeTab === 'outer' && (
            <div className="flex flex-col gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center transition-all cursor-pointer group glass-panel-active h-40 relative overflow-hidden ${
                  isDragging
                    ? 'border-primary bg-primary/20 scale-[1.02]'
                    : 'border-outline-variant hover:border-primary hover:bg-primary/5'
                }`}
              >
                {outerImage ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-24 h-16 rounded-lg overflow-hidden border border-white/20 shadow-md">
                      <img
                        src={outerImage}
                        alt="Outer Print Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-xs text-primary font-medium">Trocar Estampa Externa</span>
                  </div>
                ) : (
                  <>
                    <span
                      className="material-symbols-outlined text-3xl text-outline-variant group-hover:text-primary mb-1 transition-colors"
                      style={{ fontVariationSettings: "'FILL' 0" }}
                    >
                      image
                    </span>
                    <span className="font-button-md text-xs text-on-surface group-hover:text-primary transition-colors">
                      Enviar Estampa Externa (1780x700)
                    </span>
                    <span className="font-label-sm text-outline-variant mt-1 text-[10px]">
                      Projetada exclusivamente na face externa
                    </span>
                  </>
                )}
              </div>

              {/* Quick Presets */}
              <div className="flex gap-2">
                <button
                  onClick={() => setUseRender3Base(true)}
                  className={`flex-1 p-2 rounded-lg border text-xs font-medium transition-all ${
                    useRender3Base && !outerImage
                      ? 'border-primary bg-primary/20 text-white'
                      : 'border-white/10 bg-white/5 text-on-surface-variant hover:border-white/30'
                  }`}
                >
                  Arte Original DAE
                </button>
                <button
                  onClick={() => {
                    setOuterImage(null);
                    setUseRender3Base(false);
                    setUseCanvasText(false);
                  }}
                  className={`flex-1 p-2 rounded-lg border text-xs font-medium transition-all ${
                    !useRender3Base && !outerImage && !useCanvasText
                      ? 'border-primary bg-primary/20 text-white'
                      : 'border-white/10 bg-white/5 text-on-surface-variant hover:border-white/30'
                  }`}
                >
                  Caneca Lisa
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Colors (Alça & Interior) */}
          {activeTab === 'colors' && (
            <div className="flex flex-col gap-4">
              {/* Alça Color */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-on-surface">Cor da Alça</span>
                  <label className="relative cursor-pointer flex items-center gap-1 group" title="Escolher cor personalizada para alça">
                    <div
                      className="w-5 h-5 rounded-full border border-white/30 group-hover:scale-110 shadow-sm transition-transform flex items-center justify-center overflow-hidden"
                      style={{ backgroundColor: alcaColor }}
                    >
                      <span className="material-symbols-outlined text-[12px] text-white mix-blend-difference opacity-0 group-hover:opacity-100 transition-opacity">
                        colorize
                      </span>
                    </div>
                    <input
                      type="color"
                      value={alcaColor}
                      onChange={(e) => setAlcaColor(e.target.value)}
                      className="sr-only"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={`alca-${c.value}`}
                      onClick={() => setAlcaColor(c.value)}
                      className={`h-7 rounded-md border flex items-center justify-center transition-all ${
                        alcaColor.toLowerCase() === c.value.toLowerCase()
                          ? 'border-primary ring-2 ring-primary/40 scale-105'
                          : 'border-white/10 opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    >
                      {alcaColor.toLowerCase() === c.value.toLowerCase() && (
                        <span
                          className={`material-symbols-outlined text-[14px] ${
                            c.value === '#ffffff' ? 'text-black' : 'text-white'
                          }`}
                        >
                          check
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interior Color */}
              <div className="flex flex-col gap-2 border-t border-white/10 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-on-surface">Cor do Interior</span>
                  <label className="relative cursor-pointer flex items-center gap-1 group" title="Escolher cor personalizada para interior">
                    <div
                      className="w-5 h-5 rounded-full border border-white/30 group-hover:scale-110 shadow-sm transition-transform flex items-center justify-center overflow-hidden"
                      style={{ backgroundColor: interiorColor }}
                    >
                      <span className="material-symbols-outlined text-[12px] text-white mix-blend-difference opacity-0 group-hover:opacity-100 transition-opacity">
                        colorize
                      </span>
                    </div>
                    <input
                      type="color"
                      value={interiorColor}
                      onChange={(e) => setInteriorColor(e.target.value)}
                      className="sr-only"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={`interior-${c.value}`}
                      onClick={() => setInteriorColor(c.value)}
                      className={`h-7 rounded-md border flex items-center justify-center transition-all ${
                        interiorColor.toLowerCase() === c.value.toLowerCase()
                          ? 'border-primary ring-2 ring-primary/40 scale-105'
                          : 'border-white/10 opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    >
                      {interiorColor.toLowerCase() === c.value.toLowerCase() && (
                        <span
                          className={`material-symbols-outlined text-[14px] ${
                            c.value === '#ffffff' ? 'text-black' : 'text-white'
                          }`}
                        >
                          check
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Base Exterior Color */}
              <div className="flex flex-col gap-2 border-t border-white/10 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-on-surface">Cor Base Exterior</span>
                  <label className="relative cursor-pointer flex items-center gap-1 group" title="Escolher cor personalizada para exterior">
                    <div
                      className="w-5 h-5 rounded-full border border-white/30 group-hover:scale-110 shadow-sm transition-transform flex items-center justify-center overflow-hidden"
                      style={{ backgroundColor: baseColor }}
                    >
                      <span className="material-symbols-outlined text-[12px] text-white mix-blend-difference opacity-0 group-hover:opacity-100 transition-opacity">
                        colorize
                      </span>
                    </div>
                    <input
                      type="color"
                      value={baseColor}
                      onChange={(e) => setBaseColor(e.target.value)}
                      className="sr-only"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={`base-${c.value}`}
                      onClick={() => setBaseColor(c.value)}
                      className={`h-7 rounded-md border flex items-center justify-center transition-all ${
                        baseColor.toLowerCase() === c.value.toLowerCase()
                          ? 'border-primary ring-2 ring-primary/40 scale-105'
                          : 'border-white/10 opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    >
                      {baseColor.toLowerCase() === c.value.toLowerCase() && (
                        <span
                          className={`material-symbols-outlined text-[14px] ${
                            c.value === '#ffffff' ? 'text-black' : 'text-white'
                          }`}
                        >
                          check
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Colorir Toda a Caneca (Global Color Picker) */}
              <div className="flex flex-col gap-2.5 border-t border-white/10 pt-3 bg-white/[0.02] -mx-2 px-2 pb-2 rounded-xl">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[17px]">palette</span>
                    <span className="text-xs font-semibold text-white">Colorir Toda a Caneca</span>
                  </div>
                  <span className="text-[10px] text-primary/80 bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                    Aplica a tudo
                  </span>
                </div>

                <div className="flex items-center gap-2.5 bg-white/5 p-2 rounded-xl border border-white/10 hover:border-primary/40 transition-colors">
                  <label className="relative flex items-center justify-center cursor-pointer group">
                    <div
                      className="w-9 h-9 rounded-lg border-2 border-white/30 group-hover:border-primary shadow-inner transition-all flex items-center justify-center"
                      style={{ backgroundColor: baseColor }}
                    >
                      <span className="material-symbols-outlined text-[16px] text-white mix-blend-difference">
                        colorize
                      </span>
                    </div>
                    <input
                      type="color"
                      value={baseColor}
                      onChange={(e) => setAllColors(e.target.value)}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                  </label>

                  <div className="flex-1 flex flex-col justify-center">
                    <span className="text-xs font-medium text-on-surface">Color Picker Global</span>
                    <span className="text-[11px] font-mono text-primary font-semibold">{baseColor.toUpperCase()}</span>
                  </div>

                  <label className="cursor-pointer px-2.5 py-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary text-xs font-medium transition-all flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">tune</span>
                    <span>Escolher</span>
                    <input
                      type="color"
                      value={baseColor}
                      onChange={(e) => setAllColors(e.target.value)}
                      className="sr-only"
                    />
                  </label>
                </div>

                {/* Quick Presets for All */}
                <div className="grid grid-cols-8 gap-1">
                  {COLOR_PALETTE.map((c) => {
                    const isAllSelected =
                      baseColor.toLowerCase() === c.value.toLowerCase() &&
                      alcaColor.toLowerCase() === c.value.toLowerCase() &&
                      interiorColor.toLowerCase() === c.value.toLowerCase();
                    return (
                      <button
                        key={`all-${c.value}`}
                        onClick={() => setAllColors(c.value)}
                        className={`h-6 rounded-md border flex items-center justify-center transition-all ${
                          isAllSelected
                            ? 'border-primary ring-2 ring-primary/50 scale-110 z-10'
                            : 'border-white/10 opacity-70 hover:opacity-100 hover:scale-105'
                        }`}
                        style={{ backgroundColor: c.value }}
                        title={`Pintar tudo de ${c.name}`}
                      >
                        {isAllSelected && (
                          <span
                            className={`material-symbols-outlined text-[11px] ${
                              c.value === '#ffffff' ? 'text-black' : 'text-white'
                            }`}
                          >
                            check
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Custom Text */}
          {activeTab === 'text' && (
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-on-surface-variant font-medium block mb-1">
                  Texto na Face Externa
                </label>
                <input
                  type="text"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Ex: Seu Nome / Logotipo"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-xs text-on-surface-variant">
                O texto é projetado centralizado exclusivamente na área exterior da caneca.
              </div>
            </div>
          )}

          {/* Material Properties */}
          <div className="flex flex-col gap-3 border-t border-white/10 pt-3">
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-on-surface-variant">
                <span>Brilho Cerâmico / Rugosidade</span>
                <span className="font-mono text-primary">{Math.round(roughness * 100)}%</span>
              </div>
              <input
                className="w-full accent-primary bg-white/10 h-1.5 rounded-full appearance-none outline-none cursor-pointer"
                max="100"
                min="0"
                type="range"
                value={Math.round(roughness * 100)}
                onChange={(e) => setRoughness(Number(e.target.value) / 100)}
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-on-surface-variant">
                <span>Reflexo Metálico</span>
                <span className="font-mono text-primary">{Math.round(metalness * 100)}%</span>
              </div>
              <input
                className="w-full accent-primary bg-white/10 h-1.5 rounded-full appearance-none outline-none cursor-pointer"
                max="100"
                min="0"
                type="range"
                value={Math.round(metalness * 100)}
                onChange={(e) => setMetalness(Number(e.target.value) / 100)}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-auto pt-3 flex gap-3 border-t border-white/10">
            <button
              onClick={reset}
              className="flex-1 glass-panel text-on-surface text-xs font-semibold py-2.5 rounded-lg hover:border-primary/50 transition-colors"
            >
              Resetar Tudo
            </button>
            <button
              onClick={() => {
                const btn = document.activeElement as HTMLElement;
                if (btn) btn.blur();
              }}
              className="flex-1 bg-primary-container text-on-primary-container text-xs font-semibold py-2.5 rounded-lg hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">check</span>
              Aplicado
            </button>
          </div>
        </div>
      </aside>
    </main>
  );
}
