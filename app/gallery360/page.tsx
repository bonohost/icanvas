import React from 'react';
import type { Metadata } from 'next';
import Gallery360Viewer from '../components/gallery360/Gallery360Viewer';

export const metadata: Metadata = {
  title: 'Gallery 360 - iCanvas Visualizador 360 com Transição Crossfade',
  description:
    'Galeria imersiva 360 graus com transição suave por transparência (crossfade) entre duas fotos panorâmicas, controles de giroscópio e modo VR.',
};

export default function Gallery360Page() {
  return (
    <main className="w-full min-h-[calc(100vh-80px)] mt-20 flex flex-col items-center justify-center bg-[#050505] overflow-hidden">
      <div className="w-full flex-1 flex flex-col items-center justify-center">
        <Gallery360Viewer />
      </div>
    </main>
  );
}
