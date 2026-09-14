'use client';

import React, { useMemo, useRef, useEffect, useState, Suspense } from 'react';
import { useThree, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Float, Environment, Center } from '@react-three/drei';
import * as THREE from 'three';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import { CoffeeSurface } from './CoffeeSurface';

interface DAEColladaMugProps {
  mugColor: string;
  interiorColor: string;
  alcaColor: string;
  outerImage?: string | null;
  outerCustomText?: string;
  outerTextColor?: string;
  outerTextBgColor?: string;
  roughness?: number;
  metalness?: number;
}

/**
 * 3D Mug Model loaded from the simulator's /3dmodels/mug/caneca.dae
 * with real-time UV canvas compositing for exterior, handle, interior colors,
 * external print image and external typography.
 */
function DAEColladaMug({
  mugColor,
  interiorColor,
  alcaColor,
  outerImage,
  outerCustomText,
  outerTextColor = '#ffffff',
  outerTextBgColor = '#1e3a8a',
  roughness = 0.12,
  metalness = 0.05,
}: DAEColladaMugProps) {
  const collada = useLoader(ColladaLoader, '/3dmodels/mug/caneca.dae');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [compositedTexture, setCompositedTexture] = useState<THREE.CanvasTexture | null>(null);

  // Initialize 2K UV Canvas Texture
  useEffect(() => {
    if (!canvasRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 2048;
      canvas.height = 2048;
      canvasRef.current = canvas;
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.flipY = true;
      setCompositedTexture(tex);
    }
  }, []);

  // Update UV Texture Layers whenever colors, image, or text change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !compositedTexture) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isCancelled = false;

    const renderLayers = async () => {
      // 1. Base Exterior Ceramic
      ctx.fillStyle = mugColor || '#ffffff';
      ctx.fillRect(0, 0, 2048, 2048);

      // 2. Handle Area: x: 1090, y: 150, width: 900, height: 390
      ctx.fillStyle = alcaColor || mugColor || '#ffffff';
      ctx.fillRect(1090, 150, 900, 390);

      // 3. Interior Body & Bottom Area
      ctx.fillStyle = interiorColor || mugColor || '#ffffff';
      ctx.fillRect(0, 670, 2048, 580);
      ctx.fillRect(590, 120, 440, 440);

      // 4. Exterior Print Area (Corpo Externo da Caneca)
      // Coordinates: x: 123, y: 1303, width: 1780, height: 700
      const outerX = 123;
      const outerY = 1303;
      const outerW = 1780;
      const outerH = 700;

      if (outerImage) {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = outerImage;
          img.onload = () => {
            if (!isCancelled) {
              ctx.drawImage(img, outerX, outerY, outerW, outerH);
            }
            resolve();
          };
          img.onerror = () => resolve();
        });
      } else if (outerCustomText && outerCustomText.trim().length > 0) {
        // Modern branded typography banner on exterior ceramic
        ctx.save();
        ctx.fillStyle = outerTextBgColor || '#1e3a8a';
        ctx.fillRect(outerX + 40, outerY + 120, outerW - 80, 460);

        // Accent borders
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillRect(outerX + 40, outerY + 110, outerW - 80, 10);
        ctx.fillRect(outerX + 40, outerY + 580, outerW - 80, 10);

        // Main text
        ctx.fillStyle = outerTextColor || '#ffffff';
        ctx.font = 'bold 96px "Arial Black", "Montserrat", "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(outerCustomText, outerX + outerW / 2, outerY + 310);

        // Subtitle badge
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.font = '600 34px "Inter", sans-serif';
        ctx.fillText('CUSTOM 3D CERAMIC &bull; PREMIUM EDITION', outerX + outerW / 2, outerY + 440);
        ctx.restore();
      }

      if (!isCancelled) {
        compositedTexture.needsUpdate = true;
      }
    };

    renderLayers();

    return () => {
      isCancelled = true;
    };
  }, [
    mugColor,
    interiorColor,
    alcaColor,
    outerImage,
    outerCustomText,
    outerTextColor,
    outerTextBgColor,
    compositedTexture,
  ]);

  // Apply texture and PBR material to collada mesh
  useEffect(() => {
    if (!collada?.scene) return;

    collada.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.material = new THREE.MeshPhysicalMaterial({
          map: compositedTexture || null,
          roughness: roughness,
          metalness: metalness,
          clearcoat: 0.85,
          clearcoatRoughness: 0.1,
        });
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }, [collada, compositedTexture, roughness, metalness]);

  if (!collada?.scene) return null;

  return <primitive object={collada.scene} dispose={null} />;
}

function CameraInit() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, 0.75, 1.85);
    camera.lookAt(0, 0, 0);
  }, [camera]);
  return null;
}

export interface CoffeeMugSceneProps {
  texture: THREE.Texture;
  photoFoamTexture?: THREE.Texture | null;
  usePhotoFoam?: boolean;
  baristaPaletteFilter?: number;
  swirlIntensity?: number;
  mixValue: number;
  tileX: number;
  tileY: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
  animateWaves: boolean;
  waveAmplitude: number;
  waveFrequency: number;
  vignetteStrength: number;
  coffeeColor: string;
  mugColor: string;
  interiorColor: string;
  alcaColor?: string;
  outerImage?: string | null;
  outerCustomText?: string;
  outerTextColor?: string;
  outerTextBgColor?: string;
  roughness?: number;
  metalness?: number;
  autoRotate: boolean;
  bubbleIntensity: number;
  bubbleScale: number;
  centerClearRadius?: number;
}

export function CoffeeMugScene({
  texture,
  photoFoamTexture,
  usePhotoFoam = true,
  baristaPaletteFilter = 0.85,
  swirlIntensity = 0.5,
  mixValue,
  tileX,
  tileY,
  offsetX,
  offsetY,
  rotation,
  animateWaves,
  waveAmplitude,
  waveFrequency,
  vignetteStrength,
  coffeeColor,
  mugColor,
  interiorColor,
  alcaColor,
  outerImage,
  outerCustomText,
  outerTextColor,
  outerTextBgColor,
  roughness = 0.12,
  metalness = 0.05,
  autoRotate,
  bubbleIntensity,
  bubbleScale,
  centerClearRadius = 0.50,
}: CoffeeMugSceneProps) {
  const controlsRef = useRef<any>(null);
  const mugGroupRef = useRef<THREE.Group>(null!);

  useFrame((_, delta) => {
    if (mugGroupRef.current && autoRotate) {
      mugGroupRef.current.rotation.y += delta * 0.35;
    }
  });

  const effectiveAlcaColor = alcaColor || mugColor || '#ffffff';

  return (
    <>
      <CameraInit />

      {/* Studio Lighting Setup */}
      <ambientLight intensity={0.75} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
      />
      <directionalLight position={[-5, 4, -4]} intensity={0.5} color="#e0f2fe" />
      <directionalLight position={[0, 6, -5]} intensity={0.6} color="#fff" />
      <spotLight
        position={[0, 4, 1.5]}
        intensity={0.8}
        angle={0.6}
        penumbra={0.8}
      />
      <Environment preset="studio" />

      {/* 3D Mug from Simulator with Coffee Surface inside */}
      <Float speed={1.2} rotationIntensity={0.08} floatIntensity={0.15}>
        <group ref={mugGroupRef} position={[0, 0, 0]}>
          <Center>
            <Suspense fallback={null}>
              <DAEColladaMug
                mugColor={mugColor}
                interiorColor={interiorColor}
                alcaColor={effectiveAlcaColor}
                outerImage={outerImage}
                outerCustomText={outerCustomText}
                outerTextColor={outerTextColor}
                outerTextBgColor={outerTextBgColor}
                roughness={roughness}
                metalness={metalness}
              />
            </Suspense>

            {/* Coffee Liquid Surface placed exactly inside the DAE caneca model */}
            <CoffeeSurface
              texture={texture}
              photoFoamTexture={photoFoamTexture}
              usePhotoFoam={usePhotoFoam}
              baristaPaletteFilter={baristaPaletteFilter}
              swirlIntensity={swirlIntensity}
              mixValue={mixValue}
              tileX={tileX}
              tileY={tileY}
              offsetX={offsetX}
              offsetY={offsetY}
              rotation={rotation}
              animateWaves={animateWaves}
              waveAmplitude={waveAmplitude}
              waveFrequency={waveFrequency}
              vignetteStrength={vignetteStrength}
              coffeeColorHex={coffeeColor}
              bubbleIntensity={bubbleIntensity}
              bubbleScale={bubbleScale}
              centerClearRadius={centerClearRadius}
              liquidY={0.345}
              radius={0.395}
            />
          </Center>
        </group>
      </Float>

      {/* Soft Ground Contact Shadow */}
      <ContactShadows
        position={[0, -0.65, 0]}
        opacity={0.6}
        scale={4.5}
        blur={2.2}
        far={2.5}
      />

      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        screenSpacePanning={true}
        minDistance={0.8}
        maxDistance={5.0}
        maxPolarAngle={Math.PI / 2 + 0.08}
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        }}
        makeDefault
      />
    </>
  );
}
