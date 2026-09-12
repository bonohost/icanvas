'use client';

import React, { useState } from 'react';
import { FurnitureInstance, RoomSettings, WallSettings, WallOpening, WallSide } from '../types/furniture';
import { MATERIAL_OPTIONS, WALL_PBR_PRESETS, FLOOR_PBR_PRESETS } from '../lib/furniture-data';
import { OPENING_FRAME_COLORS, GLASS_PRESETS } from '../lib/wall-builders';
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
  DoorOpen,
  AppWindow,
  X,
  Eye,
  Sparkles,
  ChevronRight,
  Lightbulb,
} from 'lucide-react';

interface PropertiesSidebarProps {
  selected: FurnitureInstance | null;
  selectedOpening?: WallOpening | null;
  room: RoomSettings;
  onUpdateRoom: (room: RoomSettings) => void;
  onUpdate: (uid: number, updates: Partial<FurnitureInstance>) => void;
  onRemove: (uid: number) => void;
  onDuplicate: (uid: number) => void;
  onUpdateOpening?: (id: string, updates: Partial<WallOpening>) => void;
  onRemoveOpening?: (id: string) => void;
  onDuplicateOpening?: (id: string) => void;
  onDeselectAll?: () => void;
  onClose?: () => void;
  showGrid?: boolean;
  onToggleGrid?: (show: boolean) => void;
  snapOn?: boolean;
  onToggleSnap?: (snap: boolean) => void;
  autoTransparency?: boolean;
  onToggleAutoTransparency?: (transparency: boolean) => void;
}

export default function PropertiesSidebar({
  selected,
  selectedOpening,
  room,
  onUpdateRoom,
  onUpdate,
  onRemove,
  onDuplicate,
  onUpdateOpening,
  onRemoveOpening,
  onDuplicateOpening,
  onDeselectAll,
  onClose,
  showGrid = true,
  onToggleGrid,
  snapOn = true,
  onToggleSnap,
  autoTransparency = true,
  onToggleAutoTransparency,
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

  // OPENING ARCHITECTURE SETTINGS (When a door or window is selected)
  if (selectedOpening) {
    const isDoor = selectedOpening.type.startsWith('door');
    const Icon = isDoor ? DoorOpen : AppWindow;
    const currentWallLength =
      selectedOpening.wallSide === 'back' || selectedOpening.wallSide === 'front'
        ? room.width
        : room.depth;

    return (
      <aside className="w-80 flex-shrink-0 glass-panel border-l border-white/10 h-full overflow-y-auto flex flex-col z-20 backdrop-blur-xl shadow-2xl p-5 gap-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="size-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30 flex-shrink-0">
              <Icon className="size-4 text-primary" />
            </div>
            <div className="flex flex-col min-w-0">
              <h2 className="font-headline font-bold text-xs tracking-wider uppercase text-primary truncate">
                {selectedOpening.name}
              </h2>
              <span className="text-[10px] text-on-surface-variant font-mono">
                Parede: {selectedOpening.wallSide.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onDuplicateOpening?.(selectedOpening.id)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-on-surface transition-colors"
              title="Duplicar Vão na Parede"
            >
              <Copy className="size-4" />
            </button>
            <button
              onClick={() => onRemoveOpening?.(selectedOpening.id)}
              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
              title="Excluir Vão (Delete)"
            >
              <Trash2 className="size-4" />
            </button>
            {onClose ? (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors"
                title="Ocultar Painel ( ] )"
              >
                <ChevronRight className="size-4" />
              </button>
            ) : (
              <button
                onClick={() => onDeselectAll?.()}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors"
                title="Fechar Painel (Esc)"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Parede Associada */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="size-3.5 text-primary" /> Parede Instalada
          </span>
          <div className="grid grid-cols-4 gap-1 bg-white/5 p-1 rounded-xl">
            {(['back', 'front', 'left', 'right'] as const).map((side) => {
              const labels: Record<WallSide, string> = {
                back: 'Traseira',
                front: 'Frontal',
                left: 'Esquerda',
                right: 'Direita',
              };
              const isActive = selectedOpening.wallSide === side;
              return (
                <button
                  key={side}
                  onClick={() => onUpdateOpening?.(selectedOpening.id, { wallSide: side })}
                  className={`py-1 text-[10px] font-semibold rounded-lg transition-all ${
                    isActive ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-white'
                  }`}
                >
                  {labels[side]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Posição na Parede (0% a 100%) */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-on-surface-variant flex items-center gap-1.5">
              <Sliders className="size-3.5 text-primary" /> Posição na Parede
            </span>
            <span className="font-mono text-primary">
              {(selectedOpening.position * currentWallLength).toFixed(2)}m ({Math.round(selectedOpening.position * 100)}%)
            </span>
          </div>
          <input
            type="range"
            min="0.08"
            max="0.92"
            step="0.01"
            value={selectedOpening.position}
            onChange={(e) =>
              onUpdateOpening?.(selectedOpening.id, { position: parseFloat(e.target.value) || 0.5 })
            }
            className="w-full accent-primary bg-white/10 h-1.5 rounded-full appearance-none outline-none cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-on-surface-variant font-mono">
            <span>Início (0m)</span>
            <button
              onClick={() => onUpdateOpening?.(selectedOpening.id, { position: 0.5 })}
              className="text-primary hover:underline"
            >
              Centralizar (50%)
            </button>
            <span>Fim ({currentWallLength.toFixed(1)}m)</span>
          </div>
        </div>

        {/* Dimensões do Vão */}
        <div className="space-y-3 border-t border-white/10 pt-4">
          <span className="text-xs font-semibold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
            <Box className="size-3.5 text-primary" /> Dimensões do Vão
          </span>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-on-surface-variant block mb-1">Largura</label>
              <input
                type="number"
                step="0.05"
                min="0.4"
                max={currentWallLength - 0.2}
                value={selectedOpening.width}
                onChange={(e) =>
                  onUpdateOpening?.(selectedOpening.id, { width: parseFloat(e.target.value) || 0.8 })
                }
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-[10px] text-on-surface-variant block mb-1">Altura</label>
              <input
                type="number"
                step="0.05"
                min="0.4"
                max={room.height - 0.1}
                value={selectedOpening.height}
                onChange={(e) =>
                  onUpdateOpening?.(selectedOpening.id, { height: parseFloat(e.target.value) || 1.2 })
                }
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-[10px] text-on-surface-variant block mb-1">Peitoril (Sill)</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max={room.height - selectedOpening.height - 0.1}
                value={selectedOpening.sillHeight || 0}
                onChange={(e) =>
                  onUpdateOpening?.(selectedOpening.id, {
                    sillHeight: Math.max(0, parseFloat(e.target.value) || 0),
                  })
                }
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Divisória / Grade da Janela (Apenas para Janelas) */}
        {selectedOpening.type.startsWith('window') && (
          <div className="space-y-2 border-t border-white/10 pt-4">
            <span className="text-xs font-semibold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
              <Grid3x3 className="size-3.5 text-primary" /> Estilo da Grade / Divisória
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'standard', name: '2 Folhas (Padrão)', desc: 'Montante central' },
                { id: 'panoramic', name: 'Panorâmica', desc: 'Vidro inteiriço' },
                { id: 'colonial', name: 'Colonial', desc: 'Grades cruzadas' },
                { id: 'industrial', name: 'Industrial', desc: 'Travessas horizontais' },
              ].map((styleOpt) => {
                const isSelected = (selectedOpening.mullionStyle || 'standard') === styleOpt.id;
                return (
                  <button
                    key={styleOpt.id}
                    onClick={() =>
                      onUpdateOpening?.(selectedOpening.id, { mullionStyle: styleOpt.id as any })
                    }
                    className={`p-2 rounded-lg border text-left flex flex-col transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/20 text-white shadow-sm'
                        : 'border-white/10 bg-white/[0.02] text-on-surface-variant hover:border-white/30 hover:text-white'
                    }`}
                  >
                    <span className="text-[11px] font-semibold">{styleOpt.name}</span>
                    <span className="text-[9px] opacity-70">{styleOpt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Acabamento do Vidro PBR (Para Janelas e Portas de Vidro) */}
        {(selectedOpening.type.startsWith('window') || selectedOpening.type === 'door-glass') && (
          <div className="space-y-3 border-t border-white/10 pt-4">
            <span className="text-xs font-semibold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-primary" /> Acabamento do Vidro
            </span>

            {/* Presets de Vidro */}
            <div className="grid grid-cols-2 gap-1.5">
              {GLASS_PRESETS.map((preset) => {
                const isSelected = (selectedOpening.glassType || 'clear') === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() =>
                      onUpdateOpening?.(selectedOpening.id, {
                        glassType: preset.id,
                        glassColor: preset.color,
                        glassOpacity: preset.opacity,
                        glassRoughness: preset.roughness,
                      })
                    }
                    className={`p-2 rounded-lg border text-left flex items-center gap-2 transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/20 text-white shadow-sm'
                        : 'border-white/10 bg-white/[0.02] text-on-surface-variant hover:border-white/30 hover:text-white'
                    }`}
                  >
                    <div
                      className="size-3.5 rounded-full border border-white/30 flex-shrink-0 shadow-inner"
                      style={{ backgroundColor: preset.color }}
                    />
                    <span className="text-[10px] font-medium leading-tight truncate">{preset.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Ajuste Fino de Transparência & Fosco */}
            <div className="space-y-2 pt-1">
              <div>
                <div className="flex justify-between items-center text-[10px] text-on-surface-variant mb-1">
                  <span>Transparência do Vidro</span>
                  <span className="font-mono text-primary">
                    {Math.round((1 - (selectedOpening.glassOpacity ?? 0.22)) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.95"
                  step="0.05"
                  value={selectedOpening.glassOpacity ?? 0.22}
                  onChange={(e) =>
                    onUpdateOpening?.(selectedOpening.id, { glassOpacity: parseFloat(e.target.value) })
                  }
                  className="w-full accent-primary bg-white/10 h-1.5 rounded-full appearance-none outline-none cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between items-center text-[10px] text-on-surface-variant mb-1">
                  <span>Jateamento / Fosco</span>
                  <span className="font-mono text-primary">
                    {Math.round((selectedOpening.glassRoughness ?? 0.04) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.8"
                  step="0.05"
                  value={selectedOpening.glassRoughness ?? 0.04}
                  onChange={(e) =>
                    onUpdateOpening?.(selectedOpening.id, { glassRoughness: parseFloat(e.target.value) })
                  }
                  className="w-full accent-primary bg-white/10 h-1.5 rounded-full appearance-none outline-none cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-on-surface-variant">Tonalidade do Vidro</span>
                <input
                  type="color"
                  value={selectedOpening.glassColor || '#dbeafe'}
                  onChange={(e) => onUpdateOpening?.(selectedOpening.id, { glassColor: e.target.value })}
                  className="w-7 h-7 rounded-lg border border-white/20 bg-transparent cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Abertura da Folha (Para portas de giro / correr) */}
        {selectedOpening.type !== 'door-opening' && !selectedOpening.type.startsWith('window') && (
          <div className="space-y-2 border-t border-white/10 pt-4">
            <div className="flex justify-between items-center text-xs">
              <span className="text-on-surface-variant flex items-center gap-1.5">
                <DoorOpen className="size-3.5 text-primary" /> Abertura da Folha
              </span>
              <span className="font-mono text-primary">
                {Math.round((selectedOpening.leafOpenRatio ?? 0.35) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={selectedOpening.leafOpenRatio ?? 0.35}
              onChange={(e) =>
                onUpdateOpening?.(selectedOpening.id, { leafOpenRatio: parseFloat(e.target.value) })
              }
              className="w-full accent-primary bg-white/10 h-1.5 rounded-full appearance-none outline-none cursor-pointer"
            />
          </div>
        )}

        {/* Acabamento da Esquadria / Batente */}
        <div className="space-y-3 border-t border-white/10 pt-4">
          <span className="text-xs font-semibold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
            <Palette className="size-3.5 text-primary" /> Acabamento da Esquadria
          </span>

          <div className="grid grid-cols-2 gap-1.5">
            {OPENING_FRAME_COLORS.map((opt) => {
              const isSelected =
                (selectedOpening.frameColor || OPENING_FRAME_COLORS[0].color).toLowerCase() ===
                opt.color.toLowerCase();
              return (
                <button
                  key={opt.id}
                  onClick={() => onUpdateOpening?.(selectedOpening.id, { frameColor: opt.color })}
                  className={`p-2 rounded-lg border text-left flex items-center gap-2 transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/20 text-white shadow-sm'
                      : 'border-white/10 bg-white/[0.02] text-on-surface-variant hover:border-white/30 hover:text-white'
                  }`}
                >
                  <div
                    className="size-3.5 rounded-full border border-white/30 flex-shrink-0"
                    style={{ backgroundColor: opt.color }}
                  />
                  <span className="text-[10px] font-medium leading-tight truncate">{opt.name}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-on-surface-variant">Cor Customizada da Esquadria</span>
            <input
              type="color"
              value={selectedOpening.frameColor || '#1e293b'}
              onChange={(e) => onUpdateOpening?.(selectedOpening.id, { frameColor: e.target.value })}
              className="w-8 h-8 rounded-lg border border-white/20 bg-transparent cursor-pointer"
            />
          </div>
        </div>
      </aside>
    );
  }

  // ROOM ARCHITECTURE SETTINGS (When nothing is selected)
  if (!selected) {
    return (
      <aside className="w-80 flex-shrink-0 glass-panel border-l border-white/10 h-full overflow-y-auto flex flex-col z-20 backdrop-blur-xl shadow-2xl p-5 gap-6">
        <div className="border-b border-white/10 pb-3 flex items-start justify-between">
          <div>
            <h2 className="font-headline font-bold text-xs tracking-widest uppercase text-primary flex items-center gap-2">
              <Home className="size-4" />
              Configuração do Ambiente
            </h2>
            <p className="text-[11px] text-on-surface-variant mt-1">
              Defina as dimensões da sala, piso, paredes e iluminação.
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors flex-shrink-0"
              title="Ocultar Painel ( ] )"
            >
              <ChevronRight className="size-4" />
            </button>
          )}
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

        {/* Individual Walls & PBR Textures */}
        <div className="space-y-3 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="size-3.5 text-primary" /> Paredes PBR
            </span>
            <button
              onClick={() => {
                const current = room.walls[activeWallTab];
                onUpdateRoom({
                  ...room,
                  walls: {
                    back: { ...current },
                    front: { ...current },
                    left: { ...current },
                    right: { ...current },
                  },
                });
              }}
              className="text-[10px] text-primary hover:underline font-medium"
              title="Aplica a textura e cor atual a todas as 4 paredes"
            >
              Aplicar em Todas
            </button>
          </div>

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

          {/* Wall Presets */}
          <div className="space-y-2">
            <label className="text-[10px] text-on-surface-variant block">Texturas &amp; Acabamentos PBR</label>
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {WALL_PBR_PRESETS.map((preset) => {
                const isSelected =
                  room.walls[activeWallTab].textureUrl === preset.textureUrl &&
                  (!preset.textureUrl || room.walls[activeWallTab].color === preset.color);

                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      updateWall(activeWallTab, {
                        textureUrl: preset.textureUrl,
                        color: preset.color,
                        roughness: preset.roughness,
                        metalness: preset.metalness,
                        tileX: preset.tileX || 1,
                        tileY: preset.tileY || 1,
                      });
                    }}
                    className={`p-2 rounded-lg border text-left flex items-center gap-2 transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/20 text-white shadow-sm'
                        : 'border-white/10 bg-white/[0.02] text-on-surface-variant hover:border-white/30 hover:text-white'
                    }`}
                  >
                    <div
                      className="size-4 rounded border border-white/30 flex-shrink-0"
                      style={{ backgroundColor: preset.color }}
                    />
                    <span className="text-[10px] font-medium leading-tight truncate">{preset.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-on-surface-variant">Tonalidade / Cor</span>
              <input
                type="color"
                value={room.walls[activeWallTab].color}
                onChange={(e) => updateWall(activeWallTab, { color: e.target.value })}
                className="w-8 h-8 rounded-lg border border-white/20 bg-transparent cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center text-[10px] text-on-surface-variant mb-1">
                <span>Rugosidade / Fosco</span>
                <span className="font-mono text-primary">
                  {Math.round((room.walls[activeWallTab].roughness ?? 0.85) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.05"
                max="1.0"
                step="0.05"
                value={room.walls[activeWallTab].roughness ?? 0.85}
                onChange={(e) => updateWall(activeWallTab, { roughness: parseFloat(e.target.value) })}
                className="w-full accent-primary bg-white/10 h-1.5 rounded-full appearance-none outline-none cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center text-[10px] text-on-surface-variant mb-1">
                <span>Repetição de Textura (Escala)</span>
                <span className="font-mono text-primary">
                  {room.walls[activeWallTab].tileX || 1}x
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={room.walls[activeWallTab].tileX || 1}
                onChange={(e) => {
                  const v = parseInt(e.target.value) || 1;
                  updateWall(activeWallTab, { tileX: v, tileY: Math.max(1, Math.round(v / 1.5)) });
                }}
                className="w-full accent-primary bg-white/10 h-1.5 rounded-full appearance-none outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Floor Settings PBR */}
        <div className="space-y-3 border-t border-white/10 pt-4">
          <span className="text-xs font-semibold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
            <Palette className="size-3.5 text-primary" /> Piso &amp; Revestimento PBR
          </span>

          {/* Floor Presets */}
          <div className="space-y-2">
            <label className="text-[10px] text-on-surface-variant block">Pisos &amp; Porcelanatos Fotorrealistas</label>
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {FLOOR_PBR_PRESETS.map((preset) => {
                const isSelected =
                  room.floorTextureUrl === preset.textureUrl &&
                  (!preset.textureUrl || room.floorColor === preset.color);

                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      onUpdateRoom({
                        ...room,
                        floorTextureUrl: preset.textureUrl,
                        floorColor: preset.color,
                        floorRoughness: preset.roughness,
                        floorMetalness: preset.metalness,
                        floorTileX: preset.tileX || 4,
                        floorTileY: preset.tileY || 4,
                      });
                    }}
                    className={`p-2 rounded-lg border text-left flex items-center gap-2 transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/20 text-white shadow-sm'
                        : 'border-white/10 bg-white/[0.02] text-on-surface-variant hover:border-white/30 hover:text-white'
                    }`}
                  >
                    <div
                      className="size-4 rounded border border-white/30 flex-shrink-0"
                      style={{ backgroundColor: preset.color }}
                    />
                    <span className="text-[10px] font-medium leading-tight truncate">{preset.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-on-surface-variant">Tonalidade do Piso</span>
              <input
                type="color"
                value={room.floorColor}
                onChange={(e) => onUpdateRoom({ ...room, floorColor: e.target.value })}
                className="w-8 h-8 rounded-lg border border-white/20 bg-transparent cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center text-[10px] text-on-surface-variant mb-1">
                <span>Reflexo &amp; Polimento</span>
                <span className="font-mono text-primary">
                  {Math.round((1 - (room.floorRoughness ?? 0.55)) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.05"
                max="1.0"
                step="0.05"
                value={room.floorRoughness ?? 0.55}
                onChange={(e) => onUpdateRoom({ ...room, floorRoughness: parseFloat(e.target.value) })}
                className="w-full accent-primary bg-white/10 h-1.5 rounded-full appearance-none outline-none cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center text-[10px] text-on-surface-variant mb-1">
                <span>Repetição do Piso (Tamanho da Placa)</span>
                <span className="font-mono text-primary">{room.floorTileX || 4}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="12"
                step="1"
                value={room.floorTileX || 4}
                onChange={(e) => {
                  const v = parseInt(e.target.value) || 1;
                  onUpdateRoom({ ...room, floorTileX: v, floorTileY: v });
                }}
                className="w-full accent-primary bg-white/10 h-1.5 rounded-full appearance-none outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Lighting Intensity */}
        <div className="space-y-3 border-t border-white/10 pt-4">
          <div className="flex justify-between items-center text-xs">
            <span className="text-on-surface-variant flex items-center gap-1.5">
              <Sun className="size-3.5 text-primary" /> Luz Solar / Ambiente
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

        {/* Iluminação de Área PBR (RectAreaLight / Plafon LED) */}
        <div className="space-y-3 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
              <Lightbulb className="size-3.5 text-primary" /> Luz de Área (Plafon LED)
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
                onUpdateRoom({
                  ...room,
                  areaLight: {
                    ...cur,
                    enabled: !cur.enabled,
                  },
                });
              }}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                room.areaLight?.enabled ? 'bg-primary' : 'bg-white/10'
              }`}
              title={room.areaLight?.enabled ? 'Desativar Luz de Área' : 'Ativar Luz de Área'}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  room.areaLight?.enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {room.areaLight?.enabled && (
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-3">
              {/* Moldura Guia Visual (Helper) */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-white">Moldura Visual (Guia 3D)</span>
                  <span className="text-[10px] text-on-surface-variant">Exibe contorno retangular no teto</span>
                </div>
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
                    onUpdateRoom({
                      ...room,
                      areaLight: {
                        ...cur,
                        showHelper: !cur.showHelper,
                      },
                    });
                  }}
                  className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                    room.areaLight?.showHelper ? 'bg-primary' : 'bg-white/10'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      room.areaLight?.showHelper ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Intensidade */}
              <div>
                <div className="flex justify-between items-center text-[10px] text-on-surface-variant mb-1">
                  <span>Intensidade da Área</span>
                  <span className="font-mono text-primary">
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
                    onUpdateRoom({
                      ...room,
                      areaLight: {
                        ...room.areaLight!,
                        intensity: parseFloat(e.target.value),
                      },
                    });
                  }}
                  className="w-full accent-primary bg-white/10 h-1.5 rounded-full appearance-none outline-none cursor-pointer"
                />
              </div>

              {/* Dimensões da Área (Largura e Comprimento) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex justify-between items-center text-[10px] text-on-surface-variant mb-1">
                    <span>Largura (X)</span>
                    <span className="font-mono text-primary">{(room.areaLight.width ?? 2.2).toFixed(1)}m</span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="5.0"
                    step="0.1"
                    value={room.areaLight.width ?? 2.2}
                    onChange={(e) => {
                      onUpdateRoom({
                        ...room,
                        areaLight: {
                          ...room.areaLight!,
                          width: parseFloat(e.target.value),
                        },
                      });
                    }}
                    className="w-full accent-primary bg-white/10 h-1.5 rounded-full appearance-none outline-none cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center text-[10px] text-on-surface-variant mb-1">
                    <span>Comprimento (Z)</span>
                    <span className="font-mono text-primary">{(room.areaLight.height ?? 1.6).toFixed(1)}m</span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="5.0"
                    step="0.1"
                    value={room.areaLight.height ?? 1.6}
                    onChange={(e) => {
                      onUpdateRoom({
                        ...room,
                        areaLight: {
                          ...room.areaLight!,
                          height: parseFloat(e.target.value),
                        },
                      });
                    }}
                    className="w-full accent-primary bg-white/10 h-1.5 rounded-full appearance-none outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Temperatura de Cor & Presets */}
              <div className="space-y-2 border-t border-white/5 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-on-surface-variant">Temperatura / Tonalidade</span>
                  <input
                    type="color"
                    value={room.areaLight.color || '#ffffff'}
                    onChange={(e) => {
                      onUpdateRoom({
                        ...room,
                        areaLight: {
                          ...room.areaLight!,
                          color: e.target.value,
                        },
                      });
                    }}
                    className="w-7 h-7 rounded-lg border border-white/20 bg-transparent cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-4 gap-1">
                  {[
                    { name: '4000K Neutro', color: '#ffffff' },
                    { name: '3000K Quente', color: '#fff1e0' },
                    { name: '2700K Âmbar', color: '#ffd7a8' },
                    { name: '6000K Frio', color: '#eef6ff' },
                  ].map((temp) => (
                    <button
                      key={temp.name}
                      onClick={() => {
                        onUpdateRoom({
                          ...room,
                          areaLight: {
                            ...room.areaLight!,
                            color: temp.color,
                          },
                        });
                      }}
                      className={`p-1 rounded text-center border text-[9px] font-medium transition-all ${
                        (room.areaLight?.color || '#ffffff').toLowerCase() === temp.color.toLowerCase()
                          ? 'border-primary bg-primary/20 text-white shadow-sm'
                          : 'border-white/10 bg-white/[0.02] text-on-surface-variant hover:text-white'
                      }`}
                    >
                      {temp.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
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
                  <Eye className="size-3.5 text-primary" /> Auto-Ocultar Paredes
                </span>
                <span className="text-[10px] text-on-surface-variant">Transparência dinâmica na visão da câmera</span>
              </div>
              <button
                type="button"
                onClick={() => onToggleAutoTransparency?.(!autoTransparency)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  autoTransparency ? 'bg-primary' : 'bg-white/10'
                }`}
                title={autoTransparency ? 'Desativar Transparência Automática' : 'Ativar Transparência Automática'}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    autoTransparency ? 'translate-x-5' : 'translate-x-0'
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
            title="Duplicar Objeto (Ctrl+D)"
          >
            <Copy className="size-4" />
          </button>
          <button
            onClick={() => onRemove(selected.uid)}
            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
            title="Excluir Objeto (Delete)"
          >
            <Trash2 className="size-4" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors"
              title="Ocultar Painel ( ] )"
            >
              <ChevronRight className="size-4" />
            </button>
          )}
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

        {/* Smart Realignment & Wall Snapping Tools */}
        <div className="pt-1">
          <label className="text-[10px] text-on-surface-variant block mb-1.5 font-medium">Realinhamento Inteligente</label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => {
                const curX = selected.x;
                const curZ = selected.z;
                const dLeft = curX - (-room.width / 2);
                const dRight = room.width / 2 - curX;
                const dBack = curZ - (-room.depth / 2);
                const dFront = room.depth / 2 - curZ;

                const minDist = Math.min(dLeft, dRight, dBack, dFront);
                let targetRot = 0;
                let targetX = curX;
                let targetZ = curZ;

                const cos = (r: number) => Math.abs(Math.cos(r));
                const sin = (r: number) => Math.abs(Math.sin(r));
                const getBounds = (r: number) => ({
                  effW: selected.w * cos(r) + selected.d * sin(r),
                  effD: selected.w * sin(r) + selected.d * cos(r),
                });

                if (minDist === dBack) {
                  targetRot = 0;
                  const { effW, effD } = getBounds(targetRot);
                  targetZ = -room.depth / 2 + effD / 2;
                  targetX = Math.max(-room.width / 2 + effW / 2, Math.min(room.width / 2 - effW / 2, curX));
                } else if (minDist === dLeft) {
                  targetRot = Math.PI / 2;
                  const { effW, effD } = getBounds(targetRot);
                  targetX = -room.width / 2 + effW / 2;
                  targetZ = Math.max(-room.depth / 2 + effD / 2, Math.min(room.depth / 2 - effD / 2, curZ));
                } else if (minDist === dRight) {
                  targetRot = -Math.PI / 2;
                  const { effW, effD } = getBounds(targetRot);
                  targetX = room.width / 2 - effW / 2;
                  targetZ = Math.max(-room.depth / 2 + effD / 2, Math.min(room.depth / 2 - effD / 2, curZ));
                } else if (minDist === dFront) {
                  targetRot = Math.PI;
                  const { effW, effD } = getBounds(targetRot);
                  targetZ = room.depth / 2 - effD / 2;
                  targetX = Math.max(-room.width / 2 + effW / 2, Math.min(room.width / 2 - effW / 2, curX));
                }

                onUpdate(selected.uid, { x: targetX, z: targetZ, rot: targetRot });
              }}
              className="px-2.5 py-1.5 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 text-white text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all shadow-sm"
              title="Encosta perfeitamente na parede mais próxima ajustando a rotação sem entrar na parede"
            >
              <Magnet className="size-3.5 text-primary" /> Encostar Parede
            </button>

            <button
              onClick={() => {
                const cos = Math.abs(Math.cos(selected.rot));
                const sin = Math.abs(Math.sin(selected.rot));
                const effW = selected.w * cos + selected.d * sin;
                const effD = selected.w * sin + selected.d * cos;

                const minX = -room.width / 2 + effW / 2;
                const maxX = room.width / 2 - effW / 2;
                const minZ = -room.depth / 2 + effD / 2;
                const maxZ = room.depth / 2 - effD / 2;

                const newX = Math.max(minX, Math.min(maxX, selected.x));
                const newZ = Math.max(minZ, Math.min(maxZ, selected.z));

                onUpdate(selected.uid, { x: newX, z: newZ });
              }}
              className="px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/10 text-on-surface text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all"
              title="Recalcula e retira o móvel de dentro das paredes caso esteja colidindo"
            >
              <Sliders className="size-3.5 text-primary" /> Recalcular Posição
            </button>

            <button
              onClick={() => {
                const newRot = (selected.rot + Math.PI / 2) % (Math.PI * 2);
                const cos = Math.abs(Math.cos(newRot));
                const sin = Math.abs(Math.sin(newRot));
                const effW = selected.w * cos + selected.d * sin;
                const effD = selected.w * sin + selected.d * cos;

                const minX = -room.width / 2 + effW / 2;
                const maxX = room.width / 2 - effW / 2;
                const minZ = -room.depth / 2 + effD / 2;
                const maxZ = room.depth / 2 - effD / 2;

                const newX = Math.max(minX, Math.min(maxX, selected.x));
                const newZ = Math.max(minZ, Math.min(maxZ, selected.z));

                onUpdate(selected.uid, { rot: newRot, x: newX, z: newZ });
              }}
              className="px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/10 text-on-surface text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all"
              title="Gira 90 graus mantendo dentro dos limites do cômodo"
            >
              <RotateCw className="size-3.5 text-primary" /> Girar 90°
            </button>

            <button
              onClick={() => onUpdate(selected.uid, { x: 0, z: 0 })}
              className="px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/10 text-on-surface text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all"
              title="Centralizar no meio do quarto"
            >
              <Home className="size-3.5 text-primary" /> Centralizar
            </button>
          </div>
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

      {/* Material & Finish */}
      <div className="space-y-3 border-t border-white/10 pt-4">
        <span className="text-xs font-semibold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
          <Palette className="size-3.5 text-primary" /> Acabamento &amp; Textura PBR
        </span>

        {/* Material Type Pills */}
        <div className="grid grid-cols-3 gap-1 bg-white/5 p-1 rounded-lg">
          {(['wood', 'fabric', 'leather', 'metal', 'ceramic'] as const).map((type) => {
            const labels: Record<string, string> = {
              wood: 'Madeira',
              fabric: 'Tecido',
              leather: 'Couro',
              metal: 'Metal',
              ceramic: 'Mármore',
            };
            const isActive = selected.dm.t === type;
            return (
              <button
                key={type}
                onClick={() => {
                  const defaultColors: Record<string, string> = {
                    wood: '#C4A67D',
                    fabric: '#D4C5A9',
                    leather: '#C4853A',
                    metal: '#E0E0E0',
                    ceramic: '#F0F0F0',
                  };
                  onUpdate(selected.uid, {
                    dm: { t: type, c: defaultColors[type] || selected.dm.c },
                  });
                }}
                className={`py-1 text-[10px] font-medium rounded-md transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-on-surface-variant hover:text-white hover:bg-white/5'
                }`}
              >
                {labels[type]}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-on-surface-variant">
            Cor Personalizada
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
                    ? 'border-primary bg-primary/20 text-white shadow-sm'
                    : 'border-white/10 bg-white/[0.02] text-on-surface-variant hover:border-white/30'
                }`}
              >
                <div className="w-3.5 h-3.5 rounded-full border border-white/30 flex-shrink-0" style={{ backgroundColor: opt.c }} />
                <span className="text-[10px] font-medium truncate">{opt.n}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
