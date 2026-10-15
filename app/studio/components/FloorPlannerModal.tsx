'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  Trash2,
  RotateCcw,
  Sparkles,
  Check,
  Eye,
  EyeOff,
  Grid,
  Magnet,
  Move,
  PenTool,
  ZoomIn,
  ZoomOut,
  Square,
  ArrowRight,
  Box,
  Image as ImageIcon,
  Upload,
  SlidersHorizontal,
  Ruler,
  RotateCw,
  Lock,
  Unlock,
  Crop,
  Link as LinkIcon,
  AlertCircle,
  Scale,
  Percent,
  PlusCircle,
  Layers,
  Camera,
  MapPin,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Palette,
  Navigation,
} from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomSettings, RoomSpotPin, CustomFloor } from '../types/furniture';
import { calculateAdjustedWallJunctions } from '../lib/wall-builders';

// --- Data Structures ---
export interface PlannerCorner {
  id: string;
  x: number; // in meters (relative to center 0,0)
  y: number; // in meters (corresponds to 3D Z coordinate)
}

export interface PlannerWall {
  id: string;
  startId: string;
  endId: string;
  thickness: number; // in meters (default 0.15)
  height: number; // in meters (default 2.6)
}

export interface PlannerRoomLoop {
  id: string;
  corners: PlannerCorner[];
  area: number; // in m²
  name: string;
  color?: string;
  material?: string;
  center: { x: number; y: number };
  isManual?: boolean;
}

export interface PlannerSpotPin {
  id: string;
  name: string;
  x: number; // in meters (2D world)
  y: number; // in meters (2D world / 3D Z)
  height: number; // in meters (default 1.6m eye level)
  color?: string;
}

export interface RoomCustomization {
  id: string;
  name: string;
  color?: string;
  material?: string;
  center?: { x: number; y: number };
}

export const PRESET_ROOM_TYPES = [
  { name: 'Sala de Estar / Jantar', icon: '🛋️', color: '#3b82f6', material: 'madeira' },
  { name: 'Cozinha Gourmet', icon: '🍳', color: '#10b981', material: 'porcelanato' },
  { name: 'Quarto Principal / Suíte', icon: '🛏️', color: '#8b5cf6', material: 'madeira' },
  { name: 'Quarto Solteiro / Home Office', icon: '💻', color: '#ec4899', material: 'madeira' },
  { name: 'Banheiro / Lavabo', icon: '🚿', color: '#06b6d4', material: 'porcelanato' },
  { name: 'Varanda / Sacada', icon: '🌿', color: '#f59e0b', material: 'ardosia' },
  { name: 'Área de Serviço', icon: '🧺', color: '#64748b', material: 'porcelanato' },
  { name: 'Circulação / Corredor', icon: '🚶', color: '#94a3b8', material: 'porcelanato' },
];

export interface BackgroundFloorPlanConfig {
  url: string;
  visible: boolean;
  opacity: number; // 0.1 to 1.0 (default 0.65)
  x: number; // center position X in meters (default 0)
  y: number; // center position Y in meters (default 0)
  width: number; // real-world width in meters (default 10.0m)
  rotation: number; // in degrees (0, 90, 180, 270)
  cropLeft: number; // 0 to 50 %
  cropRight: number; // 0 to 50 %
  cropTop: number; // 0 to 50 %
  cropBottom: number; // 0 to 50 %
  lock: boolean;
}

export interface SavedBgPreset {
  id: string;
  name: string;
  config: BackgroundFloorPlanConfig;
}

export const DEFAULT_BG_PRESETS: SavedBgPreset[] = [
  {
    id: 'mrv-andorinhas',
    name: 'Exemplo MRV Andorinhas',
    config: {
      url: 'https://www.mrv.com.br/content/dam/conhecer/imoveis/sao-paulo/ribeirao-preto/residencial-canto-das-andorinhas/PH_ANDORINHAS_03_BL2_FINAL_203_2025.09.09.jpg',
      visible: true,
      opacity: 0.9,
      width: 7.6,
      x: 0.0,
      y: 0.25,
      rotation: 0,
      cropLeft: 18,
      cropRight: 45,
      cropTop: 0,
      cropBottom: 0,
      lock: false,
    },
  },
];

// Helper for double-click inline value editing
interface InlineEditableNumberProps {
  value: number;
  suffix?: string;
  prefix?: string;
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
  multiplier?: number; // e.g., 100 for opacity percentage (0.9 -> 90)
  className?: string;
  onChange: (newVal: number) => void;
}

function InlineEditableNumber({
  value,
  suffix = '',
  prefix = '',
  min,
  max,
  step = 0.01,
  decimals = 2,
  multiplier = 1,
  className = '',
  onChange,
}: InlineEditableNumberProps) {
  const [isEditing, setIsEditing] = useState(false);
  const displayVal = (value * multiplier).toFixed(decimals);
  const [inputVal, setInputVal] = useState(displayVal);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isEditing) {
      setInputVal((value * multiplier).toFixed(decimals));
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 15);
    }
  }, [isEditing, value, multiplier, decimals]);

  const commitChange = () => {
    setIsEditing(false);
    let num = parseFloat(inputVal.replace(',', '.'));
    if (isNaN(num)) return;
    num = num / multiplier;
    if (min !== undefined) num = Math.max(min, num);
    if (max !== undefined) num = Math.min(max, num);
    onChange(Number(num.toFixed(4)));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commitChange();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <span className="inline-flex items-center">
        {prefix && <span className="text-slate-500 font-mono text-[10px] mr-0.5">{prefix}</span>}
        <input
          ref={inputRef}
          type="number"
          step={step}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onBlur={commitChange}
          onKeyDown={handleKeyDown}
          className="w-14 bg-slate-950 text-indigo-300 font-mono font-bold text-xs border border-indigo-500/80 rounded px-1 py-0.5 outline-none text-center shadow-inner"
        />
        {suffix && <span className="text-slate-500 font-mono text-[10px] ml-0.5">{suffix}</span>}
      </span>
    );
  }

  return (
    <span
      onDoubleClick={() => setIsEditing(true)}
      title="Duplo clique para digitar o valor exato"
      className={`cursor-pointer hover:underline hover:text-indigo-300 transition-colors select-none font-mono ${className}`}
    >
      {prefix}
      {displayVal}
      {suffix}
    </span>
  );
}

interface FloorPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoom: RoomSettings;
  onApplyToProject: (updatedRoom: RoomSettings, wallSummary?: string) => void;
}

// Preset Floor Plans for Quick Start
const PRESETS = [
  {
    name: 'Studio Retangular (5×4m)',
    description: 'Sala compacta ideal para sala de estar ou quarto',
    corners: [
      { id: 'c1', x: -2.5, y: -2.0 },
      { id: 'c2', x: 2.5, y: -2.0 },
      { id: 'c3', x: 2.5, y: 2.0 },
      { id: 'c4', x: -2.5, y: 2.0 },
    ],
    walls: [
      { id: 'w1', startId: 'c1', endId: 'c2', thickness: 0.15, height: 2.6 },
      { id: 'w2', startId: 'c2', endId: 'c3', thickness: 0.15, height: 2.6 },
      { id: 'w3', startId: 'c3', endId: 'c4', thickness: 0.15, height: 2.6 },
      { id: 'w4', startId: 'c4', endId: 'c1', thickness: 0.15, height: 2.6 },
    ],
  },
  {
    name: 'Formato em L (6×5m)',
    description: 'Living integrado com cozinha americana ou varanda',
    corners: [
      { id: 'c1', x: -3.0, y: -2.5 },
      { id: 'c2', x: 3.0, y: -2.5 },
      { id: 'c3', x: 3.0, y: 0.5 },
      { id: 'c4', x: 0.5, y: 0.5 },
      { id: 'c5', x: 0.5, y: 2.5 },
      { id: 'c6', x: -3.0, y: 2.5 },
    ],
    walls: [
      { id: 'w1', startId: 'c1', endId: 'c2', thickness: 0.15, height: 2.6 },
      { id: 'w2', startId: 'c2', endId: 'c3', thickness: 0.15, height: 2.6 },
      { id: 'w3', startId: 'c3', endId: 'c4', thickness: 0.15, height: 2.6 },
      { id: 'w4', startId: 'c4', endId: 'c5', thickness: 0.15, height: 2.6 },
      { id: 'w5', startId: 'c5', endId: 'c6', thickness: 0.15, height: 2.6 },
      { id: 'w6', startId: 'c6', endId: 'c1', thickness: 0.15, height: 2.6 },
    ],
  },
  {
    name: 'Open Concept c/ Divisória (7×4.5m)',
    description: 'Espaço amplo com meia-parede ou painel central',
    corners: [
      { id: 'c1', x: -3.5, y: -2.25 },
      { id: 'c2', x: 3.5, y: -2.25 },
      { id: 'c3', x: 3.5, y: 2.25 },
      { id: 'c4', x: -3.5, y: 2.25 },
      { id: 'c5', x: 0.0, y: -2.25 },
      { id: 'c6', x: 0.0, y: 0.5 },
    ],
    walls: [
      { id: 'w1', startId: 'c1', endId: 'c5', thickness: 0.15, height: 2.6 },
      { id: 'w2', startId: 'c5', endId: 'c2', thickness: 0.15, height: 2.6 },
      { id: 'w3', startId: 'c2', endId: 'c3', thickness: 0.15, height: 2.6 },
      { id: 'w4', startId: 'c3', endId: 'c4', thickness: 0.15, height: 2.6 },
      { id: 'w5', startId: 'c4', endId: 'c1', thickness: 0.15, height: 2.6 },
      { id: 'w6', startId: 'c5', endId: 'c6', thickness: 0.15, height: 2.6 },
    ],
  },
];

export default function FloorPlannerModal({
  isOpen,
  onClose,
  currentRoom,
  onApplyToProject,
}: FloorPlannerModalProps) {
  // --- UI & Tool State ---
  const [activeTool, setActiveTool] = useState<'wall' | 'select' | 'split' | 'spot' | 'room' | 'delete'>('wall');
  const [snapGrid, setSnapGrid] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(false); // Grade no 2D começa sempre oculta
  const [snapCorner, setSnapCorner] = useState<boolean>(true);
  const [gridStep, setGridStep] = useState<number>(0.10); // 0.10m = 10cm
  const [wallHeight, setWallHeight] = useState<number>(currentRoom.height || 2.6);
  const [wallThickness] = useState<number>(0.15); // 15cm standard
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [is3DExpanded, setIs3DExpanded] = useState<boolean>(false);
  const [is2DExpanded, setIs2DExpanded] = useState<boolean>(false);
  const [showMeasurements, setShowMeasurements] = useState<boolean>(true);
  const [history, setHistory] = useState<
    {
      corners: PlannerCorner[];
      walls: PlannerWall[];
      spots?: PlannerSpotPin[];
      roomCustomizations?: RoomCustomization[];
      manualFloors?: PlannerRoomLoop[];
    }[]
  >([]);
  const [redoHistory, setRedoHistory] = useState<
    {
      corners: PlannerCorner[];
      walls: PlannerWall[];
      spots?: PlannerSpotPin[];
      roomCustomizations?: RoomCustomization[];
      manualFloors?: PlannerRoomLoop[];
    }[]
  >([]);
  const [historyToast, setHistoryToast] = useState<string | null>(null);
  const historyToastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Photoshop-Style Layers State ---
  const [layersConfig, setLayersConfig] = useState({
    walls: { visible: true, locked: false },
    floors: { visible: true, locked: false, showLabels: true },
    spots: { visible: true, locked: false },
    background: { visible: true, locked: false },
  });
  const [isLayersCollapsed, setIsLayersCollapsed] = useState<boolean>(false);
  const [expandedLayerSection, setExpandedLayerSection] = useState<'none' | 'floors' | 'spots'>('none');

  // Spots (Camera Waypoints) State
  const [spots, setSpots] = useState<PlannerSpotPin[]>(() => {
    if (currentRoom.spots && currentRoom.spots.length > 0) {
      return currentRoom.spots.map((s) => ({
        id: s.id || `spot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: s.name || 'Novo Spot',
        x: s.x,
        y: s.y,
        height: s.height || 1.6,
        color: s.color || '#06b6d4',
      }));
    }
    return [];
  });
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [draggingSpotId, setDraggingSpotId] = useState<string | null>(null);
  const [spotModal, setSpotModal] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    name: string;
    height: number;
    editId?: string;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    name: '',
    height: 1.6,
  });

  // Room Customizations State (Custom floor names & colors)
  const [roomCustomizations, setRoomCustomizations] = useState<RoomCustomization[]>(() => {
    if (currentRoom.customFloors && currentRoom.customFloors.length > 0) {
      return currentRoom.customFloors
        .filter((cf) => cf.name || cf.color || cf.material)
        .map((cf) => ({
          id: cf.id,
          name: cf.name || '',
          color: cf.color,
          material: cf.material,
        }));
    }
    return [];
  });
  const [manualFloors, setManualFloors] = useState<PlannerRoomLoop[]>(() => {
    if (currentRoom.customFloors && currentRoom.customFloors.length > 0) {
      return currentRoom.customFloors
        .filter((cf) => cf.points && cf.points.length >= 3)
        .map((cf, fIdx) => {
          let sumX = 0;
          let sumY = 0;
          cf.points.forEach((p) => {
            sumX += p.x;
            sumY += p.y;
          });
          const n = cf.points.length;
          return {
            id: cf.id || `custom_floor_${fIdx + 1}`,
            corners: cf.points.map((p, pIdx) => ({
              id: `cf_pt_${fIdx}_${pIdx}`,
              x: p.x,
              y: p.y,
            })),
            area: cf.area || 0,
            name: cf.name || '',
            color: cf.color,
            material: cf.material,
            center: { x: sumX / n, y: sumY / n },
            isManual: true,
          };
        });
    }
    return [];
  });
  const [manualRoomPoints, setManualRoomPoints] = useState<
    Array<{ x: number; y: number; cornerId?: string }>
  >([]);
  const [editingRoom, setEditingRoom] = useState<PlannerRoomLoop | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const triggerToast = useCallback((msg: string) => {
    if (historyToastTimeoutRef.current) clearTimeout(historyToastTimeoutRef.current);
    setHistoryToast(msg);
    historyToastTimeoutRef.current = setTimeout(() => {
      setHistoryToast(null);
    }, 1800);
  }, []);

  // Helper to parse RoomSettings into planner corners & walls
  const parseRoomToPlanner = useCallback((room: RoomSettings) => {
    if (room.customWalls && room.customWalls.length > 0) {
      const cornerList: PlannerCorner[] = [];
      const getOrAddCorner = (pt: { x: number; y: number }, prefix: string, idx: number): PlannerCorner => {
        let found = cornerList.find((c) => Math.hypot(c.x - pt.x, c.y - pt.y) < 0.05);
        if (!found) {
          found = { id: `${prefix}_${idx}`, x: Number(pt.x.toFixed(3)), y: Number(pt.y.toFixed(3)) };
          cornerList.push(found);
        }
        return found;
      };

      const wallList: PlannerWall[] = [];
      room.customWalls.forEach((w, idx) => {
        const c1 = getOrAddCorner(w.start, 'c_start', idx);
        const c2 = getOrAddCorner(w.end, 'c_end', idx);
        wallList.push({
          id: w.id || `w_${idx}`,
          startId: c1.id,
          endId: c2.id,
          thickness: w.thickness || 0.15,
          height: w.height || room.height || 2.6,
        });
      });

      return {
        corners: cornerList,
        walls: wallList,
        height: room.height || 2.6,
      };
    }

    const halfW = (room.width || 4) / 2;
    const halfD = (room.depth || 4) / 2;
    return {
      corners: [
        { id: 'c1', x: -halfW, y: -halfD },
        { id: 'c2', x: halfW, y: -halfD },
        { id: 'c3', x: halfW, y: halfD },
        { id: 'c4', x: -halfW, y: halfD },
      ],
      walls: [
        { id: 'w1', startId: 'c1', endId: 'c2', thickness: 0.15, height: room.height || 2.6 },
        { id: 'w2', startId: 'c2', endId: 'c3', thickness: 0.15, height: room.height || 2.6 },
        { id: 'w3', startId: 'c3', endId: 'c4', thickness: 0.15, height: room.height || 2.6 },
        { id: 'w4', startId: 'c4', endId: 'c1', thickness: 0.15, height: room.height || 2.6 },
      ],
      height: room.height || 2.6,
    };
  }, []);

  // --- Geometry State ---
  const [corners, setCorners] = useState<PlannerCorner[]>(() => parseRoomToPlanner(currentRoom).corners);
  const [walls, setWalls] = useState<PlannerWall[]>(() => parseRoomToPlanner(currentRoom).walls);

  // Sync state whenever modal opens or currentRoom changes
  useEffect(() => {
    if (isOpen) {
      const data = parseRoomToPlanner(currentRoom);
      setCorners(data.corners);
      setWalls(data.walls);
      setWallHeight(data.height);
      setHistory([]);
      setRedoHistory([]);
      setShowGrid(false); // Sempre começa com a grade 2D oculta
      setSelectedCornerId(null);
      setSelectedWallId(null);
      setDrawingStartCornerId(null);
      setCurrentMouseWorld(null);
      setPan({ x: 0, y: 0 });
      setIs3DExpanded(false);
      setIs2DExpanded(false);

      if (currentRoom.backgroundFloorPlan && currentRoom.backgroundFloorPlan.url) {
        setBgConfig(currentRoom.backgroundFloorPlan);
        setBgUrlInput(
          currentRoom.backgroundFloorPlan.url.startsWith('data:')
            ? 'Imagem Local'
            : currentRoom.backgroundFloorPlan.url
        );
      } else {
        setBgConfig({
          url: '',
          visible: false,
          opacity: 0.65,
          x: 0,
          y: 0,
          width: 9.5,
          rotation: 0,
          cropLeft: 0,
          cropRight: 0,
          cropTop: 0,
          cropBottom: 0,
          lock: false,
        });
        setBgUrlInput('');
      }
    }
  }, [isOpen, currentRoom, parseRoomToPlanner]);

  // Detected Rooms
  const [detectedRooms, setDetectedRooms] = useState<PlannerRoomLoop[]>([]);

  // Combined Rooms (Auto-detected + Manual Floors)
  const allRooms = useMemo(() => {
    const list: PlannerRoomLoop[] = [...manualFloors];
    detectedRooms.forEach((ar) => {
      const hasManualOverlap = manualFloors.some(
        (mf) => Math.hypot(mf.center.x - ar.center.x, mf.center.y - ar.center.y) < 0.6
      );
      if (!hasManualOverlap) {
        list.push(ar);
      }
    });
    return list;
  }, [detectedRooms, manualFloors]);

  // 2D Interaction Refs & State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const container2DRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState<number>(55); // pixels per meter
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Mouse & Drawing interaction
  const [drawingStartCornerId, setDrawingStartCornerId] = useState<string | null>(null);
  const [currentMouseWorld, setCurrentMouseWorld] = useState<{ x: number; y: number } | null>(null);
  const [snappedCornerId, setSnappedCornerId] = useState<string | null>(null);
  const [selectedCornerId, setSelectedCornerId] = useState<string | null>(null);
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
  const [coordInputX, setCoordInputX] = useState<string | null>(null);
  const [coordInputY, setCoordInputY] = useState<string | null>(null);

  const selectedCorner = useMemo(() => {
    if (!selectedCornerId) return null;
    return corners.find((c) => c.id === selectedCornerId) || null;
  }, [corners, selectedCornerId]);

  const selectedWall = useMemo(() => {
    if (!selectedWallId) return null;
    return walls.find((w) => w.id === selectedWallId) || null;
  }, [walls, selectedWallId]);

  const selectedWallLength = useMemo(() => {
    if (!selectedWall) return 0;
    const c1 = corners.find((c) => c.id === selectedWall.startId);
    const c2 = corners.find((c) => c.id === selectedWall.endId);
    if (!c1 || !c2) return 0;
    return Math.hypot(c2.x - c1.x, c2.y - c1.y);
  }, [corners, selectedWall]);

  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [draggingCornerId, setDraggingCornerId] = useState<string | null>(null);
  const [draggingWallId, setDraggingWallId] = useState<string | null>(null);
  const [dragAxisLock, setDragAxisLock] = useState<'none' | 'x' | 'y'>('none');
  const dragCornerStartRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const dragWallStartRef = useRef<{
    startWorld: { x: number; y: number };
    c1Id: string;
    c1Pos: { x: number; y: number };
    c2Id: string;
    c2Pos: { x: number; y: number };
  } | null>(null);
  const [hoveredWallId, setHoveredWallId] = useState<string | null>(null);
  const [hoveredCornerId, setHoveredCornerId] = useState<string | null>(null);

  // --- Background Floor Plan Image State ---
  const [bgConfig, setBgConfig] = useState<BackgroundFloorPlanConfig>(
    () =>
      currentRoom.backgroundFloorPlan || {
        url: '',
        visible: true,
        opacity: 0.65,
        x: 0,
        y: 0,
        width: 9.5,
        rotation: 0,
        cropLeft: 0,
        cropRight: 0,
        cropTop: 0,
        cropBottom: 0,
        lock: false,
      }
  );
  const [showBgImagePanel, setShowBgImagePanel] = useState<boolean>(false);
  const [bgUrlInput, setBgUrlInput] = useState<string>(() =>
    currentRoom.backgroundFloorPlan?.url
      ? currentRoom.backgroundFloorPlan.url.startsWith('data:')
        ? 'Imagem Local'
        : currentRoom.backgroundFloorPlan.url
      : ''
  );
  const [isBgLoading, setIsBgLoading] = useState<boolean>(false);
  const [bgLoadError, setBgLoadError] = useState<string | null>(null);
  const bgImageElementRef = useRef<HTMLImageElement | null>(null);

  // Saved Background Reference Presets with localStorage persistence
  const [savedBgPresets, setSavedBgPresets] = useState<SavedBgPreset[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_BG_PRESETS;
    try {
      const stored = localStorage.getItem('icanvas_saved_bg_presets');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_BG_PRESETS;
  });

  const handleApplyBgPreset = (preset: SavedBgPreset) => {
    setBgConfig(preset.config);
    setBgUrlInput(
      preset.config.url.startsWith('data:') ? 'Imagem Local' : preset.config.url
    );
  };

  const handleSaveCurrentBgAsPreset = () => {
    if (!bgConfig.url) return;
    const defaultName = bgUrlInput.startsWith('data:') ? 'Minha Planta Local' : 'Minha Planta Salva';
    const name = window.prompt('Nome para salvar este preset de planta de fundo:', defaultName);
    if (!name || !name.trim()) return;

    const newPreset: SavedBgPreset = {
      id: `bg_preset_${Date.now()}`,
      name: name.trim(),
      config: { ...bgConfig },
    };

    setSavedBgPresets((prev) => {
      const updated = [...prev, newPreset];
      try {
        localStorage.setItem('icanvas_saved_bg_presets', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleDeleteBgPreset = (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedBgPresets((prev) => {
      const updated = prev.filter((p) => p.id !== presetId);
      try {
        localStorage.setItem('icanvas_saved_bg_presets', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // 2-point scale calibration & Global Floor Plan Scaling
  const [isCalibratingScale, setIsCalibratingScale] = useState<boolean>(false);
  const [calibrationPtA, setCalibrationPtA] = useState<{ x: number; y: number } | null>(null);
  const [showCalibrateModal, setShowCalibrateModal] = useState<boolean>(false);
  const [calibrationMeasuredDistance, setCalibrationMeasuredDistance] = useState<number>(0);
  const [targetRealMetersInput, setTargetRealMetersInput] = useState<string>('3.50');
  const [calibrateTargetMode, setCalibrateTargetMode] = useState<'all' | 'walls' | 'bg'>('all');

  // Scale Entire 2D & 3D Floor Plan Modal
  const [showScaleModal, setShowScaleModal] = useState<boolean>(false);
  const [scaleTargetWidth, setScaleTargetWidth] = useState<string>('7.00');
  const [scaleTargetDepth, setScaleTargetDepth] = useState<string>('6.00');
  const [scaleFactorInput, setScaleFactorInput] = useState<string>('1.00');
  const [scaleIncludeBg, setScaleIncludeBg] = useState<boolean>(true);
  const [scaleCenterOrigin, setScaleCenterOrigin] = useState<boolean>(true);

  // Load Background Image Element
  useEffect(() => {
    if (!bgConfig.url) {
      bgImageElementRef.current = null;
      setIsBgLoading(false);
      setBgLoadError(null);
      return;
    }
    setIsBgLoading(true);
    setBgLoadError(null);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = bgConfig.url;
    img.onload = () => {
      bgImageElementRef.current = img;
      setIsBgLoading(false);
    };
    img.onerror = () => {
      // Fallback without crossOrigin
      const fallbackImg = new Image();
      fallbackImg.src = bgConfig.url;
      fallbackImg.onload = () => {
        bgImageElementRef.current = fallbackImg;
        setIsBgLoading(false);
      };
      fallbackImg.onerror = () => {
        setIsBgLoading(false);
        setBgLoadError('Erro ao carregar a imagem. Verifique o link ou carregue um arquivo local.');
      };
    };
  }, [bgConfig.url]);

  // 3D Viewport Refs
  const container3DRef = useRef<HTMLDivElement | null>(null);
  const threeSceneRef = useRef<THREE.Scene | null>(null);
  const threeCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const threeRendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const threeControlsRef = useRef<OrbitControls | null>(null);
  const wallsGroupRef = useRef<THREE.Group | null>(null);
  const floorsGroupRef = useRef<THREE.Group | null>(null);
  const spotsGroupRef = useRef<THREE.Group | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Push history snapshot before modifications
  const saveSnapshot = useCallback(() => {
    setHistory((prev) => {
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        if (
          JSON.stringify(last.corners) === JSON.stringify(corners) &&
          JSON.stringify(last.walls) === JSON.stringify(walls) &&
          JSON.stringify(last.spots || []) === JSON.stringify(spots) &&
          JSON.stringify(last.roomCustomizations || []) === JSON.stringify(roomCustomizations) &&
          JSON.stringify(last.manualFloors || []) === JSON.stringify(manualFloors)
        ) {
          return prev;
        }
      }
      return [
        ...prev.slice(-30),
        {
          corners: JSON.parse(JSON.stringify(corners)),
          walls: JSON.parse(JSON.stringify(walls)),
          spots: JSON.parse(JSON.stringify(spots)),
          roomCustomizations: JSON.parse(JSON.stringify(roomCustomizations)),
          manualFloors: JSON.parse(JSON.stringify(manualFloors)),
        },
      ];
    });
    setRedoHistory([]);
  }, [corners, walls, spots, roomCustomizations, manualFloors]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];

    setRedoHistory((r) => [
      ...r.slice(-30),
      {
        corners: JSON.parse(JSON.stringify(corners)),
        walls: JSON.parse(JSON.stringify(walls)),
        spots: JSON.parse(JSON.stringify(spots)),
        roomCustomizations: JSON.parse(JSON.stringify(roomCustomizations)),
        manualFloors: JSON.parse(JSON.stringify(manualFloors)),
      },
    ]);

    setCorners(prev.corners);
    setWalls(prev.walls);
    if (prev.spots) setSpots(prev.spots);
    if (prev.roomCustomizations) setRoomCustomizations(prev.roomCustomizations);
    if (prev.manualFloors) setManualFloors(prev.manualFloors);
    setHistory((h) => h.slice(0, -1));
    setSelectedCornerId(null);
    setSelectedWallId(null);
    setSelectedSpotId(null);
    setSelectedRoomId(null);
    triggerToast('Desfeito (Ctrl+Z)');
  }, [history, corners, walls, spots, roomCustomizations, manualFloors, triggerToast]);

  const handleRedo = useCallback(() => {
    if (redoHistory.length === 0) return;
    const next = redoHistory[redoHistory.length - 1];

    setHistory((h) => [
      ...h.slice(-30),
      {
        corners: JSON.parse(JSON.stringify(corners)),
        walls: JSON.parse(JSON.stringify(walls)),
        spots: JSON.parse(JSON.stringify(spots)),
        roomCustomizations: JSON.parse(JSON.stringify(roomCustomizations)),
        manualFloors: JSON.parse(JSON.stringify(manualFloors)),
      },
    ]);

    setCorners(next.corners);
    setWalls(next.walls);
    if (next.spots) setSpots(next.spots);
    if (next.roomCustomizations) setRoomCustomizations(next.roomCustomizations);
    if (next.manualFloors) setManualFloors(next.manualFloors);
    setRedoHistory((r) => r.slice(0, -1));
    setSelectedCornerId(null);
    setSelectedWallId(null);
    setSelectedSpotId(null);
    setSelectedRoomId(null);
    triggerToast('Refeito (Ctrl+Y)');
  }, [redoHistory, corners, walls, spots, roomCustomizations, manualFloors, triggerToast]);

  const handleStopDrawingChain = useCallback(() => {
    setDrawingStartCornerId(null);
    setSelectedCornerId(null);
  }, []);

  const handleDeleteSelected = useCallback(() => {
    if (selectedSpotId) {
      saveSnapshot();
      setSpots((prev) => prev.filter((s) => s.id !== selectedSpotId));
      setSelectedSpotId(null);
      triggerToast('Spot excluído (Del)');
    } else if (selectedCornerId) {
      if (layersConfig.walls.locked) {
        triggerToast('Camada de paredes bloqueada');
        return;
      }
      saveSnapshot();
      setCorners((prev) => prev.filter((c) => c.id !== selectedCornerId));
      setWalls((prev) =>
        prev.filter((w) => w.startId !== selectedCornerId && w.endId !== selectedCornerId)
      );
      setSelectedCornerId(null);
      triggerToast('Vértice excluído (Del)');
    } else if (selectedWallId) {
      if (layersConfig.walls.locked) {
        triggerToast('Camada de paredes bloqueada');
        return;
      }
      saveSnapshot();
      setWalls((prev) => prev.filter((w) => w.id !== selectedWallId));
      setSelectedWallId(null);
      triggerToast('Parede excluída (Del)');
    } else if (selectedRoomId) {
      const isManual = manualFloors.some((mf) => mf.id === selectedRoomId);
      if (isManual) {
        saveSnapshot();
        setManualFloors((prev) => prev.filter((f) => f.id !== selectedRoomId));
        setSelectedRoomId(null);
        triggerToast('Ambiente manual excluído (Del)');
      }
    }
  }, [selectedSpotId, selectedCornerId, selectedWallId, selectedRoomId, manualFloors, layersConfig.walls.locked, saveSnapshot, triggerToast]);

  // Global Keyboard Shortcuts for 2D Floor Planner (Ctrl+Z = Undo, Ctrl+Y = Redo, Del = Delete, Esc = Cancel)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Undo: Ctrl+Z or Cmd+Z (without Shift)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        handleUndo();
        return;
      }

      // Redo: Ctrl+Y or Cmd+Y, or Ctrl+Shift+Z / Cmd+Shift+Z
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && e.shiftKey)
      ) {
        e.preventDefault();
        e.stopPropagation();
        handleRedo();
        return;
      }

      // Delete: Delete or Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (activeTool === 'room' && e.key === 'Backspace' && manualRoomPoints.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          setManualRoomPoints((prev) => prev.slice(0, -1));
          triggerToast('Último ponto removido');
          return;
        }
        if (selectedCornerId || selectedWallId || selectedSpotId || selectedRoomId) {
          e.preventDefault();
          e.stopPropagation();
          handleDeleteSelected();
          return;
        }
      }

      // Enter: Close and finish room polygon
      if (e.key === 'Enter') {
        if (activeTool === 'room' && manualRoomPoints.length >= 3) {
          e.preventDefault();
          e.stopPropagation();
          finishManualRoomRef.current();
          return;
        }
      }

      // Escape: Stop drawing chain, clear manual room points, or clear selection
      if (e.key === 'Escape') {
        if (activeTool === 'room') {
          e.preventDefault();
          e.stopPropagation();
          if (manualRoomPoints.length > 0) {
            setManualRoomPoints([]);
            triggerToast('Seleção de pontos cancelada');
          } else {
            setActiveTool('select');
          }
          return;
        }
        if (drawingStartCornerId) {
          e.preventDefault();
          e.stopPropagation();
          handleStopDrawingChain();
          return;
        }
        if (selectedCornerId || selectedWallId || selectedSpotId || selectedRoomId) {
          e.preventDefault();
          e.stopPropagation();
          setSelectedCornerId(null);
          setSelectedWallId(null);
          setSelectedSpotId(null);
          setSelectedRoomId(null);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [
    isOpen,
    activeTool,
    manualRoomPoints,
    handleUndo,
    handleRedo,
    selectedCornerId,
    selectedWallId,
    selectedSpotId,
    selectedRoomId,
    drawingStartCornerId,
    handleDeleteSelected,
    handleStopDrawingChain,
    triggerToast,
  ]);

  // Split Wall: Insert a new corner point between two existing endpoints
  const handleSplitWall = useCallback(
    (wall: PlannerWall, customX?: number, customY?: number) => {
      const c1 = corners.find((c) => c.id === wall.startId);
      const c2 = corners.find((c) => c.id === wall.endId);
      if (!c1 || !c2) return;

      let splitX = customX !== undefined ? customX : (c1.x + c2.x) / 2;
      let splitY = customY !== undefined ? customY : (c1.y + c2.y) / 2;

      splitX = Number(splitX.toFixed(3));
      splitY = Number(splitY.toFixed(3));

      // Avoid creating a point too close to existing endpoints (< 5cm)
      if (Math.hypot(splitX - c1.x, splitY - c1.y) < 0.05 || Math.hypot(splitX - c2.x, splitY - c2.y) < 0.05) {
        return;
      }

      saveSnapshot();

      const newCornerId = `c_${Date.now()}`;
      const newCorner: PlannerCorner = {
        id: newCornerId,
        x: splitX,
        y: splitY,
      };

      const wall1: PlannerWall = {
        id: `w_${Date.now()}_1`,
        startId: wall.startId,
        endId: newCornerId,
        thickness: wall.thickness,
        height: wall.height,
      };

      const wall2: PlannerWall = {
        id: `w_${Date.now()}_2`,
        startId: newCornerId,
        endId: wall.endId,
        thickness: wall.thickness,
        height: wall.height,
      };

      setCorners((prev) => [...prev, newCorner]);
      setWalls((prev) => {
        const remaining = prev.filter((w) => w.id !== wall.id);
        return [...remaining, wall1, wall2];
      });

      setSelectedCornerId(newCornerId);
      setSelectedWallId(null);
    },
    [corners, saveSnapshot]
  );

  // --- Robust Planar Face Traversal (Minimal Closed Rooms Detection) ---
  const recalculateRooms = useCallback(() => {
    if (corners.length < 3 || walls.length < 3) {
      setDetectedRooms([]);
      return;
    }

    // Build Adjacency Map
    const cornerMap = new Map<string, PlannerCorner>();
    corners.forEach((c) => cornerMap.set(c.id, c));

    // 1. Build Adjacency List with Outgoing Polar Angles
    const adj = new Map<string, Array<{ to: string; angle: number }>>();
    corners.forEach((c) => adj.set(c.id, []));

    walls.forEach((w) => {
      if (w.startId === w.endId) return;
      const c1 = cornerMap.get(w.startId);
      const c2 = cornerMap.get(w.endId);
      if (!c1 || !c2) return;
      const a12 = Math.atan2(c2.y - c1.y, c2.x - c1.x);
      const a21 = Math.atan2(c1.y - c2.y, c1.x - c2.x);
      adj.get(w.startId)?.push({ to: w.endId, angle: a12 });
      adj.get(w.endId)?.push({ to: w.startId, angle: a21 });
    });

    // 2. Prune Dead-End Walls (vertices with degree 1 cannot be part of any closed room)
    let pruned = true;
    while (pruned) {
      pruned = false;
      for (const [cid, edges] of adj.entries()) {
        if (edges.length === 1) {
          const otherId = edges[0].to;
          adj.set(cid, []);
          const otherEdges = adj.get(otherId);
          if (otherEdges) {
            adj.set(otherId, otherEdges.filter((e) => e.to !== cid));
          }
          pruned = true;
        }
      }
    }

    // 3. Sort Outgoing Edges Counter-Clockwise (by angle ascending)
    corners.forEach((c) => {
      adj.get(c.id)?.sort((a, b) => a.angle - b.angle);
    });

    // 4. Traverse Planar Faces using Left-Turn (next edge in CCW order)
    const visitedEdges = new Set<string>();
    interface RawFace {
      corners: PlannerCorner[];
      signedArea: number;
      area: number;
      center: { x: number; y: number };
    }
    const rawFaces: RawFace[] = [];

    for (const c of corners) {
      const edges = adj.get(c.id) || [];
      for (const edge of edges) {
        const edgeKey = `${c.id}->${edge.to}`;
        if (visitedEdges.has(edgeKey)) continue;

        const pathIds: string[] = [c.id];
        let u = c.id;
        let v = edge.to;
        let infiniteLoopGuard = 0;

        while (infiniteLoopGuard++ < 120) {
          visitedEdges.add(`${u}->${v}`);
          pathIds.push(v);

          const cu = cornerMap.get(u);
          const cv = cornerMap.get(v);
          if (!cu || !cv) break;

          const outEdges = adj.get(v);
          if (!outEdges || outEdges.length === 0) break;

          // Find index of edge pointing back to u
          const backIdx = outEdges.findIndex((e) => e.to === u);
          if (backIdx === -1) break;

          // Next edge in CCW cyclic order is (backIdx + 1) % outEdges.length
          const nextEdge = outEdges[(backIdx + 1) % outEdges.length];

          u = v;
          v = nextEdge.to;

          if (u === c.id && v === edge.to) {
            break; // Loop completed
          }
        }

        // Drop duplicate closing corner from array
        if (pathIds.length > 3 && pathIds[0] === pathIds[pathIds.length - 1]) {
          pathIds.pop();
        }

        if (pathIds.length < 3) continue;

        // Map to corners
        const faceCorners = pathIds
          .map((id) => cornerMap.get(id))
          .filter((corner): corner is PlannerCorner => Boolean(corner));

        if (faceCorners.length < 3) continue;

        // Shoelace Signed Area & Centroid
        let signedArea = 0;
        let sumX = 0;
        let sumY = 0;
        let centroidX = 0;
        let centroidY = 0;
        const n = faceCorners.length;

        for (let i = 0; i < n; i++) {
          const p1 = faceCorners[i];
          const p2 = faceCorners[(i + 1) % n];
          const cross = p1.x * p2.y - p2.x * p1.y;
          signedArea += cross;
          sumX += p1.x;
          sumY += p1.y;
          centroidX += (p1.x + p2.x) * cross;
          centroidY += (p1.y + p2.y) * cross;
        }
        signedArea /= 2;
        const area = Math.abs(signedArea);

        // Ignore micro slivers or invalid faces
        if (area < 0.4) continue;

        let center = { x: sumX / n, y: sumY / n };
        if (Math.abs(signedArea) > 0.001) {
          center = {
            x: centroidX / (6 * signedArea),
            y: centroidY / (6 * signedArea),
          };
        }

        rawFaces.push({
          corners: faceCorners,
          signedArea,
          area: Number(area.toFixed(2)),
          center,
        });
      }
    }

    // 5. Separate Interior Rooms from Unbounded Exterior Face
    const negFaces = rawFaces.filter((f) => f.signedArea < 0);
    const posFaces = rawFaces.filter((f) => f.signedArea > 0);

    let interiorFaces: RawFace[] = [];
    if (negFaces.length > 0 && posFaces.length > 0) {
      if (negFaces.length >= posFaces.length) {
        interiorFaces = negFaces;
      } else {
        interiorFaces = posFaces;
      }
    } else {
      interiorFaces = rawFaces.filter((f) => f.area < 1000);
    }

    // Sort interior faces for stable indexing
    interiorFaces.sort((a, b) => a.center.x - b.center.x || a.center.y - b.center.y);

    // Build Final Room Objects and preserve customizations
    const rooms: PlannerRoomLoop[] = interiorFaces.map((face, idx) => {
      const custom = roomCustomizations.find(
        (rc) =>
          rc.id === `room_${idx + 1}` ||
          (rc.center && Math.hypot(rc.center.x - face.center.x, rc.center.y - face.center.y) < 0.8)
      );

      return {
        id: `room_${idx + 1}`,
        corners: face.corners,
        area: face.area,
        name: custom?.name || '',
        color: custom?.color,
        material: custom?.material,
        center: face.center,
      };
    });

    setDetectedRooms(rooms);
  }, [corners, walls, roomCustomizations]);

  // Complete & finalize manual room polygon
  const handleFinishManualRoom = useCallback(() => {
    if (manualRoomPoints.length < 3) {
      triggerToast('Marque pelo menos 3 pontos para formar o ambiente');
      return;
    }

    let signedArea = 0;
    let sumX = 0;
    let sumY = 0;
    let centroidX = 0;
    let centroidY = 0;
    const n = manualRoomPoints.length;

    for (let i = 0; i < n; i++) {
      const p1 = manualRoomPoints[i];
      const p2 = manualRoomPoints[(i + 1) % n];
      const cross = p1.x * p2.y - p2.x * p1.y;
      signedArea += cross;
      sumX += p1.x;
      sumY += p1.y;
      centroidX += (p1.x + p2.x) * cross;
      centroidY += (p1.y + p2.y) * cross;
    }
    signedArea /= 2;
    const area = Number(Math.abs(signedArea).toFixed(2));

    let center = { x: sumX / n, y: sumY / n };
    if (Math.abs(signedArea) > 0.001) {
      center = {
        x: centroidX / (6 * signedArea),
        y: centroidY / (6 * signedArea),
      };
    }

    const newRoomId = `manual_room_${Date.now()}`;
    const newRoom: PlannerRoomLoop = {
      id: newRoomId,
      corners: manualRoomPoints.map((p, idx) => ({
        id: p.cornerId || `mp_${Date.now()}_${idx}`,
        x: p.x,
        y: p.y,
      })),
      area,
      name: '',
      color: '#8b5cf6',
      material: 'madeira',
      center,
      isManual: true,
    };

    saveSnapshot();
    setManualFloors((prev) => [...prev, newRoom]);
    setManualRoomPoints([]);
    setSelectedRoomId(newRoom.id);
    setEditingRoom(newRoom);
    triggerToast(`Ambiente de ${area} m² criado! Defina o nome e o piso.`);
  }, [manualRoomPoints, saveSnapshot, triggerToast]);

  const finishManualRoomRef = useRef(handleFinishManualRoom);
  finishManualRoomRef.current = handleFinishManualRoom;

  // Helper function to check if a 2D world point is inside a polygon
  const isPointInPolygon = useCallback((point: { x: number; y: number }, vs: PlannerCorner[]): boolean => {
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const xi = vs[i].x;
      const yi = vs[i].y;
      const xj = vs[j].x;
      const yj = vs[j].y;
      const intersect = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }, []);

  useEffect(() => {
    recalculateRooms();
  }, [recalculateRooms]);

  // --- Coordinate Transformations ---
  const screenToWorld = useCallback(
    (screenX: number, screenY: number, canvas: HTMLCanvasElement) => {
      const centerX = canvas.width / 2 + pan.x;
      const centerY = canvas.height / 2 + pan.y;
      let wx = (screenX - centerX) / zoom;
      let wy = (screenY - centerY) / zoom;

      // Snapping
      if (snapGrid) {
        wx = Math.round(wx / gridStep) * gridStep;
        wy = Math.round(wy / gridStep) * gridStep;
      }

      return { x: wx, y: wy };
    },
    [pan, zoom, snapGrid, gridStep]
  );

  const worldToScreen = useCallback(
    (worldX: number, worldY: number, canvas: HTMLCanvasElement) => {
      const centerX = canvas.width / 2 + pan.x;
      const centerY = canvas.height / 2 + pan.y;
      return {
        x: centerX + worldX * zoom,
        y: centerY + worldY * zoom,
      };
    },
    [pan, zoom]
  );

  // Find Nearest Corner to screen point (for magnetic snapping)
  const getNearestCorner = useCallback(
    (
      screenX: number,
      screenY: number,
      canvas: HTMLCanvasElement,
      maxDistancePx = 18,
      excludeId?: string
    ) => {
      for (const corner of corners) {
        if (excludeId && corner.id === excludeId) continue;
        const sc = worldToScreen(corner.x, corner.y, canvas);
        const dist = Math.hypot(sc.x - screenX, sc.y - screenY);
        if (dist <= maxDistancePx) {
          return corner;
        }
      }
      return null;
    },
    [corners, worldToScreen]
  );

  // Find Nearest Wall to world point
  const getNearestWall = useCallback(
    (wx: number, wy: number, maxDistance = 0.25) => {
      const cornerMap = new Map<string, PlannerCorner>();
      corners.forEach((c) => cornerMap.set(c.id, c));

      for (const wall of walls) {
        const c1 = cornerMap.get(wall.startId);
        const c2 = cornerMap.get(wall.endId);
        if (!c1 || !c2) continue;

        const dx = c2.x - c1.x;
        const dy = c2.y - c1.y;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) continue;

        let t = ((wx - c1.x) * dx + (wy - c1.y) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));

        const projX = c1.x + t * dx;
        const projY = c1.y + t * dy;
        const dist = Math.hypot(wx - projX, wy - projY);

        if (dist <= maxDistance) {
          return wall;
        }
      }
      return null;
    },
    [corners, walls]
  );

  // --- 2D Canvas Render Loop ---
  const render2D = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    const width = rect.width;
    const height = rect.height;

    // Clear background
    ctx.fillStyle = '#0f172a'; // Deep slate background
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2 + pan.x;
    const centerY = height / 2 + pan.y;

    // 0. Draw Background Reference Image (Planta Baixa de Fundo)
    if (bgConfig.visible && bgImageElementRef.current && bgImageElementRef.current.complete) {
      const img = bgImageElementRef.current;
      const naturalW = img.naturalWidth || 1000;
      const naturalH = img.naturalHeight || 1000;

      const cropL = (bgConfig.cropLeft / 100) * naturalW;
      const cropT = (bgConfig.cropTop / 100) * naturalH;
      const cropR = (bgConfig.cropRight / 100) * naturalW;
      const cropB = (bgConfig.cropBottom / 100) * naturalH;

      const sx = cropL;
      const sy = cropT;
      const sw = Math.max(1, naturalW - cropL - cropR);
      const sh = Math.max(1, naturalH - cropT - cropB);

      const croppedAspect = sw / sh;
      const drawWidthMeters = bgConfig.width;
      const drawHeightMeters = drawWidthMeters / croppedAspect;

      const imgCenterSc = worldToScreen(bgConfig.x, bgConfig.y, canvas);
      const imgWidthPx = drawWidthMeters * zoom;
      const imgHeightPx = drawHeightMeters * zoom;

      ctx.save();
      ctx.globalAlpha = Math.max(0.05, Math.min(1.0, bgConfig.opacity));
      ctx.translate(imgCenterSc.x, imgCenterSc.y);
      if (bgConfig.rotation !== 0) {
        ctx.rotate((bgConfig.rotation * Math.PI) / 180);
      }

      ctx.drawImage(
        img,
        sx,
        sy,
        sw,
        sh,
        -imgWidthPx / 2,
        -imgHeightPx / 2,
        imgWidthPx,
        imgHeightPx
      );
      ctx.restore();
    }

    // 1. Draw Grid (Optional Visibility Toggle)
    if (showGrid) {
      const meterPx = zoom;
      const subGridPx = meterPx * gridStep;

      // Sub-grid lines (0.10m = 10cm sutil)
      if (subGridPx >= 4) {
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const startX = (centerX % subGridPx) - subGridPx;
        for (let x = startX; x < width; x += subGridPx) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
        }
        const startY = (centerY % subGridPx) - subGridPx;
        for (let y = startY; y < height; y += subGridPx) {
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
        }
        ctx.stroke();
      }

      // 1-Meter Major Grid
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const majorStartX = (centerX % meterPx) - meterPx;
      for (let x = majorStartX; x < width; x += meterPx) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      const majorStartY = (centerY % meterPx) - meterPx;
      for (let y = majorStartY; y < height; y += meterPx) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Origin Axes (X / Y)
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.moveTo(centerX, 0);
      ctx.lineTo(centerX, height);
      ctx.stroke();

      // Center Origin Badge
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.fillText('(0,0)', centerX + 4, centerY - 4);
    }

    // 2. Draw Detected & Manual Room Polygons (Fills & Area badges)
    if (layersConfig.floors.visible) {
      allRooms.forEach((room) => {
        if (room.corners.length < 3) return;
        ctx.beginPath();
        const firstSc = worldToScreen(room.corners[0].x, room.corners[0].y, canvas);
        ctx.moveTo(firstSc.x, firstSc.y);
        for (let i = 1; i < room.corners.length; i++) {
          const sc = worldToScreen(room.corners[i].x, room.corners[i].y, canvas);
          ctx.lineTo(sc.x, sc.y);
        }
        ctx.closePath();

        const isSelectedRoom = selectedRoomId === room.id;
        ctx.fillStyle = room.color
          ? isSelectedRoom
            ? `${room.color}55`
            : `${room.color}25`
          : isSelectedRoom
          ? 'rgba(59, 130, 246, 0.22)'
          : 'rgba(59, 130, 246, 0.08)';
        ctx.fill();

        if (isSelectedRoom) {
          ctx.strokeStyle = room.color || '#38bdf8';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Room Center Label
        if (layersConfig.floors.showLabels) {
          const centerSc = worldToScreen(room.center.x, room.center.y, canvas);
          if (room.name && room.name.trim().length > 0) {
            ctx.fillStyle = room.color ? '#f8fafc' : '#38bdf8';
            ctx.font = 'bold 12px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(room.name, centerSc.x, centerSc.y - 8);

            ctx.fillStyle = '#94a3b8';
            ctx.font = '10px monospace';
            ctx.fillText(`${room.area} m²`, centerSc.x, centerSc.y + 8);
          } else {
            // Apenas metragem quadrada sutil sem poluir com 'Cômodo X'!
            ctx.fillStyle = 'rgba(148, 163, 184, 0.75)';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${room.area} m²`, centerSc.x, centerSc.y);
          }
        }
      });
    }

    // Map corners for quick access
    const cornerMap = new Map<string, PlannerCorner>();
    corners.forEach((c) => cornerMap.set(c.id, c));

    // 3. Draw Finished Walls
    if (layersConfig.walls.visible) {
      walls.forEach((wall) => {
      const c1 = cornerMap.get(wall.startId);
      const c2 = cornerMap.get(wall.endId);
      if (!c1 || !c2) return;

      const sc1 = worldToScreen(c1.x, c1.y, canvas);
      const sc2 = worldToScreen(c2.x, c2.y, canvas);

      const isSelected = selectedWallId === wall.id;
      const isHovered =
        hoveredWallId === wall.id &&
        (activeTool === 'select' || activeTool === 'split') &&
        !draggingCornerId &&
        !draggingWallId;
      const isDragging = draggingWallId === wall.id;
      const wallThicknessPx = Math.max(4, wall.thickness * zoom);

      // Glow / Aura for hovered, dragged or selected wall
      if (isSelected || isHovered || isDragging) {
        ctx.save();
        ctx.strokeStyle =
          isDragging || isSelected
            ? 'rgba(245, 158, 11, 0.35)'
            : activeTool === 'split'
            ? 'rgba(16, 185, 129, 0.45)'
            : 'rgba(56, 189, 248, 0.3)';
        ctx.lineWidth = wallThicknessPx + 12;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sc1.x, sc1.y);
        ctx.lineTo(sc2.x, sc2.y);
        ctx.stroke();
        ctx.restore();
      }

      // Wall Main Line
      ctx.strokeStyle =
        isSelected || isDragging
          ? '#f59e0b'
          : activeTool === 'split' && isHovered
          ? '#10b981'
          : isHovered
          ? '#38bdf8'
          : '#e2e8f0';
      ctx.lineWidth = wallThicknessPx;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sc1.x, sc1.y);
      ctx.lineTo(sc2.x, sc2.y);
      ctx.stroke();

      // Inner Core line
      ctx.strokeStyle =
        isSelected || isDragging
          ? '#fbbf24'
          : activeTool === 'split' && isHovered
          ? '#34d399'
          : isHovered
          ? '#7dd3fc'
          : '#64748b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sc1.x, sc1.y);
      ctx.lineTo(sc2.x, sc2.y);
      ctx.stroke();

      // Dimension Label (Cota em metros)
      if (showMeasurements || isSelected || isDragging || isHovered) {
        const dx = c2.x - c1.x;
        const dy = c2.y - c1.y;
        const len = Math.hypot(dx, dy);
        const midSc = { x: (sc1.x + sc2.x) / 2, y: (sc1.y + sc2.y) / 2 };

        const angle = Math.atan2(sc2.y - sc1.y, sc2.x - sc1.x);
        const offsetDist = wallThicknessPx / 2 + 10;
        const normalX = -Math.sin(angle) * offsetDist;
        const normalY = Math.cos(angle) * offsetDist;

        ctx.save();
        ctx.translate(midSc.x + normalX, midSc.y + normalY);
        let rot = angle;
        if (rot > Math.PI / 2 || rot < -Math.PI / 2) {
          rot += Math.PI;
        }
        ctx.rotate(rot);

        // Badge background
        const text = isDragging ? `↔ ${len.toFixed(2)}m (Movendo)` : `${len.toFixed(2)}m`;
        ctx.font = isDragging || isSelected ? 'bold 11px monospace' : 'bold 10px monospace';
        const textWidth = ctx.measureText(text).width;
        ctx.fillStyle = isDragging || isSelected ? 'rgba(245, 158, 11, 0.95)' : isHovered ? 'rgba(14, 165, 233, 0.9)' : 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(-textWidth / 2 - 5, -8, textWidth + 10, 16);
        ctx.strokeStyle = isDragging || isSelected ? '#fbbf24' : isHovered ? '#38bdf8' : '#334155';
        ctx.lineWidth = 1;
        ctx.strokeRect(-textWidth / 2 - 5, -8, textWidth + 10, 16);

        ctx.fillStyle = isDragging || isSelected ? '#0f172a' : '#f8fafc';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 0, 0);
        ctx.restore();
      }
    });
    }

    // 3.5. Draw Live Split Point Preview on Wall when Inserir Ponto (split tool) is active
    if (activeTool === 'split' && hoveredWallId && currentMouseWorld) {
      const splitTargetWall = walls.find((w) => w.id === hoveredWallId);
      if (splitTargetWall) {
        const c1 = cornerMap.get(splitTargetWall.startId);
        const c2 = cornerMap.get(splitTargetWall.endId);
        if (c1 && c2) {
          const dx = c2.x - c1.x;
          const dy = c2.y - c1.y;
          const lenSq = dx * dx + dy * dy;
          if (lenSq > 0) {
            let t = ((currentMouseWorld.x - c1.x) * dx + (currentMouseWorld.y - c1.y) * dy) / lenSq;
            t = Math.max(0.05, Math.min(0.95, t));
            const isMidpoint = Math.abs(t - 0.5) < 0.08;
            if (isMidpoint) t = 0.5;

            const splitX = c1.x + t * dx;
            const splitY = c1.y + t * dy;
            const spSc = worldToScreen(splitX, splitY, canvas);

            ctx.save();
            // Outer Halo
            ctx.beginPath();
            ctx.arc(spSc.x, spSc.y, 14, 0, Math.PI * 2);
            ctx.fillStyle = isMidpoint ? 'rgba(16, 185, 129, 0.45)' : 'rgba(6, 182, 212, 0.35)';
            ctx.fill();

            // Point Dot
            ctx.beginPath();
            ctx.arc(spSc.x, spSc.y, 6.5, 0, Math.PI * 2);
            ctx.fillStyle = isMidpoint ? '#10b981' : '#06b6d4';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Measurement Distances
            const d1 = Math.hypot(splitX - c1.x, splitY - c1.y);
            const d2 = Math.hypot(c2.x - splitX, c2.y - splitY);
            const label = isMidpoint
              ? `⚡ Ponto Médio: ${d1.toFixed(2)}m | ${d2.toFixed(2)}m (Clique para dividir)`
              : `📍 Inserir Ponto: ${d1.toFixed(2)}m | ${d2.toFixed(2)}m (Clique para dividir)`;

            ctx.font = 'bold 10px monospace';
            const textW = ctx.measureText(label).width;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
            ctx.fillRect(spSc.x - textW / 2 - 7, spSc.y - 30, textW + 14, 18);
            ctx.strokeStyle = isMidpoint ? '#10b981' : '#06b6d4';
            ctx.lineWidth = 1;
            ctx.strokeRect(spSc.x - textW / 2 - 7, spSc.y - 30, textW + 14, 18);

            ctx.fillStyle = isMidpoint ? '#34d399' : '#67e8f9';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, spSc.x, spSc.y - 21);
            ctx.restore();
          }
        }
      }
    }

    // 4. Draw Active Wall Preview while Drawing
    if (activeTool === 'wall' && drawingStartCornerId && currentMouseWorld) {
      const startCorner = cornerMap.get(drawingStartCornerId);
      if (startCorner) {
        const sc1 = worldToScreen(startCorner.x, startCorner.y, canvas);
        const sc2 = worldToScreen(currentMouseWorld.x, currentMouseWorld.y, canvas);

        // Dashed Preview Line
        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = Math.max(3, wallThickness * zoom);
        ctx.beginPath();
        ctx.moveTo(sc1.x, sc1.y);
        ctx.lineTo(sc2.x, sc2.y);
        ctx.stroke();
        ctx.restore();

        // Length & Angle Helper
        const dx = currentMouseWorld.x - startCorner.x;
        const dy = currentMouseWorld.y - startCorner.y;
        const length = Math.hypot(dx, dy);
        const angleDeg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
          `${length.toFixed(2)}m (${angleDeg}°)`,
          (sc1.x + sc2.x) / 2,
          (sc1.y + sc2.y) / 2 - 14
        );
      }
    }

    // 5. Draw Scale Calibration Live Line
    if (isCalibratingScale && calibrationPtA && currentMouseWorld) {
      const sc1 = worldToScreen(calibrationPtA.x, calibrationPtA.y, canvas);
      const sc2 = worldToScreen(currentMouseWorld.x, currentMouseWorld.y, canvas);
      const dist = Math.hypot(currentMouseWorld.x - calibrationPtA.x, currentMouseWorld.y - calibrationPtA.y);

      ctx.save();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(sc1.x, sc1.y);
      ctx.lineTo(sc2.x, sc2.y);
      ctx.stroke();
      ctx.restore();

      // Measurement badge
      const midSc = { x: (sc1.x + sc2.x) / 2, y: (sc1.y + sc2.y) / 2 };
      ctx.fillStyle = 'rgba(6, 182, 212, 0.9)';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`📐 Medida Atual: ${dist.toFixed(2)}m (Clique no ponto final)`, midSc.x, midSc.y - 12);
    }

    // 6. Draw Corners (Vertices)
    corners.forEach((corner) => {
      const sc = worldToScreen(corner.x, corner.y, canvas);
      const isSelected = selectedCornerId === corner.id;
      const isDrawingStart = drawingStartCornerId === corner.id;
      const isSnapped = snappedCornerId === corner.id;

      if (isSnapped) {
        const isMergeTarget = Boolean(draggingCornerId && snappedCornerId === corner.id);
        ctx.beginPath();
        ctx.arc(sc.x, sc.y, isMergeTarget ? 16 : 14, 0, Math.PI * 2);
        ctx.fillStyle = isMergeTarget ? 'rgba(34, 197, 94, 0.45)' : 'rgba(56, 189, 248, 0.35)';
        ctx.fill();

        if (isMergeTarget) {
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Tooltip/Badge "Fundir Vértice"
          ctx.save();
          ctx.fillStyle = '#22c55e';
          ctx.font = 'bold 11px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('⚡ Solte para Fundir', sc.x, sc.y - 18);
          ctx.restore();
        }
      }

      ctx.beginPath();
      ctx.arc(sc.x, sc.y, isSelected || isDrawingStart ? 7 : 5, 0, Math.PI * 2);
      ctx.fillStyle = isDrawingStart
        ? '#38bdf8'
        : isSelected
        ? '#f59e0b'
        : isSnapped
        ? (draggingCornerId ? '#22c55e' : '#06b6d4')
        : '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.stroke();

      // If selected, display a neat floating pill badge with coordinates above the vertex
      if (isSelected && !draggingCornerId) {
        ctx.save();
        const coordText = `X: ${corner.x.toFixed(2)}m  Y: ${corner.y.toFixed(2)}m`;
        ctx.font = 'bold 10px monospace';
        const textWidth = ctx.measureText(coordText).width;
        const boxW = textWidth + 12;
        const boxH = 18;
        const boxX = sc.x - boxW / 2;
        const boxY = sc.y - 28;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if ((ctx as any).roundRect) {
          (ctx as any).roundRect(boxX, boxY, boxW, boxH, 4);
        } else {
          ctx.rect(boxX, boxY, boxW, boxH);
        }
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fbbf24';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(coordText, sc.x, boxY + boxH / 2);
        ctx.restore();
      }
    });

    // 7. Axis Lock Visual Guides (Shift = X, Ctrl = Y)
    if ((draggingWallId || draggingCornerId) && dragAxisLock !== 'none') {
      ctx.save();
      ctx.strokeStyle = dragAxisLock === 'x' ? 'rgba(56, 189, 248, 0.85)' : 'rgba(245, 158, 11, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);

      if (dragWallStartRef.current) {
        const { c1Pos, c2Pos } = dragWallStartRef.current;
        const sc1 = worldToScreen(c1Pos.x, c1Pos.y, canvas);
        const sc2 = worldToScreen(c2Pos.x, c2Pos.y, canvas);
        const midX = (sc1.x + sc2.x) / 2;
        const midY = (sc1.y + sc2.y) / 2;

        ctx.beginPath();
        if (dragAxisLock === 'x') {
          ctx.moveTo(0, midY);
          ctx.lineTo(width, midY);
        } else {
          ctx.moveTo(midX, 0);
          ctx.lineTo(midX, height);
        }
        ctx.stroke();

        // Badge
        ctx.setLineDash([]);
        const lockText = dragAxisLock === 'x' ? '🔒 Eixo X Travado (Shift)' : '🔒 Eixo Y Travado (Ctrl)';
        ctx.font = 'bold 10px monospace';
        const txtW = ctx.measureText(lockText).width;
        ctx.fillStyle = dragAxisLock === 'x' ? 'rgba(14, 116, 144, 0.95)' : 'rgba(180, 83, 9, 0.95)';
        ctx.beginPath();
        if ((ctx as any).roundRect) {
          (ctx as any).roundRect(midX - txtW / 2 - 8, midY - (dragAxisLock === 'x' ? 24 : 32), txtW + 16, 18, 4);
        } else {
          ctx.rect(midX - txtW / 2 - 8, midY - (dragAxisLock === 'x' ? 24 : 32), txtW + 16, 18);
        }
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(lockText, midX, midY - (dragAxisLock === 'x' ? 15 : 23));
      } else if (dragCornerStartRef.current) {
        const sc = worldToScreen(dragCornerStartRef.current.x, dragCornerStartRef.current.y, canvas);
        ctx.beginPath();
        if (dragAxisLock === 'x') {
          ctx.moveTo(0, sc.y);
          ctx.lineTo(width, sc.y);
        } else {
          ctx.moveTo(sc.x, 0);
          ctx.lineTo(sc.x, height);
        }
        ctx.stroke();

        ctx.setLineDash([]);
        const lockText = dragAxisLock === 'x' ? '🔒 Eixo X Travado (Shift)' : '🔒 Eixo Y Travado (Ctrl)';
        ctx.font = 'bold 10px monospace';
        const txtW = ctx.measureText(lockText).width;
        ctx.fillStyle = dragAxisLock === 'x' ? 'rgba(14, 116, 144, 0.95)' : 'rgba(180, 83, 9, 0.95)';
        ctx.beginPath();
        if ((ctx as any).roundRect) {
          (ctx as any).roundRect(sc.x - txtW / 2 - 8, sc.y - 24, txtW + 16, 18, 4);
        } else {
          ctx.rect(sc.x - txtW / 2 - 8, sc.y - 24, txtW + 16, 18);
        }
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(lockText, sc.x, sc.y - 15);
      }
      ctx.restore();
    }

    // 8. Draw Camera Spots (Waypoints)
    if (layersConfig.spots.visible) {
      spots.forEach((spot) => {
        const spSc = worldToScreen(spot.x, spot.y, canvas);
        const isSelected = selectedSpotId === spot.id;

        ctx.save();
        // Pulsing halo
        ctx.beginPath();
        ctx.arc(spSc.x, spSc.y, isSelected ? 16 : 13, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? 'rgba(6, 182, 212, 0.45)' : 'rgba(6, 182, 212, 0.25)';
        ctx.fill();

        // Pin body
        ctx.beginPath();
        ctx.arc(spSc.x, spSc.y, isSelected ? 8 : 6.5, 0, Math.PI * 2);
        ctx.fillStyle = spot.color || '#06b6d4';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Pin Label Badge
        const label = `📷 ${spot.name}`;
        ctx.font = 'bold 10px Inter, sans-serif';
        const tw = ctx.measureText(label).width;
        ctx.fillStyle = isSelected ? 'rgba(8, 51, 68, 0.95)' : 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(spSc.x - tw / 2 - 6, spSc.y - 28, tw + 12, 18);
        ctx.strokeStyle = isSelected ? '#22d3ee' : '#334155';
        ctx.lineWidth = isSelected ? 1.5 : 1;
        ctx.strokeRect(spSc.x - tw / 2 - 6, spSc.y - 28, tw + 12, 18);

        ctx.fillStyle = isSelected ? '#67e8f9' : '#f8fafc';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, spSc.x, spSc.y - 19);
        ctx.restore();
      });
    }

    // 9. Draw Active Spot Placer Preview
    if (activeTool === 'spot' && currentMouseWorld) {
      const msSc = worldToScreen(currentMouseWorld.x, currentMouseWorld.y, canvas);
      ctx.save();
      ctx.beginPath();
      ctx.arc(msSc.x, msSc.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(6, 182, 212, 0.35)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(msSc.x, msSc.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#06b6d4';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      const tip = '📍 Clique para posicionar Spot de Câmera';
      ctx.font = 'bold 10px Inter, sans-serif';
      const tw = ctx.measureText(tip).width;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.fillRect(msSc.x - tw / 2 - 6, msSc.y - 28, tw + 12, 18);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1;
      ctx.strokeRect(msSc.x - tw / 2 - 6, msSc.y - 28, tw + 12, 18);

      ctx.fillStyle = '#67e8f9';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tip, msSc.x, msSc.y - 19);
      ctx.restore();
    }

    // 10. Draw In-Progress Manual Room Point Selection
    if (activeTool === 'room') {
      ctx.save();

      const snappedCorner = snappedCornerId ? corners.find((c) => c.id === snappedCornerId) : null;

      // Draw semi-transparent polygon preview if 2 or more points
      if (manualRoomPoints.length >= 2 && currentMouseWorld) {
        ctx.beginPath();
        const p0Sc = worldToScreen(manualRoomPoints[0].x, manualRoomPoints[0].y, canvas);
        ctx.moveTo(p0Sc.x, p0Sc.y);
        for (let i = 1; i < manualRoomPoints.length; i++) {
          const sc = worldToScreen(manualRoomPoints[i].x, manualRoomPoints[i].y, canvas);
          ctx.lineTo(sc.x, sc.y);
        }
        const targetWorld = snappedCorner ? { x: snappedCorner.x, y: snappedCorner.y } : currentMouseWorld;
        const targetSc = worldToScreen(targetWorld.x, targetWorld.y, canvas);
        ctx.lineTo(targetSc.x, targetSc.y);
        ctx.closePath();
        ctx.fillStyle = 'rgba(99, 102, 241, 0.15)';
        ctx.fill();
      }

      // Draw perimeter lines between already-selected points
      if (manualRoomPoints.length >= 2) {
        ctx.beginPath();
        const firstSc = worldToScreen(manualRoomPoints[0].x, manualRoomPoints[0].y, canvas);
        ctx.moveTo(firstSc.x, firstSc.y);
        for (let i = 1; i < manualRoomPoints.length; i++) {
          const sc = worldToScreen(manualRoomPoints[i].x, manualRoomPoints[i].y, canvas);
          ctx.lineTo(sc.x, sc.y);
        }
        ctx.strokeStyle = '#818cf8';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      // Draw dashed rubber-band line from last point to current mouse / snapped target
      if (manualRoomPoints.length > 0 && currentMouseWorld) {
        const lastPt = manualRoomPoints[manualRoomPoints.length - 1];
        const lastSc = worldToScreen(lastPt.x, lastPt.y, canvas);
        const targetWorld = snappedCorner ? { x: snappedCorner.x, y: snappedCorner.y } : currentMouseWorld;
        const targetSc = worldToScreen(targetWorld.x, targetWorld.y, canvas);

        ctx.beginPath();
        ctx.moveTo(lastSc.x, lastSc.y);
        ctx.lineTo(targetSc.x, targetSc.y);
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = '#a5b4fc';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw numbered badges on selected vertices
      manualRoomPoints.forEach((p, idx) => {
        const sc = worldToScreen(p.x, p.y, canvas);
        const isFirst = idx === 0;

        // Halo
        ctx.beginPath();
        ctx.arc(sc.x, sc.y, isFirst ? 14 : 10, 0, Math.PI * 2);
        ctx.fillStyle = isFirst ? 'rgba(34, 197, 94, 0.35)' : 'rgba(99, 102, 241, 0.3)';
        ctx.fill();

        // Pin core
        ctx.beginPath();
        ctx.arc(sc.x, sc.y, isFirst ? 8 : 6, 0, Math.PI * 2);
        ctx.fillStyle = isFirst ? '#22c55e' : '#6366f1';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Vertex index number
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${idx + 1}`, sc.x, sc.y - 14);
      });

      // Special highlight on 1st point when polygon can be closed (>= 3 points)
      if (manualRoomPoints.length >= 3) {
        const fSc = worldToScreen(manualRoomPoints[0].x, manualRoomPoints[0].y, canvas);
        ctx.beginPath();
        ctx.arc(fSc.x, fSc.y, 18, 0, Math.PI * 2);
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        const tip = 'Clique no Ponto 1 para fechar o ambiente';
        ctx.font = 'bold 10px Inter, sans-serif';
        const tw = ctx.measureText(tip).width;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        ctx.fillRect(fSc.x - tw / 2 - 6, fSc.y + 14, tw + 12, 18);
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 1;
        ctx.strokeRect(fSc.x - tw / 2 - 6, fSc.y + 14, tw + 12, 18);
        ctx.fillStyle = '#4ade80';
        ctx.fillText(tip, fSc.x, fSc.y + 23);
      }

      ctx.restore();
    }

    ctx.restore();
  }, [
    corners,
    walls,
    allRooms,
    manualRoomPoints,
    pan,
    zoom,
    gridStep,
    activeTool,
    drawingStartCornerId,
    currentMouseWorld,
    snappedCornerId,
    selectedCornerId,
    selectedWallId,
    showMeasurements,
    wallThickness,
    worldToScreen,
    bgConfig,
    isCalibratingScale,
    calibrationPtA,
    draggingCornerId,
    draggingWallId,
    dragAxisLock,
    hoveredWallId,
    showGrid,
    layersConfig,
    spots,
    selectedSpotId,
    selectedRoomId,
  ]);

  // Animation Loop for smooth 2D drawing
  useEffect(() => {
    let animId: number;
    const loop = () => {
      render2D();
      animId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animId);
  }, [render2D]);

  // --- 3D Scene Initialization ---
  useEffect(() => {
    if (!isOpen || !container3DRef.current) return;

    const container = container3DRef.current;
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1120);
    scene.fog = new THREE.Fog(0x0b1120, 15, 45);
    threeSceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(6, 7, 7);
    threeCameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);
    threeRendererRef.current = renderer;

    // 4. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.rotateSpeed = 1.3;
    controls.panSpeed = 1.3;
    controls.zoomSpeed = 1.25;
    controls.screenSpacePanning = true;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 35;
    controls.target.set(0, 1, 0);
    controls.update();
    threeControlsRef.current = controls;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x0f172a, 0.6);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfff7ed, 1.4);
    dirLight.position.set(8, 14, 6);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 30;
    dirLight.shadow.camera.left = -10;
    dirLight.shadow.camera.right = 10;
    dirLight.shadow.camera.top = 10;
    dirLight.shadow.camera.bottom = -10;
    dirLight.shadow.bias = 0.00002; // Positive bias prevents shadow acne
    dirLight.shadow.normalBias = 0.03;
    scene.add(dirLight);

    // 6. Grid Helper
    const gridHelper = new THREE.GridHelper(20, 20, 0x38bdf8, 0x1e293b);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    const wallsGroup = new THREE.Group();
    const floorsGroup = new THREE.Group();
    const spotsGroup = new THREE.Group();
    scene.add(wallsGroup);
    scene.add(floorsGroup);
    scene.add(spotsGroup);
    wallsGroupRef.current = wallsGroup;
    floorsGroupRef.current = floorsGroup;
    spotsGroupRef.current = spotsGroup;

    // 7. Animation Loop
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      animFrameIdRef.current = requestAnimationFrame(animate);
    };
    animate();

    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      if (nw === 0 || nh === 0) return;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });
    resizeObserver.observe(container);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      resizeObserver.disconnect();
      renderer.dispose();
      controls.dispose();
    };
  }, [isOpen]);

  // --- Sync 3D Geometry ---
  useEffect(() => {
    if (!wallsGroupRef.current || !floorsGroupRef.current || !threeSceneRef.current) return;

    const wallsGroup = wallsGroupRef.current;
    const floorsGroup = floorsGroupRef.current;

    while (wallsGroup.children.length > 0) {
      const obj = wallsGroup.children[0] as THREE.Mesh;
      if (obj.geometry) obj.geometry.dispose();
      wallsGroup.remove(obj);
    }
    while (floorsGroup.children.length > 0) {
      const obj = floorsGroup.children[0] as THREE.Mesh;
      if (obj.geometry) obj.geometry.dispose();
      floorsGroup.remove(obj);
    }

    const cornerMap = new Map<string, PlannerCorner>();
    corners.forEach((c) => cornerMap.set(c.id, c));

    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.5,
      metalness: 0.05,
    });
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x94a3b8, linewidth: 1 });

    // 1. Build 3D Walls with clean junction alignment
    const rawWallsInput = walls
      .map((wall) => {
        const c1 = cornerMap.get(wall.startId);
        const c2 = cornerMap.get(wall.endId);
        if (!c1 || !c2) return null;
        return {
          id: wall.id,
          start: { x: c1.x, y: c1.y },
          end: { x: c2.x, y: c2.y },
          thickness: wall.thickness || wallThickness,
          height: wall.height || wallHeight,
        };
      })
      .filter((w): w is NonNullable<typeof w> => w !== null);

    const adjustedPlannerWalls = calculateAdjustedWallJunctions(rawWallsInput, wallThickness, wallHeight);

    adjustedPlannerWalls.forEach((adjWall) => {
      const length = adjWall.length;
      const h = adjWall.height;
      const t = adjWall.thickness;
      const centerX = adjWall.centerX;
      const centerZ = adjWall.centerZ;
      const angle = adjWall.angle;

      const wallGeo = new THREE.BoxGeometry(length, h, t);
      const wallMesh = new THREE.Mesh(wallGeo, wallMaterial);
      wallMesh.position.set(centerX, h / 2, centerZ);
      wallMesh.rotation.y = -angle;
      wallMesh.castShadow = true;
      wallMesh.receiveShadow = true;

      const edgesGeo = new THREE.EdgesGeometry(wallGeo);
      const line = new THREE.LineSegments(edgesGeo, edgeMaterial);
      wallMesh.add(line);

      wallsGroup.add(wallMesh);
    });

    // 2. Build 3D Floors
    floorsGroup.visible = layersConfig.floors.visible;
    if (layersConfig.floors.visible) {
      // 2.1 Base standard floor (piso padrão) at y = 0
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      corners.forEach((c) => {
        if (c.x < minX) minX = c.x;
        if (c.x > maxX) maxX = c.x;
        if (c.y < minY) minY = c.y;
        if (c.y > maxY) maxY = c.y;
      });
      const boundW = isFinite(minX) && maxX > minX ? (maxX - minX) : (currentRoom.width || 8);
      const boundD = isFinite(minY) && maxY > minY ? (maxY - minY) : (currentRoom.depth || 6);
      const baseW = Math.max(boundW, currentRoom.width || 8, 4) + 1.5;
      const baseD = Math.max(boundD, currentRoom.depth || 6, 4) + 1.5;
      let defaultBaseColorHex = 0x1e293b;
      if (currentRoom.floorColor) {
        defaultBaseColorHex = parseInt(currentRoom.floorColor.replace('#', '0x'), 16);
      }
      const baseFloorMaterial = new THREE.MeshStandardMaterial({
        color: defaultBaseColorHex,
        roughness: 0.6,
        metalness: 0.05,
      });
      const baseFloorGeo = new THREE.PlaneGeometry(baseW, baseD);
      const baseFloorMesh = new THREE.Mesh(baseFloorGeo, baseFloorMaterial);
      baseFloorMesh.rotation.x = -Math.PI / 2;
      baseFloorMesh.position.y = 0; // Nível 0 do piso padrão
      baseFloorMesh.receiveShadow = true;
      floorsGroup.add(baseFloorMesh);

      // 2.2 Pisos gerados de cada ambiente com espessura 3D real (12mm) e deduplicação
      const FLOOR_THICKNESS = 0.012; // 12mm de espessura física do piso
      const seenSignatures = new Set<string>();
      const uniqueRooms = allRooms.filter((r) => {
        if (r.corners.length < 3) return false;
        let cx = 0, cy = 0;
        r.corners.forEach((c) => { cx += c.x; cy += c.y; });
        cx = Number((cx / r.corners.length).toFixed(2));
        cy = Number((cy / r.corners.length).toFixed(2));
        const areaSig = Number((r.area || 0).toFixed(1));
        const sig = `${cx}_${cy}_${areaSig}`;
        if (seenSignatures.has(sig)) return false;
        seenSignatures.add(sig);
        return true;
      });

      uniqueRooms.forEach((room) => {
        const shape = new THREE.Shape();
        shape.moveTo(room.corners[0].x, -room.corners[0].y);
        for (let i = 1; i < room.corners.length; i++) {
          shape.lineTo(room.corners[i].x, -room.corners[i].y);
        }
        shape.closePath();

        let floorColorHex = 0x334155;
        if (room.color) {
          floorColorHex = parseInt(room.color.replace('#', '0x'), 16);
        } else if (currentRoom.floorColor) {
          floorColorHex = parseInt(currentRoom.floorColor.replace('#', '0x'), 16);
        }

        const roomFloorMaterial = new THREE.MeshStandardMaterial({
          color: floorColorHex,
          roughness: 0.35,
          metalness: 0.1,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -4,
        });

        const extrudeSettings = {
          depth: FLOOR_THICKNESS,
          bevelEnabled: false,
        };
        const floorGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const floorMesh = new THREE.Mesh(floorGeo, roomFloorMaterial);
        floorMesh.rotation.x = -Math.PI / 2;
        floorMesh.position.y = 0.001; // Base apoia em 1mm e topo atinge 13mm (espessura real e > 3mm do padrão)
        floorMesh.receiveShadow = true;

        floorsGroup.add(floorMesh);
      });
    }

    // 3. Build 3D Spots Markers (Camera Waypoint Pins)
    if (spotsGroupRef.current) {
      const spotsGroup = spotsGroupRef.current;
      while (spotsGroup.children.length > 0) {
        const obj = spotsGroup.children[0] as THREE.Mesh;
        if (obj.geometry) obj.geometry.dispose();
        spotsGroup.remove(obj);
      }

      if (layersConfig.spots.visible) {
        spots.forEach((spot) => {
          const spotGroup = new THREE.Group();
          spotGroup.position.set(spot.x, 0, spot.y);

          // Floor target ring
          const ringGeo = new THREE.RingGeometry(0.18, 0.25, 24);
          const ringMat = new THREE.MeshBasicMaterial({
            color: 0x06b6d4,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8,
          });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.rotation.x = -Math.PI / 2;
          ring.position.y = 0.02;
          spotGroup.add(ring);

          // Vertical indicator pin
          const pinGeo = new THREE.CylinderGeometry(0.015, 0.015, spot.height || 1.6, 8);
          const pinMat = new THREE.MeshBasicMaterial({
            color: 0x06b6d4,
            transparent: true,
            opacity: 0.6,
          });
          const pin = new THREE.Mesh(pinGeo, pinMat);
          pin.position.y = (spot.height || 1.6) / 2;
          spotGroup.add(pin);

          // Eye-level camera marker
          const sphereGeo = new THREE.SphereGeometry(0.12, 16, 16);
          const sphereMat = new THREE.MeshStandardMaterial({
            color: 0x22d3ee,
            emissive: 0x0891b2,
            emissiveIntensity: 0.6,
            roughness: 0.2,
            metalness: 0.3,
          });
          const sphere = new THREE.Mesh(sphereGeo, sphereMat);
          sphere.position.y = spot.height || 1.6;
          spotGroup.add(sphere);

          spotsGroup.add(spotGroup);
        });
      }
    }
  }, [corners, walls, allRooms, wallHeight, wallThickness, layersConfig, spots, currentRoom.floorColor]);

  // Teleport 3D camera to selected spot
  const handleFlyToSpot = useCallback((spot: PlannerSpotPin) => {
    if (!threeCameraRef.current || !threeControlsRef.current) return;
    const cam = threeCameraRef.current;
    const ctrl = threeControlsRef.current;

    // Position camera at spot location at eye level (1.60m)
    cam.position.set(spot.x, spot.height || 1.6, spot.y);
    // Look slightly towards room center
    ctrl.target.set(spot.x, 1.4, spot.y - 1.2);
    ctrl.update();
    triggerToast(`Câmera posicionada em: ${spot.name}`);
  }, [triggerToast]);

  // --- Background Floor Plan Helpers ---
  const handleLoadBgUrl = (urlToLoad?: string) => {
    const targetUrl = (urlToLoad || bgUrlInput).trim();
    if (!targetUrl) return;
    setBgConfig((prev) => ({
      ...prev,
      url: targetUrl,
      visible: true,
    }));
    setBgUrlInput(targetUrl);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setBgConfig((prev) => ({
          ...prev,
          url: dataUrl,
          visible: true,
        }));
        setBgUrlInput('Imagem Local');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetCrop = () => {
    setBgConfig((prev) => ({
      ...prev,
      cropLeft: 0,
      cropRight: 0,
      cropTop: 0,
      cropBottom: 0,
    }));
  };

  // --- Geometry Bounds & Global Scale Helpers ---
  const getGeometryBounds = useCallback(() => {
    if (corners.length === 0) {
      return {
        width: 0,
        depth: 0,
        minX: 0,
        maxX: 0,
        minY: 0,
        maxY: 0,
        centerX: 0,
        centerY: 0,
      };
    }
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    corners.forEach((c) => {
      minX = Math.min(minX, c.x);
      maxX = Math.max(maxX, c.x);
      minY = Math.min(minY, c.y);
      maxY = Math.max(maxY, c.y);
    });
    return {
      width: Math.max(0, Number((maxX - minX).toFixed(2))),
      depth: Math.max(0, Number((maxY - minY).toFixed(2))),
      minX,
      maxX,
      minY,
      maxY,
      centerX: Number(((minX + maxX) / 2).toFixed(3)),
      centerY: Number(((minY + maxY) / 2).toFixed(3)),
    };
  }, [corners]);

  const handleScaleEntirePlan = (
    ratio: number,
    options: { scaleBg?: boolean; centerOrigin?: boolean } = {
      scaleBg: scaleIncludeBg,
      centerOrigin: scaleCenterOrigin,
    }
  ) => {
    if (!isFinite(ratio) || ratio <= 0.001 || ratio >= 100 || corners.length === 0) return;
    saveSnapshot();

    const bounds = getGeometryBounds();
    const cx = options.centerOrigin ? bounds.centerX : 0;
    const cy = options.centerOrigin ? bounds.centerY : 0;

    setCorners((prev) =>
      prev.map((c) => ({
        ...c,
        x: Number(((c.x - cx) * ratio).toFixed(3)),
        y: Number(((c.y - cy) * ratio).toFixed(3)),
      }))
    );

    if (options.scaleBg && bgConfig.url) {
      setBgConfig((prev) => ({
        ...prev,
        width: Number((prev.width * ratio).toFixed(2)),
        x: Number(((prev.x - cx) * ratio).toFixed(3)),
        y: Number(((prev.y - cy) * ratio).toFixed(3)),
      }));
    }

    setShowScaleModal(false);
  };

  const handleApplyCalibration = () => {
    const realMeters = parseFloat(targetRealMetersInput);
    if (!isNaN(realMeters) && realMeters > 0 && calibrationMeasuredDistance > 0.01) {
      const ratio = realMeters / calibrationMeasuredDistance;
      saveSnapshot();

      const bounds = getGeometryBounds();
      const cx = bounds.centerX;
      const cy = bounds.centerY;

      if (calibrateTargetMode === 'all' || calibrateTargetMode === 'walls') {
        setCorners((prev) =>
          prev.map((c) => ({
            ...c,
            x: Number(((c.x - cx) * ratio).toFixed(3)),
            y: Number(((c.y - cy) * ratio).toFixed(3)),
          }))
        );
      }

      if (calibrateTargetMode === 'all' || calibrateTargetMode === 'bg') {
        if (bgConfig.url) {
          const newWidth = Number((bgConfig.width * ratio).toFixed(2));
          setBgConfig((prev) => ({
            ...prev,
            width: Math.min(100, Math.max(1, newWidth)),
            x: Number(((prev.x - cx) * ratio).toFixed(3)),
            y: Number(((prev.y - cy) * ratio).toFixed(3)),
          }));
        }
      }
    }
    setShowCalibrateModal(false);
  };

  // --- Mouse Handlers ---
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (e.button === 1 || e.altKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (e.button !== 0) return;

    const world = screenToWorld(sx, sy, canvas);
    const nearestCorner = getNearestCorner(sx, sy, canvas);

    if (isCalibratingScale) {
      if (!calibrationPtA) {
        setCalibrationPtA({ x: world.x, y: world.y });
      } else {
        const dist = Math.hypot(world.x - calibrationPtA.x, world.y - calibrationPtA.y);
        if (dist > 0.05) {
          setCalibrationMeasuredDistance(dist);
          setShowCalibrateModal(true);
        }
        setIsCalibratingScale(false);
        setCalibrationPtA(null);
      }
      return;
    }

    if (activeTool === 'wall') {
      saveSnapshot();
      if (!drawingStartCornerId) {
        if (nearestCorner) {
          setDrawingStartCornerId(nearestCorner.id);
        } else {
          const newCornerId = `c_${Date.now()}_1`;
          const newCorner: PlannerCorner = { id: newCornerId, x: world.x, y: world.y };
          setCorners((prev) => [...prev, newCorner]);
          setDrawingStartCornerId(newCornerId);
        }
      } else {
        let endCornerId: string;
        if (nearestCorner) {
          endCornerId = nearestCorner.id;
        } else {
          endCornerId = `c_${Date.now()}_2`;
          const newCorner: PlannerCorner = { id: endCornerId, x: world.x, y: world.y };
          setCorners((prev) => [...prev, newCorner]);
        }

        if (endCornerId !== drawingStartCornerId) {
          const newWall: PlannerWall = {
            id: `w_${Date.now()}`,
            startId: drawingStartCornerId,
            endId: endCornerId,
            thickness: wallThickness,
            height: wallHeight,
          };
          setWalls((prev) => [...prev, newWall]);
          setDrawingStartCornerId(endCornerId);
        }
      }
    } else if (activeTool === 'spot') {
      const hitRoom = allRooms.find((r) => isPointInPolygon({ x: world.x, y: world.y }, r.corners));
      const suggestedName = hitRoom?.name ? `Spot ${hitRoom.name}` : `Spot ${spots.length + 1}`;
      setSpotModal({
        isOpen: true,
        x: Number(world.x.toFixed(2)),
        y: Number(world.y.toFixed(2)),
        name: suggestedName,
        height: 1.6,
      });
      return;
    } else if (activeTool === 'room') {
      if (layersConfig.floors.locked) {
        triggerToast('Camada de pisos está bloqueada');
        return;
      }

      // Snap to corner if hovering near existing corner, otherwise use world point
      const pt = nearestCorner
        ? { x: nearestCorner.x, y: nearestCorner.y, cornerId: nearestCorner.id }
        : { x: Number(world.x.toFixed(2)), y: Number(world.y.toFixed(2)) };

      // Check if clicking close to the first point to close polygon
      if (manualRoomPoints.length >= 3) {
        const firstPt = manualRoomPoints[0];
        const distToFirst = Math.hypot(pt.x - firstPt.x, pt.y - firstPt.y);
        if (
          distToFirst < Math.max(0.35, 20 / zoom) ||
          (pt.cornerId && pt.cornerId === firstPt.cornerId)
        ) {
          handleFinishManualRoom();
          return;
        }
      }

      // Avoid adding duplicate point consecutively
      if (manualRoomPoints.length > 0) {
        const lastPt = manualRoomPoints[manualRoomPoints.length - 1];
        if (Math.hypot(pt.x - lastPt.x, pt.y - lastPt.y) < 0.05) {
          return;
        }
      }

      setManualRoomPoints((prev) => [...prev, pt]);
      triggerToast(`Ponto ${manualRoomPoints.length + 1} marcado`);
      return;
    } else if (activeTool === 'select') {
      // 1. Check if clicking on an existing spot
      if (layersConfig.spots.visible && !layersConfig.spots.locked) {
        const clickedSpot = spots.find((s) => Math.hypot(s.x - world.x, s.y - world.y) < Math.max(0.35, 20 / zoom));
        if (clickedSpot) {
          setSelectedSpotId(clickedSpot.id);
          setDraggingSpotId(clickedSpot.id);
          setSelectedCornerId(null);
          setSelectedWallId(null);
          setSelectedRoomId(null);
          saveSnapshot();
          return;
        }
      }

      // 2. Check corners (if walls not locked)
      if (!layersConfig.walls.locked && nearestCorner) {
        setSelectedCornerId(nearestCorner.id);
        setSelectedWallId(null);
        setSelectedSpotId(null);
        setSelectedRoomId(null);
        setDraggingCornerId(nearestCorner.id);
        setDraggingWallId(null);
        dragWallStartRef.current = null;
        dragCornerStartRef.current = { id: nearestCorner.id, x: nearestCorner.x, y: nearestCorner.y };
        saveSnapshot();
      } else {
        const nearestWall = !layersConfig.walls.locked ? getNearestWall(world.x, world.y, Math.max(0.35, 22 / zoom)) : null;
        if (nearestWall) {
          setSelectedWallId(nearestWall.id);
          setSelectedCornerId(null);
          setSelectedSpotId(null);
          setSelectedRoomId(null);
          setDraggingCornerId(null);
          setDraggingWallId(nearestWall.id);
          dragCornerStartRef.current = null;

          const c1 = corners.find((c) => c.id === nearestWall.startId);
          const c2 = corners.find((c) => c.id === nearestWall.endId);
          if (c1 && c2) {
            dragWallStartRef.current = {
              startWorld: { x: world.x, y: world.y },
              c1Id: c1.id,
              c1Pos: { x: c1.x, y: c1.y },
              c2Id: c2.id,
              c2Pos: { x: c2.x, y: c2.y },
            };
          }
          saveSnapshot();
        } else {
          // Check if clicking a room / floor
          if (layersConfig.floors.visible && !layersConfig.floors.locked) {
            const hitRoom = allRooms.find((r) => isPointInPolygon({ x: world.x, y: world.y }, r.corners));
            if (hitRoom) {
              setSelectedRoomId(hitRoom.id);
              setEditingRoom(hitRoom);
              setSelectedCornerId(null);
              setSelectedWallId(null);
              setSelectedSpotId(null);
              return;
            }
          }
          setSelectedCornerId(null);
          setSelectedWallId(null);
          setSelectedSpotId(null);
          setSelectedRoomId(null);
          setDraggingCornerId(null);
          setDraggingWallId(null);
          dragCornerStartRef.current = null;
          dragWallStartRef.current = null;
        }
      }
    } else if (activeTool === 'split') {
      if (layersConfig.walls.locked) {
        triggerToast('Camada de paredes bloqueada');
        return;
      }
      const nearestWall = getNearestWall(world.x, world.y, Math.max(0.45, 26 / zoom));
      if (nearestWall) {
        const c1 = corners.find((c) => c.id === nearestWall.startId);
        const c2 = corners.find((c) => c.id === nearestWall.endId);
        if (c1 && c2) {
          const dx = c2.x - c1.x;
          const dy = c2.y - c1.y;
          const lenSq = dx * dx + dy * dy;
          if (lenSq > 0) {
            let t = ((world.x - c1.x) * dx + (world.y - c1.y) * dy) / lenSq;
            t = Math.max(0.05, Math.min(0.95, t));
            if (Math.abs(t - 0.5) < 0.08) {
              t = 0.5;
            }
            const splitX = c1.x + t * dx;
            const splitY = c1.y + t * dy;
            handleSplitWall(nearestWall, splitX, splitY);
          }
        }
      }
    } else if (activeTool === 'delete') {
      if (layersConfig.spots.visible) {
        const clickedSpot = spots.find((s) => Math.hypot(s.x - world.x, s.y - world.y) < Math.max(0.35, 20 / zoom));
        if (clickedSpot) {
          saveSnapshot();
          setSpots((prev) => prev.filter((s) => s.id !== clickedSpot.id));
          triggerToast('Spot excluído');
          return;
        }
      }
      if (layersConfig.walls.locked) {
        triggerToast('Camada de paredes bloqueada');
        return;
      }
      saveSnapshot();
      if (nearestCorner) {
        setCorners((prev) => prev.filter((c) => c.id !== nearestCorner.id));
        setWalls((prev) =>
          prev.filter((w) => w.startId !== nearestCorner.id && w.endId !== nearestCorner.id)
        );
      } else {
        const nearestWall = getNearestWall(world.x, world.y, Math.max(0.35, 22 / zoom));
        if (nearestWall) {
          setWalls((prev) => prev.filter((w) => w.id !== nearestWall.id));
        }
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    const world = screenToWorld(sx, sy, canvas);

    // 0. Dragging Camera Spot
    if (draggingSpotId) {
      setSpots((prev) =>
        prev.map((s) =>
          s.id === draggingSpotId ? { ...s, x: Number(world.x.toFixed(2)), y: Number(world.y.toFixed(2)) } : s
        )
      );
      setCurrentMouseWorld(world);
      return;
    }

    // Detect Axis Lock (Shift = Lock X / dy=0, Ctrl = Lock Y / dx=0)
    const lockX = Boolean(e.shiftKey && !e.ctrlKey);
    const lockY = Boolean(e.ctrlKey && !e.shiftKey);
    const curLock = lockX ? 'x' : lockY ? 'y' : 'none';
    if (curLock !== dragAxisLock) {
      setDragAxisLock(curLock);
    }

    // 1. Dragging Whole Wall
    if (draggingWallId && dragWallStartRef.current) {
      const { startWorld, c1Id, c1Pos, c2Id, c2Pos } = dragWallStartRef.current;
      let dx = world.x - startWorld.x;
      let dy = world.y - startWorld.y;

      // Lock to X axis (dy = 0) or Y axis (dx = 0)
      if (lockX) {
        dy = 0;
      }
      if (lockY) {
        dx = 0;
      }

      if (snapCorner || snapGrid) {
        const step = gridStep || 0.1;
        dx = Math.round(dx / step) * step;
        dy = Math.round(dy / step) * step;
      }

      setCorners((prev) =>
        prev.map((c) => {
          if (c.id === c1Id) {
            return { ...c, x: Number((c1Pos.x + dx).toFixed(3)), y: Number((c1Pos.y + dy).toFixed(3)) };
          }
          if (c.id === c2Id) {
            return { ...c, x: Number((c2Pos.x + dx).toFixed(3)), y: Number((c2Pos.y + dy).toFixed(3)) };
          }
          return c;
        })
      );
      setCurrentMouseWorld(world);
      return;
    }

    // 2. Dragging Single Corner
    const nearestCorner = getNearestCorner(sx, sy, canvas, 22, draggingCornerId || undefined);

    if (snapCorner && nearestCorner) {
      setSnappedCornerId(nearestCorner.id);
      setCurrentMouseWorld({ x: nearestCorner.x, y: nearestCorner.y });
    } else {
      setSnappedCornerId(null);
      setCurrentMouseWorld(world);
    }

    if (draggingCornerId) {
      let targetPos = snapCorner && nearestCorner ? { x: nearestCorner.x, y: nearestCorner.y } : world;
      if (dragCornerStartRef.current) {
        if (lockX) {
          targetPos = { x: targetPos.x, y: dragCornerStartRef.current.y };
        } else if (lockY) {
          targetPos = { x: dragCornerStartRef.current.x, y: targetPos.y };
        }
      }
      setCorners((prev) =>
        prev.map((c) =>
          c.id === draggingCornerId ? { ...c, x: targetPos.x, y: targetPos.y } : c
        )
      );
      return;
    }

    // 3. Hover detection for interactive cursor styling
    if ((activeTool === 'select' || activeTool === 'split' || activeTool === 'room') && !isPanning) {
      if (nearestCorner && activeTool !== 'split') {
        setHoveredCornerId(nearestCorner.id);
        setHoveredWallId(null);
      } else {
        const nearestWall = getNearestWall(world.x, world.y, Math.max(0.45, 26 / zoom));
        setHoveredWallId(nearestWall ? nearestWall.id : null);
        setHoveredCornerId(null);
      }
    } else {
      setHoveredCornerId(null);
      setHoveredWallId(null);
    }
  };

  const handleCanvasMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }
    setDragAxisLock('none');
    setDraggingSpotId(null);
    if (draggingWallId) {
      setDraggingWallId(null);
      dragWallStartRef.current = null;
    }
    if (draggingCornerId) {
      dragCornerStartRef.current = null;
      const canvas = canvasRef.current;
      if (canvas && snapCorner) {
        const sourceCorner = corners.find((c) => c.id === draggingCornerId);
        if (sourceCorner) {
          const sc = worldToScreen(sourceCorner.x, sourceCorner.y, canvas);
          const targetCorner = getNearestCorner(sc.x, sc.y, canvas, 24, draggingCornerId);

          if (targetCorner && targetCorner.id !== draggingCornerId) {
            const targetId = targetCorner.id;
            const sourceId = draggingCornerId;

            // 1. Re-link all walls connected to sourceId -> targetId
            // 2. Remove degenerate walls (startId === endId)
            // 3. Deduplicate walls between same pairs
            setWalls((prevWalls) => {
              const relinked = prevWalls
                .map((w) => ({
                  ...w,
                  startId: w.startId === sourceId ? targetId : w.startId,
                  endId: w.endId === sourceId ? targetId : w.endId,
                }))
                .filter((w) => w.startId !== w.endId);

              const seen = new Set<string>();
              return relinked.filter((w) => {
                const key = [w.startId, w.endId].sort().join('---');
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              });
            });

            // 4. Remove source corner from state; destination remains at targetCorner
            setCorners((prevCorners) => prevCorners.filter((c) => c.id !== sourceId));
            setSelectedCornerId(targetId);
            setSnappedCornerId(null);
          }
        }
      }
      setDraggingCornerId(null);
    }
  };

  const handleCanvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    setZoom((prev) => Math.min(150, Math.max(15, prev * zoomFactor)));
  };

  const handleClearAll = () => {
    saveSnapshot();
    setCorners([]);
    setWalls([]);
    setDrawingStartCornerId(null);
    setSelectedCornerId(null);
    setSelectedWallId(null);
  };

  const handleResetToRoomRectangle = () => {
    saveSnapshot();
    const halfW = (currentRoom.width || 5.0) / 2;
    const halfD = (currentRoom.depth || 4.0) / 2;
    setCorners([
      { id: 'c1', x: -halfW, y: -halfD },
      { id: 'c2', x: halfW, y: -halfD },
      { id: 'c3', x: halfW, y: halfD },
      { id: 'c4', x: -halfW, y: halfD },
    ]);
    setWalls([
      { id: 'w1', startId: 'c1', endId: 'c2', thickness: 0.15, height: currentRoom.height || 2.6 },
      { id: 'w2', startId: 'c2', endId: 'c3', thickness: 0.15, height: currentRoom.height || 2.6 },
      { id: 'w3', startId: 'c3', endId: 'c4', thickness: 0.15, height: currentRoom.height || 2.6 },
      { id: 'w4', startId: 'c4', endId: 'c1', thickness: 0.15, height: currentRoom.height || 2.6 },
    ]);
    setBgConfig({
      url: '',
      visible: false,
      opacity: 0.65,
      x: 0,
      y: 0,
      width: 9.5,
      rotation: 0,
      cropLeft: 0,
      cropRight: 0,
      cropTop: 0,
      cropBottom: 0,
      lock: false,
    });
    setBgUrlInput('');
    setDrawingStartCornerId(null);
    setSelectedCornerId(null);
    setSelectedWallId(null);
  };

  const handleApplyPreset = (preset: (typeof PRESETS)[0]) => {
    saveSnapshot();
    setCorners(preset.corners);
    setWalls(preset.walls);
    setDrawingStartCornerId(null);
    setSelectedCornerId(null);
    setSelectedWallId(null);
  };

  const set3DCameraView = (view: 'iso' | 'top' | 'front') => {
    if (!threeCameraRef.current || !threeControlsRef.current) return;
    const cam = threeCameraRef.current;
    const ctrl = threeControlsRef.current;

    if (view === 'iso') {
      cam.position.set(6, 7, 7);
      ctrl.target.set(0, 1, 0);
    } else if (view === 'top') {
      cam.position.set(0, 12, 0.01);
      ctrl.target.set(0, 0, 0);
    } else if (view === 'front') {
      cam.position.set(0, 2, 9);
      ctrl.target.set(0, 1, 0);
    }
    ctrl.update();
  };

  const handleApplyToStudio = () => {
    if (corners.length === 0) return;

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    corners.forEach((c) => {
      minX = Math.min(minX, c.x);
      maxX = Math.max(maxX, c.x);
      minY = Math.min(minY, c.y);
      maxY = Math.max(maxY, c.y);
    });

    const calculatedWidth = Math.max(2.5, Number((maxX - minX).toFixed(2)));
    const calculatedDepth = Math.max(2.5, Number((maxY - minY).toFixed(2)));
    const calculatedArea = (calculatedWidth * calculatedDepth).toFixed(1);

    const cornerMap = new Map<string, PlannerCorner>();
    corners.forEach((c) => cornerMap.set(c.id, c));

    const customWalls = walls
      .map((w) => {
        const c1 = cornerMap.get(w.startId);
        const c2 = cornerMap.get(w.endId);
        if (!c1 || !c2) return null;
        return {
          id: w.id,
          start: { x: c1.x, y: c1.y },
          end: { x: c2.x, y: c2.y },
          thickness: w.thickness || wallThickness,
          height: w.height || wallHeight,
        };
      })
      .filter((w): w is NonNullable<typeof w> => w !== null);

    const customFloors = allRooms.map((r) => ({
      id: r.id,
      points: r.corners.map((c) => ({ x: c.x, y: c.y })),
      area: r.area,
      name: r.name,
      color: r.color,
      material: r.material,
    }));

    const updatedRoom: RoomSettings = {
      ...currentRoom,
      width: calculatedWidth,
      depth: calculatedDepth,
      height: wallHeight,
      customWalls,
      customFloors,
      spots: spots.length > 0 ? spots : undefined,
      backgroundFloorPlan: bgConfig.url ? bgConfig : undefined,
    };

    onApplyToProject(
      updatedRoom,
      `Planta 2D aplicada: ${calculatedWidth}m × ${calculatedDepth}m (${calculatedArea} m² • ${customWalls.length} paredes • ${allRooms.length} ambientes)`
    );
    onClose();
  };

  if (!isOpen) return null;

  const totalArea = allRooms.reduce((acc, r) => acc + r.area, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
      <div
        className={`flex flex-col bg-[#0b1120] border border-white/15 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 w-full ${
          isFullscreen ? 'h-full max-w-full rounded-none' : 'h-[92vh] max-w-7xl'
        }`}
      >
        {/* Modal Header */}
        <header className="flex h-14 items-center justify-between border-b border-white/10 bg-slate-900/90 px-4 sm:px-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/20 text-primary border border-primary/30 shadow-inner">
              <PenTool className="size-4 sm:size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  Editor de Planta Baixa 2D & Gerador 3D
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase tracking-widest">
                  Live CAD
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono hidden sm:block">
                {walls.length} paredes • {corners.length} cantos •{' '}
                {allRooms.length > 0
                  ? `${allRooms.length} ambiente(s) • ${totalArea.toFixed(1)} m²`
                  : 'Desenhe paredes ou use "+ Criar Ambiente"'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Presets Dropdown */}
            <div className="relative group hidden md:block">
              <button className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-all">
                <Sparkles className="size-3.5 text-amber-400" />
                <span>Presets de Plantas</span>
              </button>
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-slate-900 border border-white/15 rounded-xl shadow-2xl p-2 z-50 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all">
                <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                  Modelos Rápidos
                </div>
                {PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleApplyPreset(preset)}
                    className="w-full text-left p-2 rounded-lg hover:bg-white/10 text-xs text-white transition-all flex flex-col gap-0.5"
                  >
                    <span className="font-semibold text-primary">{preset.name}</span>
                    <span className="text-[10px] text-slate-400">{preset.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Desfazer (Ctrl+Z) */}
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className={`p-2 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center ${
                history.length > 0
                  ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white hover:text-primary active:scale-95 shadow-sm'
                  : 'bg-white/2 border-white/5 text-white/20 cursor-not-allowed'
              }`}
              title="Desfazer (Ctrl+Z)"
            >
              <RotateCcw className="size-4" />
            </button>

            {/* Refazer (Ctrl+Y) */}
            <button
              onClick={handleRedo}
              disabled={redoHistory.length === 0}
              className={`p-2 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center ${
                redoHistory.length > 0
                  ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white hover:text-primary active:scale-95 shadow-sm'
                  : 'bg-white/2 border-white/5 text-white/20 cursor-not-allowed'
              }`}
              title="Refazer (Ctrl+Y ou Ctrl+Shift+Z)"
            >
              <RotateCw className="size-4" />
            </button>

            <button
              onClick={handleResetToRoomRectangle}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all flex items-center gap-1.5"
              title="Resetar para planta retangular inicial do ambiente"
            >
              <RotateCcw className="size-3.5 text-amber-400" />
              <span className="hidden sm:inline">Resetar Planta</span>
            </button>

            <button
              onClick={handleClearAll}
              className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition-all"
              title="Limpar todas as paredes (tela em branco)"
            >
              <Trash2 className="size-4" />
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all hidden sm:block"
              title={isFullscreen ? 'Janela normal' : 'Tela cheia'}
            >
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>

            <div className="w-px h-6 bg-white/10 mx-1" />

            <button
              onClick={handleApplyToStudio}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-primary/30 flex items-center gap-2 transition-all active:scale-95"
            >
              <Check className="size-4" />
              <span>Aplicar no Projeto 3D</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-all ml-1"
              title="Fechar"
            >
              <X className="size-5" />
            </button>
          </div>
        </header>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-slate-900/60 px-4 py-2 text-xs">
          {/* Main Drawing Tools */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">
              Ferramenta:
            </span>
            <button
              onClick={() => {
                setActiveTool('wall');
                handleStopDrawingChain();
              }}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold transition-all ${
                activeTool === 'wall'
                  ? 'bg-primary text-white shadow-md shadow-primary/30 border border-primary/40'
                  : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
            >
              <PenTool className="size-3.5" />
              <span>Desenhar Parede</span>
            </button>

            <button
              onClick={() => {
                setActiveTool('select');
                handleStopDrawingChain();
              }}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold transition-all ${
                activeTool === 'select'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
              title="Mover e reposicionar cantos (vértices) ou paredes inteiras"
            >
              <Move className="size-3.5" />
              <span>Mover Canto / Parede</span>
            </button>

            <button
              onClick={() => {
                setActiveTool('split');
                handleStopDrawingChain();
              }}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold transition-all ${
                activeTool === 'split'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-500/30'
                  : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
              title="Inserir um novo vértice (ponto) ao longo de uma parede para dividi-la"
            >
              <PlusCircle className="size-3.5 text-emerald-400" />
              <span>Inserir Ponto</span>
            </button>

            <button
              onClick={() => {
                setActiveTool('spot');
                handleStopDrawingChain();
              }}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold transition-all ${
                activeTool === 'spot'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-500/30'
                  : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
              title="Adicionar Spot de Câmera (Pin) no ambiente para gerar lista de posições e navegar rapidamente em 3D"
            >
              <Camera className="size-3.5 text-cyan-400" />
              <span>+ Spot de Câmera</span>
            </button>

            <button
              onClick={() => {
                setActiveTool('room');
                setManualRoomPoints([]);
                handleStopDrawingChain();
                triggerToast('Modo Ambiente: Clique nos cantos (vértices) para traçar o contorno do cômodo');
              }}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold transition-all ${
                activeTool === 'room'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400 ring-1 ring-indigo-400/40'
                  : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
              title="Selecionar pontos sequencialmente para gerar o polígono e piso de um ambiente"
            >
              <Palette className="size-3.5 text-indigo-300" />
              <span>+ Criar Ambiente</span>
            </button>

            <button
              onClick={() => {
                setActiveTool('delete');
                handleStopDrawingChain();
              }}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold transition-all ${
                activeTool === 'delete'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm'
                  : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
            >
              <Trash2 className="size-3.5" />
              <span>Excluir Elemento</span>
            </button>

            {drawingStartCornerId && (
              <button
                onClick={handleStopDrawingChain}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold animate-pulse"
              >
                Finalizar Cadeia (Esc)
              </button>
            )}
          </div>

          {/* Snapping & Measurements Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-medium transition-all ${
                showGrid
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                  : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
              }`}
              title={showGrid ? 'Ocultar grade visual' : 'Exibir grade visual (0.10m)'}
            >
              <Grid className="size-3.5" />
              <span>{showGrid ? `Grade (${gridStep.toFixed(2)}m)` : 'Grade Oculta'}</span>
            </button>

            <button
              onClick={() => setSnapCorner(!snapCorner)}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-medium transition-all ${
                snapCorner
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
              }`}
              title="Imã de canto (fechar salas automaticamente)"
            >
              <Magnet className="size-3.5" />
              <span>Imã de Vértice</span>
            </button>

            {/* Background Floor Plan Image Button */}
            <button
              onClick={() => setShowBgImagePanel(!showBgImagePanel)}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-medium transition-all ${
                showBgImagePanel || bgConfig.url
                  ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/40 shadow-sm'
                  : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
              }`}
              title="Planta Baixa de Fundo (imagem de referência para decalque)"
            >
              <ImageIcon className="size-3.5" />
              <span>Planta de Fundo</span>
              {bgConfig.url && (
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>

            {/* Escalar / Redimensionar Planta Inteira */}
            <button
              onClick={() => {
                const bounds = getGeometryBounds();
                setScaleTargetWidth(bounds.width > 0 ? bounds.width.toFixed(2) : '7.00');
                setScaleTargetDepth(bounds.depth > 0 ? bounds.depth.toFixed(2) : '6.00');
                setScaleFactorInput('1.00');
                setShowScaleModal(true);
              }}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-medium transition-all ${
                showScaleModal
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'bg-white/5 text-slate-300 hover:text-white border border-white/5 hover:bg-white/10'
              }`}
              title="Escalar / Redimensionar toda a planta 2D e 3D proporcionalmente"
            >
              <Scale className="size-3.5 text-amber-400" />
              <span>Escalar Planta</span>
            </button>

            <button
              onClick={() => setShowMeasurements(!showMeasurements)}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-medium transition-all ${
                showMeasurements
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
              }`}
              title="Exibir cotas e medidas em metros"
            >
              <Eye className="size-3.5" />
              <span>Cotas</span>
            </button>

            <div className="w-px h-4 bg-white/10 mx-1 hidden lg:block" />

            {/* Wall Height */}
            <div className="hidden xl:flex items-center gap-2 text-slate-400">
              <span>Altura:</span>
              <select
                value={wallHeight}
                onChange={(e) => setWallHeight(Number(e.target.value))}
                className="bg-slate-800 border border-white/10 rounded px-1.5 py-0.5 text-white text-xs outline-none"
              >
                <option value={2.4}>2.40m</option>
                <option value={2.6}>2.60m (Padrão)</option>
                <option value={2.8}>2.80m</option>
                <option value={3.0}>3.00m (Pé-direito alto)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Workspace Body: Split View 2D (Left) + 3D (Right) */}
        <div className="flex flex-1 min-h-0 relative overflow-hidden">
          {/* 2D Floor Plan Canvas Area */}
          <div
            ref={container2DRef}
            className={`relative h-full bg-[#0f172a] border-r border-white/10 overflow-hidden transition-all duration-300 ${
              is3DExpanded ? 'hidden' : is2DExpanded ? 'w-full flex-1' : 'flex-1 min-w-[320px]'
            }`}
          >
            <canvas
              ref={canvasRef}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onWheel={handleCanvasWheel}
              onContextMenu={(e) => {
                e.preventDefault();
                handleStopDrawingChain();
              }}
              style={{
                cursor: isPanning
                  ? 'grabbing'
                  : activeTool === 'wall' || activeTool === 'split' || activeTool === 'room'
                  ? 'crosshair'
                  : activeTool === 'spot'
                  ? 'crosshair'
                  : activeTool === 'delete'
                  ? 'pointer'
                  : activeTool === 'select'
                  ? draggingCornerId || draggingWallId
                    ? 'grabbing'
                    : hoveredCornerId
                    ? 'move'
                    : hoveredWallId
                    ? 'grab'
                    : 'default'
                  : 'default',
              }}
              className="w-full h-full block touch-none select-none"
            />

            {/* Room Selection Floating HUD */}
            {activeTool === 'room' && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-slate-900/90 border border-indigo-500/40 rounded-full px-4 py-1.5 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95">
                <div className="size-2 rounded-full bg-indigo-400 animate-ping" />
                <span className="text-xs font-semibold text-slate-200">
                  {manualRoomPoints.length === 0
                    ? 'Clique nos cantos ou paredes para marcar os pontos do ambiente'
                    : `${manualRoomPoints.length} ponto(s) marcado(s)`}
                </span>
                {manualRoomPoints.length >= 3 && (
                  <button
                    onClick={handleFinishManualRoom}
                    className="ml-2 px-3 py-0.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold shadow-md transition-all animate-pulse"
                  >
                    Concluir Ambiente (Enter)
                  </button>
                )}
                {manualRoomPoints.length > 0 && (
                  <button
                    onClick={() => {
                      setManualRoomPoints([]);
                      triggerToast('Pontos limpos');
                    }}
                    className="px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 text-[11px] font-medium"
                  >
                    Limpar (Esc)
                  </button>
                )}
              </div>
            )}

            {/* 2D Overlay Floating Controls */}
            <div className="absolute bottom-4 left-4 z-10 flex items-center gap-1.5 bg-slate-900/80 border border-white/10 p-1 rounded-xl backdrop-blur-md shadow-lg">
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`p-1.5 rounded-lg border transition-all ${
                  showGrid
                    ? 'bg-blue-500/25 text-blue-300 border-blue-500/40'
                    : 'bg-white/5 text-slate-400 hover:text-white border-white/5'
                }`}
                title={showGrid ? 'Ocultar Grade Visual' : 'Exibir Grade Visual'}
              >
                <Grid className="size-4" />
              </button>
              <div className="w-px h-3.5 bg-white/10" />
              <button
                onClick={() => setZoom((z) => Math.min(150, z * 1.2))}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white"
                title="Aproximar Zoom"
              >
                <ZoomIn className="size-4" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.max(15, z * 0.8))}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white"
                title="Afastar Zoom"
              >
                <ZoomOut className="size-4" />
              </button>
              <button
                onClick={() => {
                  setPan({ x: 0, y: 0 });
                  setZoom(55);
                }}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white text-[11px] font-bold"
                title="Centralizar Visualização"
              >
                Reset
              </button>
              <span className="text-[10px] font-mono text-slate-400 px-1">
                {Math.round(zoom)}px/m
              </span>
            </div>

            {/* History Action Toast Badge (Ctrl+Z / Ctrl+Y Feedback) */}
            {historyToast && (
              <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 pointer-events-none bg-slate-900/95 border border-primary/50 text-white px-4 py-2 rounded-xl shadow-2xl backdrop-blur-md text-xs font-semibold flex items-center gap-2 animate-in fade-in zoom-in-95 duration-150">
                <Sparkles className="size-4 text-primary animate-pulse" />
                <span>{historyToast}</span>
              </div>
            )}

            {/* Top-Left Floating Controls: Instruction Badge & Selected Vertex / Wall Coordinate Inspector */}
            <div className="absolute top-3 left-3 z-20 flex flex-col gap-2 items-start pointer-events-none">
              {/* Instruction / Calibration Badge */}
              <div className="bg-slate-900/85 border border-white/10 px-3 py-1.5 rounded-xl backdrop-blur-md shadow-md w-fit pointer-events-none">
                <p className="text-[11px] font-semibold text-slate-200 flex items-center gap-1.5">
                  <span className={`size-2 rounded-full ${isCalibratingScale ? 'bg-cyan-400 animate-ping' : 'bg-primary animate-ping'}`} />
                  {isCalibratingScale
                    ? calibrationPtA
                      ? '📍 Clique no segundo ponto da parede para definir a medida real'
                      : '📍 Clique no primeiro ponto de uma parede com medida conhecida'
                    : activeTool === 'wall'
                    ? drawingStartCornerId
                      ? 'Clique no ponto final ou em outro canto para fechar a parede (Esc para parar)'
                      : 'Clique no grid para iniciar uma nova parede'
                    : activeTool === 'split'
                    ? 'Clique em qualquer parede para inserir um novo ponto e dividi-la em 2 segmentos'
                    : activeTool === 'spot'
                    ? 'Clique em qualquer ambiente para posicionar um Spot de Câmera 3D'
                    : activeTool === 'room'
                    ? manualRoomPoints.length >= 3
                      ? 'Clique no ponto 1 ou pressione Enter para fechar o ambiente'
                      : 'Clique nos vértices da parede para delimitar o contorno do cômodo'
                    : activeTool === 'select'
                    ? selectedCornerId
                      ? 'Vértice selecionado: ajuste as posições X e Y ou arraste (Shift = Travar X | Ctrl = Travar Y)'
                      : selectedWallId
                      ? 'Parede selecionada: arraste no 2D para mover (Shift = Travar X | Ctrl = Travar Y)'
                      : 'Clique e arraste qualquer canto ou parede (Shift = Travar X | Ctrl = Travar Y)'
                    : 'Clique em uma parede ou vértice para excluir'}
                </p>
              </div>

              {/* Photoshop-style Layers Panel (Controle de Camadas) */}
              <div className="pointer-events-auto w-64 bg-slate-900/95 border border-white/15 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden text-xs flex flex-col transition-all">
                {/* Header with Layers icon & minimize toggle */}
                <div
                  className="px-3 py-2 bg-slate-800/80 border-b border-white/10 flex items-center justify-between cursor-pointer select-none"
                  onClick={() => setIsLayersCollapsed(!isLayersCollapsed)}
                >
                  <div className="flex items-center gap-2">
                    <Layers className="size-4 text-primary" />
                    <span className="font-bold text-white text-[11px] tracking-wide uppercase">
                      Camadas (Layers)
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {isLayersCollapsed ? 'Expandir' : 'Recolher'}
                    </span>
                    {isLayersCollapsed ? (
                      <ChevronDown className="size-3.5 text-slate-400" />
                    ) : (
                      <ChevronUp className="size-3.5 text-slate-400" />
                    )}
                  </div>
                </div>

                {!isLayersCollapsed && (
                  <div className="p-1.5 flex flex-col gap-1 max-h-[50vh] overflow-y-auto">
                    {/* Layer 1: Spots de Câmera (Hotspots / Pins) */}
                    <div className="rounded-xl bg-white/5 border border-white/5 hover:border-cyan-500/30 transition-all p-1.5 flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {/* Visibility Eye */}
                          <button
                            onClick={() =>
                              setLayersConfig((prev) => ({
                                ...prev,
                                spots: { ...prev.spots, visible: !prev.spots.visible },
                              }))
                            }
                            className={`p-1 rounded-md transition-colors ${
                              layersConfig.spots.visible
                                ? 'text-cyan-400 hover:text-cyan-300'
                                : 'text-slate-600 hover:text-slate-500'
                            }`}
                            title={layersConfig.spots.visible ? 'Ocultar Spots de Câmera' : 'Exibir Spots de Câmera'}
                          >
                            {layersConfig.spots.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                          </button>

                          {/* Lock */}
                          <button
                            onClick={() =>
                              setLayersConfig((prev) => ({
                                ...prev,
                                spots: { ...prev.spots, locked: !prev.spots.locked },
                              }))
                            }
                            className={`p-1 rounded-md transition-colors ${
                              layersConfig.spots.locked
                                ? 'text-amber-400 hover:text-amber-300'
                                : 'text-slate-600 hover:text-slate-400'
                            }`}
                            title={layersConfig.spots.locked ? 'Desbloquear Spots' : 'Bloquear Spots'}
                          >
                            {layersConfig.spots.locked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
                          </button>

                          <div className="flex items-center gap-1.5">
                            <Camera className="size-3.5 text-cyan-400" />
                            <span className="font-semibold text-slate-200 text-[11px]">Spots de Câmera</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            {spots.length}
                          </span>
                          <button
                            onClick={() =>
                              setExpandedLayerSection((prev) => (prev === 'spots' ? 'none' : 'spots'))
                            }
                            className="p-1 rounded hover:bg-white/10 text-slate-400"
                            title="Ver lista de spots"
                          >
                            <ChevronDown
                              className={`size-3 transition-transform ${
                                expandedLayerSection === 'spots' ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Sub-list: Spots List with Teleport Button */}
                      {expandedLayerSection === 'spots' && (
                        <div className="mt-1 pt-1 border-t border-white/10 flex flex-col gap-1 pl-1">
                          {spots.length === 0 ? (
                            <p className="text-[10px] text-slate-500 italic py-1 px-2">
                              Nenhum spot criado. Use a ferramenta &quot;+ Spot de Câmera&quot; e clique no ambiente.
                            </p>
                          ) : (
                            spots.map((spot) => (
                              <div
                                key={spot.id}
                                className={`flex items-center justify-between px-2 py-1 rounded-lg text-[10px] transition-all ${
                                  selectedSpotId === spot.id
                                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40'
                                    : 'bg-black/20 hover:bg-white/10 text-slate-300'
                                }`}
                              >
                                <span
                                  className="truncate flex-1 cursor-pointer font-medium"
                                  onClick={() => {
                                    setSelectedSpotId(spot.id);
                                    handleFlyToSpot(spot);
                                  }}
                                  title={`Posicionar câmera em ${spot.name}`}
                                >
                                  📷 {spot.name}
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleFlyToSpot(spot)}
                                    className="p-1 rounded hover:bg-cyan-500/30 text-cyan-400 transition-colors"
                                    title="Navegar Câmera 3D para este Ponto"
                                  >
                                    <Navigation className="size-3" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSpotModal({
                                        isOpen: true,
                                        x: spot.x,
                                        y: spot.y,
                                        name: spot.name,
                                        height: spot.height || 1.6,
                                        editId: spot.id,
                                      });
                                    }}
                                    className="p-1 rounded hover:bg-white/20 text-slate-400 hover:text-white transition-colors"
                                    title="Editar Nome do Spot"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    onClick={() => {
                                      saveSnapshot();
                                      setSpots((prev) => prev.filter((s) => s.id !== spot.id));
                                    }}
                                    className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                                    title="Excluir Spot"
                                  >
                                    <Trash2 className="size-3" />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                          <button
                            onClick={() => {
                              setActiveTool('spot');
                              handleStopDrawingChain();
                            }}
                            className="mt-1 w-full py-1 px-2 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-bold text-[10px] flex items-center justify-center gap-1"
                          >
                            <Camera className="size-3" />
                            <span>+ Adicionar Spot no Canvas</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Layer 2: Pisos & Ambientes (Floors / Rooms) */}
                    <div className="rounded-xl bg-white/5 border border-white/5 hover:border-blue-500/30 transition-all p-1.5 flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {/* Visibility Eye */}
                          <button
                            onClick={() =>
                              setLayersConfig((prev) => ({
                                ...prev,
                                floors: { ...prev.floors, visible: !prev.floors.visible },
                              }))
                            }
                            className={`p-1 rounded-md transition-colors ${
                              layersConfig.floors.visible
                                ? 'text-blue-400 hover:text-blue-300'
                                : 'text-slate-600 hover:text-slate-500'
                            }`}
                            title={layersConfig.floors.visible ? 'Ocultar Pisos e Ambientes' : 'Exibir Pisos e Ambientes'}
                          >
                            {layersConfig.floors.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                          </button>

                          {/* Lock */}
                          <button
                            onClick={() =>
                              setLayersConfig((prev) => ({
                                ...prev,
                                floors: { ...prev.floors, locked: !prev.floors.locked },
                              }))
                            }
                            className={`p-1 rounded-md transition-colors ${
                              layersConfig.floors.locked
                                ? 'text-amber-400 hover:text-amber-300'
                                : 'text-slate-600 hover:text-slate-400'
                            }`}
                            title={layersConfig.floors.locked ? 'Desbloquear Pisos' : 'Bloquear Pisos'}
                          >
                            {layersConfig.floors.locked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
                          </button>

                          <div className="flex items-center gap-1.5">
                            <Palette className="size-3.5 text-blue-400" />
                            <span className="font-semibold text-slate-200 text-[11px]">Pisos & Ambientes</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            {allRooms.length}
                          </span>
                          <button
                            onClick={() =>
                              setExpandedLayerSection((prev) => (prev === 'floors' ? 'none' : 'floors'))
                            }
                            className="p-1 rounded hover:bg-white/10 text-slate-400"
                            title="Ver lista de ambientes"
                          >
                            <ChevronDown
                              className={`size-3 transition-transform ${
                                expandedLayerSection === 'floors' ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Sub-list: Detected & Manual Rooms List with customizer trigger */}
                      {expandedLayerSection === 'floors' && (
                        <div className="mt-1 pt-1 border-t border-white/10 flex flex-col gap-1 pl-1">
                          <button
                            onClick={() => {
                              setActiveTool('room');
                              setManualRoomPoints([]);
                              handleStopDrawingChain();
                              triggerToast('Clique nos vértices para criar o ambiente');
                            }}
                            className="w-full mb-1 py-1 px-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all"
                          >
                            <PlusCircle className="size-3" />
                            <span>+ Selecionar Pontos para Ambiente</span>
                          </button>

                          {allRooms.length === 0 ? (
                            <p className="text-[10px] text-slate-500 italic py-1 px-2">
                              Desenhe paredes fechadas ou clique acima para marcar os pontos do ambiente.
                            </p>
                          ) : (
                            allRooms.map((room, idx) => (
                              <div
                                key={room.id}
                                onClick={() => {
                                  setSelectedRoomId(room.id);
                                  setEditingRoom(room);
                                }}
                                className={`flex items-center justify-between px-2 py-1 rounded-lg text-[10px] cursor-pointer transition-all ${
                                  selectedRoomId === room.id
                                    ? 'bg-blue-500/20 text-blue-200 border border-blue-500/40'
                                    : 'bg-black/20 hover:bg-white/10 text-slate-300'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  <div
                                    className="size-2.5 rounded-full shrink-0 border border-white/30"
                                    style={{ backgroundColor: room.color || '#3b82f6' }}
                                  />
                                  <span className="font-medium truncate">
                                    {room.name || (room.isManual ? `Ambiente Manual ${idx + 1}` : `Piso ${idx + 1}`)}
                                  </span>
                                  {room.isManual && (
                                    <span className="px-1 py-0.2 rounded text-[8px] bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 font-semibold">
                                      Manual
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] font-mono text-slate-400">
                                    {room.area}m²
                                  </span>
                                  <span className="text-slate-400 hover:text-white" title="Personalizar ambiente">✏️</span>
                                  {room.isManual && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        saveSnapshot();
                                        setManualFloors((prev) => prev.filter((f) => f.id !== room.id));
                                        if (selectedRoomId === room.id) setSelectedRoomId(null);
                                        triggerToast('Ambiente manual removido');
                                      }}
                                      className="text-slate-500 hover:text-red-400 p-0.5 ml-0.5"
                                      title="Excluir ambiente"
                                    >
                                      <Trash2 className="size-2.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {/* Layer 3: Paredes (Walls) */}
                    <div className="rounded-xl bg-white/5 border border-white/5 hover:border-amber-500/30 transition-all p-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {/* Visibility Eye */}
                        <button
                          onClick={() =>
                            setLayersConfig((prev) => ({
                              ...prev,
                              walls: { ...prev.walls, visible: !prev.walls.visible },
                            }))
                          }
                          className={`p-1 rounded-md transition-colors ${
                            layersConfig.walls.visible
                              ? 'text-amber-400 hover:text-amber-300'
                              : 'text-slate-600 hover:text-slate-500'
                          }`}
                          title={layersConfig.walls.visible ? 'Ocultar Paredes' : 'Exibir Paredes'}
                        >
                          {layersConfig.walls.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                        </button>

                        {/* Lock */}
                        <button
                          onClick={() =>
                            setLayersConfig((prev) => ({
                              ...prev,
                              walls: { ...prev.walls, locked: !prev.walls.locked },
                            }))
                          }
                          className={`p-1 rounded-md transition-colors ${
                            layersConfig.walls.locked
                              ? 'text-amber-400 hover:text-amber-300'
                              : 'text-slate-600 hover:text-slate-400'
                          }`}
                          title={layersConfig.walls.locked ? 'Desbloquear Paredes' : 'Bloquear Paredes'}
                        >
                          {layersConfig.walls.locked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
                        </button>

                        <div className="flex items-center gap-1.5">
                          <PenTool className="size-3.5 text-amber-400" />
                          <span className="font-semibold text-slate-200 text-[11px]">Paredes 2D/3D</span>
                        </div>
                      </div>

                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {walls.length}
                      </span>
                    </div>

                    {/* Layer 4: Planta de Fundo (Background Image) */}
                    <div className="rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/30 transition-all p-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {/* Visibility Eye */}
                        <button
                          onClick={() => {
                            const newVis = !layersConfig.background.visible;
                            setLayersConfig((prev) => ({
                              ...prev,
                              background: { ...prev.background, visible: newVis },
                            }));
                            setBgConfig((prev) => ({ ...prev, visible: newVis }));
                          }}
                          className={`p-1 rounded-md transition-colors ${
                            layersConfig.background.visible && bgConfig.visible
                              ? 'text-indigo-400 hover:text-indigo-300'
                              : 'text-slate-600 hover:text-slate-500'
                          }`}
                          title="Alternar visibilidade da imagem de fundo"
                        >
                          {layersConfig.background.visible && bgConfig.visible ? (
                            <Eye className="size-3.5" />
                          ) : (
                            <EyeOff className="size-3.5" />
                          )}
                        </button>

                        {/* Lock */}
                        <button
                          onClick={() => {
                            const newLock = !layersConfig.background.locked;
                            setLayersConfig((prev) => ({
                              ...prev,
                              background: { ...prev.background, locked: newLock },
                            }));
                            setBgConfig((prev) => ({ ...prev, lock: newLock }));
                          }}
                          className={`p-1 rounded-md transition-colors ${
                            layersConfig.background.locked || bgConfig.lock
                              ? 'text-amber-400 hover:text-amber-300'
                              : 'text-slate-600 hover:text-slate-400'
                          }`}
                          title="Travar imagem de fundo"
                        >
                          {layersConfig.background.locked || bgConfig.lock ? (
                            <Lock className="size-3.5" />
                          ) : (
                            <Unlock className="size-3.5" />
                          )}
                        </button>

                        <div className="flex items-center gap-1.5">
                          <ImageIcon className="size-3.5 text-indigo-400" />
                          <span className="font-semibold text-slate-200 text-[11px]">Planta de Fundo</span>
                        </div>
                      </div>

                      <button
                        onClick={() => setShowBgImagePanel(!showBgImagePanel)}
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30"
                      >
                        Ajustar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Selected Wall Floating Inspector */}
              {selectedWall && !selectedCorner && (
                <div className="pointer-events-auto flex items-center gap-3 bg-slate-900/95 border border-amber-500/40 px-3 py-1.5 rounded-xl backdrop-blur-md shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400">
                    <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
                    <span>Parede:</span>
                  </div>
                  <div className="text-[11px] font-mono text-white">
                    Comprimento: <strong className="text-amber-300">{selectedWallLength.toFixed(2)}m</strong>
                  </div>
                  <span className="text-[10px] text-amber-200/80 font-medium hidden sm:inline">
                    (Shift = Trava Eixo X • Ctrl = Trava Eixo Y)
                  </span>

                  {/* Button to split selected wall at midpoint */}
                  <button
                    onClick={() => handleSplitWall(selectedWall)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold transition-all shadow-sm active:scale-95 ml-1"
                    title="Inserir um novo ponto exatamente no meio desta parede (dividir ao meio)"
                  >
                    <PlusCircle className="size-3.5 text-emerald-400" />
                    <span>Dividir no Meio</span>
                  </button>

                  <button
                    onClick={() => setSelectedWallId(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors ml-1"
                    title="Desmarcar parede"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              )}

              {/* Selected Vertex (Corner) Coordinate X / Y Live Edit Box */}
              {selectedCorner && (
                <div className="pointer-events-auto flex items-center gap-2 bg-slate-900/95 border border-amber-500/40 px-3 py-1.5 rounded-xl backdrop-blur-md shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400">
                    <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
                    <span>Ponto:</span>
                  </div>

                  {/* Input X */}
                  <div className="flex items-center gap-1 bg-black/50 border border-white/15 px-2 py-1 rounded-lg hover:border-amber-500/50 focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400/40 transition-all">
                    <label htmlFor="vertex-pos-x" className="text-[11px] font-bold text-amber-400 cursor-pointer">
                      X:
                    </label>
                    <input
                      id="vertex-pos-x"
                      type="number"
                      step={gridStep || 0.05}
                      value={coordInputX !== null ? coordInputX : selectedCorner.x.toFixed(2)}
                      onFocus={() => {
                        saveSnapshot();
                        setCoordInputX(String(selectedCorner.x));
                      }}
                      onChange={(e) => {
                        const valStr = e.target.value;
                        setCoordInputX(valStr);
                        const num = parseFloat(valStr);
                        if (!isNaN(num)) {
                          setCorners((prev) =>
                            prev.map((c) =>
                              c.id === selectedCorner.id ? { ...c, x: Number(num.toFixed(3)) } : c
                            )
                          );
                        }
                      }}
                      onBlur={() => {
                        setCoordInputX(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      className="w-16 bg-transparent text-white font-mono text-[11px] font-bold outline-none text-right"
                      title="Posição X do vértice em metros"
                    />
                    <span className="text-[10px] text-slate-400 font-mono">m</span>
                  </div>

                  {/* Input Y */}
                  <div className="flex items-center gap-1 bg-black/50 border border-white/15 px-2 py-1 rounded-lg hover:border-amber-500/50 focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400/40 transition-all">
                    <label htmlFor="vertex-pos-y" className="text-[11px] font-bold text-emerald-400 cursor-pointer">
                      Y:
                    </label>
                    <input
                      id="vertex-pos-y"
                      type="number"
                      step={gridStep || 0.05}
                      value={coordInputY !== null ? coordInputY : selectedCorner.y.toFixed(2)}
                      onFocus={() => {
                        saveSnapshot();
                        setCoordInputY(String(selectedCorner.y));
                      }}
                      onChange={(e) => {
                        const valStr = e.target.value;
                        setCoordInputY(valStr);
                        const num = parseFloat(valStr);
                        if (!isNaN(num)) {
                          setCorners((prev) =>
                            prev.map((c) =>
                              c.id === selectedCorner.id ? { ...c, y: Number(num.toFixed(3)) } : c
                            )
                          );
                        }
                      }}
                      onBlur={() => {
                        setCoordInputY(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      className="w-16 bg-transparent text-white font-mono text-[11px] font-bold outline-none text-right"
                      title="Posição Y do vértice em metros"
                    />
                    <span className="text-[10px] text-slate-400 font-mono">m</span>
                  </div>

                  {/* Quick Deselect / Close Button */}
                  <button
                    onClick={() => {
                      setSelectedCornerId(null);
                      setCoordInputX(null);
                      setCoordInputY(null);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors ml-0.5"
                    title="Desmarcar vértice"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* 2D Top-Right Floating Controls (Expand / Split Toggle) */}
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 pointer-events-auto">
              <div className="flex items-center gap-1 bg-slate-900/85 border border-white/10 p-1 rounded-xl backdrop-blur-md shadow-md">
                <button
                  onClick={() => {
                    setIs2DExpanded((prev) => {
                      if (!prev) setIs3DExpanded(false);
                      return !prev;
                    });
                  }}
                  className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                  title={is2DExpanded ? 'Dividir tela com 3D' : 'Expandir Planta 2D (Tela Cheia)'}
                >
                  {is2DExpanded ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
                </button>
              </div>
            </div>

            {/* Floating Background Floor Plan Image Inspector Panel */}
            {showBgImagePanel && (
              <div className="absolute top-12 right-3 z-30 w-80 max-h-[calc(100%-60px)] bg-slate-900/95 border border-white/15 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden text-xs">
                {/* Panel Header */}
                <div className="p-3 border-b border-white/10 flex items-center justify-between bg-slate-800/50">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="size-4 text-indigo-400" />
                    <span className="font-bold text-white text-xs">Planta de Fundo</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {bgConfig.url && (
                      <button
                        onClick={() => setBgConfig((prev) => ({ ...prev, visible: !prev.visible }))}
                        className={`p-1.5 rounded-lg border transition-all ${
                          bgConfig.visible
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-white/5 text-slate-400 border-white/5'
                        }`}
                        title={bgConfig.visible ? 'Ocultar imagem' : 'Exibir imagem'}
                      >
                        {bgConfig.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                      </button>
                    )}
                    <button
                      onClick={() => setShowBgImagePanel(false)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>

                {/* Panel Content (Scrollable) */}
                <div className="p-3 overflow-y-auto space-y-3.5 text-slate-300">
                  {/* Image Source */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <LinkIcon className="size-3" /> URL da Imagem da Planta
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={bgUrlInput}
                        onChange={(e) => setBgUrlInput(e.target.value)}
                        placeholder="https://exemplo.com/planta.jpg"
                        className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-600 outline-none focus:border-indigo-500 font-mono"
                      />
                      <button
                        onClick={() => handleLoadBgUrl()}
                        className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all"
                      >
                        Carregar
                      </button>
                    </div>

                    {/* Saved Presets & Upload Controls */}
                    <div className="space-y-1.5 pt-0.5">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>Presets de Referência</span>
                        {bgConfig.url && (
                          <button
                            onClick={handleSaveCurrentBgAsPreset}
                            className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 normal-case text-[10px] hover:underline"
                            title="Salvar escala, offset, rotação e crop atuais como um novo preset"
                          >
                            <Sparkles className="size-3 text-amber-400" /> Salvar Preset Atual
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {savedBgPresets.map((preset) => (
                          <div
                            key={preset.id}
                            className="group flex items-center rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-200 text-[10px] transition-all overflow-hidden"
                          >
                            <button
                              onClick={() => handleApplyBgPreset(preset)}
                              className="py-1 px-2 font-medium text-left truncate max-w-[155px]"
                              title={`Carregar ${preset.name} (${preset.config.width.toFixed(2)}m • Offset: ${preset.config.x.toFixed(2)}m, ${preset.config.y.toFixed(2)}m)`}
                            >
                              💡 {preset.name}
                            </button>
                            {preset.id !== 'mrv-andorinhas' && (
                              <button
                                onClick={(e) => handleDeleteBgPreset(preset.id, e)}
                                className="p-1 text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity pr-1.5"
                                title="Excluir preset salvo"
                              >
                                <X className="size-3" />
                              </button>
                            )}
                          </div>
                        ))}

                        <label className="text-[10px] py-1 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-medium cursor-pointer transition-all flex items-center gap-1 ml-auto">
                          <Upload className="size-3" /> Arquivo
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {isBgLoading && (
                      <p className="text-[11px] text-indigo-400 animate-pulse flex items-center gap-1">
                        Carregando imagem...
                      </p>
                    )}
                    {bgLoadError && (
                      <p className="text-[10px] text-rose-400 flex items-center gap-1">
                        <AlertCircle className="size-3 flex-shrink-0" /> {bgLoadError}
                      </p>
                    )}
                  </div>

                  {bgConfig.url && (
                    <>
                      {/* Scale & Calibration with Double-Click Inline Editing */}
                      <div className="space-y-1.5 pt-1 border-t border-white/10">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <SlidersHorizontal className="size-3" /> Escala (Largura Real)
                          </label>
                          <div className="text-indigo-400 font-bold text-xs flex items-center gap-1">
                            <InlineEditableNumber
                              value={bgConfig.width}
                              suffix=" m"
                              min={0.5}
                              max={100}
                              step={0.05}
                              decimals={2}
                              className="text-indigo-400 font-bold"
                              onChange={(width) => setBgConfig((prev) => ({ ...prev, width }))}
                            />
                          </div>
                        </div>
                        <input
                          type="range"
                          min={2}
                          max={35}
                          step={0.05}
                          value={bgConfig.width}
                          onChange={(e) =>
                            setBgConfig((prev) => ({ ...prev, width: parseFloat(e.target.value) }))
                          }
                          className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                        />
                        <button
                          onClick={() => {
                            setIsCalibratingScale(true);
                            setCalibrationPtA(null);
                          }}
                          className={`w-full py-1.5 px-2 rounded-lg border font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all ${
                            isCalibratingScale
                              ? 'bg-cyan-500 text-slate-950 border-cyan-400 animate-pulse'
                              : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/25'
                          }`}
                        >
                          <Ruler className="size-3.5" />
                          <span>
                            {isCalibratingScale
                              ? 'Modo Calibração Ativo (Clique na tela)'
                              : 'Calibrar Escala com 2 Pontos (Régua)'}
                          </span>
                        </button>
                      </div>

                      {/* Opacity Slider with Double-Click Inline Editing */}
                      <div className="space-y-1.5 pt-1 border-t border-white/10">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Opacidade / Transparência
                          </label>
                          <div className="text-slate-300 text-xs">
                            <InlineEditableNumber
                              value={bgConfig.opacity}
                              suffix="%"
                              min={0.05}
                              max={1.0}
                              multiplier={100}
                              step={1}
                              decimals={0}
                              className="text-slate-300 font-bold"
                              onChange={(opacity) => setBgConfig((prev) => ({ ...prev, opacity }))}
                            />
                          </div>
                        </div>
                        <input
                          type="range"
                          min={0.05}
                          max={1.0}
                          step={0.02}
                          value={bgConfig.opacity}
                          onChange={(e) =>
                            setBgConfig((prev) => ({ ...prev, opacity: parseFloat(e.target.value) }))
                          }
                          className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                        />
                      </div>

                      {/* Position & Rotation with Double-Click Inline Editing */}
                      <div className="space-y-2 pt-1 border-t border-white/10">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Posição & Rotação
                          </label>
                          <button
                            onClick={() =>
                              setBgConfig((prev) => ({ ...prev, x: 0, y: 0, rotation: 0 }))
                            }
                            className="text-[10px] text-slate-400 hover:text-white underline"
                          >
                            Reset Posição
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                              <span>Pos X:</span>
                              <InlineEditableNumber
                                value={bgConfig.x}
                                suffix="m"
                                min={-50}
                                max={50}
                                step={0.05}
                                decimals={2}
                                className="text-indigo-300 font-bold"
                                onChange={(x) => setBgConfig((prev) => ({ ...prev, x }))}
                              />
                            </div>
                            <input
                              type="range"
                              min={-15}
                              max={15}
                              step={0.05}
                              value={bgConfig.x}
                              onChange={(e) =>
                                setBgConfig((prev) => ({ ...prev, x: parseFloat(e.target.value) }))
                              }
                              className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                              <span>Pos Y:</span>
                              <InlineEditableNumber
                                value={bgConfig.y}
                                suffix="m"
                                min={-50}
                                max={50}
                                step={0.05}
                                decimals={2}
                                className="text-indigo-300 font-bold"
                                onChange={(y) => setBgConfig((prev) => ({ ...prev, y }))}
                              />
                            </div>
                            <input
                              type="range"
                              min={-15}
                              max={15}
                              step={0.05}
                              value={bgConfig.y}
                              onChange={(e) =>
                                setBgConfig((prev) => ({ ...prev, y: parseFloat(e.target.value) }))
                              }
                              className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                            />
                          </div>
                        </div>

                        {/* Rotation Buttons */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400 mr-1 flex items-center gap-1">
                            <RotateCw className="size-3" /> Giro:
                          </span>
                          {[0, 90, 180, 270].map((deg) => (
                            <button
                              key={deg}
                              onClick={() => setBgConfig((prev) => ({ ...prev, rotation: deg }))}
                              className={`flex-1 py-1 rounded text-[10px] font-bold border transition-all ${
                                bgConfig.rotation === deg
                                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                                  : 'bg-white/5 text-slate-300 hover:bg-white/10 border-white/5'
                              }`}
                            >
                              {deg}°
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Crop / Recorte de Margens with Double-Click Inline Editing */}
                      <div className="space-y-1.5 pt-1 border-t border-white/10">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Crop className="size-3" /> Recorte de Margens (Crop)
                          </label>
                          {(bgConfig.cropLeft > 0 ||
                            bgConfig.cropRight > 0 ||
                            bgConfig.cropTop > 0 ||
                            bgConfig.cropBottom > 0) && (
                            <button
                              onClick={handleResetCrop}
                              className="text-[10px] text-rose-400 hover:underline"
                            >
                              Reset Crop
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
                          <div>
                            <div className="flex items-center justify-between text-slate-400 mb-0.5">
                              <span>Topo:</span>
                              <InlineEditableNumber
                                value={bgConfig.cropTop}
                                suffix="%"
                                min={0}
                                max={48}
                                step={1}
                                decimals={0}
                                className="text-indigo-300 font-bold"
                                onChange={(cropTop) => setBgConfig((prev) => ({ ...prev, cropTop }))}
                              />
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={45}
                              value={bgConfig.cropTop}
                              onChange={(e) =>
                                setBgConfig((prev) => ({ ...prev, cropTop: parseInt(e.target.value) }))
                              }
                              className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between text-slate-400 mb-0.5">
                              <span>Base:</span>
                              <InlineEditableNumber
                                value={bgConfig.cropBottom}
                                suffix="%"
                                min={0}
                                max={48}
                                step={1}
                                decimals={0}
                                className="text-indigo-300 font-bold"
                                onChange={(cropBottom) => setBgConfig((prev) => ({ ...prev, cropBottom }))}
                              />
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={45}
                              value={bgConfig.cropBottom}
                              onChange={(e) =>
                                setBgConfig((prev) => ({ ...prev, cropBottom: parseInt(e.target.value) }))
                              }
                              className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between text-slate-400 mb-0.5">
                              <span>Esquerda:</span>
                              <InlineEditableNumber
                                value={bgConfig.cropLeft}
                                suffix="%"
                                min={0}
                                max={48}
                                step={1}
                                decimals={0}
                                className="text-indigo-300 font-bold"
                                onChange={(cropLeft) => setBgConfig((prev) => ({ ...prev, cropLeft }))}
                              />
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={45}
                              value={bgConfig.cropLeft}
                              onChange={(e) =>
                                setBgConfig((prev) => ({ ...prev, cropLeft: parseInt(e.target.value) }))
                              }
                              className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between text-slate-400 mb-0.5">
                              <span>Direita:</span>
                              <InlineEditableNumber
                                value={bgConfig.cropRight}
                                suffix="%"
                                min={0}
                                max={48}
                                step={1}
                                decimals={0}
                                className="text-indigo-300 font-bold"
                                onChange={(cropRight) => setBgConfig((prev) => ({ ...prev, cropRight }))}
                              />
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={45}
                              value={bgConfig.cropRight}
                              onChange={(e) =>
                                setBgConfig((prev) => ({ ...prev, cropRight: parseInt(e.target.value) }))
                              }
                              className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Remove Background Image Button */}
                      <button
                        onClick={() => {
                          setBgConfig((prev) => ({ ...prev, url: '', visible: false }));
                          setBgUrlInput('');
                        }}
                        className="w-full py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 font-bold text-[11px] transition-all flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="size-3.5" />
                        <span>Remover Imagem de Fundo</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Scale Calibration Confirmation Modal */}
            {showCalibrateModal && (
              <div className="absolute inset-0 z-40 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl p-5 w-full max-w-sm shadow-2xl space-y-4">
                  <div className="flex items-center gap-2 text-cyan-400">
                    <Ruler className="size-5" />
                    <h3 className="font-bold text-white text-sm">Calibrar Escala com Régua</h3>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Você mediu um segmento de{' '}
                    <span className="font-bold text-cyan-300 font-mono">
                      {calibrationMeasuredDistance.toFixed(2)}m
                    </span>{' '}
                    na tela. Qual é a medida real correspondente desta parede?
                  </p>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Medida Real em Metros (m)
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.2"
                      value={targetRealMetersInput}
                      onChange={(e) => setTargetRealMetersInput(e.target.value)}
                      placeholder="Ex: 3.50"
                      className="w-full bg-slate-950 border border-cyan-500/40 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold outline-none focus:ring-2 focus:ring-cyan-500"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      O que você deseja redimensionar?
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setCalibrateTargetMode('all')}
                        className={`py-1.5 px-2 rounded-lg border font-bold text-center transition-all ${
                          calibrateTargetMode === 'all'
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                            : 'bg-white/5 text-slate-400 border-white/5 hover:text-white'
                        }`}
                      >
                        Tudo (3D + Fundo)
                      </button>
                      <button
                        type="button"
                        onClick={() => setCalibrateTargetMode('walls')}
                        className={`py-1.5 px-2 rounded-lg border font-bold text-center transition-all ${
                          calibrateTargetMode === 'walls'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                            : 'bg-white/5 text-slate-400 border-white/5 hover:text-white'
                        }`}
                      >
                        Apenas Paredes
                      </button>
                      <button
                        type="button"
                        onClick={() => setCalibrateTargetMode('bg')}
                        className={`py-1.5 px-2 rounded-lg border font-bold text-center transition-all ${
                          calibrateTargetMode === 'bg'
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-sm'
                            : 'bg-white/5 text-slate-400 border-white/5 hover:text-white'
                        }`}
                      >
                        Apenas Fundo
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setShowCalibrateModal(false)}
                      className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleApplyCalibration}
                      className="flex-1 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-cyan-500/25"
                    >
                      Ajustar Escala
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Global Scale & Resize Modal */}
            {showScaleModal && (
              <div className="absolute inset-0 z-40 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
                <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-5 w-full max-w-md shadow-2xl space-y-4 text-xs">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2 text-amber-400">
                      <Scale className="size-5" />
                      <h3 className="font-bold text-white text-sm">Escalar Planta Inteira (2D & 3D)</h3>
                    </div>
                    <button
                      onClick={() => setShowScaleModal(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  {/* Current Dimensions Card */}
                  {(() => {
                    const bounds = getGeometryBounds();
                    const curW = bounds.width || 0;
                    const curD = bounds.depth || 0;
                    const curArea = (curW * curD).toFixed(1);

                    return (
                      <>
                        <div className="bg-slate-950 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                              Dimensões Atuais da Planta
                            </span>
                            <div className="font-mono text-white font-bold text-sm mt-0.5">
                              {curW.toFixed(2)}m <span className="text-slate-500">×</span> {curD.toFixed(2)}m
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                              Área Ocupada
                            </span>
                            <div className="font-mono text-amber-300 font-bold text-sm mt-0.5">
                              {curArea} m²
                            </div>
                          </div>
                        </div>

                        {/* Resize by Target Width */}
                        <div className="space-y-2 bg-slate-800/40 border border-white/5 rounded-xl p-3">
                          <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                            Opção 1: Definir Nova Largura Total
                          </label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <input
                                type="number"
                                step="0.1"
                                min="1"
                                max="100"
                                value={scaleTargetWidth}
                                onChange={(e) => setScaleTargetWidth(e.target.value)}
                                placeholder="Ex: 7.00"
                                className="w-full bg-slate-950 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white font-mono font-bold outline-none focus:border-amber-400"
                              />
                              <span className="absolute right-2.5 top-1.5 text-slate-500 font-mono text-xs">m</span>
                            </div>
                            <button
                              onClick={() => {
                                const targetW = parseFloat(scaleTargetWidth);
                                if (!isNaN(targetW) && targetW > 0 && curW > 0) {
                                  const ratio = targetW / curW;
                                  handleScaleEntirePlan(ratio);
                                }
                              }}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-all"
                            >
                              Aplicar Largura
                            </button>
                          </div>
                          {curW > 0 && parseFloat(scaleTargetWidth) > 0 && (
                            <p className="text-[10px] text-slate-400">
                              Profundidade proporcional resultante:{' '}
                              <span className="font-bold text-slate-200 font-mono">
                                {(curD * (parseFloat(scaleTargetWidth) / curW)).toFixed(2)}m
                              </span>
                            </p>
                          )}
                        </div>

                        {/* Resize by Target Depth */}
                        <div className="space-y-2 bg-slate-800/40 border border-white/5 rounded-xl p-3">
                          <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                            Opção 2: Definir Nova Profundidade Total
                          </label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <input
                                type="number"
                                step="0.1"
                                min="1"
                                max="100"
                                value={scaleTargetDepth}
                                onChange={(e) => setScaleTargetDepth(e.target.value)}
                                placeholder="Ex: 6.00"
                                className="w-full bg-slate-950 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white font-mono font-bold outline-none focus:border-amber-400"
                              />
                              <span className="absolute right-2.5 top-1.5 text-slate-500 font-mono text-xs">m</span>
                            </div>
                            <button
                              onClick={() => {
                                const targetD = parseFloat(scaleTargetDepth);
                                if (!isNaN(targetD) && targetD > 0 && curD > 0) {
                                  const ratio = targetD / curD;
                                  handleScaleEntirePlan(ratio);
                                }
                              }}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-all"
                            >
                              Aplicar Profundidade
                            </button>
                          </div>
                          {curD > 0 && parseFloat(scaleTargetDepth) > 0 && (
                            <p className="text-[10px] text-slate-400">
                              Largura proporcional resultante:{' '}
                              <span className="font-bold text-slate-200 font-mono">
                                {(curW * (parseFloat(scaleTargetDepth) / curD)).toFixed(2)}m
                              </span>
                            </p>
                          )}
                        </div>

                        {/* Quick Percentage Presets */}
                        <div className="space-y-2 bg-slate-800/40 border border-white/5 rounded-xl p-3">
                          <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                            Opção 3: Multiplicador Rápido / Porcentagem
                          </label>
                          <div className="grid grid-cols-4 gap-1.5">
                            {[
                              { label: '33% (1/3)', factor: 0.333 },
                              { label: '40%', factor: 0.4 },
                              { label: '50% (1/2)', factor: 0.5 },
                              { label: '75%', factor: 0.75 },
                              { label: '125%', factor: 1.25 },
                              { label: '150%', factor: 1.5 },
                              { label: '200% (2x)', factor: 2.0 },
                            ].map((preset) => (
                              <button
                                key={preset.label}
                                onClick={() => handleScaleEntirePlan(preset.factor)}
                                className="py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 font-bold text-[10px] border border-white/10 hover:border-amber-400/50 transition-all text-center"
                              >
                                {preset.label}
                              </button>
                            ))}
                            <div className="flex gap-1">
                              <input
                                type="number"
                                step="0.05"
                                min="0.05"
                                max="10"
                                value={scaleFactorInput}
                                onChange={(e) => setScaleFactorInput(e.target.value)}
                                className="w-12 bg-slate-950 border border-white/15 rounded-lg px-1.5 py-1 text-[10px] text-white font-mono text-center outline-none"
                              />
                              <button
                                onClick={() => {
                                  const f = parseFloat(scaleFactorInput);
                                  if (!isNaN(f) && f > 0) handleScaleEntirePlan(f);
                                }}
                                className="flex-1 py-1 px-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[10px]"
                              >
                                Ok
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Options Checkboxes */}
                        <div className="pt-1 space-y-1.5 text-slate-300">
                          <label className="flex items-center gap-2 cursor-pointer text-[11px] select-none">
                            <input
                              type="checkbox"
                              checked={scaleIncludeBg}
                              onChange={(e) => setScaleIncludeBg(e.target.checked)}
                              className="rounded border-white/20 bg-slate-950 accent-amber-500"
                            />
                            <span>Redimensionar imagem de fundo de referência também</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer text-[11px] select-none">
                            <input
                              type="checkbox"
                              checked={scaleCenterOrigin}
                              onChange={(e) => setScaleCenterOrigin(e.target.checked)}
                              className="rounded border-white/20 bg-slate-950 accent-amber-500"
                            />
                            <span>Centralizar planta na origem (0, 0)</span>
                          </label>
                        </div>
                      </>
                    );
                  })()}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <button
                      onClick={() => {
                        setShowScaleModal(false);
                        setIsCalibratingScale(true);
                        setCalibrationPtA(null);
                      }}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold"
                    >
                      <Ruler className="size-3.5" /> Medir Parede com Régua
                    </button>
                    <button
                      onClick={() => setShowScaleModal(false)}
                      className="py-1.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal para Adicionar / Editar Spot de Câmera */}
            {spotModal.isOpen && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="w-96 bg-slate-900 border border-white/15 rounded-2xl shadow-2xl p-4 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
                        <Camera className="size-4" />
                      </div>
                      <h3 className="font-bold text-white text-sm">
                        {spotModal.editId ? 'Editar Spot de Câmera' : 'Novo Spot de Câmera'}
                      </h3>
                    </div>
                    <button
                      onClick={() => setSpotModal((prev) => ({ ...prev, isOpen: false }))}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300">
                      Nome do Ponto / Ambiente:
                    </label>
                    <input
                      type="text"
                      autoFocus
                      value={spotModal.name}
                      onChange={(e) => setSpotModal((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Câmera Sala, Ponto Cozinha, Suíte..."
                      className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-medium outline-none focus:border-cyan-400"
                    />
                  </div>

                  {/* Preset Quick Chips */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Sugestões Rápidas:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Câmera Sala',
                        'Câmera Cozinha',
                        'Câmera Quarto',
                        'Câmera Banheiro',
                        'Câmera Varanda',
                        'Câmera Hall',
                      ].map((presetName) => (
                        <button
                          key={presetName}
                          onClick={() => setSpotModal((prev) => ({ ...prev, name: presetName }))}
                          className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white text-[10px] font-medium border border-white/5 transition-all"
                        >
                          {presetName}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Height */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                      <span>Altura do Ponto de Vista:</span>
                      <span className="text-cyan-400 font-mono text-xs">{spotModal.height.toFixed(2)}m</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0.8"
                        max="2.4"
                        step="0.05"
                        value={spotModal.height}
                        onChange={(e) =>
                          setSpotModal((prev) => ({ ...prev, height: parseFloat(e.target.value) }))
                        }
                        className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                      <span>0.80m (Sentado)</span>
                      <span>1.60m (Em Pé)</span>
                      <span>2.20m (Teto)</span>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                    <button
                      onClick={() => setSpotModal((prev) => ({ ...prev, isOpen: false }))}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/10"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => {
                        saveSnapshot();
                        const finalName = spotModal.name.trim() || `Spot ${spots.length + 1}`;
                        if (spotModal.editId) {
                          setSpots((prev) =>
                            prev.map((s) =>
                              s.id === spotModal.editId
                                ? { ...s, name: finalName, height: spotModal.height }
                                : s
                            )
                          );
                        } else {
                          const newSpot: PlannerSpotPin = {
                            id: `spot_${Date.now()}`,
                            name: finalName,
                            x: spotModal.x,
                            y: spotModal.y,
                            height: spotModal.height,
                            color: '#06b6d4',
                          };
                          setSpots((prev) => [...prev, newSpot]);
                          setSelectedSpotId(newSpot.id);
                        }
                        setSpotModal((prev) => ({ ...prev, isOpen: false }));
                        triggerToast(`Spot "${finalName}" salvo!`);
                      }}
                      className="px-4 py-1.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-md shadow-cyan-500/20 active:scale-95"
                    >
                      Salvar Spot
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal para Personalizar Piso e Ambiente */}
            {editingRoom && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="w-96 bg-slate-900 border border-white/15 rounded-2xl shadow-2xl p-4 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                        <Palette className="size-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm">
                          {editingRoom.isManual ? 'Personalizar Ambiente (Manual)' : 'Personalizar Ambiente / Piso'}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Área: {editingRoom.area} m² {editingRoom.isManual ? '• Polígono Manual' : '• Detecção Automática'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingRoom(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300">
                      Nome do Cômodo:
                    </label>
                    <input
                      type="text"
                      autoFocus
                      value={editingRoom.name || ''}
                      onChange={(e) =>
                        setEditingRoom((prev) => (prev ? { ...prev, name: e.target.value } : null))
                      }
                      placeholder="Ex: Quarto casal, Cozinha, Sala..."
                      className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-medium outline-none focus:border-blue-400"
                    />
                  </div>

                  {/* Preset Room Types */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Modelos de Cômodos:
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {PRESET_ROOM_TYPES.map((preset) => (
                        <button
                          key={preset.name}
                          onClick={() => {
                            setEditingRoom((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    name: preset.name,
                                    color: preset.color,
                                    material: preset.material,
                                  }
                                : null
                            );
                          }}
                          className={`p-1.5 rounded-lg text-left text-[10px] font-medium border transition-all flex items-center gap-1.5 ${
                            editingRoom.name === preset.name
                              ? 'bg-blue-500/20 text-blue-200 border-blue-500/50'
                              : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/5'
                          }`}
                        >
                          <span>{preset.icon}</span>
                          <span className="truncate">{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Floor Color Palette */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Cor / Tonalidade do Piso:
                    </span>
                    <div className="flex items-center gap-2">
                      {[
                        { label: 'Madeira Natural', color: '#b45309' },
                        { label: 'Madeira Clara', color: '#d97706' },
                        { label: 'Porcelanato Branco', color: '#e2e8f0' },
                        { label: 'Porcelanato Cinza', color: '#64748b' },
                        { label: 'Cimento Queimado', color: '#475569' },
                        { label: 'Mármore / Escuro', color: '#1e293b' },
                        { label: 'Azul Acqua', color: '#0284c7' },
                        { label: 'Verde Sálvia', color: '#059669' },
                      ].map((c) => (
                        <button
                          key={c.color}
                          onClick={() =>
                            setEditingRoom((prev) => (prev ? { ...prev, color: c.color } : null))
                          }
                          className={`size-6 rounded-full border-2 transition-all ${
                            editingRoom.color === c.color ? 'border-white scale-110 shadow-md' : 'border-white/20 hover:scale-105'
                          }`}
                          style={{ backgroundColor: c.color }}
                          title={c.label}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <button
                      onClick={() => {
                        saveSnapshot();
                        if (editingRoom.isManual) {
                          setManualFloors((prev) => prev.filter((f) => f.id !== editingRoom.id));
                          if (selectedRoomId === editingRoom.id) setSelectedRoomId(null);
                          setEditingRoom(null);
                          triggerToast('Ambiente manual excluído');
                        } else {
                          setRoomCustomizations((prev) =>
                            prev.filter((rc) => rc.id !== editingRoom.id)
                          );
                          setEditingRoom(null);
                          triggerToast('Personalização removida');
                        }
                      }}
                      className="text-[11px] text-red-400 hover:underline"
                    >
                      {editingRoom.isManual ? 'Excluir Este Ambiente' : 'Limpar Nome'}
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingRoom(null)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/10"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => {
                          saveSnapshot();
                          const updatedName = editingRoom.name.trim();
                          if (editingRoom.isManual) {
                            setManualFloors((prev) =>
                              prev.map((f) =>
                                f.id === editingRoom.id
                                  ? {
                                      ...f,
                                      name: updatedName,
                                      color: editingRoom.color,
                                      material: editingRoom.material,
                                    }
                                  : f
                              )
                            );
                          } else {
                            setRoomCustomizations((prev) => {
                              const filtered = prev.filter((rc) => rc.id !== editingRoom.id);
                              return [
                                ...filtered,
                                {
                                  id: editingRoom.id,
                                  name: updatedName,
                                  color: editingRoom.color,
                                  material: editingRoom.material,
                                  center: editingRoom.center,
                                },
                              ];
                            });
                          }
                          setEditingRoom(null);
                          triggerToast(updatedName ? `Ambiente "${updatedName}" definido!` : 'Piso atualizado!');
                        }}
                        className="px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shadow-blue-600/20 active:scale-95"
                      >
                        Salvar Ambiente
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3D Live Viewport (Right Side) */}
          <div
            className={`relative h-full bg-[#0b1120] transition-all duration-300 flex flex-col ${
              is2DExpanded ? 'hidden' : is3DExpanded ? 'w-full' : 'w-1/2 min-w-[320px]'
            }`}
          >
            {/* 3D Header Overlay */}
            <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
              <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-900/85 border border-white/10 px-2.5 py-1 rounded-xl backdrop-blur-md shadow-md">
                <Box className="size-3.5 text-primary" />
                <span className="text-xs font-bold text-white">Live 3D Viewport</span>
              </div>

              {/* 3D Camera Controls */}
              <div className="pointer-events-auto flex items-center gap-1 bg-slate-900/85 border border-white/10 p-1 rounded-xl backdrop-blur-md shadow-md">
                <button
                  onClick={() => set3DCameraView('iso')}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-300 hover:text-white hover:bg-white/10"
                  title="Perspectiva 3D Isométrica"
                >
                  3D Iso
                </button>
                <button
                  onClick={() => set3DCameraView('top')}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-300 hover:text-white hover:bg-white/10"
                  title="Vista Superior (Top-down)"
                >
                  Planta 3D
                </button>
                <button
                  onClick={() => set3DCameraView('front')}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-300 hover:text-white hover:bg-white/10"
                  title="Elevação Frontal"
                >
                  Frontal
                </button>
                <div className="w-px h-3 bg-white/10 mx-0.5" />
                <button
                  onClick={() => {
                    setIs3DExpanded((prev) => {
                      if (!prev) setIs2DExpanded(false);
                      return !prev;
                    });
                  }}
                  className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
                  title={is3DExpanded ? 'Dividir tela com 2D' : 'Expandir 3D'}
                >
                  {is3DExpanded ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
                </button>
              </div>
            </div>

            {/* Three.js Container */}
            <div ref={container3DRef} className="w-full h-full flex-1 overflow-hidden" />

            {/* 3D Footer Info */}
            <div className="absolute bottom-3 right-3 z-10 pointer-events-none bg-slate-900/80 border border-white/10 px-2.5 py-1 rounded-lg backdrop-blur-md text-[10px] font-mono text-slate-400">
              Botão esquerdo: Girar • Direito: Pan • Scroll: Zoom
            </div>
          </div>
        </div>

        {/* Footer Status Bar */}
        <footer className="flex h-11 items-center justify-between border-t border-white/10 bg-slate-900 px-4 sm:px-6 text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <Square className="size-3.5 text-primary" />
              <span>
                Área Total Estimada:{' '}
                <strong className="text-white font-mono">
                  {totalArea > 0 ? `${totalArea.toFixed(1)} m²` : '--'}
                </strong>
              </span>
            </span>
            <span className="hidden sm:inline text-slate-500">•</span>
            <span className="hidden sm:inline">
              Pé-direito: <strong className="text-slate-300 font-mono">{wallHeight.toFixed(2)}m</strong>
            </span>
            <span className="hidden sm:inline text-slate-500">•</span>
            <span className="hidden sm:inline">
              Espessura: <strong className="text-slate-300 font-mono">{(wallThickness * 100).toFixed(0)}cm</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg hover:bg-white/5 text-slate-300 hover:text-white transition-all text-xs font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleApplyToStudio}
              className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5"
            >
              <span>Salvar & Carregar no 3D</span>
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
