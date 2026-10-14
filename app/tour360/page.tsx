import React from 'react';
import type { Metadata } from 'next';
import VirtualTour360Viewer from '../components/tour360/VirtualTour360Viewer';

export const metadata: Metadata = {
  title: 'Passeio Virtual 360 - iCanvas Immersive Architectural Tour',
  description:
    'Passeio virtual 360 graus imersivo com navegação espacial por portais/hotspots, marcação detalhada de objetos e modo editor 3D.',
};

export default function Tour360Page() {
  return (
    <main className="w-full h-[calc(100vh-80px)] mt-20 flex flex-col items-center justify-center bg-[#050505] overflow-hidden">
      <div className="w-full h-full flex-1 flex flex-col items-center justify-center">
        <VirtualTour360Viewer />
      </div>
    </main>
  );
}
