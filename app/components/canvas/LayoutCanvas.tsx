'use client';

import { Canvas } from '@react-three/fiber';
import { ReactNode } from 'react';

export default function LayoutCanvas({ children }: { children: ReactNode }) {
  return (
    // Este container posiciona o canvas fixo no fundo e atrás de todo o conteúdo (-z-10)
    <div className="fixed top-0 left-0 w-full h-full -z-10">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ pointerEvents: 'none' }}
      >
        {children}
      </Canvas>
    </div>
  );
}