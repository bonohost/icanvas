'use client';

import React, { useState } from 'react';
import { CATALOG } from '../lib/furniture-data';
import { FurnitureSpec } from '../types/furniture';
import {
  CookingPot,
  Zap,
  Sofa,
  Utensils,
  Sparkles,
  Plus,
  GripVertical,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

const iconMap: Record<string, any> = {
  CookingPot,
  Zap,
  Sofa,
  Utensils,
  Sparkles,
};

interface CatalogSidebarProps {
  onAdd: (spec: FurnitureSpec) => void;
}

export default function CatalogSidebar({ onAdd }: CatalogSidebarProps) {
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    kitchen: true,
    appliances: true,
    living: false,
    dining: false,
    decor: false,
  });

  const toggleCategory = (id: string) => {
    setOpenCategories((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDragStart = (e: React.DragEvent, item: FurnitureSpec) => {
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <aside className="w-72 flex-shrink-0 glass-panel border-r border-white/10 h-full flex flex-col z-20 backdrop-blur-xl shadow-2xl">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h2 className="font-headline font-bold text-xs tracking-widest uppercase text-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">inventory_2</span>
          Catálogo 3D
        </h2>
        <span className="text-[10px] text-on-surface-variant font-mono">
          {CATALOG.reduce((acc, cat) => acc + cat.items.length, 0)} itens
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {CATALOG.map((cat) => {
          const Icon = iconMap[cat.icon] || Sparkles;
          const isOpen = openCategories[cat.id];

          return (
            <div key={cat.id} className="rounded-xl bg-white/[0.03] border border-white/5 overflow-hidden">
              <button
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center justify-between p-2.5 hover:bg-white/5 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="size-4 text-primary" />
                  <span className="text-xs font-semibold text-on-surface">{cat.label}</span>
                </div>
                {isOpen ? (
                  <ChevronDown className="size-3.5 text-on-surface-variant" />
                ) : (
                  <ChevronRight className="size-3.5 text-on-surface-variant" />
                )}
              </button>

              {isOpen && (
                <div className="p-2 pt-0 space-y-1.5">
                  {cat.items.map((item) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item)}
                      className="group flex items-center justify-between p-2 rounded-lg bg-white/[0.02] hover:bg-primary/10 border border-transparent hover:border-primary/30 transition-all cursor-grab active:cursor-grabbing"
                    >
                      <div className="flex items-center gap-2">
                        <GripVertical className="size-3.5 text-white/20 group-hover:text-primary transition-colors" />
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-on-surface group-hover:text-primary transition-colors">
                            {item.name}
                          </span>
                          <span className="text-[10px] text-on-surface-variant font-mono">
                            {item.w.toFixed(2)} × {item.d.toFixed(2)} × {item.h.toFixed(2)}m
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => onAdd(item)}
                        className="size-7 rounded-md flex items-center justify-center bg-white/5 group-hover:bg-primary text-on-surface group-hover:text-white transition-all shadow-sm"
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
        })}
      </div>

      <div className="p-3 border-t border-white/10 bg-white/[0.02]">
        <p className="text-[10px] text-on-surface-variant text-center leading-relaxed">
          Arraste itens para o chão da cena ou clique no{' '}
          <span className="text-primary font-bold">+</span>
        </p>
      </div>
    </aside>
  );
}
