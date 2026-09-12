'use client';

import React, { useState, useMemo } from 'react';
import { CATALOG, OPENING_PRESETS, OpeningPreset } from '../lib/furniture-data';
import { FurnitureSpec, WallOpening } from '../types/furniture';
import {
  CookingPot,
  Zap,
  Sofa,
  Bed,
  Bath,
  Utensils,
  Briefcase,
  Sparkles,
  Trees,
  Fence,
  Plus,
  GripVertical,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Layers,
  Box,
  DoorOpen,
  DoorClosed,
  Columns,
  Maximize,
  SquareDashed,
  AppWindow,
  Maximize2,
  StretchHorizontal,
  Grid,
} from 'lucide-react';

const iconMap: Record<string, any> = {
  CookingPot,
  Zap,
  Sofa,
  Bed,
  Bath,
  Utensils,
  Briefcase,
  Sparkles,
  Trees,
  Fence,
  DoorOpen,
  DoorClosed,
  Columns,
  Maximize,
  SquareDashed,
  AppWindow,
  Maximize2,
  StretchHorizontal,
  Grid,
};

interface CatalogSidebarProps {
  onAdd: (spec: FurnitureSpec) => void;
  onAddOpening?: (preset: OpeningPreset) => void;
  onClose?: () => void;
}

export default function CatalogSidebar({ onAdd, onAddOpening, onClose }: CatalogSidebarProps) {
  const [activeTab, setActiveTab] = useState<'furniture' | 'openings'>('furniture');
  const [searchTerm, setSearchTerm] = useState('');
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    kitchen: true,
    appliances: false,
    living: false,
    bedroom: false,
    bathroom: false,
    dining: false,
    office: false,
    decor: false,
    outdoor: false,
    structure: false,
  });

  const toggleCategory = (id: string) => {
    setOpenCategories((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const nextState: Record<string, boolean> = {};
    CATALOG.forEach((cat) => {
      nextState[cat.id] = true;
    });
    setOpenCategories(nextState);
  };

  const collapseAll = () => {
    const nextState: Record<string, boolean> = {};
    CATALOG.forEach((cat) => {
      nextState[cat.id] = false;
    });
    setOpenCategories(nextState);
  };

  const filteredCatalog = useMemo(() => {
    if (!searchTerm.trim()) return CATALOG;
    const term = searchTerm.toLowerCase();
    return CATALOG.map((cat) => {
      const matchingItems = cat.items.filter(
        (item) =>
          item.name.toLowerCase().includes(term) ||
          cat.label.toLowerCase().includes(term)
      );
      return {
        ...cat,
        items: matchingItems,
      };
    }).filter((cat) => cat.items.length > 0);
  }, [searchTerm]);

  const totalFilteredItems = useMemo(() => {
    return filteredCatalog.reduce((acc, cat) => acc + cat.items.length, 0);
  }, [filteredCatalog]);

  const totalAllItems = useMemo(() => {
    return CATALOG.reduce((acc, cat) => acc + cat.items.length, 0);
  }, []);

  const handleDragStart = (e: React.DragEvent, item: FurnitureSpec) => {
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragStartOpening = (e: React.DragEvent, preset: OpeningPreset) => {
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        ...preset,
        isOpening: true,
      })
    );
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <aside className="w-80 flex-shrink-0 glass-panel border-r border-white/10 h-full flex flex-col z-20 backdrop-blur-xl shadow-2xl bg-surface-container-lowest/80 text-on-surface">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="font-headline font-bold text-xs tracking-widest uppercase text-primary flex items-center gap-2 truncate">
              <Box className="size-4 text-primary flex-shrink-0" />
              Catálogo 3D Pro
            </h2>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-medium border border-primary/20 flex-shrink-0">
              {activeTab === 'furniture'
                ? searchTerm
                  ? `${totalFilteredItems}`
                  : `${totalAllItems}`
                : `${OPENING_PRESETS.length}`}
            </span>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors flex-shrink-0"
              title="Ocultar Catálogo ( [ )"
            >
              <ChevronLeft className="size-4" />
            </button>
          )}
        </div>

        {/* Tab Switcher: Móveis vs Portas/Janelas */}
        <div className="grid grid-cols-2 gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab('furniture')}
            className={`py-1.5 px-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'furniture'
                ? 'bg-primary text-white shadow-md'
                : 'text-on-surface-variant hover:text-white hover:bg-white/5'
            }`}
          >
            <Sofa className="size-3.5" /> Móveis 3D
          </button>
          <button
            onClick={() => setActiveTab('openings')}
            className={`py-1.5 px-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'openings'
                ? 'bg-primary text-white shadow-md'
                : 'text-on-surface-variant hover:text-white hover:bg-white/5'
            }`}
          >
            <DoorOpen className="size-3.5" /> Portas &amp; Janelas
          </button>
        </div>

        {/* Search input */}
        {activeTab === 'furniture' && (
          <>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-on-surface-variant" />
              <input
                type="text"
                placeholder="Buscar móvel, planta, luz..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg bg-surface-container/60 border border-white/10 text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Controls */}
            {!searchTerm && (
              <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
                <span className="flex items-center gap-1">
                  <Layers className="size-3 text-primary" /> {CATALOG.length} Categorias
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={expandAll}
                    className="hover:text-primary transition-colors text-[10px] font-medium"
                  >
                    Expandir
                  </button>
                  <span className="text-white/20">•</span>
                  <button
                    onClick={collapseAll}
                    className="hover:text-primary transition-colors text-[10px] font-medium"
                  >
                    Recolher
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Main List Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {activeTab === 'openings' ? (
          <div className="space-y-2">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-xs text-on-surface flex items-start gap-2 mb-2">
              <DoorOpen className="size-4 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white block">Vãos Paramétricos em Paredes</span>
                <span className="text-[11px] text-on-surface-variant leading-tight block mt-0.5">
                  Arraste diretamente sobre qualquer uma das 4 paredes da cena ou clique no botão + para inserir.
                </span>
              </div>
            </div>

            {OPENING_PRESETS.map((preset) => {
              const Icon = iconMap[preset.icon] || DoorOpen;
              const isDoor = preset.type.startsWith('door');

              return (
                <div
                  key={preset.id}
                  draggable
                  onDragStart={(e) => handleDragStartOpening(e, preset)}
                  className="group flex flex-col p-3 rounded-xl bg-surface-container-low/50 hover:bg-primary/10 border border-white/5 hover:border-primary/40 transition-all cursor-grab active:cursor-grabbing shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="size-8 rounded-lg bg-white/5 group-hover:bg-primary/20 flex items-center justify-center border border-white/10 group-hover:border-primary/30 flex-shrink-0 transition-colors">
                        <Icon className="size-4 text-primary" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-on-surface group-hover:text-primary transition-colors truncate">
                          {preset.name}
                        </span>
                        <span className="text-[10px] text-on-surface-variant font-mono">
                          {preset.width.toFixed(2)}m × {preset.height.toFixed(2)}m
                          {!isDoor && preset.sillHeight > 0 && ` • Peitoril: ${preset.sillHeight.toFixed(2)}m`}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onAddOpening?.(preset)}
                      className="size-7 flex-shrink-0 rounded-lg flex items-center justify-center bg-white/5 group-hover:bg-primary text-on-surface group-hover:text-white transition-all shadow-sm active:scale-95"
                      title="Inserir vão na parede ativa"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                  <span className="text-[10px] text-on-surface-variant/80 mt-1.5 leading-snug pl-10">
                    {preset.description}
                  </span>
                </div>
              );
            })}
          </div>
        ) : filteredCatalog.length === 0 ? (
          <div className="p-6 text-center text-on-surface-variant text-xs flex flex-col items-center gap-2">
            <Search className="size-6 text-on-surface-variant/40" />
            <span>Nenhum objeto encontrado para &quot;{searchTerm}&quot;</span>
          </div>
        ) : (
          filteredCatalog.map((cat) => {
            const Icon = iconMap[cat.icon] || Sparkles;
            const isOpen = searchTerm.trim() ? true : Boolean(openCategories[cat.id]);

            return (
              <div
                key={cat.id}
                className="rounded-xl bg-surface-container-low/40 border border-white/5 overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className="w-full flex items-center justify-between p-2.5 hover:bg-white/5 transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="size-6 rounded-md bg-primary/10 flex items-center justify-center border border-primary/20">
                      <Icon className="size-3.5 text-primary" />
                    </div>
                    <span className="text-xs font-semibold text-on-surface">{cat.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-on-surface-variant font-mono px-1.5 py-0.5 rounded bg-white/5">
                      {cat.items.length}
                    </span>
                    {isOpen ? (
                      <ChevronDown className="size-3.5 text-on-surface-variant" />
                    ) : (
                      <ChevronRight className="size-3.5 text-on-surface-variant" />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="p-2 pt-0 space-y-1.5">
                    {cat.items.map((item) => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item)}
                        className="group flex items-center justify-between p-2 rounded-lg bg-surface-container-lowest/60 hover:bg-primary/10 border border-white/5 hover:border-primary/40 transition-all cursor-grab active:cursor-grabbing shadow-sm"
                      >
                        <div className="flex items-center gap-2 overflow-hidden pr-2">
                          <GripVertical className="size-3.5 text-white/20 group-hover:text-primary transition-colors flex-shrink-0" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-medium text-on-surface group-hover:text-primary transition-colors truncate">
                              {item.name}
                            </span>
                            <span className="text-[10px] text-on-surface-variant font-mono">
                              {item.w.toFixed(2)} × {item.d.toFixed(2)} × {item.h.toFixed(2)}m
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => onAdd(item)}
                          className="size-7 flex-shrink-0 rounded-md flex items-center justify-center bg-white/5 group-hover:bg-primary text-on-surface group-hover:text-white transition-all shadow-sm active:scale-95"
                          title="Adicionar à cena"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 bg-surface-container-lowest/90">
        <p className="text-[11px] text-on-surface-variant text-center leading-relaxed">
          {activeTab === 'openings'
            ? 'Arraste para uma parede ou clique no +'
            : 'Arraste o item para o piso 3D ou clique no +'}
        </p>
      </div>
    </aside>
  );
}
