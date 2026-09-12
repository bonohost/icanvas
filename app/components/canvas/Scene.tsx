'use client';

import { Suspense, lazy, ReactElement } from 'react';
import { usePathname } from 'next/navigation';
import { Preload } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';

// Carregamento sob demanda (Lazy Loading) dos componentes de cena
const HomeScene = lazy(() => import('./HomeScene'));
const MugScene = lazy(() => import('./MugScene'));
const SofaScene = lazy(() => import('./SofaScene'));
const Viewer360Scene = lazy(() => import('./Viewer360Scene'));

const scenes = {
  '/': <HomeScene />,
  '/mug-simulator': <MugScene />,
  '/sofa-customizer': <SofaScene />,
  '/360-viewer': <Viewer360Scene />,
} as const;

export default function Scene(): ReactElement | null {
  const pathname = usePathname();

  // Seleciona a cena com base na rota atual, com fallback para a HomeScene
  const CurrentSceneComponent = scenes[pathname as keyof typeof scenes] || <HomeScene />;

  // A-Frame ou Studio gerenciam seus próprios Viewports interativos.
  if (pathname === '/360-viewer') {
    return (
      <div className="fixed top-0 left-0 w-full h-full z-0">
        <Suspense fallback={null}>
          <Viewer360Scene />
        </Suspense>
      </div>
    );
  }

  if (pathname === '/studio') {
    return null;
  }

  const cameraPosition: [number, number, number] = pathname === '/mug-simulator' ? [0, 0.15, 2.3] : [0, 0, 5];
  const cameraFov = pathname === '/mug-simulator' ? 45 : 50;

  return (
    // Para todas as outras cenas, usamos o Canvas do React Three Fiber.
    // A div externa desabilita os eventos de ponteiro para não bloquear o conteúdo da página.
    <div className="fixed top-0 left-0 w-full h-full z-0 pointer-events-auto">
      <Canvas camera={{ position: cameraPosition, fov: cameraFov }}>
        <Suspense fallback={null}>
          {CurrentSceneComponent}
          <Preload all />
        </Suspense>
      </Canvas>
    </div>
  );
}