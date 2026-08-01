'use client';

import { useSofaStore } from '@/app/stores/sofaStore';

export default function SofaPage() {
  const { materials, currentMaterialName, setMaterial } = useSofaStore();
  const materialKeys = Object.keys(materials) as (keyof typeof materials)[];

  return (
    <main className="flex-1 flex pt-20 h-full w-full relative">
      {/* A cena 3D é renderizada pelo <Scene/> no layout.tsx */}

      {/* Painel de Controle da Direita (baseado no seu mockup) */}
      <div className="absolute right-[64px] top-[64px] bottom-[64px] w-[320px] z-10 flex flex-col">
        <div className="glass-panel-active rounded-xl h-full flex flex-col overflow-hidden shadow-2xl shadow-black/50">
          {/* Header do Painel */}
          <div className="p-6 border-b border-white/10">
            <h1 className="text-xl text-on-surface font-bold tracking-tight mb-1">Configurador de Móveis</h1>
            <p className="text-on-surface-variant text-sm">Aura Lounge Chair</p>
          </div>

          {/* Conteúdo com Rolagem */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
            {/* Seção de Material */}
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xs text-on-surface-variant uppercase tracking-widest font-mono">Material</h2>
                <span className="text-xs text-primary font-mono">{currentMaterialName}</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {materialKeys.map((key) => (
                  <button
                    key={key}
                    onClick={() => setMaterial(key)}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div
                      className={`w-full aspect-square rounded-lg border-2 overflow-hidden transition-colors ${
                        currentMaterialName === key ? 'border-primary' : 'border-outline-variant group-hover:border-white/30'
                      }`}
                    >
                      {/* Aqui você colocaria uma miniatura da textura */}
                      <div className="absolute inset-0" style={{ backgroundColor: materials[key].color.getStyle() }}></div>
                    </div>
                    <span
                      className={`text-xs font-mono transition-colors ${
                        currentMaterialName === key ? 'text-primary' : 'text-on-surface-variant group-hover:text-on-surface'
                      }`}
                    >
                      {key}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            {/* TODO: Adicionar seções de Cor e Acabamento da Base */}
          </div>

          {/* Footer do Painel */}
          <div className="p-6 border-t border-white/10 bg-black/20">
            <button className="w-full bg-primary-container text-on-primary-container py-3 rounded-lg font-semibold text-sm hover:brightness-110 active:scale-95 flex items-center justify-center gap-2 transition-all">
              <span className="material-symbols-outlined text-base">shopping_cart</span>
              Adicionar ao Pedido
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}