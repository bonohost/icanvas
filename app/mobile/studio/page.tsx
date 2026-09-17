'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag,
  Home,
  Layers,
  Palette,
  Eye,
  RotateCw,
  RotateCcw,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ExternalLink,
  Sparkles,
  Move,
  Camera,
  Maximize2,
  Minimize2,
  Check,
  Search,
  ZoomIn,
  ZoomOut,
  Focus,
  X,
  Compass,
  Sliders,
  Sun,
  Grid,
  Box,
  Maximize,
  Minimize,
  Lightbulb,
  Globe,
  Lock,
  Unlock,
  Save
} from 'lucide-react';
import ThreeViewport from '../../studio/components/ThreeViewport';
import SceneCartModal from '../../studio/components/SceneCartModal';
import TemplatesModal from '../../studio/components/TemplatesModal';
import { CATALOG, FLOOR_PBR_PRESETS, WALL_PBR_PRESETS } from '../../studio/lib/furniture-data';
import { ROOM_TEMPLATES, RoomTemplatePreset } from '../../studio/lib/room-templates';
import { FurnitureInstance, FurnitureSpec, RoomSettings } from '../../studio/types/furniture';
import { getAutoSavedProject, saveAutoSaveState, saveProject } from '../../studio/lib/project-storage';

type MobileStudioTab = 'catalog' | 'properties' | 'room' | 'lighting' | 'cart';
type JoystickMode = 'object' | 'camera';

function enrichFurnitureWithCatalog(items: FurnitureInstance[]): FurnitureInstance[] {
  return items.map((item) => {
    if (item.product && item.product.stores && item.product.stores.length > 0) {
      return item;
    }
    for (const cat of CATALOG) {
      const found = cat.items.find((spec) => spec.id === item.id);
      if (found && found.product) {
        return {
          ...item,
          product: {
            ...found.product,
            showPin: true,
          },
        };
      }
    }
    return item;
  });
}

export default function MobileStudioPage() {
  const router = useRouter();

  // Navigation & Bottom Sheet States
  const [activeTab, setActiveTab] = useState<MobileStudioTab>('catalog');
  const [sheetState, setSheetState] = useState<'collapsed' | 'standard' | 'expanded'>('standard');
  const [isLandscape, setIsLandscape] = useState<boolean>(false);
  const [isLandscapePanelOpen, setIsLandscapePanelOpen] = useState<boolean>(true);
  const [isCartModalOpen, setIsCartModalOpen] = useState<boolean>(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [templateToast, setTemplateToast] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showProductPins, setShowProductPins] = useState<boolean>(true);
  const [joystickMode, setJoystickMode] = useState<JoystickMode>('object');
  const [joystickOpen, setJoystickOpen] = useState<boolean>(true);
  const [isCameraMenuOpen, setIsCameraMenuOpen] = useState<boolean>(false);
  const [isObjectLocked, setIsObjectLocked] = useState<boolean>(true);
  const [isSavedRecently, setIsSavedRecently] = useState<boolean>(false);

  // 3D Scene States
  const [furniture, setFurniture] = useState<FurnitureInstance[]>([]);
  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const [selectedOpeningId, setSelectedOpeningId] = useState<string | null>(null);
  const [activeWallSide, setActiveWallSide] = useState<'back' | 'front' | 'left' | 'right'>('back');

  const [room, setRoom] = useState<RoomSettings>({
    width: 4.8,
    depth: 3.6,
    height: 2.7,
    floorColor: '#ffffff',
    floorTextureUrl: '/textures/floor-porcelain.webp',
    floorTileX: 4,
    floorTileY: 4,
    floorRoughness: 0.15,
    floorMetalness: 0.05,
    walls: {
      back: {
        color: '#ffffff',
        textureUrl: '/textures/subway-tile.webp',
        tileX: 4,
        tileY: 2,
        roughness: 0.18,
        metalness: 0.05,
      },
      front: { color: '#f8fafc', tileX: 1, tileY: 1, roughness: 0.9, metalness: 0 },
      left: { color: '#f8fafc', tileX: 1, tileY: 1, roughness: 0.9, metalness: 0 },
      right: { color: '#f8fafc', tileX: 1, tileY: 1, roughness: 0.9, metalness: 0 },
    },
    openings: [],
    lightIntensity: 2.25,
    exposure: 1.75,
    environmentPreset: 'hdr_144',
    reflectionOpacity: 0.05,
    areaLight: {
      enabled: false,
      intensity: 2.0,
      width: 2.2,
      height: 1.6,
      color: '#ffffff',
      showHelper: false,
    },
    hdrSettings: {
      intensity: 0.4,
      rotation: 50,
      showBackground: true,
      backgroundBlur: 0.3,
      disableManualLights: false,
    },
  });

  const [cameraSettings, setCameraSettings] = useState({
    id: 'iso',
    x: 5.5,
    y: 4.5,
    z: 5.5,
    fov: 45,
  });

  // Apply room template preset
  const handleApplyTemplate = useCallback(
    (template: RoomTemplatePreset, mode: 'replace' | 'append') => {
      const timestamp = Date.now();
      const newItems: FurnitureInstance[] = template.furniture.map((item, idx) => ({
        ...item,
        uid: timestamp + idx,
      }));

      if (mode === 'replace') {
        setRoom(template.room);
        setFurniture(enrichFurnitureWithCatalog(newItems));
        setSelectedUid(null);
        setTemplateToast(`Ambiente "${template.name}" aplicado!`);
      } else {
        setFurniture((prev) => enrichFurnitureWithCatalog([...prev, ...newItems]));
        setTemplateToast(`${newItems.length} móveis adicionados!`);
      }
      setTimeout(() => setTemplateToast(null), 3000);
    },
    []
  );

  // Load auto-save or default to Kitchen template
  useEffect(() => {
    const autosave = getAutoSavedProject();
    if (autosave && autosave.furniture && autosave.furniture.length > 0) {
      if (autosave.room) setRoom(autosave.room);
      setFurniture(enrichFurnitureWithCatalog(autosave.furniture));
      if (autosave.cameraSettings) setCameraSettings(autosave.cameraSettings);
    } else {
      // Default: Initial Gourmet Kitchen Scene with Mobile Default Living HDR Lighting
      const kitchenTpl = ROOM_TEMPLATES.find((t) => t.id === 'kitchen-gourmet') || ROOM_TEMPLATES[0];
      if (kitchenTpl) {
        setRoom({
          ...kitchenTpl.room,
          environmentPreset: 'hdr_144',
          exposure: 1.75,
          lightIntensity: 2.25,
          reflectionOpacity: 0.05,
          hdrSettings: {
            intensity: 0.4,
            rotation: 50,
            showBackground: true,
            backgroundBlur: 0.3,
            disableManualLights: false,
          },
        });
        const timestamp = Date.now();
        const initialItems: FurnitureInstance[] = kitchenTpl.furniture.map((item, idx) => ({
          ...item,
          uid: timestamp + idx,
        }));
        setFurniture(enrichFurnitureWithCatalog(initialItems));
      }
    }
  }, []);

  // Save autosave on changes
  useEffect(() => {
    saveAutoSaveState({
      id: 'mobile_proj',
      name: 'Projeto Mobile 3D',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      room,
      furniture,
      cameraSettings,
    });
  }, [room, furniture, cameraSettings]);

  // Manual Project Save Handler
  const handleManualSave = useCallback(() => {
    try {
      const now = new Date().toISOString();
      const proj = {
        id: 'mobile_proj',
        name: 'Meu Projeto 3D',
        createdAt: now,
        updatedAt: now,
        room,
        furniture,
        cameraSettings,
      };
      saveProject(proj);
      saveAutoSaveState(proj);
      setIsSavedRecently(true);
      setTemplateToast('💾 Projeto salvo com sucesso!');
      setTimeout(() => {
        setIsSavedRecently(false);
        setTemplateToast(null);
      }, 2500);
    } catch (err) {
      console.error('Error saving project:', err);
      setTemplateToast('Erro ao salvar projeto');
      setTimeout(() => setTemplateToast(null), 2500);
    }
  }, [room, furniture, cameraSettings]);

  // Wall helper functions for mobile
  const updateWall = (side: 'back' | 'front' | 'left' | 'right', changes: Partial<RoomSettings['walls']['back']>) => {
    setRoom((prev) => ({
      ...prev,
      walls: {
        ...prev.walls,
        [side]: {
          ...prev.walls[side],
          ...changes,
        },
      },
    }));
  };

  const handleApplyWallToAll = () => {
    const current = room.walls[activeWallSide];
    setRoom((prev) => ({
      ...prev,
      walls: {
        back: { ...current },
        front: { ...current },
        left: { ...current },
        right: { ...current },
      },
    }));
    setTemplateToast('🎨 Revestimento aplicado a todas as 4 paredes!');
    setTimeout(() => setTemplateToast(null), 2500);
  };

  // Orientation Check
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
      console.warn('Fullscreen toggle failed:', err);
    }
  };

  // Selected Furniture Item Helper
  const selectedItem = useMemo(() => {
    return furniture.find((f) => f.uid === selectedUid) || null;
  }, [furniture, selectedUid]);

  // Auto-switch joystick mode when item selection changes
  useEffect(() => {
    if (selectedUid) {
      setJoystickMode('object');
    }
  }, [selectedUid]);

  // When an item is selected on the 3D canvas, switch tab to properties
  const handleSelectObject = useCallback((uid: number | null) => {
    setSelectedUid(uid);
    if (uid) {
      setActiveTab('properties');
      setJoystickMode('object');
    }
  }, []);

  // Cart Count & Total Calculation
  const { cartCount, cartTotal } = useMemo(() => {
    let total = 0;
    let count = 0;
    furniture.forEach((item) => {
      if (item.product && item.product.stores && item.product.stores.length > 0) {
        total += item.product.stores[0].price;
        count += 1;
      }
    });
    return { cartCount: count, cartTotal: total };
  }, [furniture]);

  // Add Item to Scene
  const handleAddFurniture = (spec: FurnitureSpec) => {
    const newUid = Date.now();
    const isWall = spec.pr === 'wall';
    const newInstance: FurnitureInstance = {
      ...spec,
      uid: newUid,
      x: 0,
      z: 0,
      by: isWall ? (spec.by || 1.5) : 0,
      rot: 0,
      scl: 1,
      dm: spec.dm ? { ...spec.dm } : { t: 'wood', c: '#ffffff' },
      product: spec.product
        ? {
          ...spec.product,
          showPin: true,
        }
        : undefined,
    };

    setFurniture((prev) => [...prev, newInstance]);
    setSelectedUid(newUid);
    setActiveTab('properties');
    setJoystickMode('object');
  };

  // Update Object Position
  const handleUpdatePosition = useCallback(
    (uid: number, x: number, z: number, by?: number, rot?: number) => {
      setFurniture((prev) =>
        prev.map((item) =>
          item.uid === uid
            ? { ...item, x, z, by: by !== undefined ? by : item.by, rot: rot !== undefined ? rot : item.rot }
            : item
        )
      );
    },
    []
  );

  // Precision Joystick Movements for Selected Object
  const handleJoystickMove = (dx: number, dz: number) => {
    if (!selectedUid) return;
    setFurniture((prev) =>
      prev.map((item) => {
        if (item.uid !== selectedUid) return item;
        const newX = +(item.x + dx).toFixed(2);
        const newZ = +(item.z + dz).toFixed(2);
        return { ...item, x: newX, z: newZ };
      })
    );
  };

  const handleJoystickElevation = (dBy: number) => {
    if (!selectedUid) return;
    setFurniture((prev) =>
      prev.map((item) => {
        if (item.uid !== selectedUid) return item;
        const newBy = Math.max(0, +((item.by || 0) + dBy).toFixed(2));
        return { ...item, by: newBy };
      })
    );
  };

  const handleJoystickRotate = (dRot: number) => {
    if (!selectedUid) return;
    setFurniture((prev) =>
      prev.map((item) => {
        if (item.uid !== selectedUid) return item;
        return { ...item, rot: +(item.rot + dRot).toFixed(4) };
      })
    );
  };

  // Camera Orbit / Step Controls (When in Camera Joystick mode)
  const handleCameraOrbit = (dAngle: number) => {
    setCameraSettings((prev) => {
      const radius = Math.sqrt(prev.x * prev.x + prev.z * prev.z) || 6;
      const currentAngle = Math.atan2(prev.z, prev.x);
      const newAngle = currentAngle + dAngle;
      return {
        ...prev,
        x: +(radius * Math.cos(newAngle)).toFixed(2),
        z: +(radius * Math.sin(newAngle)).toFixed(2),
      };
    });
  };

  const handleCameraZoom = (factor: number) => {
    setCameraSettings((prev) => ({
      ...prev,
      x: +(prev.x * factor).toFixed(2),
      y: +(prev.y * factor).toFixed(2),
      z: +(prev.z * factor).toFixed(2),
    }));
  };

  const handleCameraHeight = (dY: number) => {
    setCameraSettings((prev) => ({
      ...prev,
      y: Math.max(1.0, +(prev.y + dY).toFixed(2)),
    }));
  };

  const handleDeleteSelected = () => {
    if (!selectedUid) return;
    setFurniture((prev) => prev.filter((f) => f.uid !== selectedUid));
    setSelectedUid(null);
    setActiveTab('catalog');
  };

  const handleDuplicateSelected = () => {
    if (!selectedItem) return;
    const newUid = Date.now();
    const duplicated: FurnitureInstance = {
      ...selectedItem,
      uid: newUid,
      x: +(selectedItem.x + 0.3).toFixed(2),
      z: +(selectedItem.z + 0.3).toFixed(2),
    };
    setFurniture((prev) => [...prev, duplicated]);
    setSelectedUid(newUid);
  };

  // Filter Catalog
  const filteredCatalog = useMemo(() => {
    return CATALOG.map((cat) => {
      if (selectedCategory !== 'all' && cat.id !== selectedCategory) {
        return { ...cat, items: [] };
      }
      if (!searchQuery.trim()) return cat;
      const q = searchQuery.toLowerCase();
      const items = cat.items.filter(
        (i) => i.name.toLowerCase().includes(q) || i.product?.title?.toLowerCase().includes(q)
      );
      return { ...cat, items };
    }).filter((cat) => cat.items.length > 0);
  }, [selectedCategory, searchQuery]);

  // Camera Presets
  const setCameraPreset = (type: 'iso' | 'top' | 'front') => {
    if (type === 'iso') {
      setCameraSettings({ id: 'iso', x: 5.5, y: 4.5, z: 5.5, fov: 45 });
    } else if (type === 'top') {
      setCameraSettings({ id: 'top', x: 0, y: 8.0, z: 0.01, fov: 45 });
    } else if (type === 'front') {
      setCameraSettings({ id: 'front', x: 0, y: 2.0, z: 6.5, fov: 45 });
    }
  };

  // Height for 3D viewport based on sheet state
  const viewportHeightClass = useMemo(() => {
    if (isLandscape) return 'h-full';
    if (sheetState === 'collapsed') return 'h-full flex-1';
    if (sheetState === 'expanded') return 'h-[32dvh]';
    return 'h-[56dvh]';
  }, [isLandscape, sheetState]);

  return (
    <div className="relative w-full h-[100dvh] flex flex-col bg-neutral-950 overflow-hidden select-none">
      {/* ========================================================= */}
      {/* TOP FLOATING HUD (HEADER & CONTROLS)                      */}
      {/* ========================================================= */}
      <div className="absolute top-3.5 left-16 right-3.5 z-30 flex items-center justify-between pointer-events-none gap-2">
        {/* Camera Select Dropdown */}
        <div className="relative pointer-events-auto">
          <button
            type="button"
            onClick={() => setIsCameraMenuOpen(!isCameraMenuOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900/90 hover:bg-neutral-800 backdrop-blur-xl border border-white/15 rounded-full shadow-2xl text-white text-[11px] font-bold active:scale-95 transition-all"
          >
            <Camera className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>
              {cameraSettings.id === 'top'
                ? 'Topo'
                : cameraSettings.id === 'front'
                ? 'Frontal'
                : 'Perspectiva'}
            </span>
            <ChevronDown
              className={`w-3 h-3 text-neutral-400 transition-transform duration-200 shrink-0 ${
                isCameraMenuOpen ? 'rotate-180 text-blue-400' : ''
              }`}
            />
          </button>

          {/* Custom Dropdown Menu */}
          {isCameraMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsCameraMenuOpen(false)}
              />
              <div className="absolute top-full left-0 mt-2 z-50 min-w-[155px] bg-neutral-900/95 backdrop-blur-xl border border-white/15 rounded-2xl p-1.5 shadow-2xl flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setCameraPreset('iso');
                    setIsCameraMenuOpen(false);
                  }}
                  className={`flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    cameraSettings.id === 'iso'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-neutral-300 hover:bg-white/10 active:bg-white/15'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Box className="w-3.5 h-3.5 text-blue-300" />
                    Perspectiva
                  </span>
                  {cameraSettings.id === 'iso' && <Check className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCameraPreset('top');
                    setIsCameraMenuOpen(false);
                  }}
                  className={`flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    cameraSettings.id === 'top'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-neutral-300 hover:bg-white/10 active:bg-white/15'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    Topo
                  </span>
                  {cameraSettings.id === 'top' && <Check className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCameraPreset('front');
                    setIsCameraMenuOpen(false);
                  }}
                  className={`flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    cameraSettings.id === 'front'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-neutral-300 hover:bg-white/10 active:bg-white/15'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5 text-amber-300" />
                    Frontal
                  </span>
                  {cameraSettings.id === 'front' && <Check className="w-3.5 h-3.5" />}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right Floating Quick Tools */}
        <div className="flex items-center gap-1.5 pointer-events-auto shrink-0">
          {/* Templates / Ambientes Prontos Button (Visible only in Landscape if space permits) */}
          {isLandscape && (
            <button
              onClick={() => setIsTemplatesOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-[10px] shadow-lg border border-blue-400/40 active:scale-95 transition-all"
              title="Biblioteca de Ambientes 3D Prontos (Cozinha, Sala, etc)"
            >
              <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
              <span>Ambientes</span>
            </button>
          )}

          {/* Pins Toggle Button */}
          <button
            onClick={() => setShowProductPins(!showProductPins)}
            className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-xl border transition-all ${showProductPins
              ? 'bg-emerald-600/90 border-emerald-400 text-white shadow-lg shadow-emerald-600/30'
              : 'bg-neutral-900/85 border-white/20 text-neutral-400'
              }`}
            title="Mostrar/Ocultar Tags Magalu 2D"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
          </button>

          {/* Cart Modal Button (Spacious & Visible) */}
          <button
            onClick={() => setIsCartModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs shadow-xl shadow-emerald-950/50 border border-emerald-400/40 active:scale-95 transition-all whitespace-nowrap shrink-0"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse shrink-0" />
            <span>
              {cartCount > 0
                ? `R$ ${cartTotal.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                : 'R$ 0'}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3D THREE.JS VIEWPORT CONTAINER                            */}
      {/* ========================================================= */}
      <div className={`w-full transition-all duration-300 relative ${viewportHeightClass}`}>
        <ThreeViewport
          room={room}
          furniture={furniture}
          selectedUid={selectedUid}
          selectedOpeningId={selectedOpeningId}
          onSelect={handleSelectObject}
          onSelectOpening={setSelectedOpeningId}
          onUpdatePosition={handleUpdatePosition}
          cameraSettings={cameraSettings}
          showGrid={false}
          snapOn={true}
          collisionOn={true}
          autoTransparency={true}
          showProductPins={showProductPins}
          onOpenCart={() => setIsCartModalOpen(true)}
          isObjectLocked={isObjectLocked}
        />

        {/* Fullscreen Toggle Button (Bottom-Left of Viewport) */}
        <button
          onClick={toggleFullscreen}
          className={`absolute bottom-3 left-3 z-30 px-3 py-1.5 rounded-2xl bg-neutral-900/85 backdrop-blur-xl border border-white/20 text-white shadow-2xl flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer hover:bg-neutral-800 pointer-events-auto ${isFullscreen ? 'border-blue-400/80 text-blue-300 ring-1 ring-blue-400/40' : 'text-neutral-200'
            }`}
          title={isFullscreen ? 'Sair da Tela Cheia' : 'Entrar em Tela Cheia (Imersivo)'}
        >
          {isFullscreen ? <Minimize className="w-3.5 h-3.5 text-blue-400" /> : <Maximize className="w-3.5 h-3.5 text-neutral-300" />}
          <span className="text-[10px] font-bold">{isFullscreen ? 'Sair Fullscreen' : 'Tela Cheia'}</span>
        </button>

        {/* Selected Item Quick Action Badge (Top Center of Viewport) */}
        {selectedItem && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-950/90 backdrop-blur-xl border border-blue-500/40 text-white shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
            <span className="text-[11px] font-bold truncate max-w-[110px]">{selectedItem.name}</span>

            {/* Lock / Unlock Toggle Pill Button */}
            <button
              onClick={() => {
                const next = !isObjectLocked;
                setIsObjectLocked(next);
                setTemplateToast(
                  next
                    ? '🔒 Móveis travados contra arrasto acidental'
                    : '🔓 Móvel liberado para arrastar na tela'
                );
                setTimeout(() => setTemplateToast(null), 2500);
              }}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all border shrink-0 ${
                isObjectLocked
                  ? 'bg-amber-500/20 border-amber-400/50 text-amber-300 shadow-sm'
                  : 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300 shadow-sm'
              }`}
              title={isObjectLocked ? 'Móvel Travado: Toque para destravar e arrastar' : 'Móvel Destravado: Toque para travar'}
            >
              {isObjectLocked ? <Lock className="w-3 h-3 text-amber-300" /> : <Unlock className="w-3 h-3 text-emerald-300" />}
              <span>{isObjectLocked ? 'Travado' : 'Livre'}</span>
            </button>

            <button
              onClick={() => setSelectedUid(null)}
              className="w-4 h-4 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-neutral-300 text-[10px] ml-0.5"
              title="Desmarcar"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* ERGONOMIC TOUCH JOYSTICK & D-PAD (CANTO INFERIOR DIREITO)  */}
        {/* ========================================================= */}
        <div className="absolute bottom-3 right-3 z-30 flex flex-col items-end pointer-events-auto">
          {/* Quick Restore Floating Button with Up Arrow (When Bottom Sheet is Collapsed) */}
          {!isLandscape && sheetState === 'collapsed' && (
            <button
              onClick={() => setSheetState('standard')}
              className="w-11 h-11 mb-2 rounded-2xl bg-neutral-900/95 backdrop-blur-2xl border border-blue-500/60 hover:border-blue-400 text-white shadow-2xl shadow-black/80 flex items-center justify-center active:scale-90 transition-all ring-2 ring-blue-500/40 animate-in fade-in zoom-in-95 group"
              title="Abrir Painel (Restaurar Menu)"
            >
              <ChevronUp className="w-6 h-6 text-blue-400 group-hover:text-blue-300 stroke-[2.5] transition-transform group-active:translate-y-[-2px]" />
            </button>
          )}

          {/* Toggle Joystick Visibility Mini Button */}
          <button
            onClick={() => setJoystickOpen(!joystickOpen)}
            className="mb-1.5 px-2 py-0.5 rounded-full bg-neutral-900/80 backdrop-blur-md border border-white/20 text-[10px] font-bold text-neutral-300 flex items-center gap-1 shadow-lg active:scale-95 transition-transform"
          >
            <Compass className="w-3 h-3 text-blue-400" />
            <span>{joystickOpen ? 'Ocultar Pad' : 'Controles'}</span>
          </button>

          {joystickOpen && (
            <div className="flex flex-col bg-neutral-950/90 backdrop-blur-2xl border border-white/20 rounded-2xl p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black/50">
              {/* Header Mode Switcher: Móvel vs Câmera & Quick Save */}
              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10 gap-1.5">
                <div className="flex items-center gap-1 bg-black/40 rounded-xl p-0.5">
                  <button
                    onClick={() => setJoystickMode('object')}
                    disabled={!selectedItem}
                    className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${joystickMode === 'object' && selectedItem
                      ? 'bg-blue-600 text-white shadow'
                      : selectedItem
                        ? 'text-neutral-400 hover:text-white'
                        : 'text-neutral-600 cursor-not-allowed'
                      }`}
                  >
                    <Move className="w-2.5 h-2.5" />
                    <span>Móvel</span>
                  </button>
                  <button
                    onClick={() => setJoystickMode('camera')}
                    className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${joystickMode === 'camera' || !selectedItem
                      ? 'bg-amber-600 text-white shadow'
                      : 'text-neutral-400 hover:text-white'
                      }`}
                  >
                    <Camera className="w-2.5 h-2.5" />
                    <span>Câmera</span>
                  </button>
                </div>

                {/* Quick Save Icon-Only Button */}
                <button
                  onClick={handleManualSave}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-90 border shadow-sm ${
                    isSavedRecently
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-500/20 ring-1 ring-emerald-400/40'
                      : 'bg-white/10 hover:bg-white/20 active:bg-white/30 text-white border-white/15'
                  }`}
                  title={isSavedRecently ? 'Projeto Salvo com sucesso!' : 'Salvar Projeto'}
                >
                  {isSavedRecently ? (
                    <Check className="w-3.5 h-3.5 text-emerald-200" />
                  ) : (
                    <Save className="w-3.5 h-3.5 text-blue-300" />
                  )}
                </button>
              </div>

              {/* MODE 1: OBJECT PRECISION JOYSTICK */}
              {joystickMode === 'object' && selectedItem && (
                <div className="flex flex-col gap-1">
                  {/* D-Pad (Left) + 3 Stacked Action Buttons (Right) */}
                  <div className="flex items-center gap-1.5">
                    {/* Left: 3x3 D-Pad */}
                    <div className="grid grid-cols-3 gap-1 w-28 shrink-0">
                      {/* Row 1: Rotate CCW 10° */}
                      <button
                        onClick={() => handleJoystickRotate(-(10 * Math.PI) / 180)}
                        className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-neutral-300 active:bg-blue-600 active:text-white flex items-center justify-center transition-all active:scale-90"
                        title="Girar -10°"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>

                      {/* Row 1: Move Forward (-Z) */}
                      <button
                        onClick={() => handleJoystickMove(0, -0.1)}
                        className="w-8 h-8 rounded-xl bg-neutral-850 border border-white/15 text-white active:bg-blue-600 active:scale-95 flex items-center justify-center font-bold text-xs shadow-md"
                        title="Mover Frente"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>

                      {/* Row 1: Rotate CW 10° */}
                      <button
                        onClick={() => handleJoystickRotate((10 * Math.PI) / 180)}
                        className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-neutral-300 active:bg-blue-600 active:text-white flex items-center justify-center transition-all active:scale-90"
                        title="Girar +10°"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>

                      {/* Row 2: Move Left (-X) */}
                      <button
                        onClick={() => handleJoystickMove(-0.1, 0)}
                        className="w-8 h-8 rounded-xl bg-neutral-850 border border-white/15 text-white active:bg-blue-600 active:scale-95 flex items-center justify-center font-bold text-xs shadow-md"
                        title="Mover Esquerda"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>

                      {/* Row 2: Center Reset Angle */}
                      <button
                        onClick={() =>
                          setFurniture((prev) =>
                            prev.map((f) => (f.uid === selectedItem.uid ? { ...f, rot: 0 } : f))
                          )
                        }
                        className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-300 active:scale-90 flex items-center justify-center text-[10px] font-black"
                        title="Reset Rotação 0°"
                      >
                        0°
                      </button>

                      {/* Row 2: Move Right (+X) */}
                      <button
                        onClick={() => handleJoystickMove(0.1, 0)}
                        className="w-8 h-8 rounded-xl bg-neutral-850 border border-white/15 text-white active:bg-blue-600 active:scale-95 flex items-center justify-center font-bold text-xs shadow-md"
                        title="Mover Direita"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>

                      {/* Row 3: Height Down */}
                      <button
                        onClick={() => handleJoystickElevation(-0.05)}
                        className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-amber-300 active:bg-amber-600 active:text-white flex items-center justify-center text-[10px] font-bold"
                        title="Descer Altura Y"
                      >
                        ▼ Y
                      </button>

                      {/* Row 3: Move Backward (+Z) */}
                      <button
                        onClick={() => handleJoystickMove(0, 0.1)}
                        className="w-8 h-8 rounded-xl bg-neutral-850 border border-white/15 text-white active:bg-blue-600 active:scale-95 flex items-center justify-center font-bold text-xs shadow-md"
                        title="Mover Trás"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>

                      {/* Row 3: Height Up */}
                      <button
                        onClick={() => handleJoystickElevation(0.05)}
                        className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-amber-300 active:bg-amber-600 active:text-white flex items-center justify-center text-[10px] font-bold"
                        title="Subir Altura Y"
                      >
                        ▲ Y
                      </button>
                    </div>

                    {/* Right: 3 Stacked Action Buttons (Aligned with the 3 Rows) */}
                    <div className="flex flex-col gap-1 w-[82px] shrink-0">
                      {/* Slot 1 (Row 1): Lock / Unlock Toggle Button */}
                      <button
                        onClick={() => {
                          const next = !isObjectLocked;
                          setIsObjectLocked(next);
                          setTemplateToast(
                            next
                              ? '🔒 Móveis travados contra arrasto acidental'
                              : '🔓 Móvel liberado para arrastar na tela'
                          );
                          setTimeout(() => setTemplateToast(null), 2500);
                        }}
                        className={`w-full h-8 px-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-all active:scale-95 border ${
                          isObjectLocked
                            ? 'bg-amber-500/20 border-amber-400/50 text-amber-300 shadow-sm'
                            : 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300 shadow-sm'
                        }`}
                        title={
                          isObjectLocked
                            ? 'Móvel Travado: Toque para destravar e arrastar na tela'
                            : 'Móvel Destravado: Toque para travar'
                        }
                      >
                        {isObjectLocked ? <Lock className="w-3.5 h-3.5 text-amber-300 shrink-0" /> : <Unlock className="w-3.5 h-3.5 text-emerald-300 shrink-0" />}
                        <span className="truncate">{isObjectLocked ? 'Travado' : 'Livre'}</span>
                      </button>

                      {/* Slot 2 (Row 2): Duplicate Button */}
                      <button
                        onClick={handleDuplicateSelected}
                        className="w-full h-8 px-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 border border-white/10 text-neutral-200 flex items-center justify-center gap-1 text-[10px] font-bold active:scale-95 transition-all shadow-sm"
                        title="Duplicar Móvel"
                      >
                        <Copy className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                        <span className="truncate">Duplicar</span>
                      </button>

                      {/* Slot 3 (Row 3): Delete Button */}
                      <button
                        onClick={handleDeleteSelected}
                        className="w-full h-8 px-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 active:bg-rose-600/40 border border-rose-500/30 text-rose-300 flex items-center justify-center gap-1 text-[10px] font-bold active:scale-95 transition-all shadow-sm"
                        title="Excluir Móvel"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span className="truncate">Excluir</span>
                      </button>
                    </div>
                  </div>

                  {/* Coordinates Info */}
                  <div className="text-[9px] font-mono text-neutral-400 mt-1 flex items-center justify-between w-full px-1">
                    <span>X: {selectedItem.x.toFixed(2)}m</span>
                    <span>Z: {selectedItem.z.toFixed(2)}m</span>
                    <span>Y: {(selectedItem.by || 0).toFixed(2)}m</span>
                    <span>Rot: {Math.round((((selectedItem.rot || 0) * 180) / Math.PI) % 360 + 360) % 360}°</span>
                  </div>
                </div>
              )}

              {/* MODE 2: CAMERA NAVIGATION CONTROLS */}
              {(joystickMode === 'camera' || !selectedItem) && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    {/* Left: 3x3 Camera Controls */}
                    <div className="grid grid-cols-3 gap-1 w-28 shrink-0">
                      {/* Zoom In */}
                      <button
                        onClick={() => handleCameraZoom(0.85)}
                        className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-neutral-200 active:bg-amber-600 active:text-white flex items-center justify-center transition-all active:scale-90"
                        title="Zoom In"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>

                      {/* Camera Height Up */}
                      <button
                        onClick={() => handleCameraHeight(0.5)}
                        className="w-8 h-8 rounded-xl bg-neutral-850 border border-white/15 text-white active:bg-amber-600 active:scale-95 flex items-center justify-center font-bold text-xs shadow-md"
                        title="Câmera para Cima"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>

                      {/* Zoom Out */}
                      <button
                        onClick={() => handleCameraZoom(1.15)}
                        className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-neutral-200 active:bg-amber-600 active:text-white flex items-center justify-center transition-all active:scale-90"
                        title="Zoom Out"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>

                      {/* Orbit Left */}
                      <button
                        onClick={() => handleCameraOrbit(-0.25)}
                        className="w-8 h-8 rounded-xl bg-neutral-850 border border-white/15 text-white active:bg-amber-600 active:scale-95 flex items-center justify-center font-bold text-xs shadow-md"
                        title="Girar Câmera Esquerda"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>

                      {/* Center Reset */}
                      <button
                        onClick={() => setCameraPreset('iso')}
                        className="w-8 h-8 rounded-xl bg-amber-600/30 border border-amber-500/40 text-amber-300 active:scale-90 flex items-center justify-center text-[10px] font-bold"
                        title="Reset View"
                      >
                        <Focus className="w-3.5 h-3.5" />
                      </button>

                      {/* Orbit Right */}
                      <button
                        onClick={() => handleCameraOrbit(0.25)}
                        className="w-8 h-8 rounded-xl bg-neutral-850 border border-white/15 text-white active:bg-amber-600 active:scale-95 flex items-center justify-center font-bold text-xs shadow-md"
                        title="Girar Câmera Direita"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>

                      {/* Preset Planta */}
                      <button
                        onClick={() => setCameraPreset('top')}
                        className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-neutral-300 active:bg-amber-600 flex items-center justify-center text-[9px] font-bold"
                        title="Visão Superior"
                      >
                        Top
                      </button>

                      {/* Camera Height Down */}
                      <button
                        onClick={() => handleCameraHeight(-0.5)}
                        className="w-8 h-8 rounded-xl bg-neutral-850 border border-white/15 text-white active:bg-amber-600 active:scale-95 flex items-center justify-center font-bold text-xs shadow-md"
                        title="Câmera para Baixo"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>

                      {/* Preset Frente */}
                      <button
                        onClick={() => setCameraPreset('front')}
                        className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-neutral-300 active:bg-amber-600 flex items-center justify-center text-[9px] font-bold"
                        title="Visão Frontal"
                      >
                        Front
                      </button>
                    </div>

                    {/* Right: Quick Camera Presets */}
                    <div className="flex flex-col gap-1 w-[82px] shrink-0">
                      <button
                        onClick={() => setCameraPreset('iso')}
                        className="w-full h-8 px-2 rounded-xl bg-amber-600/20 border border-amber-500/40 text-amber-300 flex items-center justify-center gap-1 text-[10px] font-bold active:scale-95 transition-all shadow-sm"
                        title="Perspectiva 3D"
                      >
                        <Focus className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">3D 45°</span>
                      </button>
                      <button
                        onClick={() => setCameraPreset('top')}
                        className="w-full h-8 px-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-neutral-200 flex items-center justify-center gap-1 text-[10px] font-bold active:scale-95 transition-all shadow-sm"
                        title="Planta Baixa (Topo)"
                      >
                        <span className="truncate">Planta</span>
                      </button>
                      <button
                        onClick={() => setCameraPreset('front')}
                        className="w-full h-8 px-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-neutral-200 flex items-center justify-center gap-1 text-[10px] font-bold active:scale-95 transition-all shadow-sm"
                        title="Visão Frontal"
                      >
                        <span className="truncate">Frontal</span>
                      </button>
                    </div>
                  </div>

                  <span className="text-[9px] text-neutral-500 mt-1 font-mono text-center">
                    Touch &bull; Arraste na tela p/ orbitar
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* LANDSCAPE TOGGLE TAB (INVERTS ▶ / ◀)                     */}
      {/* ========================================================= */}
      {isLandscape && (
        <button
          onClick={() => setIsLandscapePanelOpen(!isLandscapePanelOpen)}
          className={`fixed top-1/2 -translate-y-1/2 z-50 py-3.5 px-2 rounded-l-xl bg-neutral-900/95 border-l border-t border-b border-white/20 text-blue-400 hover:text-white shadow-2xl flex items-center justify-center transition-all duration-300 cursor-pointer active:scale-95 ${isLandscapePanelOpen ? 'right-[360px]' : 'right-0 bg-blue-600 text-white border-blue-400'
            }`}
          title={isLandscapePanelOpen ? 'Recolher Painel (Tela Cheia)' : 'Abrir Painel'}
        >
          <span className="text-xs font-black select-none">
            {isLandscapePanelOpen ? '▶' : '◀'}
          </span>
        </button>
      )}

      {/* ========================================================= */}
      {/* MOBILE BOTTOM SHEET (PORTRAIT) / SIDE PANEL (LANDSCAPE)  */}
      {/* ========================================================= */}
      <div
        className={`z-40 bg-neutral-900/95 backdrop-blur-2xl border-white/15 flex flex-col transition-all duration-300 shadow-2xl ${isLandscape
          ? `fixed top-0 bottom-0 right-0 w-[360px] h-full rounded-l-3xl border-l ${isLandscapePanelOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
          }`
          : sheetState === 'collapsed'
            ? 'hidden pointer-events-none'
            : sheetState === 'expanded'
              ? 'flex-1 h-[68dvh] border-t rounded-t-3xl'
              : 'flex-1 h-[44dvh] border-t rounded-t-3xl'
          }`}
      >
        {/* Drag Handle & Expand / Collapse Controls (Portrait only) */}
        {!isLandscape && (
          <div className="w-full py-1.5 px-3 flex items-center justify-between border-b border-white/5 select-none">
            {/* Direct Minimize Button to completely hide panel */}
            <button
              onClick={() => setSheetState('collapsed')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-neutral-400 hover:text-white text-[10px] font-bold transition-all"
              title="Ocultar Painel (Ver 3D em Tela Cheia)"
            >
              <ChevronDown className="w-3.5 h-3.5 text-blue-400" />
              <span>Ocultar</span>
            </button>

            {/* Center Drag Pill / Status */}
            <div
              onClick={() =>
                setSheetState((prev) => (prev === 'expanded' ? 'standard' : 'expanded'))
              }
              className="flex flex-col items-center justify-center cursor-pointer active:opacity-70 py-0.5 px-2"
            >
              <div className="w-10 h-1 rounded-full bg-white/30 mb-0.5" />
              <span className="text-[9px] text-neutral-400 font-medium">
                {sheetState === 'expanded' ? 'Painel Completo' : 'Painel Médio'}
              </span>
            </div>

            {/* Toggle Standard <-> Full height */}
            <button
              onClick={() =>
                setSheetState((prev) => (prev === 'expanded' ? 'standard' : 'expanded'))
              }
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-neutral-400 hover:text-white text-[10px] font-bold transition-all"
              title={sheetState === 'expanded' ? 'Tamanho Médio' : 'Expandir Painel'}
            >
              <span>{sheetState === 'expanded' ? 'Reduzir' : 'Expandir'}</span>
              {sheetState === 'expanded' ? (
                <ChevronDown className="w-3.5 h-3.5 text-blue-400" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5 text-blue-400" />
              )}
            </button>
          </div>
        )}

        {/* 5 Navigation Tabs */}
        <div className="px-3 pb-2">
          <div className="grid grid-cols-5 gap-1 p-1 bg-black/50 rounded-2xl border border-white/10 text-[10px] font-semibold">
            <button
              onClick={() => {
                setActiveTab('catalog');
                if (sheetState === 'collapsed') setSheetState('standard');
              }}
              className={`py-2 px-0.5 rounded-xl flex items-center justify-center gap-1 transition-all ${activeTab === 'catalog'
                ? 'bg-blue-600 text-white shadow font-bold'
                : 'text-neutral-400 hover:text-white'
                }`}
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span>Catálogo</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('properties');
                if (sheetState === 'collapsed') setSheetState('standard');
              }}
              className={`py-2 px-0.5 rounded-xl flex items-center justify-center gap-1 transition-all relative ${activeTab === 'properties'
                ? 'bg-blue-600 text-white shadow font-bold'
                : 'text-neutral-400 hover:text-white'
                }`}
            >
              <Palette className="w-3.5 h-3.5 shrink-0" />
              <span>Móvel</span>
              {selectedItem && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 absolute top-1.5 right-1.5" />
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('room');
                if (sheetState === 'collapsed') setSheetState('standard');
              }}
              className={`py-2 px-0.5 rounded-xl flex items-center justify-center gap-1 transition-all ${activeTab === 'room'
                ? 'bg-blue-600 text-white shadow font-bold'
                : 'text-neutral-400 hover:text-white'
                }`}
            >
              <Home className="w-3.5 h-3.5 shrink-0" />
              <span>Sala</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('lighting');
                if (sheetState === 'collapsed') setSheetState('standard');
              }}
              className={`py-2 px-0.5 rounded-xl flex items-center justify-center gap-1 transition-all ${activeTab === 'lighting'
                ? 'bg-blue-600 text-white shadow font-bold'
                : 'text-neutral-400 hover:text-white'
                }`}
            >
              <Sun className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span>Luz</span>
            </button>

            <button
              onClick={() => setIsCartModalOpen(true)}
              className="py-2 px-0.5 rounded-xl flex items-center justify-center gap-1 transition-all bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 font-bold"
            >
              <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
              <span>{cartCount}</span>
            </button>
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-4">
          {/* ================= TAB 1: CATÁLOGO DE MÓVEIS ================= */}
          {activeTab === 'catalog' && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              {/* Quick Template Switcher Card */}
              <div
                onClick={() => setIsTemplatesOpen(true)}
                className="p-2.5 rounded-2xl bg-gradient-to-r from-blue-950/80 via-indigo-950/70 to-blue-900/80 border border-blue-500/40 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all hover:border-blue-400 shadow-lg"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0">
                    <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                  </div>
                  <h4 className="text-xs font-bold text-white">
                    Ambientes Prontos 3D
                  </h4>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] shadow shrink-0">
                  Explorar
                </div>
              </div>

              {/* Search Bar & Category Filter */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar móveis, pias, eletros..."
                    className="w-full bg-neutral-950 border border-white/15 focus:border-blue-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 outline-none"
                  />
                </div>

                {/* Category Pills */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${selectedCategory === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/5 text-neutral-400 hover:text-white'
                      }`}
                  >
                    Todos
                  </button>
                  {CATALOG.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${selectedCategory === cat.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/5 text-neutral-400 hover:text-white'
                        }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Items Grid (2 Columns) */}
              <div className="grid grid-cols-2 gap-2.5">
                {filteredCatalog.flatMap((cat) =>
                  cat.items.map((spec) => (
                    <div
                      key={spec.id}
                      onClick={() => handleAddFurniture(spec)}
                      className="group rounded-2xl p-2.5 bg-white/[0.03] border border-white/10 hover:border-blue-500/50 flex flex-col justify-between cursor-pointer active:scale-95 transition-all relative overflow-hidden"
                    >
                      <div>
                        {/* 3D Blueprint / Isometric Representation (Prepared for Future 3D Snapshots) */}
                        <div className="h-20 w-full rounded-xl mb-2 bg-gradient-to-br from-white/[0.07] via-white/[0.02] to-black/60 border border-white/10 flex flex-col items-center justify-center relative overflow-hidden group-hover:border-blue-500/40 transition-colors">
                          {/* Subtle background grid pattern */}
                          <div
                            className="absolute inset-0 opacity-15 pointer-events-none"
                            style={{
                              backgroundImage:
                                'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)',
                              backgroundSize: '12px 12px',
                            }}
                          />
                          <div className="relative z-10 flex items-center justify-center">
                            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400 shadow-inner group-hover:scale-110 group-hover:bg-blue-500/20 transition-all duration-300">
                              <Box className="w-5 h-5" />
                            </div>
                          </div>
                        </div>

                        <h4 className="text-xs font-bold text-white leading-tight line-clamp-1 group-hover:text-blue-300 transition-colors">
                          {spec.name}
                        </h4>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {spec.w}m &times; {spec.d}m &bull; h{spec.h}m
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                        {spec.product?.stores?.[0]?.price ? (
                          <span className="text-xs font-black text-emerald-400">
                            R$ {spec.product.stores[0].price.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                          </span>
                        ) : (
                          <span className="text-[10px] text-neutral-500">Módulo</span>
                        )}
                        <div className="w-6 h-6 rounded-lg bg-blue-600/80 text-white flex items-center justify-center text-xs font-bold">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ================= TAB 2: PROPRIEDADES DO MÓVEL SELECIONADO ================= */}
          {activeTab === 'properties' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {selectedItem ? (
                <>
                  {/* Selected Item Card */}
                  <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-blue-400 uppercase font-bold">
                          Móvel Selecionado
                        </span>
                        <h3 className="text-sm font-bold text-white">{selectedItem.name}</h3>
                        <span className="text-xs text-neutral-400 font-mono">
                          {selectedItem.w}m &times; {selectedItem.d}m &bull; Altura {selectedItem.h}m
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            const next = !isObjectLocked;
                            setIsObjectLocked(next);
                            setTemplateToast(
                              next
                                ? '🔒 Móveis travados contra arrasto acidental'
                                : '🔓 Móvel liberado para arrastar na tela'
                            );
                            setTimeout(() => setTemplateToast(null), 2500);
                          }}
                          className={`px-2 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 border transition-all active:scale-90 ${
                            isObjectLocked
                              ? 'bg-amber-500/20 border-amber-400/40 text-amber-300 shadow-sm'
                              : 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300 shadow-sm'
                          }`}
                          title={
                            isObjectLocked
                              ? 'Móvel Travado: Toque para destravar e arrastar na tela'
                              : 'Móvel Destravado: Toque para travar'
                          }
                        >
                          {isObjectLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                          <span>{isObjectLocked ? 'Travado' : 'Livre'}</span>
                        </button>
                        <button
                          onClick={handleDuplicateSelected}
                          className="w-8 h-8 rounded-xl bg-white/10 text-neutral-200 flex items-center justify-center hover:bg-white/20 active:scale-90 transition-transform"
                          title="Duplicar Móvel"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleDeleteSelected}
                          className="w-8 h-8 rounded-xl bg-rose-600/20 text-rose-300 border border-rose-500/30 flex items-center justify-center hover:bg-rose-600 active:scale-90 transition-transform"
                          title="Excluir Móvel"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Magazine Luiza Affiliate Store Card */}
                    {selectedItem.product && (
                      <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1">
                            <span>🛍️</span> Magazine Luiza
                          </span>
                          {selectedItem.product.stores?.[0]?.price && (
                            <span className="text-sm font-black text-emerald-400 font-mono">
                              R$ {selectedItem.product.stores[0].price.toFixed(2)}
                            </span>
                          )}
                        </div>

                        {selectedItem.product.stores?.[0]?.url && (
                          <a
                            href={selectedItem.product.stores[0].url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/50 active:scale-95 transition-all"
                          >
                            <span>Comprar no Magazine Você</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Material & Color Finish */}
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
                    <span className="text-xs font-bold text-neutral-200 block">
                      🎨 Cor &amp; Acabamento
                    </span>
                    <div className="grid grid-cols-6 gap-2">
                      {[
                        { name: 'Branco', color: '#ffffff' },
                        { name: 'Preto', color: '#1e293b' },
                        { name: 'Madeira Carvalho', color: '#c4a67d' },
                        { name: 'Nogueira', color: '#5c4033' },
                        { name: 'Cinza', color: '#64748b' },
                        { name: 'Azul Petróleo', color: '#1e3a8a' },
                      ].map((c) => (
                        <button
                          key={c.name}
                          onClick={() => {
                            setFurniture((prev) =>
                              prev.map((f) =>
                                f.uid === selectedItem.uid
                                  ? { ...f, dm: { ...(f.dm || { t: 'wood' }), c: c.color } }
                                  : f
                              )
                            );
                          }}
                          className={`h-9 rounded-xl border-2 transition-all active:scale-90 flex items-center justify-center ${selectedItem.dm?.c === c.color ? 'border-blue-400 scale-105 shadow-md' : 'border-white/20'
                            }`}
                          style={{ backgroundColor: c.color }}
                          title={c.name}
                        >
                          {selectedItem.dm?.c === c.color && (
                            <Check className={`w-3.5 h-3.5 ${c.color === '#ffffff' ? 'text-black' : 'text-white'}`} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-neutral-400">
                    <Move className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Nenhum móvel selecionado</h4>
                  <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                    Toque em qualquer móvel na cena 3D para editar suas medidas, cores e link de compra.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 3: SALA, PISO & PAREDES ================= */}
          {activeTab === 'room' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Preset Environments Switcher Button */}
              <button
                onClick={() => setIsTemplatesOpen(true)}
                className="w-full py-3 px-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>Trocar por Ambiente Pronto (Cozinhas, Salas...)</span>
              </button>

              {/* Room Dimensions */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <span className="text-xs font-bold text-neutral-200 block">
                  📐 Dimensões da Sala
                </span>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-neutral-300">
                    <span>Largura (X)</span>
                    <span className="font-mono text-blue-400 font-bold">{room.width.toFixed(1)} m</span>
                  </div>
                  <input
                    type="range"
                    min="2.0"
                    max="30.0"
                    step="0.5"
                    value={room.width}
                    onChange={(e) => setRoom((prev) => ({ ...prev, width: parseFloat(e.target.value) }))}
                    className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-neutral-300">
                    <span>Profundidade (Z)</span>
                    <span className="font-mono text-blue-400 font-bold">{room.depth.toFixed(1)} m</span>
                  </div>
                  <input
                    type="range"
                    min="2.0"
                    max="30.0"
                    step="0.5"
                    value={room.depth}
                    onChange={(e) => setRoom((prev) => ({ ...prev, depth: parseFloat(e.target.value) }))}
                    className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </div>

              {/* Floor Materials Selector */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
                <span className="text-xs font-bold text-neutral-200 block">
                  🪵 Textura do Piso
                </span>

                <div className="grid grid-cols-2 gap-2">
                  {FLOOR_PBR_PRESETS.map((tex) => (
                    <button
                      key={tex.id}
                      onClick={() =>
                        setRoom((prev) => ({
                          ...prev,
                          floorTextureUrl: tex.textureUrl,
                          floorColor: tex.color || '#ffffff',
                          floorRoughness: tex.roughness,
                          floorMetalness: tex.metalness,
                          floorTileX: tex.tileX ?? prev.floorTileX ?? 4,
                          floorTileY: tex.tileY ?? prev.floorTileY ?? 4,
                        }))
                      }
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-left flex items-center gap-2 transition-all ${room.floorTextureUrl === tex.textureUrl
                        ? 'border-blue-500 bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/50'
                        : 'border-white/10 bg-white/5 text-neutral-300'
                        }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full border border-white/30 shrink-0" style={{ backgroundColor: tex.color }} />
                      <span className="truncate">{tex.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Wall Materials & Textures Selector */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-200 block">
                    🧱 Texturas das Paredes (PBR)
                  </span>
                  <button
                    onClick={handleApplyWallToAll}
                    className="text-[10px] text-blue-400 hover:text-blue-300 active:scale-95 font-bold transition-all px-2 py-0.5 rounded-lg bg-blue-500/10 border border-blue-500/20"
                    title="Aplica a textura e cor atual a todas as 4 paredes"
                  >
                    Aplicar em Todas
                  </button>
                </div>

                {/* Wall Sides Selector (Fundo, Frente, Esquerda, Direita) */}
                <div className="grid grid-cols-4 gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-[10px] font-semibold">
                  {(['back', 'front', 'left', 'right'] as const).map((side) => {
                    const labels = { back: 'Fundo', front: 'Frente', left: 'Esquerda', right: 'Direita' };
                    return (
                      <button
                        key={side}
                        onClick={() => setActiveWallSide(side)}
                        className={`py-1.5 rounded-lg transition-all text-center ${
                          activeWallSide === side
                            ? 'bg-blue-600 text-white font-bold shadow'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        {labels[side]}
                      </button>
                    );
                  })}
                </div>

                {/* Wall Presets Grid */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-neutral-400 block font-medium">
                    Revestimentos (Parede {activeWallSide === 'back' ? 'do Fundo' : activeWallSide === 'front' ? 'da Frente' : activeWallSide === 'left' ? 'da Esquerda' : 'da Direita'}):
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {WALL_PBR_PRESETS.map((preset) => {
                      const isSelected =
                        room.walls[activeWallSide]?.textureUrl === preset.textureUrl &&
                        (!preset.textureUrl || room.walls[activeWallSide]?.color === preset.color);

                      return (
                        <button
                          key={preset.id}
                          onClick={() => {
                            updateWall(activeWallSide, {
                              textureUrl: preset.textureUrl,
                              color: preset.color,
                              roughness: preset.roughness,
                              metalness: preset.metalness,
                              tileX: preset.tileX || 1,
                              tileY: preset.tileY || 1,
                            });
                          }}
                          className={`p-2.5 rounded-xl border text-xs font-semibold text-left flex items-center gap-2 transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/50'
                              : 'border-white/10 bg-white/5 text-neutral-300'
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-white/30 shrink-0"
                            style={{ backgroundColor: preset.color }}
                          />
                          <span className="truncate">{preset.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Wall Color & Texture Repeat Scale */}
                <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-neutral-300 font-medium">Tonalidade / Cor da Parede</span>
                    <input
                      type="color"
                      value={room.walls[activeWallSide]?.color || '#ffffff'}
                      onChange={(e) => updateWall(activeWallSide, { color: e.target.value })}
                      className="w-7 h-7 rounded-lg border border-white/20 bg-transparent cursor-pointer"
                    />
                  </div>

                  {/* Wall Texture Repeat Scale */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] text-neutral-400">
                      <span>Escala da Textura (Repetição)</span>
                      <span className="font-mono text-blue-400 font-bold">{room.walls[activeWallSide]?.tileX || 1}x</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="8"
                      step="1"
                      value={room.walls[activeWallSide]?.tileX || 1}
                      onChange={(e) => {
                        const v = parseInt(e.target.value) || 1;
                        updateWall(activeWallSide, { tileX: v, tileY: Math.max(1, Math.round(v / 1.5)) });
                      }}
                      className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 4: ILUMINAÇÃO & CENÁRIOS 3D ================= */}
          {activeTab === 'lighting' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Presets de Cenários & Iluminação */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-amber-400" /> Cenários & Ambiente 3D
                  </span>
                  <span className="text-[10px] text-blue-400 font-mono font-bold uppercase">
                    {(room.environmentPreset || 'daylight').replace('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'daylight', label: 'Luz do Dia', icon: '☀️' },
                    { id: 'clean_studio', label: 'Estúdio Clean', icon: '💡' },
                    { id: 'dark_studio', label: 'Estúdio Dark', icon: '🌙' },
                    { id: 'hdr_144', label: 'Living HDR', icon: '🏙️' },
                    { id: 'hdr_185', label: 'Apartment HDR', icon: '🛋️' },
                  ].map((p) => {
                    const isActive = (room.environmentPreset || 'daylight') === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          const curHdr = room.hdrSettings || {
                            intensity: p.id === 'hdr_144' ? 0.4 : 1.0,
                            rotation: p.id === 'hdr_144' ? 50 : 0,
                            showBackground: p.id === 'hdr_144' ? true : false,
                            backgroundBlur: p.id === 'hdr_144' ? 0.3 : 0.0,
                            disableManualLights: false,
                          };
                          setRoom((prev) => ({
                            ...prev,
                            environmentPreset: p.id as any,
                            exposure: p.id === 'hdr_144' ? 1.75 : prev.exposure ?? 1.0,
                            lightIntensity: p.id === 'hdr_144' ? 2.25 : prev.lightIntensity ?? 1.0,
                            hdrSettings: {
                              ...curHdr,
                              ...(p.id === 'hdr_144' && !prev.hdrSettings
                                ? { intensity: 0.4, rotation: 50, showBackground: true, backgroundBlur: 0.3 }
                                : {}),
                            },
                          }));
                        }}
                        className={`p-2 rounded-xl text-center flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-md font-bold ring-1 ring-blue-400'
                            : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <span className="text-base">{p.icon}</span>
                        <span className="text-[10px] leading-tight font-semibold">{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Controles do Mapa HDR 360 (quando HDR estiver ativo) */}
              {(room.environmentPreset === 'hdr_144' || room.environmentPreset === 'hdr_185') && (
                <div className="p-3.5 rounded-2xl bg-blue-950/30 border border-blue-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Controles HDR 360°
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                      IBL Ativo
                    </span>
                  </div>

                  {/* Toggle Luz 100% HDR Pura */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/5">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-white">Luz 100% HDR Pura</span>
                      <span className="text-[10px] text-neutral-400">Desativa lâmpadas artificiais</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const cur = room.hdrSettings || {};
                        setRoom((prev) => ({
                          ...prev,
                          hdrSettings: {
                            ...cur,
                            disableManualLights: !cur.disableManualLights,
                          },
                        }));
                      }}
                      className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                        room.hdrSettings?.disableManualLights ? 'bg-blue-600' : 'bg-white/15'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          room.hdrSettings?.disableManualLights ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Toggle Fundo Panorâmico 360 */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/5">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-white flex items-center gap-1">
                        <Globe className="w-3 h-3 text-blue-400" /> Fundo Panorâmico 360°
                      </span>
                      <span className="text-[10px] text-neutral-400">Exibir o horizonte no fundo 3D</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const cur = room.hdrSettings || {};
                        setRoom((prev) => ({
                          ...prev,
                          hdrSettings: {
                            ...cur,
                            showBackground: !cur.showBackground,
                          },
                        }));
                      }}
                      className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                        room.hdrSettings?.showBackground ? 'bg-blue-600' : 'bg-white/15'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          room.hdrSettings?.showBackground ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Slider: Intensidade do HDR */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-neutral-300 text-[11px] font-medium">Intensidade do HDR</span>
                      <span className="font-mono text-blue-400 font-bold">
                        {Math.round((room.hdrSettings?.intensity ?? 1.0) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="3.0"
                      step="0.05"
                      value={room.hdrSettings?.intensity ?? 1.0}
                      onChange={(e) => {
                        const cur = room.hdrSettings || {};
                        setRoom((prev) => ({
                          ...prev,
                          hdrSettings: {
                            ...cur,
                            intensity: parseFloat(e.target.value),
                          },
                        }));
                      }}
                      className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  {/* Slider: Rotação 360 do HDR */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-neutral-300 text-[11px] font-medium flex items-center gap-1">
                        <Compass className="w-3 h-3 text-amber-400" /> Rotação do Sol / HDR
                      </span>
                      <span className="font-mono text-blue-400 font-bold">
                        {Math.round(room.hdrSettings?.rotation ?? 0)}°
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="2"
                      value={room.hdrSettings?.rotation ?? 0}
                      onChange={(e) => {
                        const cur = room.hdrSettings || {};
                        setRoom((prev) => ({
                          ...prev,
                          hdrSettings: {
                            ...cur,
                            rotation: parseFloat(e.target.value),
                          },
                        }));
                      }}
                      className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  {/* Slider: Desfoque do Fundo */}
                  {room.hdrSettings?.showBackground && (
                    <div className="space-y-1 pt-1 border-t border-white/10">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-neutral-300 text-[11px] font-medium">Desfoque do Fundo (Bokeh)</span>
                        <span className="font-mono text-blue-400 font-bold">
                          {Math.round((room.hdrSettings?.backgroundBlur ?? 0) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={room.hdrSettings?.backgroundBlur ?? 0.0}
                        onChange={(e) => {
                          const cur = room.hdrSettings || {};
                          setRoom((prev) => ({
                            ...prev,
                            hdrSettings: {
                              ...cur,
                              backgroundBlur: parseFloat(e.target.value),
                            },
                          }));
                        }}
                        className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Sliders Principais: Brilho & Luz Solar */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3.5">
                <span className="text-xs font-bold text-neutral-200 block">
                  🎛️ Brilho & Ajuste de Luz
                </span>

                {/* Slider Exposição da Câmera */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-300 text-[11px] font-medium flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-blue-400" /> Brilho / Exposição Geral
                    </span>
                    <span className="font-mono text-blue-400 font-bold text-xs">
                      {Math.round((room.exposure ?? 1.0) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="2.2"
                    step="0.05"
                    value={room.exposure ?? 1.0}
                    onChange={(e) => setRoom((prev) => ({ ...prev, exposure: parseFloat(e.target.value) }))}
                    className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-[9px] text-neutral-500">
                    <span>Mais Suave (40%)</span>
                    <span>Padrão (100%)</span>
                    <span>Mais Claro (220%)</span>
                  </div>
                </div>

                {/* Slider Luz Solar / Ambiente */}
                <div className="space-y-1 pt-1 border-t border-white/5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-300 text-[11px] font-medium flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-amber-400" /> Luz Solar / Ambiente
                    </span>
                    <span className="font-mono text-amber-400 font-bold text-xs">
                      {Math.round((room.lightIntensity ?? 1.0) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="2.5"
                    step="0.05"
                    value={room.lightIntensity ?? 1.0}
                    onChange={(e) => setRoom((prev) => ({ ...prev, lightIntensity: parseFloat(e.target.value) }))}
                    className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex justify-between text-[9px] text-neutral-500">
                    <span>Penumbra (20%)</span>
                    <span>Natural (100%)</span>
                    <span>Solar Intenso (250%)</span>
                  </div>
                </div>

                {/* Slider Reflexo no Piso */}
                <div className="space-y-1 pt-1 border-t border-white/5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-300 text-[11px] font-medium">Reflexo no Piso</span>
                    <span className="font-mono text-blue-400 font-bold text-xs">
                      {Math.round((room.reflectionOpacity ?? 0.05) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="0.35"
                    step="0.01"
                    value={room.reflectionOpacity ?? 0.05}
                    onChange={(e) => setRoom((prev) => ({ ...prev, reflectionOpacity: parseFloat(e.target.value) }))}
                    className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </div>

              {/* Iluminação de Área PBR (Plafon LED no Teto) */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-300" /> Luz de Área (Plafon LED)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = room.areaLight || {
                        enabled: true,
                        intensity: 2.0,
                        width: 2.2,
                        height: 1.6,
                        color: '#ffffff',
                        showHelper: true,
                      };
                      setRoom((prev) => ({
                        ...prev,
                        areaLight: {
                          ...cur,
                          enabled: !cur.enabled,
                        },
                      }));
                    }}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                      room.areaLight?.enabled ? 'bg-blue-600' : 'bg-white/10'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        room.areaLight?.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {room.areaLight?.enabled && (
                  <div className="space-y-3 pt-2 border-t border-white/10">
                    {/* Moldura Guia Visual */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-neutral-300">Moldura Guia 3D (Teto)</span>
                      <button
                        type="button"
                        onClick={() => {
                          const cur = room.areaLight || {
                            enabled: true,
                            intensity: 2.0,
                            width: 2.2,
                            height: 1.6,
                            color: '#ffffff',
                            showHelper: true,
                          };
                          setRoom((prev) => ({
                            ...prev,
                            areaLight: {
                              ...cur,
                              showHelper: !cur.showHelper,
                            },
                          }));
                        }}
                        className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                          room.areaLight?.showHelper ? 'bg-blue-600' : 'bg-white/10'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                            room.areaLight?.showHelper ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Intensidade do Plafon */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-neutral-300 text-[11px] font-medium">Intensidade do Plafon</span>
                        <span className="font-mono text-amber-400 font-bold">
                          {Math.round((room.areaLight.intensity ?? 2.0) * 50)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="6.0"
                        step="0.1"
                        value={room.areaLight.intensity ?? 2.0}
                        onChange={(e) => {
                          setRoom((prev) => ({
                            ...prev,
                            areaLight: {
                              ...prev.areaLight!,
                              intensity: parseFloat(e.target.value),
                            },
                          }));
                        }}
                        className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>

                    {/* Dimensões do Plafon (Largura e Comprimento) */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] text-neutral-400">
                          <span>Largura (X)</span>
                          <span className="font-mono text-blue-400">{(room.areaLight.width ?? 2.2).toFixed(1)}m</span>
                        </div>
                        <input
                          type="range"
                          min="0.4"
                          max="5.0"
                          step="0.1"
                          value={room.areaLight.width ?? 2.2}
                          onChange={(e) => {
                            setRoom((prev) => ({
                              ...prev,
                              areaLight: {
                                ...prev.areaLight!,
                                width: parseFloat(e.target.value),
                              },
                            }));
                          }}
                          className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] text-neutral-400">
                          <span>Comprimento (Z)</span>
                          <span className="font-mono text-blue-400">{(room.areaLight.height ?? 1.6).toFixed(1)}m</span>
                        </div>
                        <input
                          type="range"
                          min="0.4"
                          max="5.0"
                          step="0.1"
                          value={room.areaLight.height ?? 1.6}
                          onChange={(e) => {
                            setRoom((prev) => ({
                              ...prev,
                              areaLight: {
                                ...prev.areaLight!,
                                height: parseFloat(e.target.value),
                              },
                            }));
                          }}
                          className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                      </div>
                    </div>

                    {/* Temperatura / Cor da Luz do Plafon */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-medium text-neutral-400 block">Cor / Temperatura do LED</span>
                      <div className="flex gap-2">
                        {[
                          { name: 'Branco Puro (6000K)', color: '#ffffff' },
                          { name: 'Branco Neutro (4000K)', color: '#f4f4f5' },
                          { name: 'Branco Quente (3000K)', color: '#ffe8d6' },
                          { name: 'Âmbar Aconchegante', color: '#fed7aa' },
                        ].map((c) => (
                          <button
                            key={c.color}
                            type="button"
                            onClick={() => {
                              setRoom((prev) => ({
                                ...prev,
                                areaLight: {
                                  ...prev.areaLight!,
                                  color: c.color,
                                },
                              }));
                            }}
                            className={`flex-1 h-8 rounded-xl border transition-all flex items-center justify-center ${
                              (room.areaLight?.color || '#ffffff') === c.color
                                ? 'border-blue-400 ring-2 ring-blue-500/40 scale-105 shadow'
                                : 'border-white/10 hover:border-white/30'
                            }`}
                            style={{ backgroundColor: c.color }}
                            title={c.name}
                          >
                            {(room.areaLight?.color || '#ffffff') === c.color && (
                              <Check className="w-3.5 h-3.5 text-neutral-900" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cart Modal with Shoppable Scene details */}
      <SceneCartModal
        isOpen={isCartModalOpen}
        onClose={() => setIsCartModalOpen(false)}
        furniture={furniture}
        onSelectItem={(uid: number) => {
          setSelectedUid(uid);
          setActiveTab('properties');
        }}
      />

      {/* Room Templates Modal */}
      <TemplatesModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onApplyTemplate={handleApplyTemplate}
      />

      {/* Toast Notification */}
      {templateToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-blue-600 text-white font-bold text-xs shadow-2xl border border-blue-400/40 animate-in fade-in slide-in-from-top-3 duration-200">
          {templateToast}
        </div>
      )}
    </div>
  );
}
