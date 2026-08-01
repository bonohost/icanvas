export default function MugSimulatorPage() {
  return (
    <main className="flex-1 flex mt-20 relative h-[calc(100vh-80px)] pointer-events-none">
      {/* Active Canvas (3D Scene Area) */}
      <div className="flex-1 relative w-full h-full pointer-events-none">
        {/* Floating Viewport Controls */}
        <div className="absolute bottom-margin-mobile md:bottom-margin-desktop left-1/2 -translate-x-1/2 glass-panel rounded-full px-4 py-2 flex gap-2 z-10 pointer-events-auto">
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 text-on-surface-variant hover:text-primary transition-colors" title="Orbit">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>360</span>
          </button>
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 text-on-surface-variant hover:text-primary transition-colors" title="Pan">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>pan_tool</span>
          </button>
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 text-on-surface-variant hover:text-primary transition-colors" title="Zoom">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>zoom_in</span>
          </button>
        </div>
        
        {/* Contextual Title */}
        <div className="absolute top-8 left-8 z-10 pointer-events-none">
          <h1 className="font-display-lg text-on-surface opacity-80 mix-blend-screen">Simulador<br/>de Canecas 3D</h1>
        </div>
      </div>

      {/* Right Control Panel */}
      <aside className="w-panel-width flex-shrink-0 glass-panel border-l border-white/10 h-full overflow-y-auto flex flex-col relative z-20 pointer-events-auto">
        <div className="p-6 flex flex-col gap-8 h-full">
          {/* Section Header */}
          <div>
            <h2 className="font-headline-lg-mobile text-primary mb-2">Texture Configurator</h2>
            <p className="font-body-md text-on-surface-variant text-sm">Upload an image to map onto the ceramic surface.</p>
          </div>
          
          {/* Upload Area */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="border-2 border-dashed border-outline-variant rounded-xl p-8 flex flex-col items-center justify-center text-center hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer group glass-panel-active h-64">
              <span className="material-symbols-outlined text-4xl text-outline-variant group-hover:text-primary mb-4 transition-colors" style={{ fontVariationSettings: "'FILL' 0" }}>upload_file</span>
              <span className="font-button-md text-on-surface group-hover:text-primary transition-colors">Drag &amp; Drop Texture</span>
              <span className="font-label-sm text-outline-variant mt-2">JPG, PNG (Max 4K)</span>
            </div>
            
            {/* Material Properties */}
            <div className="flex flex-col gap-4 mt-4">
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="font-label-sm text-on-surface-variant">MATERIAL BASE</span>
                <span className="font-label-sm text-primary">Ceramic</span>
              </div>
              <div className="space-y-2">
                <label className="font-label-sm text-on-surface-variant block">Roughness</label>
                <input className="w-full accent-primary bg-surface h-1 rounded-full appearance-none outline-none" max="100" min="0" type="range" defaultValue="20"/>
              </div>
              <div className="space-y-2">
                <label className="font-label-sm text-on-surface-variant block">Metallic</label>
                <input className="w-full accent-primary bg-surface h-1 rounded-full appearance-none outline-none" max="100" min="0" type="range" defaultValue="5"/>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="mt-auto pt-6 flex gap-3 border-t border-white/10">
            <button className="flex-1 glass-panel text-on-surface font-button-md py-3 rounded-lg hover:border-primary/50 transition-colors">Reset</button>
            <button className="flex-1 bg-primary-container text-on-primary-container font-button-md py-3 rounded-lg hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]">Apply</button>
          </div>
        </div>
      </aside>
    </main>
  );
}
