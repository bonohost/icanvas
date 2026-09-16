'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Home, Coffee, Sofa, Monitor, MessageCircle, Sparkles } from 'lucide-react';

export default function MobileMenuDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { href: '/mobile', label: 'Início Mobile', icon: Home },
    { href: '/mobile/mug-coffee', label: 'Caneca & Café 3D', icon: Coffee },
    { href: '/mobile/studio', label: 'Studio 3D Ambientes', icon: Sofa },
    { href: '/', label: 'Modo Desktop Completo', icon: Monitor },
  ];

  return (
    <>
      {/* Floating Hamburger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 w-10 h-10 rounded-full bg-neutral-900/80 backdrop-blur-xl border border-white/20 text-white flex items-center justify-center shadow-2xl active:scale-90 transition-all cursor-pointer"
        aria-label="Abrir Menu de Navegação"
      >
        <Menu className="w-5 h-5 text-neutral-200" />
      </button>

      {/* Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        />
      )}

      {/* Slide-out Drawer */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-[280px] z-50 bg-neutral-950/95 backdrop-blur-2xl border-r border-white/10 flex flex-col justify-between p-5 transition-transform duration-300 ease-out shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="text-base font-extrabold text-white tracking-tight">iCanvas 3D</span>
                <span className="block text-[10px] font-mono text-blue-400">Mobile Suite</span>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-2">
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider px-2">
              Simuladores &amp; Páginas
            </span>
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                      : 'text-neutral-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Drawer Footer (WhatsApp / Contact) */}
        <div className="pt-4 border-t border-white/10 space-y-3">
          <a
            href="https://wa.me/5516991041695?text=Ol%C3%A1!%20Gostaria%20de%20tirar%20d%C3%BAvidas%20sobre%20o%20iCanvas%203D"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold shadow-lg active:scale-95 transition-transform"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Falar no WhatsApp</span>
          </a>

          <p className="text-[10px] text-center text-neutral-400">
            iCanvas 3D &bull; WebGL &amp; PBR Engine
          </p>
        </div>
      </aside>
    </>
  );
}
