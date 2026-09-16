'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Monitor, Sparkles } from 'lucide-react';

export default function MobileHomePage() {
  return (
    <div className="flex-1 flex flex-col bg-gradient-to-b from-neutral-950 via-neutral-900 to-black overflow-y-auto select-none pb-12">
      {/* Top Bar with Desktop Switcher */}
      <div className="flex items-center justify-between px-5 pt-4">
        <div className="flex items-center gap-2">
          <img
            alt="iCanvas"
            className="h-8 w-8 rounded-lg shadow-md"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBnFZQ2bFdaVbssT6uU1ZjtMrnHWlwq6wk6FR-dLrRtjjW0IH3RqgwSrgUL7N_ZYK_kDZB2EyJDf9ZdhOwudm06y5aaMhkxbof6NlrORz0liR2CBKl3BNrGSsNh4oyLcovE5XuzP2kBdwoUexur6W_Do7rWACIFW4hTD1gY11Z_DQcHH2j4I6DSLH_5o4aIug1QkDZ2Yg49gLwxZFUoIw_sIOZMzxT-igdo6wkaDnNNvaVDJNlbrhNN"
          />
          <span className="text-base font-extrabold text-blue-500 tracking-tight">iCanvas 3D</span>
        </div>

        <Link
          href="/"
          onClick={() => {
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('prefer_desktop', '1');
            }
          }}
          className="text-[11px] text-neutral-400 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 flex items-center gap-1.5 transition-colors"
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>Desktop</span>
        </Link>
      </div>

      {/* Hero Section (Texto compacto reduzido pela metade) */}
      <section className="px-5 pt-6 pb-4 text-left">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-mono font-semibold uppercase tracking-wider mb-2.5">
          <Sparkles className="w-3 h-3" />
          <span>WebGL 3D Mobile Engine</span>
        </div>

        <h1 className="text-2xl font-black text-white tracking-tight leading-snug bg-clip-text text-transparent bg-gradient-to-r from-white via-neutral-100 to-neutral-400">
          WebGL 3D para o seu produto. Seu cliente simula, seu cliente compra.
        </h1>

        <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
          Dê ao seu cliente a oportunidade de visualizar e interagir com seu produto em 3D, direto no celular.
        </p>

        <div className="mt-4">
          <Link
            href="/mobile/mug-coffee"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 active:scale-95 transition-all"
          >
            <span>Começar Agora</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Cards Bento Grid (Simuladores com Imagens Oficiais) */}
      <section className="px-5 space-y-3.5 mt-2">
        <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">
          Simuladores Interativos
        </span>

        {/* Card 1: Caneca & Café 3D (Mug Sim) */}
        <Link
          href="/mobile/mug-coffee"
          className="group block rounded-2xl p-4 bg-neutral-900/90 border border-white/10 hover:border-amber-500/40 shadow-xl active:scale-[0.98] transition-all overflow-hidden relative"
        >
          <div className="h-36 w-full rounded-xl overflow-hidden relative border border-white/10 mb-3 bg-neutral-950">
            <img
              alt="Mug Sim"
              className="object-cover w-full h-full opacity-90 group-hover:scale-105 transition-transform duration-500"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCR83Wptz43BKcUdES_89T9qVSVts2fxDRE7cWbolhEX0_nqsnTDZrd9tsPfT7dUsSa24suAdM455TdQsQXBi8ycaZdsTt--j5vRoTH5OcnubcsDMfChsCwaNnMM6nG1EB6926m4z9YiwzsJieeUrE7RHOvQP3bv48jbn10eXK9G9HPOzQidRsd0tVBRhg3eyiCtzw7cbwZn4Sn00ZXICvPO862YZJKiqbcvMWysM32kO8WhqWY72d-"
            />
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-amber-500/90 text-black text-[9px] font-bold">
              ✨ Shader Real
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                ☕ Caneca &amp; Café 3D
              </h3>
              <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
                Personalização de canecas em tempo real com pintura de bolhas e frases no café.
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all flex-shrink-0 ml-2" />
          </div>
        </Link>

        {/* Card 2: Studio 3D (Planejador de Ambientes & Shop the Scene) */}
        <Link
          href="/mobile/studio"
          className="group block rounded-2xl p-4 bg-neutral-900/90 border border-white/10 hover:border-blue-500/40 shadow-xl active:scale-[0.98] transition-all overflow-hidden relative"
        >
          <div className="h-36 w-full rounded-xl overflow-hidden relative border border-white/10 mb-3 bg-neutral-950">
            <img
              alt="Studio 3D"
              className="object-cover w-full h-full opacity-90 group-hover:scale-105 transition-transform duration-500"
              src="/images/studio-preview.png"
            />
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-500/90 text-black text-[9px] font-bold">
              🛍️ Shop the Scene
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                🛋️ Studio 3D &amp; Ambientes
              </h3>
              <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
                Planejador 3D com catálogo modular e links diretos para o Magazine Luiza.
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all flex-shrink-0 ml-2" />
          </div>
        </Link>

        {/* Card 3: 360 Viewer */}
        <Link
          href="/360-viewer"
          className="group block rounded-2xl p-4 bg-neutral-900/90 border border-white/10 hover:border-indigo-500/40 shadow-xl active:scale-[0.98] transition-all overflow-hidden relative"
        >
          <div className="h-36 w-full rounded-xl overflow-hidden relative border border-white/10 mb-3 bg-neutral-950">
            <img
              alt="360 Viewer"
              className="object-cover w-full h-full opacity-90 group-hover:scale-105 transition-transform duration-500"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCgQrzk7TGxDAHkvAWZ8NIv909I4L-4v26KpJ2BJBLTHDTmXXen9zABHv8C5ByztXWCBd5TeJMunWu-ZMNB0ORjNhQjJde-zn4SRsx5zlbpdR_9J6G3mEmzDLFM9V2EYvVM5ENNZ9RZpSnq39TlgMt54PCo6qa9W41D9lDl3PzHQahwQVGD7geN7LOlIof3Zub9eR_3DNmtFZ5KURhpQntO0qG2YMxdym2HiIPhMUEy_bM44SkzbFZM"
            />
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-indigo-500/90 text-white text-[9px] font-bold">
              🌐 Panorâmico
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                🌐 360 Viewer
              </h3>
              <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
                Imersão panorâmica suave otimizada para web e celulares.
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all flex-shrink-0 ml-2" />
          </div>
        </Link>
      </section>
    </div>
  );
}
