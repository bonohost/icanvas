'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomSettings } from '../types/furniture';

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
  center: { x: number; y: number };
}

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
  const [activeTool, setActiveTool] = useState<'wall' | 'select' | 'delete'>('wall');
  const [snapGrid, setSnapGrid] = useState<boolean>(true);
  const [snapCorner, setSnapCorner] = useState<boolean>(true);
  const [gridStep] = useState<number>(0.25); // 0.25m = 25cm
  const [wallHeight, setWallHeight] = useState<number>(currentRoom.height || 2.6);
  const [wallThickness] = useState<number>(0.15); // 15cm standard
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [is3DExpanded, setIs3DExpanded] = useState<boolean>(false);
  const [showMeasurements, setShowMeasurements] = useState<boolean>(true);
  const [history, setHistory] = useState<{ corners: PlannerCorner[]; walls: PlannerWall[] }[]>([]);

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
      setSelectedCornerId(null);
      setSelectedWallId(null);
      setDrawingStartCornerId(null);
      setCurrentMouseWorld(null);
      setPan({ x: 0, y: 0 });

      if (currentRoom.backgroundFloorPlan) {
        setBgConfig(currentRoom.backgroundFloorPlan);
        setBgUrlInput(
          currentRoom.backgroundFloorPlan.url.startsWith('data:')
            ? 'Imagem Local'
            : currentRoom.backgroundFloorPlan.url
        );
      }
    }
  }, [isOpen, currentRoom, parseRoomToPlanner]);

  // Detected Rooms
  const [detectedRooms, setDetectedRooms] = useState<PlannerRoomLoop[]>([]);

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
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [draggingCornerId, setDraggingCornerId] = useState<string | null>(null);

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
  const animFrameIdRef = useRef<number | null>(null);

  // Push history snapshot before modifications
  const saveSnapshot = useCallback(() => {
    setHistory((prev) => [
      ...prev.slice(-15),
      {
        corners: JSON.parse(JSON.stringify(corners)),
        walls: JSON.parse(JSON.stringify(walls)),
      },
    ]);
  }, [corners, walls]);

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setCorners(prev.corners);
    setWalls(prev.walls);
    setHistory((h) => h.slice(0, -1));
  };

  // --- Cycle / Closed Room Detection Algorithm ---
  const recalculateRooms = useCallback(() => {
    if (corners.length < 3 || walls.length < 3) {
      setDetectedRooms([]);
      return;
    }

    // Build Adjacency Map
    const cornerMap = new Map<string, PlannerCorner>();
    corners.forEach((c) => cornerMap.set(c.id, c));

    const adj = new Map<string, string[]>();
    corners.forEach((c) => adj.set(c.id, []));

    walls.forEach((w) => {
      if (cornerMap.has(w.startId) && cornerMap.has(w.endId)) {
        adj.get(w.startId)?.push(w.endId);
        adj.get(w.endId)?.push(w.startId);
      }
    });

    // Detect Simple Closed Polygons (Eulerian / Cycle Traversal)
    const visitedCycles: string[][] = [];
    const rooms: PlannerRoomLoop[] = [];

    // Check for Simple Closed Loop including all connected boundary corners
    const findCycleFrom = (startId: string, currentId: string, path: string[], visited: Set<string>) => {
      if (path.length > 2 && currentId === startId) {
        // Closed loop found
        const canonical = [...path].sort().join('-');
        if (!visitedCycles.some((c) => c.sort().join('-') === canonical)) {
          visitedCycles.push([...path]);
        }
        return;
      }

      if (path.length >= 10) return; // limit depth for responsiveness

      const neighbors = adj.get(currentId) || [];
      for (const n of neighbors) {
        const prevId = path[path.length - 2];
        if (n === prevId) continue; // don't go backwards along same wall
        if (n === startId && path.length >= 3) {
          findCycleFrom(startId, n, [...path, n], visited);
        } else if (!visited.has(n)) {
          visited.add(n);
          findCycleFrom(startId, n, [...path, n], visited);
          visited.delete(n);
        }
      }
    };

    corners.forEach((c) => {
      findCycleFrom(c.id, c.id, [c.id], new Set([c.id]));
    });

    // Calculate Area and Center for each cycle using Shoelace formula
    visitedCycles.forEach((cycle, idx) => {
      const cycleCorners = cycle
        .map((id) => cornerMap.get(id))
        .filter((c): c is PlannerCorner => Boolean(c));

      if (cycleCorners.length >= 3) {
        let area = 0;
        let sumX = 0;
        let sumY = 0;
        const n = cycleCorners.length;

        for (let i = 0; i < n; i++) {
          const c1 = cycleCorners[i];
          const c2 = cycleCorners[(i + 1) % n];
          area += c1.x * c2.y - c2.x * c1.y;
          sumX += c1.x;
          sumY += c1.y;
        }
        area = Math.abs(area) / 2;

        if (area > 0.5) {
          // Ignore micro artefacts
          rooms.push({
            id: `room_${idx + 1}`,
            corners: cycleCorners,
            area: Number(area.toFixed(2)),
            name: `Cômodo ${idx + 1}`,
            center: { x: sumX / n, y: sumY / n },
          });
        }
      }
    });

    setDetectedRooms(rooms);
  }, [corners, walls]);

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
    (screenX: number, screenY: number, canvas: HTMLCanvasElement, maxDistancePx = 18) => {
      for (const corner of corners) {
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

    // 1. Draw Grid
    const meterPx = zoom;
    const subGridPx = meterPx * gridStep;

    // Sub-grid lines (sutil)
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

    // 2. Draw Detected Room Polygons (Fills & Area badges)
    detectedRooms.forEach((room) => {
      if (room.corners.length < 3) return;
      ctx.beginPath();
      const firstSc = worldToScreen(room.corners[0].x, room.corners[0].y, canvas);
      ctx.moveTo(firstSc.x, firstSc.y);
      for (let i = 1; i < room.corners.length; i++) {
        const sc = worldToScreen(room.corners[i].x, room.corners[i].y, canvas);
        ctx.lineTo(sc.x, sc.y);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(59, 130, 246, 0.08)'; // Soft blue fill
      ctx.fill();

      // Room Center Label
      const centerSc = worldToScreen(room.center.x, room.center.y, canvas);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${room.name}`, centerSc.x, centerSc.y - 8);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px monospace';
      ctx.fillText(`${room.area} m²`, centerSc.x, centerSc.y + 8);
    });

    // Map corners for quick access
    const cornerMap = new Map<string, PlannerCorner>();
    corners.forEach((c) => cornerMap.set(c.id, c));

    // 3. Draw Finished Walls
    walls.forEach((wall) => {
      const c1 = cornerMap.get(wall.startId);
      const c2 = cornerMap.get(wall.endId);
      if (!c1 || !c2) return;

      const sc1 = worldToScreen(c1.x, c1.y, canvas);
      const sc2 = worldToScreen(c2.x, c2.y, canvas);

      const isSelected = selectedWallId === wall.id;
      const wallThicknessPx = Math.max(4, wall.thickness * zoom);

      // Wall Main Line
      ctx.strokeStyle = isSelected ? '#f59e0b' : '#e2e8f0';
      ctx.lineWidth = wallThicknessPx;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sc1.x, sc1.y);
      ctx.lineTo(sc2.x, sc2.y);
      ctx.stroke();

      // Inner Core line
      ctx.strokeStyle = isSelected ? '#fbbf24' : '#64748b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sc1.x, sc1.y);
      ctx.lineTo(sc2.x, sc2.y);
      ctx.stroke();

      // Dimension Label (Cota em metros)
      if (showMeasurements) {
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
        const text = `${len.toFixed(2)}m`;
        ctx.font = 'bold 10px monospace';
        const textWidth = ctx.measureText(text).width;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(-textWidth / 2 - 4, -7, textWidth + 8, 14);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.strokeRect(-textWidth / 2 - 4, -7, textWidth + 8, 14);

        ctx.fillStyle = '#f8fafc';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 0, 0);
        ctx.restore();
      }
    });

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
        ctx.beginPath();
        ctx.arc(sc.x, sc.y, 14, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(sc.x, sc.y, isSelected || isDrawingStart ? 7 : 5, 0, Math.PI * 2);
      ctx.fillStyle = isDrawingStart
        ? '#38bdf8'
        : isSelected
        ? '#f59e0b'
        : isSnapped
        ? '#06b6d4'
        : '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    ctx.restore();
  }, [
    corners,
    walls,
    detectedRooms,
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
    controls.dampingFactor = 0.05;
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
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    // 6. Grid Helper
    const gridHelper = new THREE.GridHelper(20, 20, 0x38bdf8, 0x1e293b);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    const wallsGroup = new THREE.Group();
    const floorsGroup = new THREE.Group();
    scene.add(wallsGroup);
    scene.add(floorsGroup);
    wallsGroupRef.current = wallsGroup;
    floorsGroupRef.current = floorsGroup;

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

    // 1. Build 3D Walls
    walls.forEach((wall) => {
      const c1 = cornerMap.get(wall.startId);
      const c2 = cornerMap.get(wall.endId);
      if (!c1 || !c2) return;

      const dx = c2.x - c1.x;
      const dy = c2.y - c1.y;
      const length = Math.hypot(dx, dy);
      if (length < 0.01) return;

      const angle = Math.atan2(dy, dx);
      const centerX = (c1.x + c2.x) / 2;
      const centerZ = (c1.y + c2.y) / 2;
      const h = wall.height || wallHeight;
      const t = wall.thickness || wallThickness;

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
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.4,
      metalness: 0.1,
    });

    detectedRooms.forEach((room) => {
      if (room.corners.length < 3) return;

      const shape = new THREE.Shape();
      shape.moveTo(room.corners[0].x, -room.corners[0].y);
      for (let i = 1; i < room.corners.length; i++) {
        shape.lineTo(room.corners[i].x, -room.corners[i].y);
      }
      shape.closePath();

      const floorGeo = new THREE.ShapeGeometry(shape);
      const floorMesh = new THREE.Mesh(floorGeo, floorMaterial);
      floorMesh.rotation.x = -Math.PI / 2;
      floorMesh.position.y = 0.005;
      floorMesh.receiveShadow = true;

      floorsGroup.add(floorMesh);
    });
  }, [corners, walls, detectedRooms, wallHeight, wallThickness]);

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

    if (e.button === 1 || e.altKey || (e.shiftKey && activeTool === 'select')) {
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
    } else if (activeTool === 'select') {
      if (nearestCorner) {
        setSelectedCornerId(nearestCorner.id);
        setSelectedWallId(null);
        setDraggingCornerId(nearestCorner.id);
        saveSnapshot();
      } else {
        const nearestWall = getNearestWall(world.x, world.y);
        if (nearestWall) {
          setSelectedWallId(nearestWall.id);
          setSelectedCornerId(null);
        } else {
          setSelectedCornerId(null);
          setSelectedWallId(null);
        }
      }
    } else if (activeTool === 'delete') {
      saveSnapshot();
      if (nearestCorner) {
        setCorners((prev) => prev.filter((c) => c.id !== nearestCorner.id));
        setWalls((prev) =>
          prev.filter((w) => w.startId !== nearestCorner.id && w.endId !== nearestCorner.id)
        );
      } else {
        const nearestWall = getNearestWall(world.x, world.y);
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
    const nearestCorner = getNearestCorner(sx, sy, canvas);

    if (snapCorner && nearestCorner) {
      setSnappedCornerId(nearestCorner.id);
      setCurrentMouseWorld({ x: nearestCorner.x, y: nearestCorner.y });
    } else {
      setSnappedCornerId(null);
      setCurrentMouseWorld(world);
    }

    if (draggingCornerId) {
      setCorners((prev) =>
        prev.map((c) =>
          c.id === draggingCornerId ? { ...c, x: world.x, y: world.y } : c
        )
      );
    }
  };

  const handleCanvasMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }
    if (draggingCornerId) {
      setDraggingCornerId(null);
    }
  };

  const handleCanvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    setZoom((prev) => Math.min(150, Math.max(15, prev * zoomFactor)));
  };

  const handleStopDrawingChain = () => {
    setDrawingStartCornerId(null);
    setSelectedCornerId(null);
  };

  const handleClearAll = () => {
    saveSnapshot();
    setCorners([]);
    setWalls([]);
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

    const customFloors = detectedRooms.map((r) => ({
      id: r.id,
      points: r.corners.map((c) => ({ x: c.x, y: c.y })),
      area: r.area,
      name: r.name,
    }));

    const updatedRoom: RoomSettings = {
      ...currentRoom,
      width: calculatedWidth,
      depth: calculatedDepth,
      height: wallHeight,
      customWalls,
      customFloors,
      backgroundFloorPlan: bgConfig.url ? bgConfig : undefined,
    };

    onApplyToProject(
      updatedRoom,
      `Planta 2D aplicada: ${calculatedWidth}m × ${calculatedDepth}m (${calculatedArea} m² • ${customWalls.length} paredes)`
    );
    onClose();
  };

  if (!isOpen) return null;

  const totalArea = detectedRooms.reduce((acc, r) => acc + r.area, 0);

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
                {detectedRooms.length > 0
                  ? `${detectedRooms.length} cômodo(s) fechado(s) • ${totalArea.toFixed(1)} m²`
                  : 'Desenhe paredes fechadas para formar cômodos'}
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

            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className={`p-2 rounded-xl border text-xs font-semibold transition-all ${
                history.length > 0
                  ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                  : 'bg-white/2 border-white/5 text-white/20 cursor-not-allowed'
              }`}
              title="Desfazer última alteração"
            >
              <RotateCcw className="size-4" />
            </button>

            <button
              onClick={handleClearAll}
              className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition-all"
              title="Limpar todas as paredes"
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
            >
              <Move className="size-3.5" />
              <span>Mover / Editar Canto</span>
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
              onClick={() => setSnapGrid(!snapGrid)}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-medium transition-all ${
                snapGrid
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
              }`}
              title="Alinhamento magnético à grade"
            >
              <Grid className="size-3.5" />
              <span>Grade ({gridStep}m)</span>
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
            className={`relative h-full flex-1 bg-[#0f172a] border-r border-white/10 overflow-hidden cursor-crosshair ${
              is3DExpanded ? 'hidden' : 'block'
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
              className="w-full h-full block touch-none select-none"
            />

            {/* 2D Overlay Floating Controls */}
            <div className="absolute bottom-4 left-4 z-10 flex items-center gap-1.5 bg-slate-900/80 border border-white/10 p-1 rounded-xl backdrop-blur-md shadow-lg">
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

            {/* Instruction / Calibration Badge */}
            <div className="absolute top-3 left-3 z-10 pointer-events-none bg-slate-900/85 border border-white/10 px-3 py-1.5 rounded-xl backdrop-blur-md shadow-md">
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
                  : activeTool === 'select'
                  ? 'Clique e arraste um vértice (círculo) para mover paredes conectadas'
                  : 'Clique em uma parede ou vértice para excluir'}
              </p>
            </div>

            {/* Floating Background Floor Plan Image Inspector Panel */}
            {showBgImagePanel && (
              <div className="absolute top-3 right-3 z-30 w-80 max-h-[calc(100%-24px)] bg-slate-900/95 border border-white/15 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden text-xs">
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

                    {/* Quick Preset Buttons */}
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <button
                        onClick={() =>
                          handleLoadBgUrl(
                            'https://www.mrv.com.br/content/dam/conhecer/imoveis/sao-paulo/ribeirao-preto/residencial-canto-das-andorinhas/PH_ANDORINHAS_03_BL2_FINAL_203_2025.09.09.jpg'
                          )
                        }
                        className="flex-1 text-[10px] py-1 px-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 font-medium transition-all text-left truncate"
                        title="Carregar Planta MRV Canto das Andorinhas"
                      >
                        💡 Exemplo MRV Andorinhas
                      </button>

                      <label className="text-[10px] py-1 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-medium cursor-pointer transition-all flex items-center gap-1">
                        <Upload className="size-3" /> Arquivo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
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
                      {/* Scale & Calibration */}
                      <div className="space-y-1.5 pt-1 border-t border-white/10">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <SlidersHorizontal className="size-3" /> Escala (Largura Real)
                          </label>
                          <span className="text-indigo-400 font-mono font-bold text-xs">
                            {bgConfig.width.toFixed(2)} m
                          </span>
                        </div>
                        <input
                          type="range"
                          min={2}
                          max={35}
                          step={0.1}
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

                      {/* Opacity Slider */}
                      <div className="space-y-1.5 pt-1 border-t border-white/10">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Opacidade / Transparência
                          </label>
                          <span className="text-slate-300 font-mono text-xs">
                            {Math.round(bgConfig.opacity * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.1}
                          max={1.0}
                          step={0.05}
                          value={bgConfig.opacity}
                          onChange={(e) =>
                            setBgConfig((prev) => ({ ...prev, opacity: parseFloat(e.target.value) }))
                          }
                          className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                        />
                      </div>

                      {/* Position & Rotation */}
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
                            <span className="text-[10px] text-slate-400">Pos X: {bgConfig.x.toFixed(2)}m</span>
                            <input
                              type="range"
                              min={-15}
                              max={15}
                              step={0.25}
                              value={bgConfig.x}
                              onChange={(e) =>
                                setBgConfig((prev) => ({ ...prev, x: parseFloat(e.target.value) }))
                              }
                              className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400">Pos Y: {bgConfig.y.toFixed(2)}m</span>
                            <input
                              type="range"
                              min={-15}
                              max={15}
                              step={0.25}
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
                                  ? 'bg-indigo-600 text-white border-indigo-500'
                                  : 'bg-white/5 text-slate-300 hover:bg-white/10 border-white/5'
                              }`}
                            >
                              {deg}°
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Crop / Recorte de Margens */}
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
                            <span className="text-slate-400">Topo: {bgConfig.cropTop}%</span>
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
                            <span className="text-slate-400">Base: {bgConfig.cropBottom}%</span>
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
                            <span className="text-slate-400">Esquerda: {bgConfig.cropLeft}%</span>
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
                            <span className="text-slate-400">Direita: {bgConfig.cropRight}%</span>
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
          </div>

          {/* 3D Live Viewport (Right Side) */}
          <div
            className={`relative h-full bg-[#0b1120] transition-all duration-300 flex flex-col ${
              is3DExpanded ? 'w-full' : 'w-1/2 min-w-[320px]'
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
                  onClick={() => setIs3DExpanded(!is3DExpanded)}
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
