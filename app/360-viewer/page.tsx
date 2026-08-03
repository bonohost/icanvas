export default function Viewer360Page() {
  return (
    <main className="flex-1 flex mt-20 relative h-[calc(100vh-80px)] pointer-events-none">
      <div className="flex-1 relative w-full h-full pointer-events-none">
        {/* Top Left Title */}
        {/* <div className="absolute top-8 left-8 z-10 glass-panel rounded-xl p-6 pointer-events-auto">
          <h1 className="font-headline-lg-mobile text-on-surface font-bold">Visualizador 360 Render</h1>
          <p className="font-label-sm text-outline-variant mt-1 uppercase tracking-widest">Premium VR Environment</p>
        </div> */}
        
        {/* Top Right Controls */}
        {/* <div className="absolute top-8 right-8 z-10 glass-panel rounded-lg p-2 flex gap-2 pointer-events-auto">
          <button className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-white/5 text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>360</span>
          </button>
          <button className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-white/5 text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>fullscreen</span>
          </button>
          <button className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-white/5 text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>videocam</span>
          </button>
        </div> */}

        {/* Bottom Left Details */}
        {/* <div className="absolute bottom-8 left-8 z-10 glass-panel rounded-xl p-6 w-80 pointer-events-auto">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-on-surface-variant text-sm">info</span>
            <span className="font-label-sm text-on-surface-variant">Scene Details</span>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-surface/50 rounded-lg p-3 border border-white/5">
              <span className="block font-label-sm text-on-surface-variant text-[10px] uppercase mb-1">Resolution</span>
              <span className="font-body-md text-on-surface font-semibold text-sm">8K Ultra HD</span>
            </div>
            <div className="bg-surface/50 rounded-lg p-3 border border-white/5">
              <span className="block font-label-sm text-on-surface-variant text-[10px] uppercase mb-1">Lighting</span>
              <span className="font-body-md text-on-surface font-semibold text-sm">Global Illum.</span>
            </div>
          </div>
          <div>
            <span className="block font-label-sm text-on-surface-variant text-[10px] uppercase mb-2">Active Materials</span>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-surface-variant rounded text-[10px] font-label-sm text-tertiary">Glass</span>
              <span className="px-2 py-1 bg-surface-variant rounded text-[10px] font-label-sm text-primary">Brushed Metal</span>
              <span className="px-2 py-1 bg-surface-variant rounded text-[10px] font-label-sm text-on-surface-variant">Matte Obsidian</span>
            </div>
          </div>
        </div> */}

        {/* Bottom Right Controls */}
        {/* <div className="absolute bottom-8 right-8 z-10 flex gap-2 pointer-events-auto">
          <button className="w-12 h-12 glass-panel rounded-full flex items-center justify-center hover:glass-panel-active text-on-surface transition-all">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>zoom_in</span>
          </button>
          <button className="w-12 h-12 glass-panel rounded-full flex items-center justify-center hover:glass-panel-active text-on-surface transition-all">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>zoom_out</span>
          </button>
        </div> */}
      </div>
    </main>
  );
}
