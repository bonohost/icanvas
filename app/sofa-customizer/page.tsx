export default function SofaCustomizerPage() {
  return (
    <main className="flex-1 flex mt-20 relative h-[calc(100vh-80px)] pointer-events-none">
      {/* Active Canvas (3D Scene Area) */}
      <div className="flex-1 relative w-full h-full pointer-events-none">
        {/* Floating Viewport Controls */}
        <div className="absolute left-8 top-1/2 -translate-y-1/2 glass-panel rounded-full px-2 py-4 flex flex-col gap-2 z-10 pointer-events-auto">
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 text-on-surface-variant hover:text-primary transition-colors" title="Orbit">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>360</span>
          </button>
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 text-on-surface-variant hover:text-primary transition-colors" title="Pan">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>pan_tool</span>
          </button>
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 text-on-surface-variant hover:text-primary transition-colors" title="Zoom">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>zoom_in</span>
          </button>
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 text-on-surface-variant hover:text-primary transition-colors" title="Focus">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>center_focus_strong</span>
          </button>
        </div>
      </div>

      {/* Right Control Panel */}
      <aside className="w-panel-width flex-shrink-0 glass-panel border-l border-white/10 h-full overflow-y-auto flex flex-col relative z-20 pointer-events-auto">
        <div className="p-6 flex flex-col gap-8 h-full">
          
          {/* Header */}
          <div>
            <h2 className="font-headline-lg-mobile text-on-surface">Configurador de Móveis</h2>
            <p className="font-body-md text-on-surface-variant text-sm">Aura Lounge Chair</p>
          </div>
          
          {/* Config Area */}
          <div className="flex-1 flex flex-col gap-6">
            
            {/* Material */}
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="font-label-sm text-on-surface-variant uppercase">Material</span>
                <span className="font-label-sm text-primary">Leather</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button className="flex flex-col gap-1 items-center">
                  <div className="w-full h-16 rounded-md bg-[#7c533c] border-2 border-primary"></div>
                  <span className="font-label-sm text-on-surface-variant text-[10px]">Leather</span>
                </button>
                <button className="flex flex-col gap-1 items-center opacity-60 hover:opacity-100 transition-opacity">
                  <div className="w-full h-16 rounded-md bg-[#a7aebb] border border-white/10"></div>
                  <span className="font-label-sm text-on-surface-variant text-[10px]">Fabric</span>
                </button>
                <button className="flex flex-col gap-1 items-center opacity-60 hover:opacity-100 transition-opacity">
                  <div className="w-full h-16 rounded-md bg-[#1d3557] border border-white/10"></div>
                  <span className="font-label-sm text-on-surface-variant text-[10px]">Velvet</span>
                </button>
              </div>
            </div>
            
            {/* Color */}
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="font-label-sm text-on-surface-variant uppercase">Color</span>
                <span className="font-label-sm text-primary">Cognac</span>
              </div>
              <div className="flex gap-2">
                <button className="w-8 h-8 rounded-full bg-[#bd5d21] border-2 border-primary"></button>
                <button className="w-8 h-8 rounded-full bg-[#201e1a] border border-white/10 opacity-70 hover:opacity-100"></button>
                <button className="w-8 h-8 rounded-full bg-[#ece7dd] border border-white/10 opacity-70 hover:opacity-100"></button>
                <button className="w-8 h-8 rounded-full bg-[#3c4238] border border-white/10 opacity-70 hover:opacity-100"></button>
              </div>
            </div>

            {/* Base Finish */}
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="font-label-sm text-on-surface-variant uppercase">Base Finish</span>
                <span className="font-label-sm text-primary">Matte Black</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button className="px-3 py-4 rounded-md border-2 border-primary bg-white/5 flex items-center justify-between text-left">
                  <span className="font-label-sm text-on-surface">Matte<br/>Black</span>
                  <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
                </button>
                <button className="px-3 py-4 rounded-md border border-white/10 hover:border-white/30 flex items-center justify-between text-left transition-colors">
                  <span className="font-label-sm text-on-surface-variant">Brushed<br/>Steel</span>
                </button>
              </div>
            </div>
          </div>
          
          {/* Actions & Price */}
          <div className="mt-auto pt-6 border-t border-white/10">
            <div className="flex flex-col mb-4">
              <span className="font-label-sm text-on-surface-variant">Total</span>
              <span className="font-headline-lg-mobile text-on-surface font-bold">$1,249</span>
            </div>
            <button className="w-full bg-primary-container text-on-primary-container font-button-md py-3 rounded-lg hover:brightness-110 active:scale-95 transition-all flex justify-center items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
              Add to Order
            </button>
          </div>
        </div>
      </aside>
    </main>
  );
}
