import Link from "next/link";

export default function HomePage() {
  return (
    <>
      {/* Main Content */}
      <main className="flex-grow z-10 relative pt-24 md:pt-32 px-margin-mobile md:px-margin-desktop flex flex-col items-center">
        
        {/* Hero Section */}
        <section className="text-center max-w-4xl mx-auto py-20 md:py-32 flex flex-col items-center">
          <h1 className="font-display-lg text-display-lg font-bold text-on-background mb-6 tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
            WEGBL 3D para o seu produto ou serviço. Seu cliente simula, seu cliente compra.
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mx-auto mb-12 text-lg">
            De ao seu cliente a oportunidade de visualizar e interagir com seu produto em 3D, diretamente no navegador. Experimente a imersão total com o iCanvas.
          </p>
          <Link href="/mug-simulator" className="bg-primary-container text-on-primary-container font-button-md text-button-md px-8 py-4 rounded-lg hover:opacity-90 transition-opacity active:scale-95 shadow-[0_0_30px_rgba(37,99,235,0.3)] flex items-center gap-2">
            Começar Agora
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
        </section>

        {/* Simulators Bento Grid */}
        <section className="w-full max-w-7xl mx-auto pb-32">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Mug Sim Card */}
            <Link href="/mug-simulator" className="glass-panel rounded-xl p-8 hover:glass-panel-active transition-all duration-500 group flex flex-col h-full cursor-pointer relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-electric-glow/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="mb-6 h-48 w-full rounded-lg overflow-hidden relative border border-white/5">
                <img alt="Mug Sim" className="object-cover w-full h-full opacity-80 group-hover:opacity-100 transition-opacity duration-300" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCR83Wptz43BKcUdES_89T9qVSVts2fxDRE7cWbolhEX0_nqsnTDZrd9tsPfT7dUsSa24suAdM455TdQsQXBi8ycaZdsTt--j5vRoTH5OcnubcsDMfChsCwaNnMM6nG1EB6926m4z9YiwzsJieeUrE7RHOvQP3bv48jbn10eXK9G9HPOzQidRsd0tVBRhg3eyiCtzw7cbwZn4Sn00ZXICvPO862YZJKiqbcvMWysM32kO8WhqWY72d-" />
              </div>
              <div className="flex items-center gap-3 mb-3 relative z-10">
                <span className="material-symbols-outlined text-primary text-[24px]">coffee</span>
                <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Mug Sim</h3>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant relative z-10">Simulador de personalização de canecas em tempo real. Teste materiais, estampas e reflexos com precisão milimétrica.</p>
            </Link>

            {/* Configurator Card */}
            <Link href="/sofa-customizer" className="glass-panel rounded-xl p-8 hover:glass-panel-active transition-all duration-500 group flex flex-col h-full cursor-pointer relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-electric-glow/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="mb-6 h-48 w-full rounded-lg overflow-hidden relative border border-white/5">
                <img alt="Configurator" className="object-cover w-full h-full opacity-80 group-hover:opacity-100 transition-opacity duration-300" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCRIpVrJrLWY3YlXRh01vp7gvLTRJ8dpWYkl0-uWHNOE0X_MwYnrlOl3LWUIsrqnTZwrWcB0VXzSnVZ2my0C5FD1yj4PvddSC7_qV6CNpSgPGmLTwWdfKLGP2YTUq7YZh3EFYhzwi8UshDW5YJpWkcDs_w0bXeHm-c5zpfEhdxgI78u49T83kglghJlJKmhgZJDZlOJ5qOu0GKzs5fEKVg17CJ6vQGWbAZv5pOW4xAkCI8boDIyT7vT" />
              </div>
              <div className="flex items-center gap-3 mb-3 relative z-10">
                <span className="material-symbols-outlined text-primary text-[24px]">tune</span>
                <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Configurator</h3>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant relative z-10">Plataforma robusta para configuração de móveis e produtos complexos. Explore variações estruturais instantaneamente.</p>
            </Link>

            {/* 360 Viewer Card */}
            <Link href="/360-viewer" className="glass-panel rounded-xl p-8 hover:glass-panel-active transition-all duration-500 group flex flex-col h-full cursor-pointer relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-electric-glow/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="mb-6 h-48 w-full rounded-lg overflow-hidden relative border border-white/5">
                <img alt="360 Viewer" className="object-cover w-full h-full opacity-80 group-hover:opacity-100 transition-opacity duration-300" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCgQrzk7TGxDAHkvAWZ8NIv909I4L-4v26KpJ2BJBLTHDTmXXen9zABHv8C5ByztXWCBd5TeJMunWu-ZMNB0ORjNhQjJde-zn4SRsx5zlbpdR_9J6G3mEmzDLFM9V2EYvVM5ENNZ9RZpSnq39TlgMt54PCo6qa9W41D9lDl3PzHQahwQVGD7geN7LOlIof3Zub9eR_3DNmtFZ5KURhpQntO0qG2YMxdym2HiIPhMUEy_bM44SkzbFZM" />
              </div>
              <div className="flex items-center gap-3 mb-3 relative z-10">
                <span className="material-symbols-outlined text-primary text-[24px]">360</span>
                <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">360 Viewer</h3>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant relative z-10">Imersão total em ambientes virtuais. Navegação panorâmica suave otimizada para web, proporcionando uma visão completa.</p>
            </Link>

            {/* Studio 3D Card */}
            <Link href="/studio" className="glass-panel rounded-xl p-8 hover:glass-panel-active transition-all duration-500 group flex flex-col h-full cursor-pointer relative overflow-hidden md:col-span-3 lg:col-span-1">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="mb-6 h-48 w-full rounded-lg overflow-hidden relative border border-white/5 bg-slate-900 flex items-center justify-center">
                <span className="material-symbols-outlined text-6xl text-primary/60 group-hover:text-primary group-hover:scale-110 transition-all">view_in_ar</span>
              </div>
              <div className="flex items-center gap-3 mb-3 relative z-10">
                <span className="material-symbols-outlined text-primary text-[24px]">architecture</span>
                <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Studio 3D</h3>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant relative z-10">Planejador e configurador de ambientes 3D em tempo real com catálogo modular, snap magnético e réguas dinâmicas.</p>
            </Link>

          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-lowest dark:bg-surface-container-lowest w-full py-16 border-t border-outline-variant z-10 relative">
        <div className="flex flex-col md:flex-row justify-between items-center px-margin-desktop gap-8 max-w-full mx-auto">
          <div className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface font-bold tracking-tighter">
            iCanvas
          </div>
          <nav className="flex flex-wrap justify-center gap-6">
            <Link href="#" className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors opacity-80 hover:opacity-100">Privacy Policy</Link>
            <Link href="#" className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors opacity-80 hover:opacity-100">Terms of Service</Link>
            <Link href="#" className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors opacity-80 hover:opacity-100">Documentation</Link>
            <Link href="#" className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors opacity-80 hover:opacity-100">Support</Link>
          </nav>
          <div className="font-label-sm text-label-sm text-on-surface-variant">
            © 2024 iCanvas. Premium 3D Visualization.
          </div>
        </div>
      </footer>
    </>
  );
}
