'use client';

import { useMemo, useRef, useState } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Environment, Center } from '@react-three/drei';
import { CanvasTexture, Group, SRGBColorSpace } from 'three';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';

function Mug(props: any) {
  const groupRef = useRef<Group>(null!);
  const collada = useLoader(ColladaLoader, '/3dmodels/mug/caneca.dae');

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <group {...props} ref={groupRef}>
      <primitive object={collada.scene} dispose={null} />
    </group>
  );
}

export default function MugScene() {
  // Estado para o texto a ser desenhado no canvas
  const [text, setText] = useState('iCanvas');

  // Cria o canvas 2D e a textura
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d')!;
    
    // Desenha o conteúdo no canvas 2D
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.font = 'bold 60px Arial';
    context.fillStyle = '#0077ff';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const canvasTexture = new CanvasTexture(canvas);
    canvasTexture.colorSpace = SRGBColorSpace;
    return canvasTexture;
  }, [text]); // Recria a textura quando o texto muda

  return (
    <>
      <Environment preset="studio" />
      <Center>
        <Mug>
          <meshStandardMaterial map={texture} roughness={0.2} metalness={0.1} />
        </Mug>
      </Center>
      <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
    </>
  );
}