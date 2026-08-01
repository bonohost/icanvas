'use client';

// Este componente representa o painel lateral de controle do seu mockup.

export default function MugControls() {
  return (
    <main className="flex-1 flex mt-20 relative h-[calc(100vh-80px)]">
      {/* A área do canvas 3D é renderizada pelo <Scene/> no layout.tsx */}
      {/* Esta div serve como um placeholder para o conteúdo da página, se houver. */}
      <div className="flex-1">
        {/* Contextual Title from mockup */}
        <div className="absolute top-8 left-8 z-10 pointer-events-none">
          <h1 className="text-5xl md:text-6xl font-bold text-on-surface opacity-80 mix-blend-screen">
            Simulador
            <br />
            de Canecas 3D
          </h1>
        </div>
      </div>

      {/* Right Control Panel */}
      <aside className="w-[320px] flex-shrink-0 glass-panel border-l border-white/10 h-full overflow-y-auto flex flex-col relative z-20">
        <div className="p-6 flex flex-col gap-8 h-full">
          {/* Section Header */}
          <div>
            <h2 className="text-xl font-semibold text-primary mb-2">Texture Configurator</h2>
            <p className="text-sm text-on-surface-variant">
              Faça upload de uma imagem ou digite um texto para aplicar na caneca.
            </p>
          </div>

          {/* Upload Area */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="border-2 border-dashed border-outline-variant rounded-xl p-8 flex flex-col items-center justify-center text-center hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer group glass-panel-active h-64">
              <span className="material-symbols-outlined text-4xl text-outline-variant group-hover:text-primary mb-4 transition-colors">
                upload_file
              </span>
              <span className="font-semibold text-on-surface group-hover:text-primary transition-colors">
                Arraste sua textura
              </span>
              <span className="text-xs text-outline-variant mt-2 uppercase tracking-wider">JPG, PNG (Max 4K)</span>
            </div>

            {/* TODO: Adicionar os controles de material (Roughness, Metallic) e texto aqui */}
          </div>

          {/* Actions */}
          <div className="mt-auto pt-6 flex gap-3 border-t border-white/10">
            <button className="flex-1 glass-panel text-on-surface font-semibold py-3 rounded-lg hover:border-primary/50 transition-colors">
              Resetar
            </button>
            <button className="flex-1 bg-primary-container text-on-primary-container font-semibold py-3 rounded-lg hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]">
              Aplicar
            </button>
          </div>
        </div>
      </aside>
    </main>
  );
}