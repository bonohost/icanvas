'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Environment, Center } from '@react-three/drei';
import * as THREE from 'three';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import { useMugStore } from '../../stores/mugStore';

function Mug({
  texture,
  roughness,
  metalness,
}: {
  texture: THREE.Texture | null;
  roughness: number;
  metalness: number;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const collada = useLoader(ColladaLoader, '/3dmodels/mug/caneca.dae');
  const autoRotate = useMugStore((state) => state.autoRotate);

  useFrame((_, delta) => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += delta * 0.4;
    }
  });

  // Apply composited texture directly onto the Collada mesh material
  useEffect(() => {
    if (!collada?.scene) return;

    collada.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.material = new THREE.MeshStandardMaterial({
          map: texture || null,
          roughness: roughness,
          metalness: metalness,
        });
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }, [collada, texture, roughness, metalness]);

  if (!collada) return null;

  return (
    <group ref={groupRef}>
      <primitive object={collada.scene} dispose={null} />
    </group>
  );
}

export default function MugScene() {
  const {
    outerImage,
    useRender3Base,
    customText,
    useCanvasText,
    baseColor,
    alcaColor,
    interiorColor,
    roughness,
    metalness,
  } = useMugStore();

  // Reference to our compositing canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [compositedTexture, setCompositedTexture] = useState<THREE.CanvasTexture | null>(null);

  // Initialize canvas
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

  // Re-draw texture whenever any UV layer changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !compositedTexture) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isCancelled = false;

    const renderLayers = async () => {
      // 1. Base Ceramic Surface (2048x2048)
      ctx.fillStyle = baseColor || '#ffffff';
      ctx.fillRect(0, 0, 2048, 2048);

      // 2. Base render3.png if active
      if (useRender3Base) {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = '/3dmodels/mug/render3.png';
          img.onload = () => {
            if (!isCancelled) {
              ctx.drawImage(img, 0, 0, 2048, 2048);
            }
            resolve();
          };
          img.onerror = () => resolve();
        });
      }

      if (isCancelled) return;

      // 3. Alça (Handle Area): x: 1090, y: 150, width: 900, height: 390
      if (alcaColor && alcaColor.toLowerCase() !== '#ffffff') {
        ctx.fillStyle = alcaColor;
        ctx.fillRect(1090, 150, 900, 390);
      }

      // 4. Interior (Inside Cup Area):
      // - Body interior: x: 0, y: 670, width: 2048, height: 580
      // - Bottom interior: x: 590, y: 120, width: 440, height: 440
      if (interiorColor && interiorColor.toLowerCase() !== '#ffffff') {
        ctx.fillStyle = interiorColor;
        ctx.fillRect(0, 670, 2048, 580);
        ctx.fillRect(590, 120, 440, 440);
      }

      // 5. Exterior Print Area (Outside of the Mug):
      // x: 123, y: 1303, width: 1780, height: 700
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
      } else if (useCanvasText && customText) {
        // Draw crisp typography on the exterior print area
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(outerX, outerY + 150, outerW, 400);

        ctx.fillStyle = '#60a5fa';
        ctx.fillRect(outerX, outerY + 140, outerW, 10);
        ctx.fillRect(outerX, outerY + 550, outerW, 10);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 110px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(customText, outerX + outerW / 2, outerY + 320);

        ctx.fillStyle = '#bfdbfe';
        ctx.font = '600 36px "Inter", sans-serif';
        ctx.fillText('CUSTOM 3D CERAMIC', outerX + outerW / 2, outerY + 420);
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
    outerImage,
    useRender3Base,
    customText,
    useCanvasText,
    baseColor,
    alcaColor,
    interiorColor,
    compositedTexture,
  ]);

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
      <directionalLight position={[-5, -2, -5]} intensity={0.4} />
      <Environment preset="studio" />
      <Center>
        <Mug
          texture={compositedTexture}
          roughness={roughness}
          metalness={metalness}
        />
      </Center>
      <OrbitControls
        enableZoom={true}
        enablePan={true}
        enableRotate={true}
        minDistance={2}
        maxDistance={10}
      />
    </>
  );
}