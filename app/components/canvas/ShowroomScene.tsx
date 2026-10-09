'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// Lista de modelos 3D do Showroom com calibração do usuário
const INITIAL_SHOWROOM_MODELS = [
  {
    id: 'drill',
    name: 'Furadeira / Drill',
    category: 'Ferramentas',
    src: '/3dmodels/showroom/drill.glb',
    scale: 7.36,
    offsetY: 0.12,
    rotation: { rx: -1, ry: 32, rz: -10 },
  },
  {
    id: 'alicate',
    name: 'Alicate Profissional',
    category: 'Ferramentas',
    src: '/3dmodels/showroom/alicate.glb',
    scale: 8.91,
    offsetY: 1.21,
    rotation: { rx: 0, ry: 45, rz: 0 },
  },
  {
    id: 'martelo',
    name: 'Martelo de Aço',
    category: 'Ferramentas',
    src: '/3dmodels/showroom/martelo.glb',
    scale: 5.71,
    offsetY: 0.94,
    rotation: { rx: 28, ry: 45, rz: 0 },
  },
  {
    id: 'chaveglb',
    name: 'Chave de Fenda',
    category: 'Ferramentas',
    src: '/3dmodels/showroom/chaveglb.glb',
    scale: 5.31,
    offsetY: 0.73,
    rotation: { rx: 32, ry: 45, rz: 0 },
  },
  {
    id: 'moderchair',
    name: 'Cadeira Moderna',
    category: 'Mobiliário',
    src: '/3dmodels/showroom/moderchair.glb',
    scale: 0.74,
    offsetY: 0.05,
    rotation: { rx: 0, ry: -30, rz: 0 },
  },
  {
    id: 'prateleira',
    name: 'Prateleira de Parede',
    category: 'Mobiliário',
    src: '/3dmodels/showroom/prateleira.glb',
    scale: 0.11,
    offsetY: 0.05,
    rotation: { rx: 0, ry: 0, rz: 0 },
  },
];

export default function ShowroomScene() {
  const [aframeLoaded, setAframeLoaded] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false); // Oculto por padrão, ativado por Shift + Y
  const [panelOpen, setPanelOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [cameraCaptured, setCameraCaptured] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [activeTab, setActiveTab] = useState<'arrows' | 'models' | 'camera'>('arrows');
  const [arrowSubTab, setArrowSubTab] = useState<'left' | 'right' | 'both'>('both');

  // Modelos e suas escalas individuais editáveis
  const [modelsList, setModelsList] = useState(INITIAL_SHOWROOM_MODELS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Controles individuais de cada seta (Esquerda e Direita)
  const [leftArrow, setLeftArrow] = useState({
    posX: -1.3,
    posY: 0.95,
    posZ: 0.0,
    rotX: 180,
    rotY: -26,
    rotZ: 0,
    scale: 1.0,
    faceCamera: false,
  });

  const [rightArrow, setRightArrow] = useState({
    posX: 0.35,
    posY: 0.95,
    posZ: 1.25,
    rotX: 0,
    rotY: -73,
    rotZ: 0,
    scale: 1.0,
    faceCamera: false,
  });

  // Rotação inicial da câmera calibrada (aplicada no Camera Rig)
  const [cameraInitialRotation, setCameraInitialRotation] = useState({ rx: 3.6, ry: -39.9, rz: 0 });
  const [liveCameraRotation, setLiveCameraRotation] = useState({ rx: 3.6, ry: -39.9, rz: 0 });

  // Estados do cilindro (raio 50cm = 0.5m, altura 5cm = 0.05m)
  const [cylinderState, setCylinderState] = useState({
    radius: 0.5,
    height: 0.05,
    position: { x: 3.2, y: -0.35, z: -3.95 },
    rotation: { rx: 0, ry: 0, rz: 0 },
    scale: { sx: 1.85, sy: 1.85, sz: 1.85 },
    color: '#059669',
  });

  const cylinderRef = useRef<any>(null);
  const modelEntityRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const rigRef = useRef<any>(null);
  const opacityRef = useRef<number>(1.0);
  const animFrameRef = useRef<number | null>(null);

  // Helper para aplicar opacidade a todos os materiais do GLTF
  const applyModelOpacity = useCallback((opacity: number) => {
    opacityRef.current = opacity;
    const entity = modelEntityRef.current;
    if (!entity || !entity.object3D) return;

    entity.object3D.traverse((child: any) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat: any) => {
            mat.transparent = true;
            mat.opacity = opacity;
            mat.needsUpdate = true;
          });
        } else {
          child.material.transparent = true;
          child.material.opacity = opacity;
          child.needsUpdate = true;
        }
      }
    });
  }, []);

  // Transição suave com fade: 100% -> 0% -> troca modelo -> 0% -> 100%
  const transitionToModel = useCallback((newIndex: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    const fadeDuration = 220; // ms
    const startTime = performance.now();

    // Fase 1: Fade out (1 -> 0)
    const fadeOut = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / fadeDuration, 1);
      const currentOpacity = 1 - progress;
      applyModelOpacity(currentOpacity);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(fadeOut);
      } else {
        setCurrentIndex(newIndex);

        // Fase 2: Fade in (0 -> 1)
        const fadeInStart = performance.now();
        const fadeIn = (inTime: number) => {
          const inElapsed = inTime - fadeInStart;
          const inProgress = Math.min(inElapsed / fadeDuration, 1);
          applyModelOpacity(inProgress);

          if (inProgress < 1) {
            animFrameRef.current = requestAnimationFrame(fadeIn);
          } else {
            applyModelOpacity(1);
            setIsTransitioning(false);
          }
        };

        setTimeout(() => {
          applyModelOpacity(0);
          animFrameRef.current = requestAnimationFrame(fadeIn);
        }, 60);
      }
    };

    animFrameRef.current = requestAnimationFrame(fadeOut);
  }, [applyModelOpacity, isTransitioning]);

  const goToNext = useCallback(() => {
    const nextIdx = (currentIndex + 1) % modelsList.length;
    transitionToModel(nextIdx);
  }, [currentIndex, modelsList.length, transitionToModel]);

  const goToPrev = useCallback(() => {
    const prevIdx = (currentIndex - 1 + modelsList.length) % modelsList.length;
    transitionToModel(prevIdx);
  }, [currentIndex, modelsList.length, transitionToModel]);

  // Atualizar escala do modelo específico (range 0.01 até 10.0)
  const updateModelScale = (index: number, newScale: number) => {
    if (isNaN(newScale)) return;
    const val = Number(Math.max(0.01, Math.min(10.0, newScale)).toFixed(2));
    setModelsList((prev) =>
      prev.map((m, idx) => (idx === index ? { ...m, scale: val } : m))
    );
  };

  // Atualizar offsetY do modelo específico
  const updateModelOffsetY = (index: number, newOffset: number) => {
    if (isNaN(newOffset)) return;
    const val = Number(newOffset.toFixed(2));
    setModelsList((prev) =>
      prev.map((m, idx) => (idx === index ? { ...m, offsetY: val } : m))
    );
  };

  // Atualizar rotação do modelo específico (rx, ry, rz)
  const updateModelRotation = (index: number, axis: 'rx' | 'ry' | 'rz', value: number) => {
    if (isNaN(value)) return;
    const val = Number(value.toFixed(1));
    setModelsList((prev) =>
      prev.map((m, idx) =>
        idx === index
          ? { ...m, rotation: { ...m.rotation, [axis]: val } }
          : m
      )
    );
  };

  // Helper para atualizar propriedades das setas
  const updateArrowField = (
    target: 'left' | 'right' | 'both',
    field: string,
    value: any
  ) => {
    if (target === 'left' || target === 'both') {
      setLeftArrow((prev: any) => ({
        ...prev,
        [field]: field === 'posX' && target === 'both' ? -Math.abs(value) : value,
      }));
    }
    if (target === 'right' || target === 'both') {
      setRightArrow((prev: any) => ({
        ...prev,
        [field]: field === 'posX' && target === 'both' ? Math.abs(value) : value,
      }));
    }
  };

  // Capturar rotação da câmera atual
  const captureCurrentCamera = () => {
    setCameraInitialRotation({ ...liveCameraRotation });
    if (rigRef.current) {
      rigRef.current.setAttribute(
        'rotation',
        `${liveCameraRotation.rx} ${liveCameraRotation.ry} 0`
      );
    }
    setCameraCaptured(true);
    setTimeout(() => setCameraCaptured(false), 2000);
  };

  useEffect(() => {
    // Importação dinâmica do A-Frame no lado do cliente
    import('aframe').then(() => {
      const AFRAME = (window as typeof window & { AFRAME?: any }).AFRAME;

      if (AFRAME) {
        // Componente Billboard opcional
        if (!AFRAME.components['face-camera']) {
          AFRAME.registerComponent('face-camera', {
            schema: {
              enabled: { type: 'boolean', default: true },
            },
            tick() {
              if (!this.data.enabled) return;
              const scene = this.el.sceneEl;
              const camera = scene?.camera;
              if (camera && (window as any).THREE) {
                const camWorldPos = new (window as any).THREE.Vector3();
                camera.getWorldPosition(camWorldPos);
                this.el.object3D.lookAt(camWorldPos);
              }
            },
          });
        }

        if (!AFRAME.components['carousel-trigger']) {
          AFRAME.registerComponent('carousel-trigger', {
            schema: {
              action: { type: 'string', default: 'next' },
            },
            init() {
              const el = this.el;

              this.onMouseEnter = () => {
                el.object3D.scale.set(1.25, 1.25, 1.25);
              };

              this.onMouseLeave = () => {
                el.object3D.scale.set(1.0, 1.0, 1.0);
              };

              this.onClick = (evt: any) => {
                evt?.stopPropagation?.();
                window.dispatchEvent(
                  new CustomEvent('carousel-action', {
                    detail: { action: this.data.action },
                  })
                );
              };

              el.addEventListener('mouseenter', this.onMouseEnter);
              el.addEventListener('mouseleave', this.onMouseLeave);
              el.addEventListener('click', this.onClick);
            },
            remove() {
              const el = this.el;
              el.removeEventListener('mouseenter', this.onMouseEnter);
              el.removeEventListener('mouseleave', this.onMouseLeave);
              el.removeEventListener('click', this.onClick);
            },
          });
        }

        if (!AFRAME.components['gltf-opacity-sync']) {
          AFRAME.registerComponent('gltf-opacity-sync', {
            init() {
              const THREE = (window as any).THREE;
              let envTexture: any = null;
              if (THREE) {
                const loader = new THREE.TextureLoader();
                loader.load('/textures/360/escritorio4.jpg', (tex: any) => {
                  tex.mapping = THREE.EquirectangularReflectionMapping;
                  envTexture = tex;
                  applyEnv();
                });
              }

              const applyEnv = () => {
                const mesh = this.el.getObject3D('mesh');
                if (mesh && THREE) {
                  mesh.traverse((node: any) => {
                    if (node.isMesh && node.material) {
                      const processMat = (m: any) => {
                        m.transparent = true;
                        if (envTexture && !m.envMap) {
                          m.envMap = envTexture;
                          m.envMapIntensity = 1.25;
                        }
                        m.needsUpdate = true;
                      };

                      if (Array.isArray(node.material)) {
                        node.material.forEach(processMat);
                      } else {
                        processMat(node.material);
                      }
                    }
                  });
                }
              };

              this.el.addEventListener('model-loaded', () => {
                applyEnv();
              });
            },
          });
        }

        if (!AFRAME.components['auto-spin']) {
          AFRAME.registerComponent('auto-spin', {
            schema: {
              speed: { type: 'number', default: 0.4 },
              enabled: { type: 'boolean', default: true },
            },
            tick(_time: number, timeDelta: number) {
              if (!this.data.enabled) return;
              this.el.object3D.rotation.y += (this.data.speed * (timeDelta / 1000));
            },
          });
        }

        // Componente de Vidro Esverdeado com 50% de Transparência e Reflexão 360°
        if (!AFRAME.components['glass-pedestal']) {
          AFRAME.registerComponent('glass-pedestal', {
            schema: {
              envMapSrc: { type: 'string', default: '/textures/360/escritorio4.jpg' },
              roughness: { type: 'number', default: 0.05 },
              metalness: { type: 'number', default: 0.2 },
              transmission: { type: 'number', default: 0.50 },
              ior: { type: 'number', default: 1.52 },
              reflectivity: { type: 'number', default: 0.95 },
              color: { type: 'color', default: '#059669' },
              opacity: { type: 'number', default: 0.50 },
              envMapIntensity: { type: 'number', default: 2.2 },
            },
            init() {
              const el = this.el;
              const THREE = (window as any).THREE;
              if (!THREE) return;

              const loader = new THREE.TextureLoader();
              loader.load(this.data.envMapSrc, (envTexture: any) => {
                envTexture.mapping = THREE.EquirectangularReflectionMapping;

                const applyGlassMaterial = () => {
                  const mesh = el.getObject3D('mesh');
                  if (mesh) {
                    const mat = new THREE.MeshPhysicalMaterial({
                      color: new THREE.Color(this.data.color),
                      metalness: this.data.metalness,
                      roughness: this.data.roughness,
                      transmission: this.data.transmission,
                      ior: this.data.ior,
                      reflectivity: this.data.reflectivity,
                      transparent: true,
                      opacity: this.data.opacity,
                      envMap: envTexture,
                      envMapIntensity: this.data.envMapIntensity,
                      clearcoat: 1.0,
                      clearcoatRoughness: 0.03,
                      depthWrite: false,
                    });

                    mesh.material = mat;
                    mesh.material.needsUpdate = true;
                  }
                };

                applyGlassMaterial();
                el.addEventListener('loaded', applyGlassMaterial);
              });
            },
          });
        }
      }

      setAframeLoaded(true);
    });

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // Monitorar rotação global da câmera em tempo real
  useEffect(() => {
    if (!aframeLoaded) return;

    const interval = window.setInterval(() => {
      const cam = cameraRef.current;
      const THREE = (window as any).THREE;
      if (!cam?.object3D || !THREE) return;

      const worldQuat = new THREE.Quaternion();
      const worldEuler = new THREE.Euler(0, 0, 0, 'YXZ');
      cam.object3D.getWorldQuaternion(worldQuat);
      worldEuler.setFromQuaternion(worldQuat, 'YXZ');

      const toDeg = (rad: number) => Number((rad * (180 / Math.PI)).toFixed(1));

      setLiveCameraRotation({
        rx: toDeg(worldEuler.x),
        ry: toDeg(worldEuler.y),
        rz: toDeg(worldEuler.z),
      });
    }, 120);

    return () => clearInterval(interval);
  }, [aframeLoaded]);

  // Listener para eventos de clique do mouse e Quest 2
  useEffect(() => {
    const handleCarouselAction = (e: any) => {
      if (e.detail?.action === 'next') {
        goToNext();
      } else if (e.detail?.action === 'prev') {
        goToPrev();
      }
    };

    window.addEventListener('carousel-action', handleCarouselAction);
    return () => {
      window.removeEventListener('carousel-action', handleCarouselAction);
    };
  }, [goToNext, goToPrev]);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Shift + Y: Alterna visibilidade do painel calibrador
      if (e.shiftKey && (e.key === 'Y' || e.key === 'y' || e.code === 'KeyY')) {
        e.preventDefault();
        setPanelVisible((prev) => !prev);
      } else if (e.key === 'ArrowLeft') {
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [goToNext, goToPrev]);

  // Master JSON de exportação incluindo Setas e Modelos com Rotação XYZ
  const masterJsonConfig = {
    cameraInitialRotation,
    cylinder: {
      position: cylinderState.position,
      scale: cylinderState.scale,
      radius: cylinderState.radius,
      height: cylinderState.height,
    },
    arrows: {
      leftArrow,
      rightArrow,
    },
    models: modelsList.map((m) => ({
      id: m.id,
      name: m.name,
      scale: m.scale,
      offsetY: m.offsetY,
      rotation: m.rotation,
    })),
  };

  // JSON contendo APENAS a rotação de todos os modelos
  const modelsRotationJsonConfig = {
    modelsRotation: modelsList.map((m) => ({
      id: m.id,
      name: m.name,
      rotation: m.rotation,
    })),
  };

  // JSON contendo APENAS a escala e posição dos modelos
  const modelsPositionScaleJsonConfig = {
    modelsPositionScale: modelsList.map((m) => ({
      id: m.id,
      name: m.name,
      scale: m.scale,
      offsetY: m.offsetY,
    })),
  };

  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const copyMasterJson = () => {
    const jsonString = JSON.stringify(masterJsonConfig, null, 2);
    navigator.clipboard.writeText(jsonString).then(() => {
      setCopied(true);
      setCopyFeedback('full');
      setTimeout(() => {
        setCopied(false);
        setCopyFeedback(null);
      }, 3000);
    });
  };

  const copyRotationOnlyJson = () => {
    const jsonString = JSON.stringify(modelsRotationJsonConfig, null, 2);
    navigator.clipboard.writeText(jsonString).then(() => {
      setCopyFeedback('rotation');
      setTimeout(() => setCopyFeedback(null), 3000);
    });
  };

  const copyPositionScaleOnlyJson = () => {
    const jsonString = JSON.stringify(modelsPositionScaleJsonConfig, null, 2);
    navigator.clipboard.writeText(jsonString).then(() => {
      setCopyFeedback('posScale');
      setTimeout(() => setCopyFeedback(null), 3000);
    });
  };

  const activeModel = modelsList[currentIndex];
  const targetArrowObj = arrowSubTab === 'left' ? leftArrow : arrowSubTab === 'right' ? rightArrow : rightArrow;

  return (
    <div style={{ width: '100%', height: '100%' }} className="pointer-events-auto relative">
      {/* PAINEL DE CONTROLE À ESQUERDA - CALIBRADOR (ATIVADO COM SHIFT + Y) */}
      {panelVisible && (
        <div
          className={`fixed top-20 left-6 z-40 transition-all duration-300 pointer-events-auto ${
            panelOpen ? 'w-96' : 'w-auto'
          }`}
        >
          <div className="glass-panel rounded-2xl p-5 border border-white/10 shadow-2xl backdrop-blur-xl bg-surface/90 text-on-surface">
            {/* Header do Painel */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-yellow-400 text-xl">tune</span>
                <div>
                  <h2 className="text-sm font-bold tracking-wide text-white">Calibrador Showroom 3D</h2>
                  <span className="text-[10px] font-mono text-outline uppercase tracking-wider block">
                    {activeTab === 'arrows'
                      ? 'Posição & Rotação das Setas'
                      : activeTab === 'models'
                      ? 'Rotação XYZ & Escala dos Objetos'
                      : 'Orientação da Câmera'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPanelOpen(!panelOpen)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-outline hover:text-white transition-colors"
                  title={panelOpen ? 'Recolher painel' : 'Expandir painel'}
                >
                  <span className="material-symbols-outlined text-base">
                    {panelOpen ? 'chevron_left' : 'chevron_right'}
                  </span>
                </button>
                <button
                  onClick={() => setPanelVisible(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-500/20 text-outline hover:text-red-400 transition-colors"
                  title="Fechar painel (Shift + Y)"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>
            </div>

          {panelOpen && (
            <div className="mt-3 space-y-3.5 max-h-[calc(100vh-180px)] overflow-y-auto pr-1">
              {/* ABAS PRINCIPAIS */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-black/40 rounded-xl border border-white/5 text-xs font-semibold">
                <button
                  onClick={() => setActiveTab('arrows')}
                  className={`py-1.5 px-1 rounded-lg flex items-center justify-center gap-1 transition-all ${
                    activeTab === 'arrows'
                      ? 'bg-yellow-400 text-black font-bold shadow-md shadow-yellow-400/20'
                      : 'text-on-surface-variant hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">navigation</span>
                  Setas 3D
                </button>
                <button
                  onClick={() => setActiveTab('models')}
                  className={`py-1.5 px-1 rounded-lg flex items-center justify-center gap-1 transition-all ${
                    activeTab === 'models'
                      ? 'bg-yellow-400 text-black font-bold shadow-md shadow-yellow-400/20'
                      : 'text-on-surface-variant hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">view_in_ar</span>
                  Objetos 3D
                </button>
                <button
                  onClick={() => setActiveTab('camera')}
                  className={`py-1.5 px-1 rounded-lg flex items-center justify-center gap-1 transition-all ${
                    activeTab === 'camera'
                      ? 'bg-yellow-400 text-black font-bold shadow-md shadow-yellow-400/20'
                      : 'text-on-surface-variant hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">videocam</span>
                  Câmera
                </button>
              </div>

              {/* ABA: CONTROLE DE POSIÇÃO E ROTAÇÃO INDIVIDUAL DE CADA SETA */}
              {activeTab === 'arrows' && (
                <div className="space-y-3">
                  {/* Sub-abas para escolher Seta Esquerda, Seta Direita ou Ambas */}
                  <div className="flex gap-1 bg-surface-container/60 p-1 rounded-lg border border-white/5 text-xs font-semibold">
                    <button
                      onClick={() => setArrowSubTab('both')}
                      className={`flex-1 py-1 rounded text-[11px] transition-all ${
                        arrowSubTab === 'both'
                          ? 'bg-yellow-400 text-black font-bold'
                          : 'text-on-surface-variant hover:text-white'
                      }`}
                    >
                      Ambas (Simétrico)
                    </button>
                    <button
                      onClick={() => setArrowSubTab('left')}
                      className={`flex-1 py-1 rounded text-[11px] transition-all ${
                        arrowSubTab === 'left'
                          ? 'bg-yellow-400 text-black font-bold'
                          : 'text-on-surface-variant hover:text-white'
                      }`}
                    >
                      Seta Esquerda
                    </button>
                    <button
                      onClick={() => setArrowSubTab('right')}
                      className={`flex-1 py-1 rounded text-[11px] transition-all ${
                        arrowSubTab === 'right'
                          ? 'bg-yellow-400 text-black font-bold'
                          : 'text-on-surface-variant hover:text-white'
                      }`}
                    >
                      Seta Direita
                    </button>
                  </div>

                  <div className="bg-surface-container/60 p-3 rounded-xl border border-white/5 space-y-3">
                    {/* ROTAÇÃO NOS EIXOS X, Y, Z */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">3d_rotation</span> Rotação nos Eixos (Graus)
                        </span>
                        <span className="text-[10px] font-mono text-outline">
                          {arrowSubTab === 'both' ? 'Simétrica' : arrowSubTab === 'left' ? 'Esquerda' : 'Direita'}
                        </span>
                      </div>

                      {/* Eixo Rot X */}
                      <div className="space-y-1 bg-black/30 p-2 rounded-lg border border-white/5">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-red-400 font-bold">Rot X (Inclinar Vertical)</span>
                          <span className="text-white font-bold">{targetArrowObj.rotX}°</span>
                        </div>
                        <input
                          type="range"
                          min="-180"
                          max="180"
                          step="1"
                          value={targetArrowObj.rotX}
                          onChange={(e) => updateArrowField(arrowSubTab, 'rotX', parseFloat(e.target.value))}
                          className="w-full accent-red-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                        />
                      </div>

                      {/* Eixo Rot Y */}
                      <div className="space-y-1 bg-black/30 p-2 rounded-lg border border-white/5">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-green-400 font-bold">Rot Y (Girar Horizontal)</span>
                          <span className="text-white font-bold">{targetArrowObj.rotY}°</span>
                        </div>
                        <input
                          type="range"
                          min="-180"
                          max="180"
                          step="1"
                          value={targetArrowObj.rotY}
                          onChange={(e) => updateArrowField(arrowSubTab, 'rotY', parseFloat(e.target.value))}
                          className="w-full accent-green-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                        />
                      </div>

                      {/* Eixo Rot Z */}
                      <div className="space-y-1 bg-black/30 p-2 rounded-lg border border-white/5">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-blue-400 font-bold">Rot Z (Girar no Plano)</span>
                          <span className="text-white font-bold">{targetArrowObj.rotZ}°</span>
                        </div>
                        <input
                          type="range"
                          min="-180"
                          max="180"
                          step="1"
                          value={targetArrowObj.rotZ}
                          onChange={(e) => updateArrowField(arrowSubTab, 'rotZ', parseFloat(e.target.value))}
                          className="w-full accent-blue-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* POSIÇÃO NOS EIXOS X, Y, Z */}
                    <div className="space-y-2 pt-2 border-t border-white/10">
                      <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">open_with</span> Posição (X, Y, Z)
                      </span>

                      {/* Posição X */}
                      <div className="space-y-1 bg-black/30 p-2 rounded-lg border border-white/5">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-white font-semibold">
                            {arrowSubTab === 'both' ? 'Afastamento Lateral (±X)' : 'Posição X'}
                          </span>
                          <span className="text-yellow-400 font-bold">
                            {arrowSubTab === 'both' ? Math.abs(rightArrow.posX).toFixed(2) : targetArrowObj.posX.toFixed(2)}m
                          </span>
                        </div>
                        <input
                          type="range"
                          min={arrowSubTab === 'both' ? '0.3' : '-4.0'}
                          max="4.0"
                          step="0.05"
                          value={arrowSubTab === 'both' ? Math.abs(rightArrow.posX) : targetArrowObj.posX}
                          onChange={(e) => updateArrowField(arrowSubTab, 'posX', parseFloat(e.target.value))}
                          className="w-full accent-yellow-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                        />
                      </div>

                      {/* Posição Y */}
                      <div className="space-y-1 bg-black/30 p-2 rounded-lg border border-white/5">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-white font-semibold">Altura (Y)</span>
                          <span className="text-green-400 font-bold">{targetArrowObj.posY.toFixed(2)}m</span>
                        </div>
                        <input
                          type="range"
                          min="-1.0"
                          max="3.0"
                          step="0.05"
                          value={targetArrowObj.posY}
                          onChange={(e) => updateArrowField(arrowSubTab, 'posY', parseFloat(e.target.value))}
                          className="w-full accent-green-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                        />
                      </div>

                      {/* Posição Z */}
                      <div className="space-y-1 bg-black/30 p-2 rounded-lg border border-white/5">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-white font-semibold">Profundidade (Z)</span>
                          <span className="text-blue-400 font-bold">{targetArrowObj.posZ.toFixed(2)}m</span>
                        </div>
                        <input
                          type="range"
                          min="-3.0"
                          max="3.0"
                          step="0.05"
                          value={targetArrowObj.posZ}
                          onChange={(e) => updateArrowField(arrowSubTab, 'posZ', parseFloat(e.target.value))}
                          className="w-full accent-blue-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                        />
                      </div>

                      {/* Tamanho / Escala */}
                      <div className="space-y-1 bg-black/30 p-2 rounded-lg border border-white/5">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-white font-semibold">Tamanho / Escala</span>
                          <span className="text-yellow-300 font-bold">{targetArrowObj.scale.toFixed(2)}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.3"
                          max="3.0"
                          step="0.05"
                          value={targetArrowObj.scale}
                          onChange={(e) => updateArrowField(arrowSubTab, 'scale', parseFloat(e.target.value))}
                          className="w-full accent-yellow-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ABA: OBJETOS 3D (ROTAÇÃO XYZ + ESCALA + ALTURA) */}
              {activeTab === 'models' && (
                <div className="space-y-3">
                  <div className="bg-surface-container/60 p-3 rounded-xl border border-white/5 space-y-3">
                    {/* Cabeçalho do Modelo Selecionado */}
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm text-yellow-400">view_in_ar</span>
                        Modelo Selecionado
                      </span>
                      <span className="text-[11px] font-mono text-yellow-400 font-bold">
                        {currentIndex + 1} de {modelsList.length}
                      </span>
                    </div>

                    {/* Botões de Seleção Rápida */}
                    <div className="grid grid-cols-3 gap-1.5">
                      {modelsList.map((m, idx) => (
                        <button
                          key={m.id}
                          onClick={() => transitionToModel(idx)}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold truncate border transition-all text-center ${
                            currentIndex === idx
                              ? 'bg-yellow-400 text-black border-yellow-400 font-bold shadow-md shadow-yellow-400/30'
                              : 'bg-white/5 border-white/5 text-on-surface-variant hover:border-white/20 hover:text-white'
                          }`}
                        >
                          {idx + 1}. {m.name.split(' ')[0]}
                        </button>
                      ))}
                    </div>

                    {/* Auto-girar toggle */}
                    <div className="flex items-center justify-between bg-black/40 p-2 rounded-lg border border-white/5">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-yellow-400">sync</span>
                        <span className="text-[11px] text-white font-medium">Giro Automático 360°</span>
                      </div>
                      <button
                        onClick={() => setAutoRotate(!autoRotate)}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                          autoRotate
                            ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20'
                        }`}
                      >
                        {autoRotate ? 'LIGADO' : 'PAUSADO (ESTÁTICO)'}
                      </button>
                    </div>

                    {/* CONTROLES DE ROTAÇÃO XYZ DO MODELO ATIVO */}
                    <div className="space-y-2 pt-2 border-t border-white/10">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">3d_rotation</span> Rotação XYZ do Objeto
                        </span>
                        <button
                          onClick={() => {
                            updateModelRotation(currentIndex, 'rx', 0);
                            updateModelRotation(currentIndex, 'ry', 0);
                            updateModelRotation(currentIndex, 'rz', 0);
                          }}
                          className="text-[10px] text-outline hover:text-white underline font-mono"
                        >
                          Zerar (0°)
                        </button>
                      </div>

                      {/* Rot X */}
                      <div className="space-y-1 bg-black/30 p-2 rounded-lg border border-white/5">
                        <div className="flex justify-between items-center text-xs font-mono">
                          <span className="text-red-400 font-semibold">Rot X (Inclinar Vertical)</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="-180"
                              max="180"
                              step="1"
                              value={activeModel.rotation?.rx ?? 0}
                              onChange={(e) => updateModelRotation(currentIndex, 'rx', parseFloat(e.target.value))}
                              className="w-14 px-1 py-0.5 bg-black/60 border border-red-400/40 rounded text-red-400 font-mono font-bold text-right text-xs focus:outline-none"
                            />
                            <span className="text-red-400 font-bold">°</span>
                          </div>
                        </div>
                        <input
                          type="range"
                          min="-180"
                          max="180"
                          step="1"
                          value={activeModel.rotation?.rx ?? 0}
                          onChange={(e) => updateModelRotation(currentIndex, 'rx', parseFloat(e.target.value))}
                          className="w-full accent-red-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                        />
                      </div>

                      {/* Rot Y */}
                      <div className="space-y-1 bg-black/30 p-2 rounded-lg border border-white/5">
                        <div className="flex justify-between items-center text-xs font-mono">
                          <span className="text-emerald-400 font-semibold">Rot Y (Girar Horizontal)</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="-180"
                              max="180"
                              step="1"
                              value={activeModel.rotation?.ry ?? 0}
                              onChange={(e) => updateModelRotation(currentIndex, 'ry', parseFloat(e.target.value))}
                              className="w-14 px-1 py-0.5 bg-black/60 border border-emerald-400/40 rounded text-emerald-400 font-mono font-bold text-right text-xs focus:outline-none"
                            />
                            <span className="text-emerald-400 font-bold">°</span>
                          </div>
                        </div>
                        <input
                          type="range"
                          min="-180"
                          max="180"
                          step="1"
                          value={activeModel.rotation?.ry ?? 0}
                          onChange={(e) => updateModelRotation(currentIndex, 'ry', parseFloat(e.target.value))}
                          className="w-full accent-emerald-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                        />
                      </div>

                      {/* Rot Z */}
                      <div className="space-y-1 bg-black/30 p-2 rounded-lg border border-white/5">
                        <div className="flex justify-between items-center text-xs font-mono">
                          <span className="text-blue-400 font-semibold">Rot Z (Girar no Plano)</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="-180"
                              max="180"
                              step="1"
                              value={activeModel.rotation?.rz ?? 0}
                              onChange={(e) => updateModelRotation(currentIndex, 'rz', parseFloat(e.target.value))}
                              className="w-14 px-1 py-0.5 bg-black/60 border border-blue-400/40 rounded text-blue-400 font-mono font-bold text-right text-xs focus:outline-none"
                            />
                            <span className="text-blue-400 font-bold">°</span>
                          </div>
                        </div>
                        <input
                          type="range"
                          min="-180"
                          max="180"
                          step="1"
                          value={activeModel.rotation?.rz ?? 0}
                          onChange={(e) => updateModelRotation(currentIndex, 'rz', parseFloat(e.target.value))}
                          className="w-full accent-blue-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* CONTROLES DE ESCALA & ALTURA */}
                    <div className="pt-2 border-t border-white/10 space-y-2.5">
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-white font-bold">Tamanho / Escala</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0.01"
                            max="10.0"
                            step="0.05"
                            value={activeModel.scale}
                            onChange={(e) => updateModelScale(currentIndex, parseFloat(e.target.value))}
                            className="w-16 px-1.5 py-0.5 bg-black/60 border border-yellow-400/40 rounded text-yellow-400 font-mono font-bold text-right text-xs focus:outline-none"
                          />
                          <span className="text-yellow-400 font-bold">x</span>
                        </div>
                      </div>

                      <input
                        type="range"
                        min="0.01"
                        max="10.0"
                        step="0.05"
                        value={activeModel.scale}
                        onChange={(e) => updateModelScale(currentIndex, parseFloat(e.target.value))}
                        className="w-full accent-yellow-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                      />

                      <div className="space-y-1 pt-1 border-t border-white/5">
                        <div className="flex justify-between text-[11px] text-on-surface-variant">
                          <span>Altura em Relação ao Pedestal</span>
                          <span className="font-mono text-white font-bold">{activeModel.offsetY.toFixed(2)}m</span>
                        </div>
                        <input
                          type="range"
                          min="-0.5"
                          max="2.0"
                          step="0.01"
                          value={activeModel.offsetY}
                          onChange={(e) => updateModelOffsetY(currentIndex, parseFloat(e.target.value))}
                          className="w-full accent-primary h-1.5 bg-white/10 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Botão Rápido de Copiar Rotações */}
                    <div className="pt-1">
                      <button
                        onClick={copyRotationOnlyJson}
                        className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                          copyFeedback === 'rotation'
                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                            : 'bg-yellow-400 hover:bg-yellow-300 text-black shadow-md shadow-yellow-400/20'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {copyFeedback === 'rotation' ? 'check_circle' : 'content_copy'}
                        </span>
                        {copyFeedback === 'rotation'
                          ? 'Rotações Copiadas!'
                          : 'COPIAR SÓ A ROTAÇÃO DOS OBJETOS'}
                      </button>
                    </div>

                    {/* Botões Anterior / Próximo */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={goToPrev}
                        disabled={isTransitioning}
                        className="py-1.5 px-3 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border border-white/10"
                      >
                        <span className="material-symbols-outlined text-sm">arrow_back</span> Anterior
                      </button>
                      <button
                        onClick={goToNext}
                        disabled={isTransitioning}
                        className="py-1.5 px-3 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border border-white/10"
                      >
                        Próximo <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ABA: CÂMERA INICIAL */}
              {activeTab === 'camera' && (
                <div className="space-y-3">
                  <div className="bg-surface-container/60 p-3 rounded-xl border border-white/5 space-y-3">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-yellow-400 text-sm">center_focus_strong</span>
                      <span className="text-xs font-bold text-white uppercase">Orientação Inicial da Câmera</span>
                    </div>

                    <p className="text-[11px] text-on-surface-variant leading-relaxed">
                      Gire a visualização 360 até enquadrar o showroom perfeitamente e clique abaixo:
                    </p>

                    <div className="bg-black/50 p-2.5 rounded-lg border border-white/10 font-mono text-xs space-y-1">
                      <div className="flex justify-between text-outline">
                        <span>Ângulo Atual:</span>
                        <span className="text-emerald-400 font-bold">
                          Yaw: {liveCameraRotation.ry}° | Pitch: {liveCameraRotation.rx}°
                        </span>
                      </div>
                      <div className="flex justify-between text-outline pt-1 border-t border-white/5">
                        <span>Ângulo Salvo:</span>
                        <span className="text-yellow-400 font-bold">
                          Yaw: {cameraInitialRotation.ry}° | Pitch: {cameraInitialRotation.rx}°
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={captureCurrentCamera}
                      className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                        cameraCaptured
                          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                          : 'bg-yellow-400 hover:bg-yellow-300 text-black shadow-lg shadow-yellow-400/20'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {cameraCaptured ? 'check_circle' : 'photo_camera'}
                      </span>
                      {cameraCaptured ? 'Ângulo Capturado e Aplicado ao Rig!' : 'Capturar Visão Atual da Câmera'}
                    </button>
                  </div>
                </div>
              )}

              {/* MASTER JSON DE EXPORTAÇÃO */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-outline">Exportar Configurações</span>
                  <span className="text-[10px] font-mono text-yellow-400">Pronto para Copiar</span>
                </div>

                {/* BOTÕES DE CÓPIA SEPARADA */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={copyRotationOnlyJson}
                    className={`py-2 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 border transition-all ${
                      copyFeedback === 'rotation'
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-emerald-500/30'
                        : 'bg-yellow-400 hover:bg-yellow-300 text-black border-yellow-400'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {copyFeedback === 'rotation' ? 'check' : '3d_rotation'}
                    </span>
                    {copyFeedback === 'rotation' ? 'Copiado!' : 'Copiar Só Rotação'}
                  </button>

                  <button
                    onClick={copyPositionScaleOnlyJson}
                    className={`py-2 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 border transition-all ${
                      copyFeedback === 'posScale'
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-emerald-500/30'
                        : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {copyFeedback === 'posScale' ? 'check' : 'straighten'}
                    </span>
                    {copyFeedback === 'posScale' ? 'Copiado!' : 'Copiar Só Escalas'}
                  </button>
                </div>

                {/* PREVIEW DO JSON GERAL */}
                <div className="bg-black/60 p-2.5 rounded-xl border border-white/10 font-mono text-[10px] text-gray-300 overflow-x-auto max-h-28 select-all">
                  <pre>{JSON.stringify(masterJsonConfig, null, 2)}</pre>
                </div>

                {/* BOTÃO COPIAR TUDO */}
                <button
                  onClick={copyMasterJson}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all duration-200 shadow-xl ${
                    copied
                      ? 'bg-emerald-500 text-white shadow-emerald-500/30 scale-[1.01]'
                      : 'bg-white/15 hover:bg-white/25 text-white border border-white/10'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">
                    {copied ? 'check_circle' : 'content_copy'}
                  </span>
                  {copied
                    ? 'JSON Completo Copiado!'
                    : 'COPIAR JSON GERAL COMPLETO'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* CENA A-FRAME COM SUPORTE A WEBXR / QUEST 2 */}
      {aframeLoaded && (
        <a-scene
          embedded
          vr-mode-ui="enabled: true"
          cursor="rayOrigin: mouse; fuse: false"
          raycaster="objects: .clickable"
        >
          {/* Imagem 360° de alta resolução: escritorio4.jpg */}
          <a-sky src="/textures/360/escritorio4.jpg" rotation="0 -130 0"></a-sky>

          {/* ILUMINAÇÃO DE ESTÚDIO PROFISSIONAL (3-Point Studio + Showroom Spotlight) */}
          {/* 1. Luz Ambiente de Preenchimento Natural */}
          <a-entity light="type: ambient; color: #ffffff; intensity: 0.9"></a-entity>

          {/* 2. Key Light (Luz Principal de Destaque / Especular) */}
          <a-entity light="type: directional; color: #ffffff; intensity: 2.2; position: 5 6 -1.5"></a-entity>

          {/* 3. Fill Light (Luz de Preenchimento Suave) */}
          <a-entity light="type: directional; color: #e2e8f0; intensity: 1.2; position: 1 3 -2"></a-entity>

          {/* 4. Rim / Edge Light (Luz de Contorno / Silhueta para destacar o objeto do fundo 360) */}
          <a-entity light="type: directional; color: #bae6fd; intensity: 2.0; position: 3.2 4.5 -7.5"></a-entity>

          {/* 5. Spotlight Focal de Showroom (Foco vertical sobre o pedestal de vidro) */}
          <a-entity light="type: spot; color: #ffffff; intensity: 2.6; angle: 45; penumbra: 0.6; position: 3.2 4.2 -3.95"></a-entity>

          {/* 6. Underglow Suave de Cristal na Base */}
          <a-entity light="type: point; color: #38bdf8; intensity: 0.6; distance: 2.5; position: 3.2 -0.32 -3.95"></a-entity>

          {/* CONJUNTO CILINDRO PEDESTAL + MODELO 3D + SETAS */}
          <a-entity
            position={`${cylinderState.position.x} ${cylinderState.position.y} ${cylinderState.position.z}`}
            rotation={`${cylinderState.rotation.rx} ${cylinderState.rotation.ry} ${cylinderState.rotation.rz}`}
            scale={`${cylinderState.scale.sx} ${cylinderState.scale.sy} ${cylinderState.scale.sz}`}
          >
            {/* 1. Cilindro Principal de Vidro Esverdeado 50% Transparente com Reflexão do 360° */}
            <a-cylinder
              ref={cylinderRef}
              radius="0.5"
              height="0.05"
              class="clickable"
              glass-pedestal="envMapSrc: /textures/360/escritorio4.jpg; color: #059669; opacity: 0.50; roughness: 0.04; transmission: 0.50; ior: 1.52; reflectivity: 0.95; envMapIntensity: 2.2;"
            ></a-cylinder>

            {/* 2. Borda / Anel de Vidro Esmeralda Biselado com Alto Brilho */}
            <a-ring
              position="0 0.026 0"
              rotation="-90 0 0"
              radius-inner="0.46"
              radius-outer="0.50"
              glass-pedestal="envMapSrc: /textures/360/escritorio4.jpg; color: #34d399; opacity: 0.65; roughness: 0.02; transmission: 0.60; ior: 1.54; reflectivity: 0.98; envMapIntensity: 2.8;"
            ></a-ring>

            {/* 3. Base inferior translúcida com brilho metálico */}
            <a-cylinder
              position="0 -0.028 0"
              radius="0.52"
              height="0.008"
              color="#047857"
              material="roughness: 0.2; metalness: 0.8; opacity: 0.75;"
            ></a-cylinder>

            {/* OBJETO 3D DO CARROSSEL */}
            <a-entity
              ref={modelEntityRef}
              key={activeModel.id}
              gltf-model={`url(${activeModel.src})`}
              position={`0 ${activeModel.offsetY} 0`}
              rotation={`${activeModel.rotation.rx} ${activeModel.rotation.ry} ${activeModel.rotation.rz}`}
              scale={`${activeModel.scale} ${activeModel.scale} ${activeModel.scale}`}
              auto-spin={`speed: 0.4; enabled: ${autoRotate}`}
              gltf-opacity-sync
            ></a-entity>

            {/* SETAS / TRIÂNGULOS AMARELOS INTERATIVOS */}
            {/* SETA ESQUERDA (ANTERIOR) */}
            <a-entity
              position={`${leftArrow.posX} ${leftArrow.posY} ${leftArrow.posZ}`}
              rotation={`${leftArrow.rotX} ${leftArrow.rotY} ${leftArrow.rotZ}`}
              scale={`${leftArrow.scale} ${leftArrow.scale} ${leftArrow.scale}`}
              class="clickable"
              carousel-trigger="action: prev"
              face-camera={`enabled: ${leftArrow.faceCamera}`}
            >
              {/* Área invisível de colisão para facilitar o clique no Quest 2 e Mouse */}
              <a-circle
                radius="0.22"
                material="opacity: 0.0; transparent: true; depthWrite: false;"
                class="clickable"
              ></a-circle>
              {/* Triângulo Amarelo Limpo apontando para a Esquerda */}
              <a-triangle
                vertex-a="-0.10 0 0.01"
                vertex-b="0.07 0.10 0.01"
                vertex-c="0.07 -0.10 0.01"
                color="#FACC15"
                material="side: double; emissive: #EAB308; emissiveIntensity: 0.8; roughness: 0.1; metalness: 0.2; transparent: false;"
                class="clickable"
              ></a-triangle>
            </a-entity>

            {/* SETA DIREITA (PRÓXIMO) */}
            <a-entity
              position={`${rightArrow.posX} ${rightArrow.posY} ${rightArrow.posZ}`}
              rotation={`${rightArrow.rotX} ${rightArrow.rotY} ${rightArrow.rotZ}`}
              scale={`${rightArrow.scale} ${rightArrow.scale} ${rightArrow.scale}`}
              class="clickable"
              carousel-trigger="action: next"
              face-camera={`enabled: ${rightArrow.faceCamera}`}
            >
              {/* Área invisível de colisão para facilitar o clique no Quest 2 e Mouse */}
              <a-circle
                radius="0.22"
                material="opacity: 0.0; transparent: true; depthWrite: false;"
                class="clickable"
              ></a-circle>
              {/* Triângulo Amarelo Limpo apontando para a Direita */}
              <a-triangle
                vertex-a="0.10 0 0.01"
                vertex-b="-0.07 0.10 0.01"
                vertex-c="-0.07 -0.10 0.01"
                color="#FACC15"
                material="side: double; emissive: #EAB308; emissiveIntensity: 0.8; roughness: 0.1; metalness: 0.2; transparent: false;"
                class="clickable"
              ></a-triangle>
            </a-entity>
          </a-entity>

          {/* CAMERA RIG */}
          <a-entity
            id="cameraRig"
            ref={rigRef}
            position="0 0 0"
            rotation={`${cameraInitialRotation.rx} ${cameraInitialRotation.ry} 0`}
          >
            <a-camera
              ref={cameraRef}
              look-controls="enabled: true"
              wasd-controls="enabled: false"
            >
              <a-cursor
                id="cursor"
                rayOrigin="mouse"
                fuse="false"
                raycaster="objects: .clickable"
                visible="false"
              ></a-cursor>
            </a-camera>

            {/* CONTROLADORES DO QUEST 2 */}
            <a-entity
              id="rightHand"
              laser-controls="hand: right"
              raycaster="objects: .clickable; lineColor: #FACC15; lineOpacity: 0.9"
              oculus-touch-controls="hand: right"
            ></a-entity>
            <a-entity
              id="leftHand"
              laser-controls="hand: left"
              raycaster="objects: .clickable; lineColor: #FACC15; lineOpacity: 0.9"
              oculus-touch-controls="hand: left"
            ></a-entity>

            {/* HAND TRACKING */}
            <a-entity hand-tracking-controls="hand: right"></a-entity>
            <a-entity hand-tracking-controls="hand: left"></a-entity>
          </a-entity>
        </a-scene>
      )}
    </div>
  );
}
