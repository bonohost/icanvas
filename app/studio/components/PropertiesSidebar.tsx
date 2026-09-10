'use client';

import React, { useState } from 'react';
import { FurnitureInstance, RoomSettings, WallSettings } from '../types/furniture';
import { MATERIAL_OPTIONS } from '../lib/furniture-data';
import {
  Trash2,
  Copy,
  Home,
  Layers,
  Sun,
  RotateCw,
  Box,
  Palette,
  ArrowUpFromLine,
  Sliders,
  Grid3x3,
  Magnet,
} from 'lucide-react';

interface PropertiesSidebarProps {
  selected: FurnitureInstance | null;
  room: RoomSettings;
  onUpdateRoom: (room: RoomSettings) => void;
  onUpdate: (uid: number, updates: Partial<FurnitureInstance>) => void;
  onRemove: (uid: number) => void;
  onDuplicate: (uid: number) => void;
  showGrid?: boolean;
  onToggleGrid?: (show: boolean) => void;
  snapOn?: boolean;
  onToggleSnap?: (snap: boolean) => void;
}

export default function PropertiesSidebar({
  selected,
  room,
  onUpdateRoom,
  onUpdate,
  onRemove,
  onDuplicate,
  showGrid = true,
  onToggleGrid,
  snapOn = true,
  onToggleSnap,
}: PropertiesSidebarProps) {
  const [activeWallTab, setActiveWallTab] = useState<keyof RoomSettings['walls']>('back');

  const updateWall = (key: keyof RoomSettings['walls'], updates: Partial<WallSettings>) => {
    onUpdateRoom({
      ...room,
      walls: {
        ...room.walls,
        [key]: { ...room.walls[key], ...updates },
      },
    });
  };

  // ROOM ARCHITECTURE SETTINGS (When nothing is selected)
  if (!selected) {
    return (
      <aside className="w-80 flex-shrink-0 glass-panel border-l border-white/10 h-full overflow-y-auto flex flex-col z-20 backdrop-blur-xl shadow-2xl p-5 gap-6">
        <div className="border-b border-white/10 pb-3">
          <h2 className="font-headline font-bold text-xs tracking-widest uppercase text-primary flex items-center gap-2">
            <Home className="size-4" />
            Configuração do Ambiente
          </h2>
          <p className="text-[11px] text-on-surface-variant mt-1">
            Defina as dimensões da sala, piso, paredes e iluminação.
          </p>
        </div>

        {/* Room Dimensions */}
        <div className="space-y-3">
          <span className="text-xs font-semibold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
            <Box className="size-3.5 text-primary" /> Dimensões da Sala (m)
          </span>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-on-surface-variant block mb-1">Largura (X)</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="20"
                value={room.width}
                onChange={(e) => onUpdateRoom({ ...room, width: parseFloat(e.target.value) || 1 })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-[10px] text-on-surface-variant block mb-1">Profundidade (Z)</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="20"
                value={room.depth}
                onChange={(e) => onUpdateRoom({ ...room, depth: parseFloat(e.target.value) || 1 })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-[10px] text-on-surface-variant block mb-1">Pé-Direito (Y)</label>
              <input
                type="number"
                step="0.1"
                min="1.8"
                max="5"
                value={room.height}
                onChange={(e) => onUpdateRoom({ ...room, height: parseFloat(e.target.value) || 2.4 })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Individual Walls */}
        <div className="space-y-3 border-t border-white/10 pt-4">
          <span className="text-xs font-semibold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="size-3.5 text-primary" /> Paredes Individuais
          </span>

          <div className="grid grid-cols-4 gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
            {(['back', 'front', 'left', 'right'] as const).map((side) => {
              const labels = { back: 'Fundo', front: 'Frente', left: 'Esq.', right: 'Dir.' };
              return (
                <button
                  key={side}
                  onClick={() => setActiveWallTab(side)}
                  className={`py-1 text-[10px] font-semibold rounded-md transition-all ${
                    activeWallTab === side
                      ? 'bg-primary text-white shadow'
                      : 'text-on-surface-variant hover:text-white'
                  }`}
                >
                  {labels[side]}
                </button>
              );
            })}
          </div>

          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-on-surface-variant">Cor da Parede</span>
              <input
                type="color"
                value={room.walls[activeWallTab].color}
                onChange={(e) => updateWall(activeWallTab, { color: e.target.value })}
                className="w-8 h-8 rounded-lg border border-white/20 bg-transparent cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Floor Settings */}
        <div className="space-y-3 border-t border-white/10 pt-4">
          <span className="text-xs font-semibold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
            <Palette className="size-3.5 text-primary" /> Acabamento do Piso
          </span>

          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
            <span className="text-xs text-on-surface-variant">Cor do Piso</span>
            <input
              type="color"
              value={room.floorColor}
              onChange={(e) => onUpdateRoom({ ...room, floorColor: e.target.value })}
              className="w-8 h-8 rounded-lg border border-white/20 bg-transparent cursor-pointer"
            />
          </div>
        </div>

        {/* Lighting Intensity */}
        <div className="space-y-3 border-t border-white/10 pt-4">
          <div className="flex justify-between items-center text-xs">
            <span className="text-on-surface-variant flex items-center gap-1.5">
              <Sun className="size-3.5 text-primary" /> Intensidade da Luz
            </span>
            <span className="font-mono text-primary">{Math.round(room.lightIntensity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="3.0"
            step="0.1"
            value={room.lightIntensity}
            onChange={(e) => onUpdateRoom({ ...room, lightIntensity: parseFloat(e.target.value) })}
            className="w-full accent-primary bg-white/10 h-1.5 rounded-full appearance-none outline-none cursor-pointer"
          />
        </div>

        {/* Visual Guides & Grid Toggle */}
        <div className="space-y-3 border-t border-white/10 pt-4">
          <span className="text-xs font-semibold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
            <Grid3x3 className="size-3.5 text-primary" /> Visualização &amp; Grade
          </span>

          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-white flex items-center gap-1.5">
                  <Grid3x3 className="size-3.5 text-primary" /> Exibir Grade (Grid)
                </span>
                <span className="text-[10px] text-on-surface-variant">Linhas de apoio no chão 3D</span>
              </div>
              <button
                type="button"
                onClick={() => onToggleGrid?.(!showGrid)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  showGrid ? 'bg-primary' : 'bg-white/10'
                }`}
                title={showGrid ? 'Ocultar Grade' : 'Exibir Grade'}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    showGrid ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between border-t border-white/5 pt-2.5">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-white flex items-center gap-1.5">
                  <Magnet className="size-3.5 text-primary" /> Snap Magnético
                </span>
                <span className="text-[10px] text-on-surface-variant">Encaixe rente a paredes e móveis</span>
              </div>
              <button
                type="button"
                onClick={() => onToggleSnap?.(!snapOn)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  snapOn ? 'bg-primary' : 'bg-white/10'
                }`}
                title={snapOn ? 'Desativar Snap' : 'Ativar Snap'}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    snapOn ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // SELECTED FURNITURE OBJECT SETTINGS
  const matOptions = MATERIAL_OPTIONS[selected.dm.t] || [];

  return (
    <aside className="w-80 flex-shrink-0 glass-panel border-l border-white/10 h-full overflow-y-auto flex flex-col z-20 backdrop-blur-xl shadow-2xl p-5 gap-5">
      <div className="border-b border-white/10 pb-3 flex items-start justify-between">
        <div>
          <span className="text-[10px] text-primary font-mono uppercase tracking-wider">Item Selecionado</span>
          <h2 className="font-headline font-bold text-sm text-on-surface leading-tight mt-0.5">
            {selected.name}
          </h2>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onDuplicate(selected.uid)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-on-surface transition-colors"
            title="Duplicar Objeto"
          >
            <Copy className="size-4" />
          </button>
          <button
            onClick={() => onRemove(selected.uid)}
            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
            title="Excluir Objeto"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {/* Transform / Position */}
      <div className="space-y-3">
        <span className="text-xs font-semibold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
          <Sliders className="size-3.5 text-primary" /> Posição &amp; Rotação
        </span>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-on-surface-variant block mb-1">Posição X (m)</label>
            <input
              type="number"
              step="0.05"
              value={selected.x.toFixed(2)}
              onChange={(e) => onUpdate(selected.uid, { x: parseFloat(e.target.value) || 0 })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-[10px] text-on-surface-variant block mb-1">Posição Z (m)</label>
            <input
              type="number"
              step="0.05"
              value={selected.z.toFixed(2)}
              onChange={(e) => onUpdate(selected.uid, { z: parseFloat(e.target.value) || 0 })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center text-[10px] text-on-surface-variant mb-1">
            <span className="flex items-center gap-1">
              <ArrowUpFromLine className="size-3" /> Elevação do Solo (Y)
            </span>
            <span className="font-mono text-primary">{selected.by.toFixed(2)} m</span>
          </div>
          <input
            type="range"
            min="0"
            max="2.5"
            step="0.05"
            value={selected.by}
            onChange={(e) => onUpdate(selected.uid, { by: parseFloat(e.target.value) })}
            className="w-full accent-primary bg-white/10 h-1.5 rounded-full appearance-none outline-none cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between items-center text-[10px] text-on-surface-variant mb-1">
            <span className="flex items-center gap-1">
              <RotateCw className="size-3" /> Rotação Y
            </span>
            <span className="font-mono text-primary">
              {Math.round((selected.rot * 180) / Math.PI)}°
            </span>
          </div>
          <input
            type="range"
            min="0"
            max={Math.PI * 2}
            step={Math.PI / 12}
            value={selected.rot}
            onChange={(e) => onUpdate(selected.uid, { rot: parseFloat(e.target.value) })}
            className="w-full accent-primary bg-white/10 h-1.5 rounded-full appearance-none outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* Dimensions */}
      <div className="space-y-3 border-t border-white/10 pt-4">
        <span className="text-xs font-semibold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
          <Box className="size-3.5 text-primary" /> Dimensões do Módulo
        </span>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] text-on-surface-variant block mb-1">Largura</label>
            <input
              type="number"
              step="0.05"
              min="0.1"
              value={selected.w}
              onChange={(e) => onUpdate(selected.uid, { w: parseFloat(e.target.value) || 0.1 })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-[10px] text-on-surface-variant block mb-1">Profund.</label>
            <input
              type="number"
              step="0.05"
              min="0.1"
              value={selected.d}
              onChange={(e) => onUpdate(selected.uid, { d: parseFloat(e.target.value) || 0.1 })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-[10px] text-on-surface-variant block mb-1">Altura</label>
            <input
              type="number"
              step="0.05"
              min="0.1"
              value={selected.h}
              onChange={(e) => onUpdate(selected.uid, { h: parseFloat(e.target.value) || 0.1 })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Material & Color */}
      <div className="space-y-3 border-t border-white/10 pt-4">
        <span className="text-xs font-semibold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
          <Palette className="size-3.5 text-primary" /> Material &amp; Cor
        </span>

        <div className="flex items-center justify-between">
          <span className="text-xs text-on-surface-variant capitalize">
            Tipo: {selected.dm.t}
          </span>
          <input
            type="color"
            value={selected.dm.c}
            onChange={(e) =>
              onUpdate(selected.uid, {
                dm: { ...selected.dm, c: e.target.value },
              })
            }
            className="w-8 h-8 rounded-lg border border-white/20 bg-transparent cursor-pointer"
          />
        </div>

        {matOptions.length > 0 && (
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            {matOptions.map((opt) => (
              <button
                key={opt.n}
                onClick={() =>
                  onUpdate(selected.uid, {
                    dm: { ...selected.dm, c: opt.c },
                  })
                }
                className={`p-2 rounded-lg border text-left flex items-center gap-2 transition-all ${
                  selected.dm.c.toLowerCase() === opt.c.toLowerCase()
                    ? 'border-primary bg-primary/20 text-white'
                    : 'border-white/10 bg-white/[0.02] text-on-surface-variant hover:border-white/30'
                }`}
              >
                <div className="w-3.5 h-3.5 rounded-full border border-white/30" style={{ backgroundColor: opt.c }} />
                <span className="text-[10px] font-medium truncate">{opt.n}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
