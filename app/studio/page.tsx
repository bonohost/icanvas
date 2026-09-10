'use client';

import React, { useState, useCallback } from 'react';
import ThreeViewport from './components/ThreeViewport';
import CatalogSidebar from './components/CatalogSidebar';
import PropertiesSidebar from './components/PropertiesSidebar';
import { FurnitureInstance, FurnitureSpec, RoomSettings } from './types/furniture';
import {
  Grid3x3,
  Magnet,
  Trash2,
  Video,
  Monitor,
  Sparkles,
} from 'lucide-react';

export default function StudioPage() {
  const [furniture, setFurniture] = useState<FurnitureInstance[]>([
    {
      id: 'cab-base-2',
      name: 'Balcão Base 2 Portas',
      w: 0.8,
      d: 0.6,
      h: 0.85,
      by: 0,
      pr: 'base',
      modelUrl: '/models/kitchenCabinet.glb',
      dm: { t: 'wood', c: '#ffffff' },
      uid: 1,
      x: -1.2,
      z: -0.8,
      rot: 0,
      scl: 1,
    },
    {
      id: 'cab-wall-1',
      name: 'Armário Aéreo 2 Portas',
      w: 0.8,
      d: 0.35,
      h: 0.65,
      by: 1.5,
      pr: 'wall',
      modelUrl: '/models/kitchenCabinetUpperDouble.glb',
      dm: { t: 'wood', c: '#ffffff' },
      uid: 2,
      x: -1.2,
      z: -0.8,
      rot: 0,
      scl: 1,
    },
    {
      id: 'fridge-large',
      name: 'Geladeira Duplex Inox',
      w: 0.85,
      d: 0.8,
      h: 1.9,
      by: 0,
      pr: 'fr',
      modelUrl: '/models/kitchenFridgeLarge.glb',
      dm: { t: 'metal', c: '#d4d4d8' },
      uid: 3,
      x: 0.8,
      z: -0.7,
      rot: 0,
      scl: 1,
    },
  ]);

  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [snapOn, setSnapOn] = useState(true);
  const [collisionOn, setCollisionOn] = useState(true);

  const [room, setRoom] = useState<RoomSettings>({
    width: 4.5,
    depth: 3.2,
    height: 2.6,
    floorColor: '#e2e8f0',
    floorTileX: 4,
    floorTileY: 4,
    walls: {
      back: { color: '#f8fafc', tileX: 2, tileY: 1 },
      front: { color: '#f8fafc', tileX: 2, tileY: 1 },
      left: { color: '#f8fafc', tileX: 2, tileY: 1 },
      right: { color: '#f8fafc', tileX: 2, tileY: 1 },
    },
    lightIntensity: 1.2,
    reflectionOpacity: 0.05,
  });

  const [cameraSettings, setCameraSettings] = useState({
    id: 'iso',
    x: 5.5,
    y: 4.5,
    z: 5.5,
    fov: 45,
  });

  const handleAdd = useCallback(
    (spec: FurnitureSpec, position?: { x: number; z: number; by?: number; rot?: number }) => {
      const newInstance: FurnitureInstance = {
        ...spec,
        uid: Date.now(),
        x: position?.x ?? (Math.random() - 0.5) * (room.width - 1),
        z: position?.z ?? (Math.random() - 0.5) * (room.depth - 1),
        rot: position?.rot ?? 0,
        scl: 1,
        by: position?.by ?? spec.by ?? 0,
      };
      setFurniture((prev) => [...prev, newInstance]);
      setSelectedUid(newInstance.uid);
    },
    [room.width, room.depth]
  );

  const handleUpdate = useCallback((uid: number, updates: Partial<FurnitureInstance>) => {
    setFurniture((prev) => prev.map((f) => (f.uid === uid ? { ...f, ...updates } : f)));
  }, []);

  const handleUpdatePosition = useCallback(
    (uid: number, x: number, z: number, by?: number, rot?: number) => {
      setFurniture((prev) =>
        prev.map((f) => {
          if (f.uid === uid) {
            return {
              ...f,
              x,
              z,
              by: by !== undefined ? by : f.by,
              rot: rot !== undefined ? rot : f.rot,
            };
          }
          return f;
        })
      );
    },
    []
  );

  const handleRemove = useCallback((uid: number) => {
    setFurniture((prev) => prev.filter((f) => f.uid !== uid));
    setSelectedUid(null);
  }, []);

  const handleDuplicate = useCallback(
    (uid: number) => {
      const target = furniture.find((f) => f.uid === uid);
      if (!target) return;
      const dupe: FurnitureInstance = {
        ...target,
        uid: Date.now(),
        x: target.x + 0.3,
        z: target.z + 0.3,
      };
      setFurniture((prev) => [...prev, dupe]);
      setSelectedUid(dupe.uid);
    },
    [furniture]
  );

  const handleClearAll = () => {
    if (window.confirm('Deseja limpar todos os móveis da cena?')) {
      setFurniture([]);
      setSelectedUid(null);
    }
  };

  const selectedObject = furniture.find((f) => f.uid === selectedUid) || null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#090d16] text-white pt-20">
      {/* Studio Header Toolbar */}
      <header className="flex h-14 items-center justify-between border-b border-white/10 bg-surface-glass px-6 backdrop-blur-xl z-20">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h1 className="font-headline text-base font-bold tracking-tight text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">view_in_ar</span>
              iCanvas Studio 3D
            </h1>
            <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-mono">
              Ambiente: {room.width.toFixed(1)}m × {room.depth.toFixed(1)}m | {furniture.length} móveis
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-all ${
              showGrid
                ? 'bg-primary/20 text-primary border border-primary/40'
                : 'bg-white/5 text-on-surface-variant hover:text-white border border-white/5'
            }`}
          >
            <Grid3x3 className="size-3.5" /> Grid
          </button>

          <button
            onClick={() => setSnapOn(!snapOn)}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-all ${
              snapOn
                ? 'bg-primary/20 text-primary border border-primary/40'
                : 'bg-white/5 text-on-surface-variant hover:text-white border border-white/5'
            }`}
          >
            <Magnet className="size-3.5" /> Snap
          </button>

          <div className="w-px h-5 bg-white/10 mx-1" />

          <button
            onClick={handleClearAll}
            className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all"
            title="Limpar Cena"
          >
            <Trash2 className="size-3.5" /> Limpar
          </button>
        </div>
      </header>

      {/* Main Studio Area (Catalog + 3D Viewport + Properties) */}
      <div className="flex flex-1 overflow-hidden relative min-h-0 h-full">
        <CatalogSidebar onAdd={handleAdd} />

        <main className="relative flex-1 bg-[#0b0f19] overflow-hidden h-full min-h-0">
          <ThreeViewport
            room={room}
            furniture={furniture}
            onSelect={setSelectedUid}
            selectedUid={selectedUid}
            onUpdatePosition={handleUpdatePosition}
            onDropFurniture={handleAdd}
            showGrid={showGrid}
            snapOn={snapOn}
            collisionOn={collisionOn}
            cameraSettings={cameraSettings}
          />
        </main>

        <PropertiesSidebar
          selected={selectedObject}
          room={room}
          onUpdateRoom={setRoom}
          onUpdate={handleUpdate}
          onRemove={handleRemove}
          onDuplicate={handleDuplicate}
          showGrid={showGrid}
          onToggleGrid={setShowGrid}
          snapOn={snapOn}
          onToggleSnap={setSnapOn}
        />
      </div>

      {/* Studio Footer (Viewpoints & Technical info) */}
      <footer className="flex h-10 items-center justify-between border-t border-white/10 bg-surface-glass px-6 backdrop-blur-xl z-20">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-1.5">
            <Video className="size-3 text-primary" /> Visualização:
          </span>
          <div className="flex gap-1.5">
            {[
              { id: 'iso', label: 'Isométrica 3D', pos: { x: 5.5, y: 4.5, z: 5.5, fov: 45 } },
              { id: 'top', label: 'Planta Baixa (Top)', pos: { x: 0, y: 7.5, z: 0.05, fov: 38 } },
              { id: 'front', label: 'Elevação Frontal', pos: { x: 0, y: 1.5, z: 6.5, fov: 45 } },
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => setCameraSettings({ ...v.pos, id: v.id })}
                className={`h-6 px-2.5 rounded text-[10px] font-semibold uppercase tracking-wider transition-all ${
                  cameraSettings.id === v.id
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-white/5 text-on-surface-variant hover:text-white hover:bg-white/10'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 text-[10px] font-mono text-on-surface-variant uppercase tracking-widest">
          <span className="flex items-center gap-1.5 text-primary font-semibold">
            <Monitor className="size-3" /> WebGL 2.0 PBR
          </span>
        </div>
      </footer>
    </div>
  );
}
