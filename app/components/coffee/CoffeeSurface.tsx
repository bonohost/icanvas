'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { coffeeVertexShader, coffeeFragmentShader } from './CoffeeShaders';

export interface CoffeeSurfaceProps {
  texture: THREE.Texture;
  mixValue: number;
  tileX?: number;
  tileY?: number;
  offsetX?: number;
  offsetY?: number;
  rotation?: number;
  animateWaves?: boolean;
  waveAmplitude?: number;
  waveFrequency?: number;
  vignetteStrength?: number;
  coffeeColorHex?: string;
  bubbleIntensity?: number;
  bubbleScale?: number;
  centerClearRadius?: number;
  liquidY?: number;
  radius?: number;
}

export function CoffeeSurface({
  texture,
  mixValue,
  tileX = 1.0,
  tileY = 1.0,
  offsetX = 0.0,
  offsetY = 0.0,
  rotation = 0.0,
  animateWaves = true,
  waveAmplitude = 0.007,
  waveFrequency = 1.0,
  vignetteStrength = 0.55,
  coffeeColorHex = '#4a1b0b',
  bubbleIntensity = 0.9,
  bubbleScale = 68.0,
  centerClearRadius = 0.50,
  liquidY = 0.72,
  radius = 0.93,
}: CoffeeSurfaceProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null!);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTexture: { value: texture },
      uMix: { value: mixValue },
      uTile: { value: new THREE.Vector2(tileX, tileY) },
      uOffset: { value: new THREE.Vector2(offsetX, offsetY) },
      uRotation: { value: rotation },
      uAnimateWaves: { value: animateWaves ? 1.0 : 0.0 },
      uCoffeeColor: { value: new THREE.Color(coffeeColorHex) },
      uCremaColor: { value: new THREE.Color('#4c230e') },
      uWaveFrequency: { value: waveFrequency },
      uWaveAmplitude: { value: waveAmplitude },
      uVignetteRadius: { value: 0.72 },
      uVignetteStrength: { value: vignetteStrength },
      uLiquidDistortion: { value: 4.0 },
      uBubbleIntensity: { value: bubbleIntensity },
      uBubbleScale: { value: bubbleScale },
      uCenterClearRadius: { value: centerClearRadius },
    }),
    []
  );

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      // Smooth lerp transition for uMix
      materialRef.current.uniforms.uMix.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uMix.value,
        mixValue,
        delta * 3.8
      );
      materialRef.current.uniforms.uTexture.value = texture;
      materialRef.current.uniforms.uTile.value.set(tileX, tileY);
      materialRef.current.uniforms.uOffset.value.set(offsetX, offsetY);
      materialRef.current.uniforms.uRotation.value = rotation;
      materialRef.current.uniforms.uAnimateWaves.value = animateWaves ? 1.0 : 0.0;
      materialRef.current.uniforms.uWaveAmplitude.value = waveAmplitude;
      materialRef.current.uniforms.uWaveFrequency.value = waveFrequency;
      materialRef.current.uniforms.uVignetteStrength.value = vignetteStrength;
      materialRef.current.uniforms.uCoffeeColor.value.set(coffeeColorHex);
      materialRef.current.uniforms.uBubbleIntensity.value = bubbleIntensity;
      materialRef.current.uniforms.uBubbleScale.value = bubbleScale;
      materialRef.current.uniforms.uCenterClearRadius.value = centerClearRadius;
    }
  });

  return (
    <mesh
      position={[0, liquidY, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <circleGeometry args={[radius, 128]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={coffeeVertexShader}
        fragmentShader={coffeeFragmentShader}
        uniforms={uniforms}
        transparent={true}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
