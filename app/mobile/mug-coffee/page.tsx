'use client';

import React, { useState, useMemo, useEffect, ChangeEvent } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import {
  Coffee,
  Image as ImageIcon,
  Palette,
  RotateCw,
  Sparkles,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Type,
  Check,
  Upload,
  Maximize,
  Minimize
} from 'lucide-react';
import { CoffeeMugScene } from '../../components/coffee/CoffeeMugScene';
import { CoffeeBubblePaintModal } from '../../components/coffee/CoffeeBubblePaintModal';
import { createLatteArtTexture, createLatteArtTextTexture, PresetArtType } from '../../components/coffee/LatteArtTextures';

const MUG_PRESET_COLORS = [
  { name: 'Branco Puro', value: '#ffffff' },
  { name: 'Preto Matte', value: '#18181b' },
  { name: 'Azul Cobalto', value: '#1e3a8a' },
  { name: 'Terracota', value: '#9a3412' },
  { name: 'Verde Matcha', value: '#166534' },
  { name: 'Vermelho', value: '#dc2626' },
  { name: 'Amarelo Ouro', value: '#eab308' },
  { name: 'Rosa Pastel', value: '#f472b6' },
  { name: 'Laranja Crema', value: '#ea580c' },
  { name: 'Cinza Grafite', value: '#374151' },
];

const EXTERIOR_TEXT_PRESETS = [
  { label: '☕ Coffee & Code', text: 'COFFEE & CODE', bg: '#1e3a8a', color: '#ffffff' },
  { label: '✨ Café Perfeito', text: 'MEU CAFÉ PERFEITO', bg: '#9a3412', color: '#fef3c7' },
  { label: '❤️ Feito com Amor', text: 'FEITO COM AMOR', bg: '#be185d', color: '#ffffff' },
  { label: '🚀 Dev Fuel', text: 'DEVELOPER FUEL', bg: '#15803d', color: '#ffffff' },
  { label: '⭐ Good Vibes', text: 'GOOD VIBES ONLY', bg: '#b45309', color: '#ffffff' },
];

type MobileTab = 'coffee' | 'print' | 'ceramic';

export default function MobileMugCoffeePage() {
  const [activeTab, setActiveTab] = useState<MobileTab>('coffee');
  const [sheetCollapsed, setSheetCollapsed] = useState<boolean>(false);
  const [isLandscape, setIsLandscape] = useState<boolean>(false);
  const [isLandscapePanelOpen, setIsLandscapePanelOpen] = useState<boolean>(true);
  const [isBubblePaintModalOpen, setIsBubblePaintModalOpen] = useState<boolean>(false);

  // --- TAB 1: CAFÉ & LATTE ART STATES ---
  const [mixValue, setMixValue] = useState<number>(0.33);
  const [activePreset, setActivePreset] = useState<PresetArtType | 'custom'>('text');
  const [textLine1, setTextLine1] = useState<string>('Amo ❤️');
  const [textLine2, setTextLine2] = useState<string>('Café');
  const [tileScale, setTileScale] = useState<number>(1.0);
  const [offsetX, setOffsetX] = useState<number>(0.0);
  const [offsetY, setOffsetY] = useState<number>(0.0);
  const [rotation, setRotation] = useState<number>(0.0);

  // Shader Parameters
  const [animateWaves, setAnimateWaves] = useState<boolean>(true);
  const [waveAmplitude] = useState<number>(0.007);
  const [waveFrequency] = useState<number>(1.0);
  const [vignetteStrength] = useState<number>(0.55);
  const [coffeeColor, setCoffeeColor] = useState<string>('#4a1b0b');
  const [bubbleIntensity, setBubbleIntensity] = useState<number>(1.1);
  const [bubbleScale] = useState<number>(58.0);
  const [centerClearRadius] = useState<number>(0.52);
  const [baristaPaletteFilter, setBaristaPaletteFilter] = useState<number>(0.85);
  const [swirlIntensity, setSwirlIntensity] = useState<number>(0.5);
  const [customCoffeeImageName, setCustomCoffeeImageName] = useState<string | null>(null);

  // --- TAB 2: ESTAMPA EXTERNA ---
  const [outerImage, setOuterImage] = useState<string | null>(null);
  const [outerImageName, setOuterImageName] = useState<string | null>(null);
  const [outerCustomText, setOuterCustomText] = useState<string>('COFFEE & CODE');
  const [outerTextColor, setOuterTextColor] = useState<string>('#ffffff');
  const [outerTextBgColor, setOuterTextBgColor] = useState<string>('#1e3a8a');
  const [useExteriorText, setUseExteriorText] = useState<boolean>(true);

  // --- TAB 3: CERÂMICA ---
  const [mugColor, setMugColor] = useState<string>('#ffffff');
  const [alcaColor, setAlcaColor] = useState<string>('#ffffff');
  const [interiorColor, setInteriorColor] = useState<string>('#ffffff');
  const [colorTarget, setColorTarget] = useState<'all' | 'alca' | 'body' | 'interior'>('all');
  const [roughness] = useState<number>(0.12);
  const [metalness] = useState<number>(0.05);

  // Viewport State
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [photoFoamTexture, setPhotoFoamTexture] = useState<THREE.Texture | null>(null);
  const [currentCoffeeTexture, setCurrentCoffeeTexture] = useState<THREE.Texture | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Fullscreen state listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isDocFull = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isDocFull);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      const doc = document as any;
      const docEl = document.documentElement as any;

      if (!doc.fullscreenElement && !doc.webkitFullscreenElement && !doc.mozFullScreenElement && !doc.msFullscreenElement) {
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        } else if (docEl.mozRequestFullScreen) {
          await docEl.mozRequestFullScreen();
        } else if (docEl.msRequestFullscreen) {
          await docEl.msRequestFullscreen();
        }
      } else {
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          await doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          await doc.msExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen toggle not permitted or failed:', err);
    }
  };

  // Detect Orientation
  useEffect(() => {
    const checkOrientation = () => {
      if (typeof window !== 'undefined') {
        setIsLandscape(window.innerWidth > window.innerHeight);
      }
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  // Load High-Res Real Foam Texture
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

  // Presets textures
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

  // Initial text texture
  useEffect(() => {
    const textTex = createLatteArtTextTexture(textLine1, textLine2);
    setCurrentCoffeeTexture(textTex);
  }, []);

  // Dynamic text updates
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

  const handleOuterImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOuterImageName(file.name);
      const url = URL.createObjectURL(file);
      setOuterImage(url);
      setUseExteriorText(false);
    }
  };

  const applyColor = (hex: string) => {
    if (colorTarget === 'all') {
      setMugColor(hex);
      setAlcaColor(hex);
      setInteriorColor(hex);
    } else if (colorTarget === 'alca') {
      setAlcaColor(hex);
    } else if (colorTarget === 'body') {
      setMugColor(hex);
    } else if (colorTarget === 'interior') {
      setInteriorColor(hex);
    }
  };

  const resetAll = () => {
    setMixValue(0.33);
    setActivePreset('text');
    setTextLine1('Amo ❤️');
    setTextLine2('Café');
    setTileScale(1.0);
    setOffsetX(0.0);
    setOffsetY(0.0);
    setRotation(0.0);
    setMugColor('#ffffff');
    setAlcaColor('#ffffff');
    setInteriorColor('#ffffff');
    setColorTarget('all');
    setOuterImage(null);
    setOuterImageName(null);
    setOuterCustomText('COFFEE & CODE');
    setUseExteriorText(true);
    setAutoRotate(false);
    setCustomCoffeeImageName(null);
    const textTex = createLatteArtTextTexture('Amo ❤️', 'Café');
    setCurrentCoffeeTexture(textTex);
  };

  return (
    <div className="relative w-full h-[100dvh] flex flex-col bg-gradient-to-b from-neutral-950 via-neutral-900 to-black overflow-hidden select-none">
      {/* Floating Top Right Actions */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
        {/* Quick Milk Reveal Pill */}
        <button
          onClick={() => setMixValue((prev) => (prev > 0.5 ? 0.0 : 1.0))}
          className="px-3 py-1.5 rounded-full text-xs font-bold bg-neutral-900/80 text-amber-300 border border-amber-500/40 backdrop-blur-xl shadow-2xl flex items-center gap-1.5 active:scale-90 transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{mixValue > 0.5 ? '☕ Café Puro' : '✨ Revelar'}</span>
        </button>

        {/* Rotate Button */}
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-xl border transition-all cursor-pointer ${
            autoRotate
              ? 'bg-amber-500 border-amber-400 text-white shadow-lg shadow-amber-500/30'
              : 'bg-neutral-900/80 border-white/20 text-neutral-300'
          }`}
          title="Girar Caneca 360°"
        >
          <RotateCw className={`w-4 h-4 ${autoRotate ? 'animate-spin' : ''}`} />
        </button>

        {/* Reset Button */}
        <button
          onClick={resetAll}
          className="w-9 h-9 rounded-full bg-neutral-900/80 backdrop-blur-xl border border-white/20 flex items-center justify-center text-neutral-300 active:scale-90 transition-transform cursor-pointer"
          title="Resetar Personalização"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Bottom Left Action - Fullscreen Toggle (especially for Landscape mobile) */}
      <button
        onClick={toggleFullscreen}
        className={`absolute bottom-3 left-3 z-30 px-3 py-2 rounded-2xl bg-neutral-900/85 backdrop-blur-xl border border-white/20 text-white shadow-2xl flex items-center gap-2 active:scale-95 transition-all cursor-pointer hover:bg-neutral-800 ${
          isFullscreen ? 'border-amber-400/80 text-amber-300 ring-1 ring-amber-400/40' : 'text-neutral-200'
        }`}
        title={isFullscreen ? 'Sair da Tela Cheia' : 'Entrar em Tela Cheia (Imersivo)'}
      >
        {isFullscreen ? <Minimize className="w-4 h-4 text-amber-400" /> : <Maximize className="w-4 h-4 text-neutral-300" />}
        <span className="text-[11px] font-semibold">{isFullscreen ? 'Sair Fullscreen' : 'Tela Cheia'}</span>
      </button>

      {/* 3D Canvas Viewport (Dynamic Height depending on orientation and sheet) */}
      <div
        className={`w-full transition-all duration-300 relative ${
          isLandscape
            ? 'h-full'
            : sheetCollapsed
            ? 'h-[calc(100dvh-36px)]'
            : 'h-[56dvh]'
        }`}
      >
        {currentCoffeeTexture && (
          <Canvas
            shadows={{ type: THREE.PCFShadowMap }}
            camera={{ position: [0, 0.75, 1.85], fov: 44 }}
            gl={{ antialias: true, alpha: true }}
          >
            <CoffeeMugScene
              texture={currentCoffeeTexture}
              photoFoamTexture={photoFoamTexture}
              usePhotoFoam={true}
              baristaPaletteFilter={baristaPaletteFilter}
              swirlIntensity={swirlIntensity}
              mixValue={mixValue}
              tileX={tileScale}
              tileY={tileScale}
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
      </div>

      {/* Edge Toggle Tab for Landscape Mode (Inverts ▶ / ◀ without extra buttons) */}
      {isLandscape && (
        <button
          onClick={() => setIsLandscapePanelOpen(!isLandscapePanelOpen)}
          className={`fixed top-1/2 -translate-y-1/2 z-50 py-3.5 px-2 rounded-l-xl bg-neutral-900/95 border-l border-t border-b border-white/20 text-amber-400 hover:text-white shadow-2xl flex items-center justify-center transition-all duration-300 cursor-pointer active:scale-95 ${
            isLandscapePanelOpen ? 'right-[340px]' : 'right-0 bg-amber-500 text-white border-amber-300/40'
          }`}
          title={isLandscapePanelOpen ? 'Recolher Painel (Tela Cheia)' : 'Abrir Painel'}
        >
          <span className="text-xs font-black select-none">
            {isLandscapePanelOpen ? '▶' : '◀'}
          </span>
        </button>
      )}

      {/* ========================================================= */}
      {/* MOBILE BOTTOM SHEET (PORTRAIT) / SIDE DRAWER (LANDSCAPE) */}
      {/* ========================================================= */}
      <div
        className={`z-40 bg-neutral-900/95 backdrop-blur-2xl border-white/15 flex flex-col transition-all duration-300 shadow-2xl ${
          isLandscape
            ? `fixed top-0 bottom-0 right-0 w-[340px] h-full rounded-l-3xl border-l ${
                isLandscapePanelOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
              }`
            : sheetCollapsed
            ? 'h-[36px] border-t rounded-t-2xl overflow-hidden'
            : 'flex-1 h-[44dvh] border-t rounded-t-3xl'
        }`}
      >
        {/* Drag Handle & Expand/Collapse Toggle (Portrait only) */}
        {!isLandscape && (
          <div
            onClick={() => setSheetCollapsed(!sheetCollapsed)}
            className="w-full h-[36px] flex flex-col items-center justify-center cursor-pointer active:opacity-70 select-none shrink-0"
          >
            <div className="w-10 h-1 rounded-full bg-white/30" />
            <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-medium">
              <span>{sheetCollapsed ? 'Puxar para Expandir' : 'Recolher Painel'}</span>
              {sheetCollapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </div>
          </div>
        )}

        {/* Inner Content (Tabs + Options) - Hidden completely when collapsed */}
        <div className={`flex-1 flex flex-col min-h-0 transition-opacity duration-200 ${sheetCollapsed && !isLandscape ? 'hidden' : 'opacity-100'}`}>
          {/* 3 Main Navigation Tabs */}
          <div className="px-4 pb-2 shrink-0">
            <div className="grid grid-cols-3 gap-1 p-1 bg-black/50 rounded-2xl border border-white/10 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('coffee')}
                className={`py-2 px-1 rounded-xl flex items-center justify-center gap-1.5 transition-all ${activeTab === 'coffee'
                    ? 'bg-amber-500 text-white shadow-lg font-bold'
                    : 'text-neutral-400 hover:text-white'
                  }`}
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>Café</span>
              </button>
              <button
                onClick={() => setActiveTab('print')}
                className={`py-2 px-1 rounded-xl flex items-center justify-center gap-1.5 transition-all ${activeTab === 'print'
                    ? 'bg-amber-500 text-white shadow-lg font-bold'
                    : 'text-neutral-400 hover:text-white'
                  }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Estampa</span>
              </button>
              <button
                onClick={() => setActiveTab('ceramic')}
                className={`py-2 px-1 rounded-xl flex items-center justify-center gap-1.5 transition-all ${activeTab === 'ceramic'
                    ? 'bg-amber-500 text-white shadow-lg font-bold'
                    : 'text-neutral-400 hover:text-white'
                  }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Cores</span>
              </button>
            </div>
          </div>

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-4">
          {/* ================= TAB 1: CAFÉ & LEITE ================= */}
          {activeTab === 'coffee' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Botão Pintor de Bolhas Touch */}
              <button
                type="button"
                onClick={() => setIsBubblePaintModalOpen(true)}
                className="w-full py-3 px-3 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer active:scale-95 group"
              >
                <span className="text-base group-hover:scale-125 transition-transform">🫧</span>
                <span>Pintar Bolhas com o Dedo (Shader)</span>
              </button>

              {/* Presets Grid */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-neutral-300">Padrão de Arte na Espuma:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleSelectPreset('text')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 col-span-2 ${activePreset === 'text'
                        ? 'border-amber-500 bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/50'
                        : 'border-white/10 bg-white/5 text-neutral-300'
                      }`}
                  >
                    <Type className="w-4 h-4 text-amber-400" />
                    <span>Digitar Frase no Café (2 Linhas)</span>
                  </button>

                  <button
                    onClick={() => handleSelectPreset('rosetta')}
                    className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 ${activePreset === 'rosetta'
                        ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                        : 'border-white/10 bg-white/5 text-neutral-400'
                      }`}
                  >
                    <span>🌿</span> Rosetta
                  </button>
                  <button
                    onClick={() => handleSelectPreset('flower')}
                    className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 ${activePreset === 'flower'
                        ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                        : 'border-white/10 bg-white/5 text-neutral-400'
                      }`}
                  >
                    <span>🌸</span> Flor Etching
                  </button>
                  <button
                    onClick={() => handleSelectPreset('heart')}
                    className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 ${activePreset === 'heart'
                        ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                        : 'border-white/10 bg-white/5 text-neutral-400'
                      }`}
                  >
                    <span>❤️</span> Coração
                  </button>
                  <button
                    onClick={() => handleSelectPreset('swan')}
                    className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 ${activePreset === 'swan'
                        ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                        : 'border-white/10 bg-white/5 text-neutral-400'
                      }`}
                  >
                    <span>🦢</span> Cisne
                  </button>
                </div>
              </div>

              {/* Text Input Editor */}
              {activePreset === 'text' && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    ✍️ Sua Mensagem Personalizada
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={textLine1}
                      onChange={(e) => setTextLine1(e.target.value)}
                      placeholder="Linha 1"
                      maxLength={18}
                      className="w-full bg-neutral-950 border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 outline-none"
                    />
                    <input
                      type="text"
                      value={textLine2}
                      onChange={(e) => setTextLine2(e.target.value)}
                      placeholder="Linha 2"
                      maxLength={18}
                      className="w-full bg-neutral-950 border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 outline-none"
                    />
                  </div>

                  {/* Fast suggestion chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <button
                      onClick={() => { setTextLine1('Amo ❤️'); setTextLine2('Café'); }}
                      className="text-[10px] px-2.5 py-1 rounded-full bg-white/10 text-neutral-200"
                    >
                      Amo ❤️ Café
                    </button>
                    <button
                      onClick={() => { setTextLine1('Bom'); setTextLine2('Dia ✨'); }}
                      className="text-[10px] px-2.5 py-1 rounded-full bg-white/10 text-neutral-200"
                    >
                      Bom Dia ✨
                    </button>
                    <button
                      onClick={() => { setTextLine1('Dev'); setTextLine2('Fuel ☕'); }}
                      className="text-[10px] px-2.5 py-1 rounded-full bg-white/10 text-neutral-200"
                    >
                      Dev Fuel ☕
                    </button>
                  </div>
                </div>
              )}

              {/* Upload Coffee Liquid Image */}
              <div>
                <label className="cursor-pointer border border-dashed border-white/20 hover:border-amber-500 bg-white/[0.02] rounded-xl p-3 flex items-center justify-center gap-2 text-xs text-neutral-300">
                  <Upload className="w-4 h-4 text-amber-400" />
                  <span>{customCoffeeImageName ? `Foto: ${customCoffeeImageName}` : 'Foto na Espuma do Café'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleCoffeeImageUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Sliders: Visibilidade & Zoom */}
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-neutral-300">
                    <span>Intensidade do Leite</span>
                    <span className="font-mono text-amber-400 font-bold">{Math.round(mixValue * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.02"
                    value={mixValue}
                    onChange={(e) => setMixValue(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-neutral-300">
                    <span>Tamanho da Arte (Zoom)</span>
                    <span className="font-mono text-amber-400 font-bold">{tileScale.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.6"
                    max="2.0"
                    step="0.05"
                    value={tileScale}
                    onChange={(e) => setTileScale(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: ESTAMPA ================= */}
          {activeTab === 'print' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Upload Card */}
              <label className="cursor-pointer border-2 border-dashed border-amber-500/40 bg-amber-500/5 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 text-center">
                <Upload className="w-6 h-6 text-amber-400" />
                <div>
                  <span className="text-xs font-bold text-white block">
                    {outerImageName ? outerImageName : 'Enviar Foto da Galeria / Câmera'}
                  </span>
                  <span className="text-[10px] text-neutral-400">Gabarito 1780 &times; 700 px</span>
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
                  className="w-full py-1.5 text-xs text-red-400 bg-red-500/10 rounded-xl"
                >
                  Remover Foto
                </button>
              )}

              {/* Text on Mug */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
                <span className="text-xs font-bold text-neutral-200 block">
                  🔤 Frase Impressa no Corpo
                </span>
                <input
                  type="text"
                  value={outerCustomText}
                  onChange={(e) => {
                    setOuterCustomText(e.target.value);
                    setUseExteriorText(true);
                    setOuterImage(null);
                  }}
                  placeholder="Ex: COFFEE & CODE"
                  maxLength={28}
                  className="w-full bg-neutral-950 border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white uppercase font-bold tracking-wider outline-none"
                />

                {/* Color Pickers */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/10">
                    <span className="text-[11px] text-neutral-300">Cor Texto:</span>
                    <input
                      type="color"
                      value={outerTextColor}
                      onChange={(e) => setOuterTextColor(e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                    />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/10">
                    <span className="text-[11px] text-neutral-300">Faixa Fundo:</span>
                    <input
                      type="color"
                      value={outerTextBgColor}
                      onChange={(e) => setOuterTextBgColor(e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                    />
                  </div>
                </div>

                {/* Ready Presets */}
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] text-neutral-400 font-medium">Modelos Prontos:</span>
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
                        className="text-left text-xs p-2 rounded-xl bg-white/5 border border-white/10 text-neutral-300 flex items-center justify-between active:scale-[0.98]"
                      >
                        <span className="font-semibold">{p.label}</span>
                        <span className="w-3.5 h-3.5 rounded-full border border-white/30" style={{ backgroundColor: p.bg }} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 3: CERÂMICA ================= */}
          {activeTab === 'ceramic' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Part selector */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-neutral-300">Onde Aplicar a Cor:</span>
                <div className="grid grid-cols-4 gap-1 p-1 bg-black/40 rounded-xl border border-white/10 text-[11px]">
                  <button
                    onClick={() => setColorTarget('all')}
                    className={`py-1.5 rounded-lg font-bold transition-all ${colorTarget === 'all' ? 'bg-amber-500 text-white shadow' : 'text-neutral-400'
                      }`}
                  >
                    Toda
                  </button>
                  <button
                    onClick={() => setColorTarget('alca')}
                    className={`py-1.5 rounded-lg font-bold transition-all ${colorTarget === 'alca' ? 'bg-amber-500 text-white shadow' : 'text-neutral-400'
                      }`}
                  >
                    Alça ☕
                  </button>
                  <button
                    onClick={() => setColorTarget('body')}
                    className={`py-1.5 rounded-lg font-bold transition-all ${colorTarget === 'body' ? 'bg-amber-500 text-white shadow' : 'text-neutral-400'
                      }`}
                  >
                    Corpo
                  </button>
                  <button
                    onClick={() => setColorTarget('interior')}
                    className={`py-1.5 rounded-lg font-bold transition-all ${colorTarget === 'interior' ? 'bg-amber-500 text-white shadow' : 'text-neutral-400'
                      }`}
                  >
                    Interior
                  </button>
                </div>
              </div>

              {/* Color Grid */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-neutral-300">Paleta Cerâmica PBR:</span>
                <div className="grid grid-cols-5 gap-2.5">
                  {MUG_PRESET_COLORS.map((c) => {
                    const currentActive =
                      colorTarget === 'alca'
                        ? alcaColor === c.value
                        : colorTarget === 'interior'
                          ? interiorColor === c.value
                          : mugColor === c.value;

                    return (
                      <button
                        key={c.name}
                        onClick={() => applyColor(c.value)}
                        className={`h-11 rounded-2xl border-2 flex items-center justify-center transition-all active:scale-90 relative ${currentActive ? 'border-amber-400 scale-105 shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/50' : 'border-white/20'
                          }`}
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                      >
                        {currentActive && (
                          <Check className={`w-4 h-4 ${c.value === '#ffffff' ? 'text-black' : 'text-white'}`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Color Wheel */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                <span className="text-xs font-semibold text-neutral-200">Cor Personalizada (RGB/Hex)</span>
                <input
                  type="color"
                  value={colorTarget === 'alca' ? alcaColor : colorTarget === 'interior' ? interiorColor : mugColor}
                  onChange={(e) => applyColor(e.target.value)}
                  className="w-8 h-8 rounded-xl cursor-pointer bg-transparent border-0"
                />
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Modal Interativo Touch de Pintura de Bolhas */}
      <CoffeeBubblePaintModal
        isOpen={isBubblePaintModalOpen}
        onClose={() => setIsBubblePaintModalOpen(false)}
        onApply={(tex) => {
          setPhotoFoamTexture(tex);
        }}
        onLivePreview={(tex) => {
          setPhotoFoamTexture(tex);
        }}
      />
    </div>
  );
}
