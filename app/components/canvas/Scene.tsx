'use client';

import { useFrame } from '@react-three/fiber';
import { Icosahedron } from '@react-three/drei';
import { useRef } from 'react';
import { Mesh } from 'three';

function HeroObject() {
  const meshRef = useRef<Mesh>(null!);

  // useFrame para animar o objeto em cada frame
  useFrame((state, delta) => {
    // Rotação contínua
    meshRef.current.rotation.y += delta * 0.2;
    // Movimento sutil de "flutuação" usando o tempo do estado
    meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.2;
  });

  return (
    // Usamos um Icosaedro para um visual mais "tech"
    <Icosahedron ref={meshRef} args={[1.5, 0]} position={[0, 0, 0]}>
      {/* O material wireframe é ótimo para um look de "planta baixa" 3D */}
      <meshStandardMaterial color="#0077ff" wireframe />
    </Icosahedron>
  );
}

export default function Scene() {
  return (
    <>
      {/* Luzes são essenciais para que os materiais sejam visíveis */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1.5} />
      <pointLight position={[-5, -5, -5]} intensity={0.5} color="blue" />

      <HeroObject />
    </>
  );
}