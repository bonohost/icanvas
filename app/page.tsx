'use client';

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isMobileDevice =
        window.innerWidth < 768 ||
        /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
      const userPrefersDesktop =
        sessionStorage.getItem("prefer_desktop") === "1";
      if (isMobileDevice && !userPrefersDesktop) {
        router.replace("/mobile");
      }
    }
  }, [router]);
  return (
    <>
      {/* Main Content */}
      <main className="flex-grow z-10 relative pt-20 md:pt-24 px-4 md:px-8 lg:px-12 flex flex-col items-center justify-between">

        {/* Hero Section */}
        <section className="text-center max-w-6xl mx-auto pt-4 md:pt-6 pb-6 md:pb-8 flex flex-col items-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-3 md:mb-4 tracking-tight leading-[1.15] bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/70">
            WebGL 3D para o seu produto ou serviço. Seu cliente simula, seu cliente compra.
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-slate-300 max-w-3xl mx-auto mb-5 md:mb-6 leading-relaxed">
            Dê ao seu cliente a oportunidade de visualizar e interagir com seu produto em 3D, diretamente no navegador. Experimente a imersão total com o iCanvas.
          </p>
          <Link
            href="/mug-coffee"
            className="bg-primary hover:bg-primary-hover text-white font-semibold text-sm md:text-base px-6 py-3 rounded-xl hover:opacity-95 transition-all active:scale-95 shadow-[0_0_25px_rgba(37,99,235,0.4)] flex items-center gap-2"
          >
            <span>Começar Agora</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
        </section>

        {/* Simulators Bento Grid */}
        <section className="w-full max-w-7xl mx-auto pb-12 md:pb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">

            {/* 1. Mug Sim */}
            <Link href="/mug-coffee" className="glass-panel rounded-2xl p-5 lg:p-6 hover:glass-panel-active transition-all duration-300 group flex flex-col h-full cursor-pointer relative overflow-hidden border border-white/10 hover:border-primary/50 shadow-lg hover:shadow-primary/20">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              <div className="mb-4 h-36 sm:h-40 lg:h-44 w-full rounded-xl overflow-hidden relative border border-white/10 bg-slate-950">
                <img alt="Mug Sim" className="object-cover w-full h-full opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCR83Wptz43BKcUdES_89T9qVSVts2fxDRE7cWbolhEX0_nqsnTDZrd9tsPfT7dUsSa24suAdM455TdQsQXBi8ycaZdsTt--j5vRoTH5OcnubcsDMfChsCwaNnMM6nG1EB6926m4z9YiwzsJieeUrE7RHOvQP3bv48jbn10eXK9G9HPOzQidRsd0tVBRhg3eyiCtzw7cbwZn4Sn00ZXICvPO862YZJKiqbcvMWysM32kO8WhqWY72d-" />
              </div>
              <div className="flex items-center gap-2.5 mb-2 relative z-10">
                <span className="material-symbols-outlined text-primary text-[22px]">coffee</span>
                <h3 className="text-base lg:text-lg font-bold text-white">Mug Sim</h3>
              </div>
              <p className="text-xs lg:text-sm text-slate-300 relative z-10 leading-relaxed">Simulador de personalização de canecas em tempo real com Latte Art interativo, relevos cerâmicos e reflexos milimétricos.</p>
            </Link>

            {/* 2. View 360 */}
            <Link href="/360-viewer" className="glass-panel rounded-2xl p-5 lg:p-6 hover:glass-panel-active transition-all duration-300 group flex flex-col h-full cursor-pointer relative overflow-hidden border border-white/10 hover:border-primary/50 shadow-lg hover:shadow-primary/20">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              <div className="mb-4 h-36 sm:h-40 lg:h-44 w-full rounded-xl overflow-hidden relative border border-white/10 bg-slate-950">
                <img alt="View 360" className="object-cover w-full h-full opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCgQrzk7TGxDAHkvAWZ8NIv909I4L-4v26KpJ2BJBLTHDTmXXen9zABHv8C5ByztXWCBd5TeJMunWu-ZMNB0ORjNhQjJde-zn4SRsx5zlbpdR_9J6G3mEmzDLFM9V2EYvVM5ENNZ9RZpSnq39TlgMt54PCo6qa9W41D9lDl3PzHQahwQVGD7geN7LOlIof3Zub9eR_3DNmtFZ5KURhpQntO0qG2YMxdym2HiIPhMUEy_bM44SkzbFZM" />
              </div>
              <div className="flex items-center gap-2.5 mb-2 relative z-10">
                <span className="material-symbols-outlined text-primary text-[22px]">360</span>
                <h3 className="text-base lg:text-lg font-bold text-white">View 360</h3>
              </div>
              <p className="text-xs lg:text-sm text-slate-300 relative z-10 leading-relaxed">Imersão total em ambientes virtuais panorâmicos 360°. Navegação suave otimizada para web, proporcionando uma visão completa.</p>
            </Link>

            {/* 3. Planner 3D */}
            <Link href="/studio" className="glass-panel rounded-2xl p-5 lg:p-6 hover:glass-panel-active transition-all duration-300 group flex flex-col h-full cursor-pointer relative overflow-hidden border border-white/10 hover:border-primary/50 shadow-lg hover:shadow-primary/20">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              <div className="mb-4 h-36 sm:h-40 lg:h-44 w-full rounded-xl overflow-hidden relative border border-white/10 bg-slate-950">
                <img
                  alt="Planner 3D - Planejador de Ambientes"
                  className="object-cover w-full h-full opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                  src="/images/studio-preview.png"
                />
              </div>
              <div className="flex items-center gap-2.5 mb-2 relative z-10">
                <span className="material-symbols-outlined text-primary text-[22px]">architecture</span>
                <h3 className="text-base lg:text-lg font-bold text-white">Planner 3D</h3>
              </div>
              <p className="text-xs lg:text-sm text-slate-300 relative z-10 leading-relaxed">Planejador e configurador de ambientes 3D em tempo real com catálogo modular, snap magnético, planta 2D/3D e Shop the Scene.</p>
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
