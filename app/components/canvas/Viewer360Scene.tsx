'use client';

import { useEffect, useRef, useState } from 'react';

export default function Viewer360Scene() {
  const [aframeLoaded, setAframeLoaded] = useState(false);
  const [debugVisible, setDebugVisible] = useState(false);
  const [entityPose, setEntityPose] = useState({
    x: -1,
    y: 0,
    z: -3,
    rx: 0,
    ry: 45,
    rz: 0,
  });
  const entityRef = useRef<any>(null);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === 'j') {
        event.preventDefault();
        setDebugVisible((current) => !current);
      }
    };

    window.addEventListener('keydown', handleShortcut);

    // A-Frame não é um módulo ES padrão. Importamos dinamicamente
    // aqui para garantir que ele só seja executado no lado do cliente,
    // após a montagem do componente. Isso evita o erro "require() is forbidden".
    import('aframe').then(() => {
      const AFRAME = (window as typeof window & { AFRAME?: any }).AFRAME;

      if (AFRAME && !AFRAME.components.draggable) {
        AFRAME.registerComponent('draggable', {
          schema: {
            planeY: { type: 'number', default: 0 },
          },
          init() {
            this.dragging = false;
            this.pointer = new (window as typeof window & { THREE?: any }).THREE.Vector2();
            this.raycaster = new (window as typeof window & { THREE?: any }).THREE.Raycaster();
            this.intersectionPoint = new (window as typeof window & { THREE?: any }).THREE.Vector3();
            this.plane = new (window as typeof window & { THREE?: any }).THREE.Plane(
              new (window as typeof window & { THREE?: any }).THREE.Vector3(0, 1, 0),
              -this.data.planeY,
            );

            const scene = this.el.sceneEl;

            this.onMouseDown = () => {
              this.dragging = true;
            };

            this.onMouseUp = () => {
              this.dragging = false;
            };

            this.onMouseMove = (event: MouseEvent) => {
              if (!this.dragging || !scene.camera) {
                return;
              }

              const canvas = scene.canvas;
              const rect = canvas.getBoundingClientRect();

              this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
              this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

              this.raycaster.setFromCamera(this.pointer, scene.camera);

              if (this.raycaster.ray.intersectPlane(this.plane, this.intersectionPoint)) {
                this.el.object3D.position.x = this.intersectionPoint.x;
                this.el.object3D.position.z = this.intersectionPoint.z;
                this.el.object3D.position.y = this.data.planeY;
              }
            };

            this.el.addEventListener('mousedown', this.onMouseDown);
            window.addEventListener('mouseup', this.onMouseUp);
            window.addEventListener('mousemove', this.onMouseMove);
          },
          remove() {
            this.el.removeEventListener('mousedown', this.onMouseDown);
            window.removeEventListener('mouseup', this.onMouseUp);
            window.removeEventListener('mousemove', this.onMouseMove);
          },
        });
      }

      setAframeLoaded(true);
    });

    return () => {
      window.removeEventListener('keydown', handleShortcut);
    };
  }, []);

  useEffect(() => {
    if (!aframeLoaded) {
      return;
    }

    const syncPose = () => {
      const entity = entityRef.current;
      if (!entity?.object3D) {
        return;
      }

      const { x, y, z } = entity.object3D.position;
      const { x: rx, y: ry, z: rz } = entity.object3D.rotation;

      setEntityPose({
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
        z: Number(z.toFixed(2)),
        rx: Number(rx.toFixed(2)),
        ry: Number(ry.toFixed(2)),
        rz: Number(rz.toFixed(2)),
      });
    };

    const timer = window.setInterval(syncPose, 100);

    return () => {
      window.clearInterval(timer);
    };
  }, [aframeLoaded]);

  if (!aframeLoaded) {
    return null; // Aguarda o A-Frame carregar antes de montar as tags
  }

  return (
    // A-Frame assume o controle total deste container.
    // A classe `pointer-events-auto` é crucial para que os cliques e o arrastar funcionem.
    <div style={{ width: '100%', height: '100%' }} className="pointer-events-auto">
      {debugVisible && (
        <div
          style={{
            position: 'absolute',
            top: 252,
            left: 12,
            zIndex: 20,
            padding: '8px 10px',
            borderRadius: 8,
            background: 'rgba(0,0,0,0.72)',
            color: '#fff',
            fontSize: 12,
            lineHeight: 1.5,
            pointerEvents: 'none',
            fontFamily: 'monospace',
          }}
        >
          <strong>Debug pose</strong>
          <div>position: x {entityPose.x} / y {entityPose.y} / z {entityPose.z}</div>
          <div>rotation: x {entityPose.rx} / y {entityPose.ry} / z {entityPose.rz}</div>
          <div>Ctrl+J: alterna o painel</div>
        </div>
      )}

      <a-scene
        embedded
        vr-mode-ui="enabled: false" // Desabilita o botão de VR se não for necessário
        cursor="rayOrigin: mouse; fuse: false"
      >
        {/* Imagem 360° de alta resolução. O asset está em /public/textures/360/room.jpg */}
        <a-sky src="/textures/360/room.jpg" rotation="0 -130 0"></a-sky>

        {/* Exemplo de Hotspot interativo */}
        <a-box
          position="-1 1.5 -3"
          rotation="0 45 0"
          color="#4CC3D9"
          draggable="planeY: 1.5"
        ></a-box>

        <a-box
          position="-1 0 -3"
          rotation="0 45 0"
          color="#21a196"
          draggable="planeY: 0"
        ></a-box>

        <a-entity
          ref={entityRef}
          gltf-model="url(/3dmodels/wash/wash.glb)"
          position="-2.36 0 -1.71"
          rotation="0 -45 0"
          draggable="planeY: 0"
          scale="1 1 1"
          visible="true"
        ></a-entity>


        {/* Câmera com controles de giroscópio para mobile e arrastar para desktop */}
        <a-camera look-controls="enabled: true" wasd-controls="enabled: false"></a-camera>
      </a-scene>
    </div>
  );
}