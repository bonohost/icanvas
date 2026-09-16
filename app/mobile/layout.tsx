import React from 'react';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'iCanvas Mobile 3D',
  description: 'Visualização e personalização 3D móvel de alta performance para smartphones e tablets.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

import MobileMenuDrawer from './components/MobileMenuDrawer';

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 w-full h-[100dvh] bg-neutral-950 text-white flex flex-col overflow-hidden select-none touch-none overscroll-none">
      <MobileMenuDrawer />
      {children}
    </div>
  );
}
