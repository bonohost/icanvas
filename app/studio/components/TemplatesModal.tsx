'use client';

import React, { useState } from 'react';
import { ROOM_TEMPLATES, RoomTemplatePreset } from '../lib/room-templates';
import { FurnitureInstance, RoomSettings } from '../types/furniture';
import {
  Sparkles,
  Sofa,
  CookingPot,
  Bed,
  Briefcase,
  Bath,
  Trees,
  X,
  Layers,
  ArrowRight,
  Maximize2,
  Check,
  PlusCircle,
} from 'lucide-react';

const iconMap: Record<string, any> = {
  Sofa,
  CookingPot,
  Bed,
  Briefcase,
  Bath,
  Trees,
};

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTemplate: (template: RoomTemplatePreset, mode: 'replace' | 'append') => void;
}

export default function TemplatesModal({
  isOpen,
  onClose,
  onApplyTemplate,
}: TemplatesModalProps) {
  const [activeCategory, setActiveCategory] = useState<string>('Todas');
  const [selectedTemplate, setSelectedTemplate] = useState<RoomTemplatePreset | null>(null);

  if (!isOpen) return null;

  const categories = ['Todas', 'Residencial', 'Gourmet', 'Corporativo', 'Externa'];

  const filteredTemplates = activeCategory === 'Todas'
    ? ROOM_TEMPLATES
    : ROOM_TEMPLATES.filter((t) => t.category === activeCategory);

  const handleApply = (template: RoomTemplatePreset, mode: 'replace' | 'append') => {
    onApplyTemplate(template, mode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl rounded-2xl bg-[#0f172a]/95 border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[88vh] text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
              <Sparkles className="size-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-headline tracking-wide uppercase text-white">
                Biblioteca de Ambientes Prontos 3D
              </h2>
              <p className="text-[11px] text-white/50">
                Carregue salas, quartos, cozinhas e escritórios decorados com 1 clique
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="size-8 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-white/10 bg-white/[0.01] overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                activeCategory === cat
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((tpl) => {
              const Icon = iconMap[tpl.icon] || Sparkles;

              return (
                <div
                  key={tpl.id}
                  className="group rounded-2xl p-4 bg-white/[0.02] border border-white/10 hover:border-primary/50 hover:bg-white/[0.04] transition-all flex flex-col justify-between gap-4 shadow-lg hover:shadow-primary/5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-105 transition-transform">
                        <Icon className="size-4 text-primary" />
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/70 font-mono border border-white/10">
                        {tpl.category}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-primary transition-colors">
                        {tpl.name}
                      </h3>
                      <p className="text-[11px] text-white/60 leading-relaxed mt-1 line-clamp-2">
                        {tpl.description}
                      </p>
                    </div>

                    {/* Dimensions & Specs */}
                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5 text-[10px] font-mono text-white/70">
                      <div className="flex justify-between">
                        <span className="text-white/40">Dimensões:</span>
                        <span className="text-white font-bold">
                          {tpl.room.width.toFixed(1)}m × {tpl.room.depth.toFixed(1)}m
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/40">Móveis 3D:</span>
                        <span className="text-primary font-bold">{tpl.furniture.length} itens</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    <button
                      onClick={() => handleApply(tpl, 'replace')}
                      className="w-full py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 group/btn"
                    >
                      <span>Substituir Cena</span>
                      <ArrowRight className="size-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                    </button>

                    <button
                      onClick={() => handleApply(tpl, 'append')}
                      className="w-full py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-[10px] font-semibold transition-all flex items-center justify-center gap-1.5"
                      title="Adiciona apenas os móveis deste template sem alterar as paredes do seu ambiente"
                    >
                      <PlusCircle className="size-3" />
                      <span>Mesclar Móveis</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
