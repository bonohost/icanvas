'use client';

import { useFrame } from '@react-three/fiber';
import { Icosahedron } from '@react-three/drei';
import { useRef } from 'react';
import { Mesh } from 'three';

function HeroObject() {
  const meshRef = useRef<Mesh>(null!);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y += delta * 0.2;
    meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.2;
  });

  return (
    <Icosahedron ref={meshRef} args={[1.5, 0]} position={[0, 0, 0]}>
      <meshStandardMaterial color="#0077ff" wireframe />
    </Icosahedron>
  );
}

export default function HomeScene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1.5} />
      <HeroObject />
    </>
  );
}