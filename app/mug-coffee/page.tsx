'use client';

import React, { useState, useMemo, useEffect, ChangeEvent } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { CoffeeMugScene } from '../components/coffee/CoffeeMugScene';
import { CoffeeBubblePaintModal } from '../components/coffee/CoffeeBubblePaintModal';
import { createLatteArtTexture, createLatteArtTextTexture, PresetArtType } from '../components/coffee/LatteArtTextures';

const MUG_PRESET_COLORS = [
  { name: 'Branco Puro', value: '#ffffff' },
  { name: 'Preto Matte', value: '#18181b' },
  { name: 'Azul Cobalto', value: '#1e3a8a' },
  { name: 'Terracota', value: '#9a3412' },
  { name: 'Verde Matcha', value: '#166534' },
  { name: 'Vermelho Intenso', value: '#dc2626' },
  { name: 'Amarelo Ouro', value: '#eab308' },
  { name: 'Rosa Pastel', value: '#f472b6' },
  { name: 'Laranja Crema', value: '#ea580c' },
];

const EXTERIOR_TEXT_PRESETS = [
  { label: '☕ Coffee & Code', text: 'COFFEE & CODE', bg: '#1e3a8a', color: '#ffffff' },
  { label: '✨ Café Perfeito', text: 'MEU CAFÉ PERFEITO', bg: '#9a3412', color: '#fef3c7' },
  { label: '❤️ Feito com Amor', text: 'FEITO COM AMOR', bg: '#be185d', color: '#ffffff' },
  { label: '🚀 Dev Fuel', text: 'DEVELOPER FUEL', bg: '#15803d', color: '#ffffff' },
  { label: '⭐ Good Vibes', text: 'GOOD VIBES ONLY', bg: '#b45309', color: '#ffffff' },
];

type MainTabType = 'coffee' | 'mug_print' | 'ceramic';

export default function MugCoffeePage() {
  // Navigation Studio Tab
  const [activeMainTab, setActiveMainTab] = useState<MainTabType>('coffee');

  // --- TAB 1: COFFEE & LATTE ART STATES ---
  const [mixValue, setMixValue] = useState<number>(.33);
  const [activePreset, setActivePreset] = useState<PresetArtType | 'custom'>('text');

  // Custom Coffee Text Message States (Duas Linhas no Leite)
  const [textLine1, setTextLine1] = useState<string>('Amo ❤️');
  const [textLine2, setTextLine2] = useState<string>('Café');

  // Transform Tile & Offset Controls (Escala, Posição e Rotação no café)
  const [tileScale, setTileScale] = useState<number>(1.0);
  const [tileX, setTileX] = useState<number>(1.0);
  const [tileY, setTileY] = useState<number>(1.0);
  const [lockAspectRatio, setLockAspectRatio] = useState<boolean>(true);
  const [offsetX, setOffsetX] = useState<number>(0.0);
  const [offsetY, setOffsetY] = useState<number>(0.0);
  const [rotation, setRotation] = useState<number>(0.0);

  // Shader Liquid Parameters (Ondulação suave e orgânica ativada)
  const [animateWaves, setAnimateWaves] = useState<boolean>(true);
  const [waveAmplitude, setWaveAmplitude] = useState<number>(0.007);
  const [waveFrequency, setWaveFrequency] = useState<number>(1.0);
  const [vignetteStrength, setVignetteStrength] = useState<number>(0.55);
  const [coffeeColor, setCoffeeColor] = useState<string>('#4a1b0b');
  const [bubbleIntensity, setBubbleIntensity] = useState<number>(1.1);
  const [bubbleScale, setBubbleScale] = useState<number>(58.0);
  const [centerClearRadius, setCenterClearRadius] = useState<number>(0.52);
  const [baristaPaletteFilter, setBaristaPaletteFilter] = useState<number>(0.85);
  const [swirlIntensity, setSwirlIntensity] = useState<number>(0.5);
  const [customCoffeeImageName, setCustomCoffeeImageName] = useState<string | null>(null);

  // --- TAB 2: EXTERIOR MUG PRINT STATES ---
  const [outerImage, setOuterImage] = useState<string | null>(null);
  const [outerImageName, setOuterImageName] = useState<string | null>(null);
  const [outerCustomText, setOuterCustomText] = useState<string>('COFFEE & CODE');
  const [outerTextColor, setOuterTextColor] = useState<string>('#ffffff');
  const [outerTextBgColor, setOuterTextBgColor] = useState<string>('#1e3a8a');
  const [useExteriorText, setUseExteriorText] = useState<boolean>(true);

  // --- TAB 3: CERAMIC & MUG APPEARANCE ---
  const [mugColor, setMugColor] = useState<string>('#ffffff');
  const [alcaColor, setAlcaColor] = useState<string>('#ffffff');
  const [interiorColor, setInteriorColor] = useState<string>('#ffffff');
  const [colorTarget, setColorTarget] = useState<'all' | 'alca' | 'body' | 'interior'>('all');
  const [roughness, setRoughness] = useState<number>(0.12);
  const [metalness, setMetalness] = useState<number>(0.05);

  // Viewport Modes
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [isZenMode, setIsZenMode] = useState<boolean>(false);

  // Generate static preset textures for coffee
  const presetTextures = useMemo(() => {
    if (typeof window === 'undefined') return {} as Record<PresetArtType, THREE.Texture>;
    return {
      text: createLatteArtTextTexture('Amo ❤️', 'Café'),
      rosetta: createLatteArtTexture('rosetta'),
      flower: createLatteArtTexture('flower'),
      heart: createLatteArtTexture('heart'),
      swan: createLatteArtTexture('swan'),
    };
  }, []);

  const [photoFoamTexture, setPhotoFoamTexture] = useState<THREE.Texture | null>(null);
  const [usePhotoFoam, setUsePhotoFoam] = useState<boolean>(true);
  const [isBubblePaintModalOpen, setIsBubblePaintModalOpen] = useState<boolean>(false);

  // Load high-resolution photographic reference coffee bubbles texture
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load('/textures/coffee/coffee_real_bubbles.png', (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      setPhotoFoamTexture(tex);
    });
  }, []);

  const [currentCoffeeTexture, setCurrentCoffeeTexture] = useState<THREE.Texture | null>(null);

  // Load initial coffee texture
  useEffect(() => {
    const textTex = createLatteArtTextTexture(textLine1, textLine2);
    setCurrentCoffeeTexture(textTex);
  }, []);

  // Update text texture dynamically when typing
  useEffect(() => {
    if (activePreset === 'text') {
      const tex = createLatteArtTextTexture(textLine1, textLine2);
      setCurrentCoffeeTexture(tex);
    }
  }, [textLine1, textLine2, activePreset]);

  const handleSelectPreset = (preset: PresetArtType) => {
    setActivePreset(preset);
    setCustomCoffeeImageName(null);
    if (preset === 'text') {
      const tex = createLatteArtTextTexture(textLine1, textLine2);
      setCurrentCoffeeTexture(tex);
    } else if (presetTextures[preset]) {
      setCurrentCoffeeTexture(presetTextures[preset]);
    }
  };

  // Upload image to project on coffee liquid surface
  const handleCoffeeImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomCoffeeImageName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const tex = new THREE.Texture(img);
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.needsUpdate = true;
          setCurrentCoffeeTexture(tex);
          setActivePreset('custom');
          setMixValue(1.0);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload image to print on the exterior body of the ceramic mug
  const handleOuterImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOuterImageName(file.name);
      const url = URL.createObjectURL(file);
      setOuterImage(url);
      setUseExteriorText(false);
    }
  };

  const handleScaleChange = (val: number) => {
    setTileScale(val);
    if (lockAspectRatio) {
      setTileX(val);
      setTileY(val);
    }
  };

  const toggleLatteArt = () => {
    setMixValue((prev) => (prev > 0.5 ? 0.0 : 1.0));
  };

  const resetTransform = () => {
    setTileScale(1.0);
    setTileX(1.0);
    setTileY(1.0);
    setOffsetX(0.0);
    setOffsetY(0.0);
    setRotation(0.0);
  };

  const resetAll = () => {
    setMixValue(1.0);
    setActivePreset('text');
    setTextLine1('Amo ❤️');
    setTextLine2('Café');
    resetTransform();
    setAnimateWaves(true);
    setWaveAmplitude(0.007);
    setWaveFrequency(1.0);
    setVignetteStrength(0.55);
    setCoffeeColor('#4a1b0b');
    setBubbleIntensity(1.1);
    setBubbleScale(58.0);
    setCenterClearRadius(0.52);
    setMugColor('#ffffff');
    setAlcaColor('#ffffff');
    setInteriorColor('#ffffff');
    setColorTarget('all');
    setOuterImage(null);
    setOuterImageName(null);
    setOuterCustomText('COFFEE & CODE');
    setUseExteriorText(true);
    setRoughness(0.12);
    setMetalness(0.05);
    setAutoRotate(false);
    setCustomCoffeeImageName(null);
    const textTex = createLatteArtTextTexture('Amo ❤️', 'Café');
    setCurrentCoffeeTexture(textTex);
  };

  // Keyboard shortcut support (Escape or F to toggle/exit Zen mode)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        setIsZenMode((prev) => !prev);
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsZenMode((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <main className="flex-1 flex mt-20 relative h-[calc(100vh-80px)] overflow-hidden bg-gradient-to-b from-neutral-950 via-neutral-900 to-black select-none">
      {/* 3D Canvas Viewport (min-w-0 ensures flex container resizes correctly with sidebar) */}
      <div
        className="flex-1 min-w-0 relative h-full"
        onContextMenu={(e) => e.preventDefault()}
      >
        {currentCoffeeTexture && (
          <Canvas
            shadows={{ type: THREE.PCFShadowMap }}
            camera={{ position: [0, 0.75, 1.85], fov: 44 }}
            gl={{ antialias: true, alpha: true }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <CoffeeMugScene
              texture={currentCoffeeTexture}
              photoFoamTexture={photoFoamTexture}
              usePhotoFoam={usePhotoFoam}
              baristaPaletteFilter={baristaPaletteFilter}
              swirlIntensity={swirlIntensity}
              mixValue={mixValue}
              tileX={lockAspectRatio ? tileScale : tileX}
              tileY={lockAspectRatio ? tileScale : tileY}
              offsetX={offsetX}
              offsetY={offsetY}
              rotation={rotation}
              animateWaves={animateWaves}
              waveAmplitude={waveAmplitude}
              waveFrequency={waveFrequency}
              vignetteStrength={vignetteStrength}
              coffeeColor={coffeeColor}
              mugColor={mugColor}
              alcaColor={alcaColor}
              interiorColor={interiorColor}
              outerImage={outerImage}
              outerCustomText={useExteriorText ? outerCustomText : ''}
              outerTextColor={outerTextColor}
              outerTextBgColor={outerTextBgColor}
              roughness={roughness}
              metalness={metalness}
              autoRotate={autoRotate}
              bubbleIntensity={bubbleIntensity}
              bubbleScale={bubbleScale}
              centerClearRadius={centerClearRadius}
            />
          </Canvas>
        )}

        {/* Top Left Title Overlay */}
        <div
          className={`absolute top-6 left-8 z-10 pointer-events-none transition-opacity duration-300 ${isZenMode ? 'opacity-0' : 'opacity-100'
            }`}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 mb-2 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-[11px] font-mono text-amber-300 tracking-wider uppercase font-semibold">
              All-in-One 3D Studio &bull; Caneca &amp; Café
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight leading-tight">
            Mug &amp; Coffee Studio 3D
          </h1>
          <p className="text-xs text-neutral-400 mt-1 max-w-md">
            Personalize a estampa externa da caneca, a pintura cerâmica, a alça e projete arte fluida ou mensagens na espuma do café.
          </p>
        </div>

        {/* Floating Quick Action Bar */}
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-neutral-900/90 backdrop-blur-2xl border border-white/15 rounded-full px-4 py-2 flex items-center gap-3 z-30 shadow-2xl transition-all duration-300 pointer-events-auto"
        >
          {/* Quick Reveal Toggle */}
          <button
            type="button"
            onClick={toggleLatteArt}
            className={`px-3.5 py-1.5 rounded-full flex items-center gap-2 text-xs font-semibold transition-all shadow cursor-pointer ${mixValue > 0.5
              ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white'
              : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
          >
            <span>{mixValue > 0.5 ? '☕ Café Puro' : '✨ Revelar Leite'}</span>
          </button>

          <div className="h-4 w-[1px] bg-white/10" />

          {/* Quick Bubble Shader Painter Modal Toggle */}
          <button
            type="button"
            onClick={() => setIsBubblePaintModalOpen(true)}
            className="px-3.5 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold transition-all bg-gradient-to-r from-amber-500/25 to-amber-600/35 text-amber-300 border border-amber-500/40 hover:bg-amber-500/40 shadow-lg shadow-amber-500/10 cursor-pointer"
            title="Abrir Pintor de Bolhas de Café com GLSL Shader"
          >
            <span>🫧 Pintar Bolhas</span>
          </button>

          <div className="h-4 w-[1px] bg-white/10" />

          {/* Quick Animate Waves Toggle */}
          <button
            type="button"
            onClick={() => setAnimateWaves(!animateWaves)}
            className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer ${animateWaves
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              : 'text-neutral-400 hover:text-white'
              }`}
            title="Ligar/Desligar Animação de Ondas"
          >
            <span>{animateWaves ? '🌊 Ondas: ON' : '🌊 Ondas: OFF'}</span>
          </button>

          <div className="h-4 w-[1px] bg-white/10" />

          {/* Auto Rotate */}
          <button
            type="button"
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer ${autoRotate
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'text-neutral-400 hover:text-white'
              }`}
            title="Girar Caneca Automaticamente"
          >
            <span>{autoRotate ? '360° Girando' : '360° Pausado'}</span>
          </button>

          <div className="h-4 w-[1px] bg-white/10" />

          {/* Zen Mode Button */}
          <button
            type="button"
            onClick={() => setIsZenMode((prev) => !prev)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${isZenMode
              ? 'bg-amber-500 hover:bg-amber-400 text-white shadow-lg ring-2 ring-amber-400/50'
              : 'text-neutral-300 hover:text-white hover:bg-white/10'
              }`}
            title="Modo Foco (ESC ou Tecla F)"
          >
            {isZenMode ? '📂 Abrir Painel' : '👁️ Foco'}
          </button>

          <div className="h-4 w-[1px] bg-white/10" />

          {/* Reset */}
          <button
            type="button"
            onClick={resetAll}
            className="px-3 py-1.5 rounded-full text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Edge Dock Toggle Button - Always visible & accessible */}
      <button
        type="button"
        onClick={() => setIsZenMode((prev) => !prev)}
        className={`absolute top-1/2 -translate-y-1/2 z-40 py-3 px-2 rounded-l-xl bg-amber-500 hover:bg-amber-400 text-white shadow-2xl transition-all duration-300 flex items-center justify-center cursor-pointer border border-amber-300/40 ${isZenMode ? 'right-0' : 'right-[380px]'
          }`}
        title={isZenMode ? 'Abrir Painel Lateral (ESC)' : 'Recolher Painel (Foco)'}
      >
        <span className="text-xs font-black select-none">
          {isZenMode ? '◀' : '▶'}
        </span>
      </button>

      {/* Right All-in-One Studio Sidebar */}
      <aside
        className={`w-[380px] flex-shrink-0 bg-neutral-900/95 backdrop-blur-2xl border-l border-white/10 h-full overflow-y-auto flex flex-col z-20 shadow-2xl transition-all duration-300 ${isZenMode ? 'hidden' : 'flex'
          }`}
      >
        <div className="p-6 flex flex-col gap-5 text-white">
          <div>
            <h2 className="text-base font-bold text-amber-400 flex items-center gap-2">
              <span>☕🎨</span> All-in-One Studio 3D
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Personalize a caneca completa e o café líquido em uma única experiência integrada.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-neutral-950/70 rounded-xl border border-white/10 text-xs font-semibold">
            <button
              onClick={() => setActiveMainTab('coffee')}
              className={`py-2 px-1 rounded-lg flex items-center justify-center gap-1.5 transition-all ${activeMainTab === 'coffee'
                ? 'bg-amber-500 text-white shadow-lg ring-1 ring-amber-400/50'
                : 'text-neutral-400 hover:text-white'
                }`}
            >
              <span>☕</span> Café &amp; Leite
            </button>
            <button
              onClick={() => setActiveMainTab('mug_print')}
              className={`py-2 px-1 rounded-lg flex items-center justify-center gap-1.5 transition-all ${activeMainTab === 'mug_print'
                ? 'bg-amber-500 text-white shadow-lg ring-1 ring-amber-400/50'
                : 'text-neutral-400 hover:text-white'
                }`}
            >
              <span>🖼️</span> Estampa
            </button>
            <button
              onClick={() => setActiveMainTab('ceramic')}
              className={`py-2 px-1 rounded-lg flex items-center justify-center gap-1.5 transition-all ${activeMainTab === 'ceramic'
                ? 'bg-amber-500 text-white shadow-lg ring-1 ring-amber-400/50'
                : 'text-neutral-400 hover:text-white'
                }`}
            >
              <span>🎨</span> Cerâmica
            </button>
          </div>

          {/* ========================================================= */}
          {/* TAB 1: CAFÉ LÍQUIDO & LATTE ART                           */}
          {/* ========================================================= */}
          {activeMainTab === 'coffee' && (
            <div className="flex flex-col gap-5 animate-in fade-in duration-200">
              {/* Shader uMix Transition */}
              <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-neutral-200">Visibilidade da Arte / Texto (uMix)</span>
                  <span className="font-mono text-amber-400 font-bold">
                    {Math.round(mixValue * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={mixValue}
                  onChange={(e) => setMixValue(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              {/* Seletor de Padrões e Mensagem de Texto no Café */}
              <div className="flex flex-col gap-3">
                <label className="text-xs font-semibold text-neutral-300">
                  Arte na Superfície do Café
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleSelectPreset('text')}
                    className={`p-2.5 rounded-xl border text-xs font-medium transition-all text-left flex items-center gap-2 col-span-2 ${activePreset === 'text'
                      ? 'border-amber-500 bg-amber-500/20 text-amber-300 shadow ring-1 ring-amber-500/50'
                      : 'border-white/10 bg-white/5 text-neutral-400 hover:text-white'
                      }`}
                  >
                    <span className="text-base">💌</span>
                    <div className="flex flex-col">
                      <span className="font-semibold">Mensagem no Leite (2 Linhas)</span>
                      <span className="text-[10px] text-neutral-400">Sem borda &bull; 25% transparência café</span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleSelectPreset('rosetta')}
                    className={`p-2 rounded-xl border text-xs font-medium transition-all text-left flex items-center gap-2 ${activePreset === 'rosetta'
                      ? 'border-amber-500 bg-amber-500/20 text-amber-300 shadow'
                      : 'border-white/10 bg-white/5 text-neutral-400 hover:text-white'
                      }`}
                  >
                    <span>🌿</span> Rosetta Alada
                  </button>
                  <button
                    onClick={() => handleSelectPreset('flower')}
                    className={`p-2 rounded-xl border text-xs font-medium transition-all text-left flex items-center gap-2 ${activePreset === 'flower'
                      ? 'border-amber-500 bg-amber-500/20 text-amber-300 shadow'
                      : 'border-white/10 bg-white/5 text-neutral-400 hover:text-white'
                      }`}
                  >
                    <span>🌸</span> Flor Etching
                  </button>
                  <button
                    onClick={() => handleSelectPreset('heart')}
                    className={`p-2 rounded-xl border text-xs font-medium transition-all text-left flex items-center gap-2 ${activePreset === 'heart'
                      ? 'border-amber-500 bg-amber-500/20 text-amber-300 shadow'
                      : 'border-white/10 bg-white/5 text-neutral-400 hover:text-white'
                      }`}
                  >
                    <span>❤️</span> Coração Fluido
                  </button>
                  <button
                    onClick={() => handleSelectPreset('swan')}
                    className={`p-2 rounded-xl border text-xs font-medium transition-all text-left flex items-center gap-2 ${activePreset === 'swan'
                      ? 'border-amber-500 bg-amber-500/20 text-amber-300 shadow'
                      : 'border-white/10 bg-white/5 text-neutral-400 hover:text-white'
                      }`}
                  >
                    <span>🦢</span> Cisne Elegante
                  </button>
                </div>

                {/* Editor de Mensagem em Duas Linhas */}
                {activePreset === 'text' && (
                  <div className="flex flex-col gap-2.5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 animate-in fade-in duration-200">
                    <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                      <span>✍️</span> Digite sua Mensagem no Café
                    </span>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-neutral-400 font-medium">Linha 1</label>
                      <input
                        type="text"
                        value={textLine1}
                        onChange={(e) => setTextLine1(e.target.value)}
                        placeholder="Ex: Bom dia!"
                        maxLength={20}
                        className="w-full bg-neutral-900/90 border border-white/15 focus:border-amber-400 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 outline-none transition-colors"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-neutral-400 font-medium">Linha 2</label>
                      <input
                        type="text"
                        value={textLine2}
                        onChange={(e) => setTextLine2(e.target.value)}
                        placeholder="Ex: Te Amo ❤️"
                        maxLength={20}
                        className="w-full bg-neutral-900/90 border border-white/15 focus:border-amber-400 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 outline-none transition-colors"
                      />
                    </div>

                    {/* Sugestões Rápidas */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <button
                        onClick={() => { setTextLine1('Amo ❤️'); setTextLine2('Café'); }}
                        className="text-[10px] px-2 py-0.5 rounded bg-white/5 hover:bg-amber-500/20 border border-white/10 text-neutral-300 hover:text-amber-300 transition-colors"
                      >
                        Amo ❤️ Café
                      </button>
                      <button
                        onClick={() => { setTextLine1('Tenha um'); setTextLine2('Lindo Dia ✨'); }}
                        className="text-[10px] px-2 py-0.5 rounded bg-white/5 hover:bg-amber-500/20 border border-white/10 text-neutral-300 hover:text-amber-300 transition-colors"
                      >
                        Lindo Dia ✨
                      </button>
                      <button
                        onClick={() => { setTextLine1('Coffee'); setTextLine2('First ☕'); }}
                        className="text-[10px] px-2 py-0.5 rounded bg-white/5 hover:bg-amber-500/20 border border-white/10 text-neutral-300 hover:text-amber-300 transition-colors"
                      >
                        Coffee First ☕
                      </button>
                    </div>
                  </div>
                )}

                {/* Upload Imagem no Café */}
                <div>
                  <label className="cursor-pointer border border-dashed border-white/20 hover:border-amber-500 bg-white/[0.02] hover:bg-amber-500/5 rounded-xl p-2.5 flex items-center justify-center gap-2 transition-all text-xs text-neutral-300 group">
                    <span className="text-amber-400 group-hover:scale-110 transition-transform">📁</span>
                    <span>{customCoffeeImageName ? `Foto: ${customCoffeeImageName}` : 'Projetar Foto na Espuma'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleCoffeeImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Escala & Posição da Arte no Café */}
              <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-amber-500/[0.04] border border-amber-500/20">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <span>📐</span> Escala &amp; Posição da Arte (UV)
                  </span>
                  <button
                    onClick={resetTransform}
                    className="text-[10px] text-neutral-400 hover:text-amber-300 underline"
                  >
                    Centralizar
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-neutral-300">
                    <span>Zoom da Arte</span>
                    <span className="font-mono text-amber-400 font-semibold">{tileScale.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.2"
                    step="0.02"
                    value={tileScale}
                    onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-neutral-700 rounded appearance-none cursor-pointer accent-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[11px] text-neutral-400">Posição X: {offsetX.toFixed(2)}</span>
                    <input
                      type="range"
                      min="-0.5"
                      max="0.5"
                      step="0.01"
                      value={offsetX}
                      onChange={(e) => setOffsetX(parseFloat(e.target.value))}
                      className="w-full h-1 bg-neutral-700 rounded appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-neutral-400">Posição Y: {offsetY.toFixed(2)}</span>
                    <input
                      type="range"
                      min="-0.5"
                      max="0.5"
                      step="0.01"
                      value={offsetY}
                      onChange={(e) => setOffsetY(parseFloat(e.target.value))}
                      className="w-full h-1 bg-neutral-700 rounded appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Filtro Barista & Swirl de Leite (Shader Customizado) */}
              <div className="flex flex-col gap-3.5 border-t border-white/10 pt-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                    <span>🎨</span> Filtro Barista &amp; Swirl de Leite
                  </h3>
                  <span className="text-[10px] font-mono text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    GLSL Shader
                  </span>
                </div>

                {/* Filtro de Cores Barista (Luminância -> Tons de Espresso, Latte e Espuma) */}
                <div className="space-y-1.5 p-3 rounded-xl bg-amber-500/[0.04] border border-amber-500/20">
                  <div className="flex justify-between text-xs text-neutral-200 font-medium">
                    <span>Filtro de Cores Barista</span>
                    <span className="font-mono text-amber-400 font-bold">
                      {Math.round(baristaPaletteFilter * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.05"
                    value={baristaPaletteFilter}
                    onChange={(e) => setBaristaPaletteFilter(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-neutral-700 rounded appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
                    <span>0% (Cor Original)</span>
                    <span>100% (Espresso/Latte/Creme)</span>
                  </div>
                  <p className="text-[10px] text-neutral-400 pt-1 leading-normal">
                    Converte imagens e textos em autênticas tonalidades de espresso escuro (#2e170a), café com leite (#7a4a26) e espuma cremosa (#ebeae5).
                  </p>
                </div>

                {/* Distorção Fluida Swirl Noise */}
                <div className="space-y-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/10">
                  <div className="flex justify-between text-xs text-neutral-200 font-medium">
                    <span>Distorção Fluida (Swirl de Leite)</span>
                    <span className="font-mono text-amber-400 font-bold">
                      {swirlIntensity.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.5"
                    step="0.05"
                    value={swirlIntensity}
                    onChange={(e) => setSwirlIntensity(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-neutral-700 rounded appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
                    <span>0.0 (Estático)</span>
                    <span>1.5 (Vórtice Barista)</span>
                  </div>
                </div>
              </div>

              {/* Bolhas & Microespuma 3D (Fotográfico Realista vs Procedural) */}
              <div className="flex flex-col gap-3.5 border-t border-white/10 pt-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                    <span>🫧</span> Bolhas &amp; Microespuma do Café
                  </h3>
                  <span className="text-[10px] font-mono text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Shader Custom
                  </span>
                </div>

                {/* Botão Pintor Interativo 2D -> 3D Shader */}
                <button
                  type="button"
                  onClick={() => setIsBubblePaintModalOpen(true)}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer group"
                >
                  <span className="group-hover:scale-125 transition-transform">🎨</span>
                  <span>Pintar Bolhas com Mouse (Shader)</span>
                </button>

                {/* Seletor de Modo de Bolhas */}
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/40 rounded-xl border border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setUsePhotoFoam(true)}
                    className={`py-2 px-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${usePhotoFoam
                      ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow ring-1 ring-amber-400/50'
                      : 'text-neutral-400 hover:text-white'
                      }`}
                  >
                    <span>📸</span> Fotográfico Real
                  </button>
                  <button
                    type="button"
                    onClick={() => setUsePhotoFoam(false)}
                    className={`py-2 px-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${!usePhotoFoam
                      ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow ring-1 ring-amber-400/50'
                      : 'text-neutral-400 hover:text-white'
                      }`}
                  >
                    <span>✨</span> Procedural 3D
                  </button>
                </div>

                {usePhotoFoam ? (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 leading-relaxed">
                    <p className="font-semibold text-amber-300 flex items-center gap-1">
                      <span>✨</span> Modo Fotorrealista Ativo
                    </p>
                    <p className="text-[10px] text-neutral-300 mt-1">
                      Utilizando o anel fotográfico real com meias-luas assimétricas, profundidade de cavidades e centro espelhado liso.
                    </p>
                  </div>
                ) : (
                  /* Raio Central Limpo Procedural */
                  <div className="space-y-1 p-3 rounded-lg bg-amber-500/[0.06] border border-amber-500/20">
                    <div className="flex justify-between text-xs text-neutral-200 font-medium">
                      <span>Área Central Limpa (Sem Bolhas)</span>
                      <span className="font-mono text-amber-400 font-bold">
                        {Math.round(centerClearRadius * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.10"
                      max="0.80"
                      step="0.02"
                      value={centerClearRadius}
                      onChange={(e) => setCenterClearRadius(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-neutral-700 rounded appearance-none cursor-pointer accent-amber-500"
                    />
                    <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
                      <span>10% (Espuma Total)</span>
                      <span>80% (Apenas Borda)</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-neutral-300">
                      <span>Relevo / Brilho</span>
                      <span className="font-mono text-amber-400">{bubbleIntensity.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="2.5"
                      step="0.1"
                      value={bubbleIntensity}
                      onChange={(e) => setBubbleIntensity(parseFloat(e.target.value))}
                      className="w-full h-1 bg-neutral-700 rounded appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-neutral-300">
                      <span>Densidade</span>
                      <span className="font-mono text-amber-400">{Math.round(bubbleScale)}</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="80"
                      step="2"
                      value={bubbleScale}
                      onChange={(e) => setBubbleScale(parseFloat(e.target.value))}
                      className="w-full h-1 bg-neutral-700 rounded appearance-none cursor-pointer accent-amber-500"
                      disabled={usePhotoFoam}
                    />
                  </div>
                </div>
              </div>

              {/* Dinâmica do Líquido */}
              <div className="flex flex-col gap-2.5 border-t border-white/10 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-neutral-300">🌊 Ondas do Líquido</span>
                  <button
                    onClick={() => setAnimateWaves(!animateWaves)}
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${animateWaves ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-neutral-800 text-neutral-400'
                      }`}
                  >
                    {animateWaves ? 'Ativo' : 'Pausado'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: ESTAMPA DA CANECA (CORPO EXTERIOR)                 */}
          {/* ========================================================= */}
          {activeMainTab === 'mug_print' && (
            <div className="flex flex-col gap-5 animate-in fade-in duration-200">
              {/* Upload Foto / Estampa para a Caneca */}
              <div className="flex flex-col gap-2.5">
                <span className="text-xs font-semibold text-neutral-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span>📸</span> Estampa Externa da Caneca
                  </span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    1780 &times; 700 px
                  </span>
                </span>
                <label className="cursor-pointer border-2 border-dashed border-amber-500/40 hover:border-amber-400 bg-amber-500/5 hover:bg-amber-500/10 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 transition-all text-center group">
                  <span className="text-2xl text-amber-400 group-hover:scale-110 transition-transform">🖼️</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">
                      {outerImageName ? `Estampa: ${outerImageName}` : 'Clique para Escolher Foto / Arte'}
                    </span>
                    <span className="text-[10px] text-neutral-400 mt-0.5">
                      Gabarito oficial: <strong className="text-amber-300">1780 &times; 700 px</strong> (PNG com transparência, JPG, WEBP)
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleOuterImageUpload}
                    className="hidden"
                  />
                </label>

                {outerImage && (
                  <button
                    onClick={() => {
                      setOuterImage(null);
                      setOuterImageName(null);
                      setUseExteriorText(true);
                    }}
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 justify-center py-1"
                  >
                    <span>🗑️</span> Remover Imagem Externa
                  </button>
                )}
              </div>

              {/* Texto Impresso no Corpo Cerâmico */}
              <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                    <span>🔤</span> Texto Impresso na Caneca
                  </span>
                  <button
                    onClick={() => {
                      setUseExteriorText(!useExteriorText);
                      if (!useExteriorText) setOuterImage(null);
                    }}
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-all ${useExteriorText && !outerImage
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-neutral-800 text-neutral-400'
                      }`}
                  >
                    {useExteriorText && !outerImage ? 'Ativo' : 'Desativado'}
                  </button>
                </div>

                <input
                  type="text"
                  value={outerCustomText}
                  onChange={(e) => {
                    setOuterCustomText(e.target.value);
                    setUseExteriorText(true);
                    setOuterImage(null);
                  }}
                  placeholder="Ex: COFFEE & CODE"
                  maxLength={30}
                  className="w-full bg-neutral-900/90 border border-white/15 focus:border-amber-400 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 outline-none uppercase font-bold tracking-wider"
                />

                {/* Cores do Texto e Fundo da Faixa */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-white/10">
                    <span className="text-[11px] text-neutral-300">Cor Texto:</span>
                    <input
                      type="color"
                      value={outerTextColor}
                      onChange={(e) => setOuterTextColor(e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                    />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-white/10">
                    <span className="text-[11px] text-neutral-300">Faixa Fundo:</span>
                    <input
                      type="color"
                      value={outerTextBgColor}
                      onChange={(e) => setOuterTextBgColor(e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                    />
                  </div>
                </div>

                {/* Presets Rápidos de Estampa */}
                <div className="flex flex-col gap-1.5 pt-1">
                  <span className="text-[10px] text-neutral-400 font-medium">Modelos Prontos de Estampa:</span>
                  <div className="grid grid-cols-1 gap-1.5">
                    {EXTERIOR_TEXT_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        onClick={() => {
                          setOuterCustomText(p.text);
                          setOuterTextBgColor(p.bg);
                          setOuterTextColor(p.color);
                          setUseExteriorText(true);
                          setOuterImage(null);
                        }}
                        className="text-left text-xs p-2 rounded-lg bg-white/5 hover:bg-amber-500/20 border border-white/10 text-neutral-300 hover:text-white transition-all flex items-center justify-between"
                      >
                        <span className="font-semibold">{p.label}</span>
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/30"
                          style={{ backgroundColor: p.bg }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: CERÂMICA & PINTURA DAS PARTES                      */}
          {/* ========================================================= */}
          {activeMainTab === 'ceramic' && (
            <div className="flex flex-col gap-5 animate-in fade-in duration-200">
              {/* Abas de Seleção de Onde Pintar */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                  <span>🎨</span> Escolha a Parte da Caneca
                </span>
                <div className="grid grid-cols-4 gap-1 p-1 bg-black/40 rounded-lg border border-white/10 text-[11px]">
                  <button
                    onClick={() => setColorTarget('all')}
                    className={`py-1.5 rounded-md font-medium transition-all ${colorTarget === 'all'
                      ? 'bg-amber-500 text-white shadow font-semibold'
                      : 'text-neutral-400 hover:text-white'
                      }`}
                  >
                    Toda
                  </button>
                  <button
                    onClick={() => setColorTarget('alca')}
                    className={`py-1.5 rounded-md font-medium transition-all ${colorTarget === 'alca'
                      ? 'bg-amber-500 text-white shadow font-semibold'
                      : 'text-neutral-400 hover:text-white'
                      }`}
                  >
                    Alça ☕
                  </button>
                  <button
                    onClick={() => setColorTarget('body')}
                    className={`py-1.5 rounded-md font-medium transition-all ${colorTarget === 'body'
                      ? 'bg-amber-500 text-white shadow font-semibold'
                      : 'text-neutral-400 hover:text-white'
                      }`}
                  >
                    Corpo
                  </button>
                  <button
                    onClick={() => setColorTarget('interior')}
                    className={`py-1.5 rounded-md font-medium transition-all ${colorTarget === 'interior'
                      ? 'bg-amber-500 text-white shadow font-semibold'
                      : 'text-neutral-400 hover:text-white'
                      }`}
                  >
                    Interior
                  </button>
                </div>
              </div>

              {/* Status da Parte Selecionada */}
              <div className="text-[11px] text-amber-300/90 font-medium flex items-center justify-between p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <span>
                  {colorTarget === 'all' && 'Pintando: Caneca Completa (Corpo, Alça e Interior)'}
                  {colorTarget === 'alca' && 'Pintando: Apenas a Alça (Handle)'}
                  {colorTarget === 'body' && 'Pintando: Apenas o Exterior do Corpo'}
                  {colorTarget === 'interior' && 'Pintando: Apenas o Interior da Caneca'}
                </span>
                <span className="font-mono text-xs font-bold">
                  {colorTarget === 'alca' ? alcaColor : colorTarget === 'interior' ? interiorColor : mugColor}
                </span>
              </div>

              {/* Paleta de Cores em Grade */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-neutral-300">Cores Cerâmicas Clássicas:</span>
                <div className="grid grid-cols-5 gap-2">
                  {MUG_PRESET_COLORS.map((c) => {
                    const currentActiveColor =
                      colorTarget === 'alca'
                        ? alcaColor
                        : colorTarget === 'interior'
                          ? interiorColor
                          : mugColor;
                    const isSelected = currentActiveColor.toLowerCase() === c.value.toLowerCase();

                    return (
                      <button
                        key={c.value}
                        onClick={() => {
                          if (colorTarget === 'all') {
                            setMugColor(c.value);
                            setAlcaColor(c.value);
                            setInteriorColor(c.value);
                          } else if (colorTarget === 'alca') {
                            setAlcaColor(c.value);
                          } else if (colorTarget === 'body') {
                            setMugColor(c.value);
                          } else if (colorTarget === 'interior') {
                            setInteriorColor(c.value);
                          }
                        }}
                        className={`h-8 rounded-lg border transition-all relative group ${isSelected
                          ? 'border-amber-400 ring-2 ring-amber-400/60 scale-105 z-10'
                          : 'border-white/15 opacity-80 hover:opacity-100 hover:scale-105'
                          }`}
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                      >
                        {isSelected && (
                          <span className="absolute inset-0 flex items-center justify-center text-xs text-neutral-900 font-bold drop-shadow">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Picker Livre HTML */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/10">
                <span className="text-xs text-neutral-300 font-medium">
                  Cor Livre ({colorTarget === 'alca' ? 'Alça' : colorTarget === 'interior' ? 'Interior' : 'Corpo'}):
                </span>
                <input
                  type="color"
                  value={colorTarget === 'alca' ? alcaColor : colorTarget === 'interior' ? interiorColor : mugColor}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (colorTarget === 'all') {
                      setMugColor(val);
                      setAlcaColor(val);
                      setInteriorColor(val);
                    } else if (colorTarget === 'alca') {
                      setAlcaColor(val);
                    } else if (colorTarget === 'body') {
                      setMugColor(val);
                    } else if (colorTarget === 'interior') {
                      setInteriorColor(val);
                    }
                  }}
                  className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-white/20"
                />
              </div>

              {/* Acabamento Cerâmico (PBR Material) */}
              <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                  <span>✨</span> Acabamento &amp; Brilho Cerâmico
                </span>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-neutral-300">
                    <span>Brilho Cerâmico (Roughness)</span>
                    <span className="font-mono text-amber-400">{roughness.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.02"
                    max="0.80"
                    step="0.02"
                    value={roughness}
                    onChange={(e) => setRoughness(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-neutral-700 rounded appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
                    <span>Glossy / Esmaltado (0.05)</span>
                    <span>Matte Fosco (0.60)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Modal de Pintura de Bolhas e Espuma GLSL Shader em Tempo Real */}
      <CoffeeBubblePaintModal
        isOpen={isBubblePaintModalOpen}
        onClose={() => setIsBubblePaintModalOpen(false)}
        onApply={(tex) => {
          setPhotoFoamTexture(tex);
          setUsePhotoFoam(true);
        }}
        onLivePreview={(tex) => {
          setPhotoFoamTexture(tex);
          setUsePhotoFoam(true);
        }}
      />
    </main>
  );
}
