'use client';

import { useEffect } from 'react';

export default function Viewer360Scene() {
  useEffect(() => {
    // A-Frame não é um módulo ES padrão. Importamos dinamicamente
    // aqui para garantir que ele só seja executado no lado do cliente,
    // após a montagem do componente. Isso evita o erro "require() is forbidden".
    import('aframe');
  }, []);

  return (
    // A-Frame assume o controle total deste container.
    // A classe `pointer-events-auto` é crucial para que os cliques e o arrastar funcionem.
    <div style={{ width: '100%', height: '100%' }} className="pointer-events-auto">
      <a-scene
        embedded
        vr-mode-ui="enabled: false" // Desabilita o botão de VR se não for necessário
        cursor="rayOrigin: mouse; fuse: false"
      >
        {/* Imagem 360° de alta resolução. Coloque-a em /public/360/panorama.jpg */}
        <a-sky src="/360/panorama.jpg" rotation="0 -130 0"></a-sky>

        {/* Exemplo de Hotspot interativo */}
        <a-box
          position="-1 1.5 -3"
          rotation="0 45 0"
          color="#4CC3D9"
          shadow
          animation__mouseenter="property: scale; to: 1.2 1.2 1.2; startEvents: mouseenter; dur: 200"
          animation__mouseleave="property: scale; to: 1 1 1; startEvents: mouseleave; dur: 200"
        ></a-box>

        {/* Câmera com controles de giroscópio para mobile e arrastar para desktop */}
        <a-camera look-controls-enabled="true" wasd-controls-enabled="false"></a-camera>
      </a-scene>
    </div>
  );
}