'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';

// Lista de modelos 3D do Showroom com valores calibrados pelo usuário
const INITIAL_SHOWROOM_MODELS = [
  {
    id: 'drill',
    name: 'Furadeira / Drill',
    category: 'Ferramentas',
    src: '/3dmodels/showroom/drill.glb',
    scale: 7.36,
    offsetY: 0.01,
    rotation: { rx: -1, ry: 32, rz: -10 },
  },
  {
    id: 'alicate',
    name: 'Alicate Profissional',
    category: 'Ferramentas',
    src: '/3dmodels/showroom/alicate.glb',
    scale: 7.16,
    offsetY: 1.22,
    rotation: { rx: -35, ry: -38, rz: 0 },
  },
  {
    id: 'martelo',
    name: 'Martelo de Aço',
    category: 'Ferramentas',
    src: '/3dmodels/showroom/martelo.glb',
    scale: 4.76,
    offsetY: 0.68,
    rotation: { rx: 28, ry: 45, rz: 0 },
  },
  {
    id: 'chaveglb',
    name: 'Chave de Fenda',
    category: 'Ferramentas',
    src: '/3dmodels/showroom/chaveglb.glb',
    scale: 5.26,
    offsetY: 0.74,
    rotation: { rx: 32, ry: 45, rz: 0 },
  },
  {
    id: 'moderchair',
    name: 'Cadeira Moderna',
    category: 'Mobiliário',
    src: '/3dmodels/showroom/moderchair.glb',
    scale: 0.74,
    offsetY: 0,
    rotation: { rx: 0, ry: -30, rz: 0 },
  },
  {
    id: 'prateleira',
    name: 'Prateleira de Parede',
    category: 'Mobiliário',
    src: '/3dmodels/showroom/prateleira.glb',
    scale: 0.07,
    offsetY: -0.07,
    rotation: { rx: 0, ry: 0, rz: 0 },
  },
];

export default function ShowroomScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [panelVisible, setPanelVisible] = useState(false); // Oculto por padrão, ativado por Shift + Y
  const [panelOpen, setPanelOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [cameraCaptured, setCameraCaptured] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [activeTab, setActiveTab] = useState<'arrows' | 'models' | 'pedestal' | 'camera'>('arrows');
  const [arrowSubTab, setArrowSubTab] = useState<'left' | 'right' | 'both'>('both');

  // Modelos e suas escalas individuais editáveis
  const [modelsList, setModelsList] = useState(INITIAL_SHOWROOM_MODELS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Controles individuais de cada seta calibrados pelo usuário
  const [leftArrow, setLeftArrow] = useState({
    posX: -1.3,
    posY: 0.75,
    posZ: 0.0,
    rotX: 180,
    rotY: -26,
    rotZ: 0,
    scale: 1.0,
  });

  const [rightArrow, setRightArrow] = useState({
    posX: 0.35,
    posY: 0.75,
    posZ: 1.25,
    rotX: 0,
    rotY: -73,
    rotZ: 0,
    scale: 1.0,
  });

  // Rotação inicial da câmera calibrada
  const [cameraInitialRotation, setCameraInitialRotation] = useState({ rx: -2.7, ry: -35, rz: -1.9 });
  const [liveCameraRotation, setLiveCameraRotation] = useState({ rx: -2.7, ry: -35, rz: -1.9 });

  // Estados do cilindro pedestal calibrados pelo usuário
  const [cylinderState, setCylinderState] = useState({
    radius: 0.5,
    height: 0.05,
    position: { x: 3.3, y: -0.3, z: -3.95 },
    rotation: { rx: 0, ry: 0, rz: 0 },
    scale: { sx: 1.85, sy: 1.85, sz: 1.85 },
    color: '#059669',
  });

  // Referências Three.js
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRigRef = useRef<THREE.Group | null>(null);
  const pedestalGroupRef = useRef<THREE.Group | null>(null);
  const modelHolderRef = useRef<THREE.Group | null>(null);
  const currentModelGroupRef = useRef<THREE.Group | null>(null);
  const leftArrowGroupRef = useRef<THREE.Group | null>(null);
  const rightArrowGroupRef = useRef<THREE.Group | null>(null);
  const autoRotateRef = useRef(true);
  const modelsListRef = useRef(modelsList);
  const currentIndexRef = useRef(0);
  const isTransitioningRef = useRef(false);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    modelsListRef.current = modelsList;
  }, [modelsList]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    isTransitioningRef.current = isTransitioning;
  }, [isTransitioning]);

  // Helper para carregar modelo GLTF com ambiente reflexivo
  const loadModel = useCallback((modelData: typeof INITIAL_SHOWROOM_MODELS[0], envMap: THREE.Texture | null) => {
    return new Promise<THREE.Group>((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(
        modelData.src,
        (gltf) => {
          const model = gltf.scene;
          model.traverse((child: any) => {
            if (child.isMesh && child.material) {
              const applyMat = (mat: any) => {
                mat.transparent = true;
                mat.opacity = 1.0;
                if (envMap) {
                  mat.envMap = envMap;
                  mat.envMapIntensity = 1.25;
                }
                mat.needsUpdate = true;
              };
              if (Array.isArray(child.material)) {
                child.material.forEach(applyMat);
              } else {
                applyMat(child.material);
              }
            }
          });

          // Posição, Escala e Rotação
          model.position.set(0, modelData.offsetY, 0);
          model.scale.set(modelData.scale, modelData.scale, modelData.scale);
          model.rotation.set(
            THREE.MathUtils.degToRad(modelData.rotation.rx),
            THREE.MathUtils.degToRad(modelData.rotation.ry),
            THREE.MathUtils.degToRad(modelData.rotation.rz),
            'YXZ'
          );

          resolve(model);
        },
        undefined,
        reject
      );
    });
  }, []);

  // Transição suave com fade: 100% -> 0% -> troca -> 0% -> 100%
  const transitionToModel = useCallback((newIndex: number) => {
    if (isTransitioningRef.current || !modelHolderRef.current) return;
    setIsTransitioning(true);
    isTransitioningRef.current = true;

    const currentModel = currentModelGroupRef.current;
    const fadeDuration = 220; // ms
    const startTime = performance.now();

    const setOpacity = (obj: THREE.Object3D, op: number) => {
      obj.traverse((child: any) => {
        if (child.isMesh && child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m: any) => {
              m.transparent = true;
              m.opacity = op;
            });
          } else {
            child.material.transparent = true;
            child.material.opacity = op;
          }
        }
      });
    };

    // Fade out
    const fadeOutInterval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / fadeDuration, 1);
      if (currentModel) {
        setOpacity(currentModel, 1 - progress);
      }

      if (progress >= 1) {
        clearInterval(fadeOutInterval);

        // Remover e limpar modelo antigo do container dedicado
        if (modelHolderRef.current) {
          modelHolderRef.current.clear();
        }

        // Carregar novo modelo
        const newModelData = modelsListRef.current[newIndex];
        const envMap = sceneRef.current?.environment || null;

        loadModel(newModelData, envMap).then((loadedGroup) => {
          setOpacity(loadedGroup, 0);
          if (modelHolderRef.current) {
            modelHolderRef.current.clear();
            modelHolderRef.current.add(loadedGroup);
            currentModelGroupRef.current = loadedGroup;
          }
          setCurrentIndex(newIndex);
          currentIndexRef.current = newIndex;

          // Fade in
          const fadeInStart = performance.now();
          const fadeInInterval = setInterval(() => {
            const inElapsed = performance.now() - fadeInStart;
            const inProgress = Math.min(inElapsed / fadeDuration, 1);
            setOpacity(loadedGroup, inProgress);

            if (inProgress >= 1) {
              clearInterval(fadeInInterval);
              setOpacity(loadedGroup, 1);
              setIsTransitioning(false);
              isTransitioningRef.current = false;
            }
          }, 16);
        }).catch(() => {
          setIsTransitioning(false);
          isTransitioningRef.current = false;
        });
      }
    }, 16);
  }, [loadModel]);

  const goToNext = useCallback(() => {
    const nextIdx = (currentIndexRef.current + 1) % modelsListRef.current.length;
    transitionToModel(nextIdx);
  }, [transitionToModel]);

  const goToPrev = useCallback(() => {
    const prevIdx = (currentIndexRef.current - 1 + modelsListRef.current.length) % modelsListRef.current.length;
    transitionToModel(prevIdx);
  }, [transitionToModel]);

  // Atualizar propriedades em tempo real quando alteradas no painel
  useEffect(() => {
    const currentModel = currentModelGroupRef.current;
    if (!currentModel) return;
    const activeData = modelsList[currentIndex];
    currentModel.position.set(0, activeData.offsetY, 0);
    currentModel.scale.set(activeData.scale, activeData.scale, activeData.scale);
    currentModel.rotation.set(
      THREE.MathUtils.degToRad(activeData.rotation.rx),
      THREE.MathUtils.degToRad(activeData.rotation.ry),
      THREE.MathUtils.degToRad(activeData.rotation.rz),
      'YXZ'
    );
  }, [modelsList, currentIndex]);

  // Atualizar Setas em tempo real
  useEffect(() => {
    if (leftArrowGroupRef.current) {
      leftArrowGroupRef.current.position.set(leftArrow.posX, leftArrow.posY, leftArrow.posZ);
      leftArrowGroupRef.current.rotation.set(
        THREE.MathUtils.degToRad(leftArrow.rotX),
        THREE.MathUtils.degToRad(leftArrow.rotY),
        THREE.MathUtils.degToRad(leftArrow.rotZ),
        'YXZ'
      );
      leftArrowGroupRef.current.scale.set(leftArrow.scale, leftArrow.scale, leftArrow.scale);
    }
  }, [leftArrow]);

  useEffect(() => {
    if (rightArrowGroupRef.current) {
      rightArrowGroupRef.current.position.set(rightArrow.posX, rightArrow.posY, rightArrow.posZ);
      rightArrowGroupRef.current.rotation.set(
        THREE.MathUtils.degToRad(rightArrow.rotX),
        THREE.MathUtils.degToRad(rightArrow.rotY),
        THREE.MathUtils.degToRad(rightArrow.rotZ),
        'YXZ'
      );
      rightArrowGroupRef.current.scale.set(rightArrow.scale, rightArrow.scale, rightArrow.scale);
    }
  }, [rightArrow]);

  // Atualizar Pedestal / Cilindro em tempo real
  useEffect(() => {
    if (pedestalGroupRef.current) {
      pedestalGroupRef.current.position.set(
        cylinderState.position.x,
        cylinderState.position.y,
        cylinderState.position.z
      );
      pedestalGroupRef.current.scale.set(
        cylinderState.scale.sx,
        cylinderState.scale.sy,
        cylinderState.scale.sz
      );
    }
  }, [cylinderState]);

  // Inicialização do Three.js WebXR
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isMounted = true;

    // 1. Cena Three.js
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Câmera e Camera Rig
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 0);
    cameraRef.current = camera;

    const cameraRig = new THREE.Group();
    cameraRig.position.set(0, 0, 0);
    cameraRig.rotation.set(
      THREE.MathUtils.degToRad(cameraInitialRotation.rx),
      THREE.MathUtils.degToRad(cameraInitialRotation.ry),
      THREE.MathUtils.degToRad(cameraInitialRotation.rz || 0),
      'YXZ'
    );
    cameraRig.add(camera);
    scene.add(cameraRig);
    cameraRigRef.current = cameraRig;

    // 3. Renderer WebGL com WebXR Ativado
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.xr.enabled = true; // WebXR Oficial Habilitado
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // Botão VR Oficial WebXR
    const vrBtn = VRButton.createButton(renderer);
    vrBtn.style.position = 'fixed';
    vrBtn.style.bottom = '24px';
    vrBtn.style.left = '50%';
    vrBtn.style.transform = 'translateX(-50%)';
    vrBtn.style.zIndex = '999';
    vrBtn.style.borderRadius = '12px';
    vrBtn.style.padding = '12px 24px';
    vrBtn.style.fontWeight = 'bold';
    vrBtn.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.4)';
    vrBtn.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    vrBtn.style.backdropFilter = 'blur(12px)';
    document.body.appendChild(vrBtn);

    // 4. Controles Panorâmicos 360 em Primeira Pessoa (Look-around Desktop)
    let isUserInteracting = false;
    let onPointerDownPointerX = 0;
    let onPointerDownPointerY = 0;
    let onPointerDownLon = cameraInitialRotation.ry;
    let onPointerDownLat = cameraInitialRotation.rx;
    let lon = cameraInitialRotation.ry;
    let lat = cameraInitialRotation.rx;
    let targetLon = lon;
    let targetLat = lat;
    let hasMoved = false;

    // 5. Grupo do Pedestal e Container de Modelos
    const pedestalGroup = new THREE.Group();
    pedestalGroup.position.set(cylinderState.position.x, cylinderState.position.y, cylinderState.position.z);
    pedestalGroup.scale.set(cylinderState.scale.sx, cylinderState.scale.sy, cylinderState.scale.sz);
    scene.add(pedestalGroup);
    pedestalGroupRef.current = pedestalGroup;

    const modelHolder = new THREE.Group();
    pedestalGroup.add(modelHolder);
    modelHolderRef.current = modelHolder;

    // 6. 360 Sky / Ambiente
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('/textures/360/escritorio4.jpg', (tex) => {
      if (!isMounted) return;
      tex.mapping = THREE.EquirectangularReflectionMapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      scene.environment = tex;

      // Esfera de fundo 360° invertida
      const skyGeo = new THREE.SphereGeometry(500, 60, 40);
      skyGeo.scale(-1, 1, 1);
      const skyMat = new THREE.MeshBasicMaterial({ map: tex });
      const skyMesh = new THREE.Mesh(skyGeo, skyMat);
      skyMesh.rotation.y = THREE.MathUtils.degToRad(-130);
      scene.add(skyMesh);

      // Carregar apenas UM modelo inicial no container dedicado (drill)
      modelHolder.clear();
      loadModel(INITIAL_SHOWROOM_MODELS[0], tex).then((modelGroup) => {
        if (!isMounted) return;
        modelHolder.clear();
        modelHolder.add(modelGroup);
        currentModelGroupRef.current = modelGroup;
      });
    });

    // 7. Iluminação de Estúdio Profissional
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(5, 6, -1.5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe2e8f0, 1.4);
    fillLight.position.set(1, 3, -2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xbae6fd, 2.2);
    rimLight.position.set(3.2, 4.5, -7.5);
    scene.add(rimLight);

    const spotLight = new THREE.SpotLight(0xffffff, 2.8, 15, Math.PI / 4, 0.6);
    spotLight.position.set(3.2, 4.2, -3.95);
    spotLight.target.position.set(3.2, -0.35, -3.95);
    scene.add(spotLight);
    scene.add(spotLight.target);

    const underglow = new THREE.PointLight(0x38bdf8, 0.8, 3.0);
    underglow.position.set(3.2, -0.32, -3.95);
    scene.add(underglow);

    // Cilindro Principal de Vidro Verde 50% Transparente
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(cylinderState.color),
      metalness: 0.15,
      roughness: 0.04,
      transmission: 0.50,
      ior: 1.52,
      reflectivity: 0.95,
      transparent: true,
      opacity: 0.50,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      depthWrite: false,
    });
    const cylinderGeo = new THREE.CylinderGeometry(cylinderState.radius, cylinderState.radius, cylinderState.height, 64);
    const cylinderMesh = new THREE.Mesh(cylinderGeo, glassMat);
    pedestalGroup.add(cylinderMesh);

    // Anel Biselado Superior
    const ringGeo = new THREE.RingGeometry(0.46, 0.50, 64);
    const ringMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#34d399'),
      opacity: 0.65,
      roughness: 0.02,
      transmission: 0.60,
      ior: 1.54,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.set(0, 0.026, 0);
    ringMesh.rotation.x = -Math.PI / 2;
    pedestalGroup.add(ringMesh);

    // Base Inferior Translúcida
    const baseGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.008, 64);
    const baseMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#047857'),
      roughness: 0.2,
      metalness: 0.8,
      transparent: true,
      opacity: 0.75,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.set(0, -0.028, 0);
    pedestalGroup.add(baseMesh);

    // 8. Criação das Setas 3D Amarelas Interativas
    const createArrowGroup = (isLeft: boolean) => {
      const group = new THREE.Group();

      // Disco Invisível de Colisão
      const collisionGeo = new THREE.CircleGeometry(0.24, 32);
      const collisionMat = new THREE.MeshBasicMaterial({ visible: false });
      const collisionMesh = new THREE.Mesh(collisionGeo, collisionMat);
      group.add(collisionMesh);

      // Triângulo Amarelo
      const triangleShape = new THREE.Shape();
      if (isLeft) {
        triangleShape.moveTo(-0.10, 0);
        triangleShape.lineTo(0.07, 0.10);
        triangleShape.lineTo(0.07, -0.10);
      } else {
        triangleShape.moveTo(0.10, 0);
        triangleShape.lineTo(-0.07, 0.10);
        triangleShape.lineTo(-0.07, -0.10);
      }
      triangleShape.closePath();

      const triangleGeo = new THREE.ShapeGeometry(triangleShape);
      const triangleMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#FACC15'),
        emissive: new THREE.Color('#EAB308'),
        emissiveIntensity: 0.8,
        roughness: 0.1,
        metalness: 0.2,
        side: THREE.DoubleSide,
      });
      const triangleMesh = new THREE.Mesh(triangleGeo, triangleMat);
      triangleMesh.position.z = 0.01;
      group.add(triangleMesh);

      return group;
    };

    const leftArrowGroup = createArrowGroup(true);
    leftArrowGroup.position.set(leftArrow.posX, leftArrow.posY, leftArrow.posZ);
    leftArrowGroup.rotation.set(
      THREE.MathUtils.degToRad(leftArrow.rotX),
      THREE.MathUtils.degToRad(leftArrow.rotY),
      THREE.MathUtils.degToRad(leftArrow.rotZ),
      'YXZ'
    );
    pedestalGroup.add(leftArrowGroup);
    leftArrowGroupRef.current = leftArrowGroup;

    const rightArrowGroup = createArrowGroup(false);
    rightArrowGroup.position.set(rightArrow.posX, rightArrow.posY, rightArrow.posZ);
    rightArrowGroup.rotation.set(
      THREE.MathUtils.degToRad(rightArrow.rotX),
      THREE.MathUtils.degToRad(rightArrow.rotY),
      THREE.MathUtils.degToRad(rightArrow.rotZ),
      'YXZ'
    );
    pedestalGroup.add(rightArrowGroup);
    rightArrowGroupRef.current = rightArrowGroup;

    // 9. Configuração dos Controles WebXR / Meta Quest 2
    const controller1 = renderer.xr.getController(0);
    const controller2 = renderer.xr.getController(1);

    const laserGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -6),
    ]);
    const laserMat = new THREE.LineBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.85 });

    controller1.add(new THREE.Line(laserGeo, laserMat));
    controller2.add(new THREE.Line(laserGeo, laserMat));

    cameraRig.add(controller1);
    cameraRig.add(controller2);

    const controllerModelFactory = new XRControllerModelFactory();
    const grip1 = renderer.xr.getControllerGrip(0);
    grip1.add(controllerModelFactory.createControllerModel(grip1));
    cameraRig.add(grip1);

    const grip2 = renderer.xr.getControllerGrip(1);
    grip2.add(controllerModelFactory.createControllerModel(grip2));
    cameraRig.add(grip2);

    // Raycaster para Clicks no WebXR
    const xrRaycaster = new THREE.Raycaster();
    const tempMatrix = new THREE.Matrix4();
    let lastClickTime = 0;

    const handleXRSelect = (event: any) => {
      const now = performance.now();
      if (now - lastClickTime < 300) return; // Debounce
      lastClickTime = now;

      const controller = event.target;
      tempMatrix.identity().extractRotation(controller.matrixWorld);
      xrRaycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      xrRaycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

      const interactiveObjects = [leftArrowGroup, rightArrowGroup];
      const intersects = xrRaycaster.intersectObjects(interactiveObjects, true);

      if (intersects.length > 0) {
        let hitObject: THREE.Object3D | null = intersects[0].object;
        while (hitObject && hitObject.parent && hitObject !== leftArrowGroup && hitObject !== rightArrowGroup) {
          hitObject = hitObject.parent;
        }

        if (hitObject === leftArrowGroup) {
          goToPrev();
        } else if (hitObject === rightArrowGroup) {
          goToNext();
        }
      }
    };

    controller1.addEventListener('select', handleXRSelect);
    controller1.addEventListener('selectstart', handleXRSelect);
    controller2.addEventListener('select', handleXRSelect);
    controller2.addEventListener('selectstart', handleXRSelect);

    // 10. Interação Panorâmica 360 & Cliques Desktop
    const mouseRaycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      if (renderer.xr.isPresenting) return;
      isUserInteracting = true;
      hasMoved = false;
      onPointerDownPointerX = event.clientX;
      onPointerDownPointerY = event.clientY;
      onPointerDownLon = lon;
      onPointerDownLat = lat;
    };

    const handlePointerMove = (event: MouseEvent) => {
      if (renderer.xr.isPresenting) return;

      if (isUserInteracting) {
        const dx = event.clientX - onPointerDownPointerX;
        const dy = event.clientY - onPointerDownPointerY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          hasMoved = true;
        }
        lon = (onPointerDownPointerX - event.clientX) * 0.15 + onPointerDownLon;
        lat = (event.clientY - onPointerDownPointerY) * 0.15 + onPointerDownLat;
        lat = Math.max(-85, Math.min(85, lat));
      }

      // Hover nas setas se não estiver arrastando a tela
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      mouseRaycaster.setFromCamera(mouse, camera);
      const intersects = mouseRaycaster.intersectObjects([leftArrowGroup, rightArrowGroup], true);

      if (intersects.length > 0) {
        let hitObject: THREE.Object3D | null = intersects[0].object;
        while (hitObject && hitObject.parent && hitObject !== leftArrowGroup && hitObject !== rightArrowGroup) {
          hitObject = hitObject.parent;
        }
        if (hitObject === leftArrowGroup) {
          leftArrowGroup.scale.set(leftArrow.scale * 1.25, leftArrow.scale * 1.25, leftArrow.scale * 1.25);
          rightArrowGroup.scale.set(rightArrow.scale, rightArrow.scale, rightArrow.scale);
        } else if (hitObject === rightArrowGroup) {
          rightArrowGroup.scale.set(rightArrow.scale * 1.25, rightArrow.scale * 1.25, rightArrow.scale * 1.25);
          leftArrowGroup.scale.set(leftArrow.scale, leftArrow.scale, leftArrow.scale);
        }
        document.body.style.cursor = 'pointer';
      } else {
        leftArrowGroup.scale.set(leftArrow.scale, leftArrow.scale, leftArrow.scale);
        rightArrowGroup.scale.set(rightArrow.scale, rightArrow.scale, rightArrow.scale);
        document.body.style.cursor = isUserInteracting ? 'grabbing' : 'default';
      }
    };

    const handlePointerUp = () => {
      isUserInteracting = false;
    };

    const handleCanvasClick = (event: MouseEvent) => {
      if (renderer.xr.isPresenting || hasMoved) return;
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      mouseRaycaster.setFromCamera(mouse, camera);
      const intersects = mouseRaycaster.intersectObjects([leftArrowGroup, rightArrowGroup], true);

      if (intersects.length > 0) {
        let hitObject: THREE.Object3D | null = intersects[0].object;
        while (hitObject && hitObject.parent && hitObject !== leftArrowGroup && hitObject !== rightArrowGroup) {
          hitObject = hitObject.parent;
        }
        if (hitObject === leftArrowGroup) {
          goToPrev();
        } else if (hitObject === rightArrowGroup) {
          goToNext();
        }
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('click', handleCanvasClick);

    // 11. Redimensionamento
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // 12. Loop de Animação WebXR
    let lastTime = performance.now();
    renderer.setAnimationLoop(() => {
      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      // Giro Automático do Modelo 3D
      if (autoRotateRef.current && currentModelGroupRef.current) {
        currentModelGroupRef.current.rotation.y += 0.4 * delta;
      }

      // Hover check nos controladores WebXR
      if (renderer.xr.isPresenting) {
        const checkControllerHover = (ctrl: THREE.Group) => {
          tempMatrix.identity().extractRotation(ctrl.matrixWorld);
          xrRaycaster.ray.origin.setFromMatrixPosition(ctrl.matrixWorld);
          xrRaycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
          return xrRaycaster.intersectObjects([leftArrowGroup, rightArrowGroup], true);
        };

        const hits1 = checkControllerHover(controller1);
        const hits2 = checkControllerHover(controller2);
        const hits = hits1.length > 0 ? hits1 : hits2;

        if (hits.length > 0) {
          let hitObject: THREE.Object3D | null = hits[0].object;
          while (hitObject && hitObject.parent && hitObject !== leftArrowGroup && hitObject !== rightArrowGroup) {
            hitObject = hitObject.parent;
          }
          if (hitObject === leftArrowGroup) {
            leftArrowGroup.scale.set(leftArrow.scale * 1.25, leftArrow.scale * 1.25, leftArrow.scale * 1.25);
            rightArrowGroup.scale.set(rightArrow.scale, rightArrow.scale, rightArrow.scale);
          } else if (hitObject === rightArrowGroup) {
            rightArrowGroup.scale.set(rightArrow.scale * 1.25, rightArrow.scale * 1.25, rightArrow.scale * 1.25);
            leftArrowGroup.scale.set(leftArrow.scale, leftArrow.scale, leftArrow.scale);
          }
        } else {
          leftArrowGroup.scale.set(leftArrow.scale, leftArrow.scale, leftArrow.scale);
          rightArrowGroup.scale.set(rightArrow.scale, rightArrow.scale, rightArrow.scale);
        }
      }

      if (!renderer.xr.isPresenting) {
        // Interpolação suave do 360 look-around
        targetLon += (lon - targetLon) * 0.15;
        targetLat += (lat - targetLat) * 0.15;

        const phi = THREE.MathUtils.degToRad(90 - targetLat);
        const theta = THREE.MathUtils.degToRad(targetLon);

        const lookTarget = new THREE.Vector3();
        lookTarget.x = camera.position.x - 500 * Math.sin(phi) * Math.sin(theta);
        lookTarget.y = camera.position.y + 500 * Math.cos(phi);
        lookTarget.z = camera.position.z - 500 * Math.sin(phi) * Math.cos(theta);

        camera.lookAt(lookTarget);

        setLiveCameraRotation({
          rx: Number(targetLat.toFixed(1)),
          ry: Number(targetLon.toFixed(1)),
          rz: 0,
        });
      }

      renderer.render(scene, camera);
    });

    return () => {
      isMounted = false;
      renderer.setAnimationLoop(null);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('click', handleCanvasClick);
      if (vrBtn && vrBtn.parentElement) {
        vrBtn.parentElement.removeChild(vrBtn);
      }
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [loadModel, goToNext, goToPrev, cameraInitialRotation.rx, cameraInitialRotation.ry, cameraInitialRotation.rz, cylinderState.radius, cylinderState.height, cylinderState.color]);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

  // Atualizar propriedades dos Modelos
  const updateModelScale = (index: number, newScale: number) => {
    if (isNaN(newScale)) return;
    const val = Number(Math.max(0.01, Math.min(20.0, newScale)).toFixed(2));
    setModelsList((prev) =>
      prev.map((m, idx) => (idx === index ? { ...m, scale: val } : m))
    );
  };

  const updateModelOffsetY = (index: number, newOffset: number) => {
    if (isNaN(newOffset)) return;
    const val = Number(newOffset.toFixed(2));
    setModelsList((prev) =>
      prev.map((m, idx) => (idx === index ? { ...m, offsetY: val } : m))
    );
  };

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

  // Atualizar propriedades das Setas
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

  // Atualizar Pedestal / Cilindro
  const updateCylinderPos = (axis: 'x' | 'y' | 'z', value: number) => {
    if (isNaN(value)) return;
    setCylinderState((prev) => ({
      ...prev,
      position: { ...prev.position, [axis]: Number(value.toFixed(2)) },
    }));
  };

  const updateCylinderScale = (value: number) => {
    if (isNaN(value)) return;
    const s = Number(value.toFixed(2));
    setCylinderState((prev) => ({
      ...prev,
      scale: { sx: s, sy: s, sz: s },
    }));
  };

  const captureCurrentCamera = () => {
    setCameraInitialRotation({ ...liveCameraRotation });
    if (cameraRigRef.current) {
      cameraRigRef.current.rotation.set(
        THREE.MathUtils.degToRad(liveCameraRotation.rx),
        THREE.MathUtils.degToRad(liveCameraRotation.ry),
        THREE.MathUtils.degToRad(liveCameraRotation.rz || 0),
        'YXZ'
      );
    }
    setCameraCaptured(true);
    setTimeout(() => setCameraCaptured(false), 2000);
  };

  // Master JSON de exportação
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

  const modelsRotationJsonConfig = {
    modelsRotation: modelsList.map((m) => ({
      id: m.id,
      name: m.name,
      rotation: m.rotation,
    })),
  };

  const modelsPositionScaleJsonConfig = {
    modelsPositionScale: modelsList.map((m) => ({
      id: m.id,
      name: m.name,
      scale: m.scale,
      offsetY: m.offsetY,
    })),
  };

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
      {/* Container Three.js WebXR */}
      <div ref={containerRef} className="w-full h-full fixed top-0 left-0 z-0 pointer-events-auto" />

      {/* PAINEL DE CONTROLE À ESQUERDA - CALIBRADOR (ATIVADO COM SHIFT + Y) */}
      {panelVisible && (
        <div
          className={`fixed top-20 left-6 z-40 transition-all duration-300 pointer-events-auto ${
            panelOpen ? 'w-96' : 'w-auto'
          }`}
        >
          <div className="glass-panel rounded-2xl p-5 border border-white/10 shadow-2xl backdrop-blur-xl bg-surface/90 text-on-surface max-h-[calc(100vh-100px)] overflow-y-auto">
            {/* Header do Painel */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-yellow-400 text-xl">tune</span>
                <div>
                  <h2 className="text-sm font-bold tracking-wide text-white">Calibrador Three.js VR</h2>
                  <span className="text-[10px] font-mono text-outline uppercase tracking-wider block">
                    {activeTab === 'arrows'
                      ? 'Posição & Rotação das Setas'
                      : activeTab === 'models'
                      ? 'Rotação XYZ & Escala dos Objetos'
                      : activeTab === 'pedestal'
                      ? 'Posição & Escala do Cilindro'
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
                {/* Abas Principais */}
                <div className="grid grid-cols-4 gap-1 bg-black/40 p-1 rounded-xl border border-white/5 text-[11px] font-semibold">
                  <button
                    onClick={() => setActiveTab('arrows')}
                    className={`py-1.5 px-1 rounded-lg flex items-center justify-center gap-0.5 transition-all ${
                      activeTab === 'arrows'
                        ? 'bg-yellow-400 text-black font-bold shadow-md shadow-yellow-400/20'
                        : 'text-on-surface-variant hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xs">navigation</span>
                    Setas
                  </button>
                  <button
                    onClick={() => setActiveTab('models')}
                    className={`py-1.5 px-1 rounded-lg flex items-center justify-center gap-0.5 transition-all ${
                      activeTab === 'models'
                        ? 'bg-yellow-400 text-black font-bold shadow-md shadow-yellow-400/20'
                        : 'text-on-surface-variant hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xs">view_in_ar</span>
                    Objetos
                  </button>
                  <button
                    onClick={() => setActiveTab('pedestal')}
                    className={`py-1.5 px-1 rounded-lg flex items-center justify-center gap-0.5 transition-all ${
                      activeTab === 'pedestal'
                        ? 'bg-yellow-400 text-black font-bold shadow-md shadow-yellow-400/20'
                        : 'text-on-surface-variant hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xs">circle</span>
                    Pedestal
                  </button>
                  <button
                    onClick={() => setActiveTab('camera')}
                    className={`py-1.5 px-1 rounded-lg flex items-center justify-center gap-0.5 transition-all ${
                      activeTab === 'camera'
                        ? 'bg-yellow-400 text-black font-bold shadow-md shadow-yellow-400/20'
                        : 'text-on-surface-variant hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xs">videocam</span>
                    Câmera
                  </button>
                </div>

                {/* ABA: CONTROLE DE SETAS */}
                {activeTab === 'arrows' && (
                  <div className="space-y-3">
                    <div className="flex gap-1 bg-surface-container/60 p-1 rounded-lg border border-white/5 text-xs font-semibold">
                      <button
                        onClick={() => setArrowSubTab('both')}
                        className={`flex-1 py-1 rounded text-[11px] transition-all ${
                          arrowSubTab === 'both' ? 'bg-yellow-400 text-black font-bold' : 'text-on-surface-variant hover:text-white'
                        }`}
                      >
                        Ambas (Simétrico)
                      </button>
                      <button
                        onClick={() => setArrowSubTab('left')}
                        className={`flex-1 py-1 rounded text-[11px] transition-all ${
                          arrowSubTab === 'left' ? 'bg-yellow-400 text-black font-bold' : 'text-on-surface-variant hover:text-white'
                        }`}
                      >
                        Seta Esquerda
                      </button>
                      <button
                        onClick={() => setArrowSubTab('right')}
                        className={`flex-1 py-1 rounded text-[11px] transition-all ${
                          arrowSubTab === 'right' ? 'bg-yellow-400 text-black font-bold' : 'text-on-surface-variant hover:text-white'
                        }`}
                      >
                        Seta Direita
                      </button>
                    </div>

                    <div className="bg-surface-container/60 p-3 rounded-xl border border-white/5 space-y-3">
                      {/* Rotação nos Eixos */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">3d_rotation</span> Rotação nos Eixos (Graus)
                          </span>
                        </div>

                        {/* Rot X */}
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

                        {/* Rot Y */}
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

                        {/* Rot Z */}
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

                      {/* Posição nos Eixos */}
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
                            min={arrowSubTab === 'both' ? '0.1' : '-5.0'}
                            max="5.0"
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
                            min="-10.0"
                            max="10.0"
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
                            min="-5.0"
                            max="5.0"
                            step="0.05"
                            value={targetArrowObj.posZ}
                            onChange={(e) => updateArrowField(arrowSubTab, 'posZ', parseFloat(e.target.value))}
                            className="w-full accent-blue-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                          />
                        </div>

                        {/* Escala */}
                        <div className="space-y-1 bg-black/30 p-2 rounded-lg border border-white/5">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-white font-semibold">Tamanho / Escala</span>
                            <span className="text-yellow-300 font-bold">{targetArrowObj.scale.toFixed(2)}x</span>
                          </div>
                          <input
                            type="range"
                            min="0.2"
                            max="4.0"
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

                {/* ABA: OBJETOS 3D */}
                {activeTab === 'models' && (
                  <div className="space-y-3">
                    <div className="bg-surface-container/60 p-3 rounded-xl border border-white/5 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm text-yellow-400">view_in_ar</span>
                          Modelo Selecionado
                        </span>
                        <span className="text-[11px] font-mono text-yellow-400 font-bold">
                          {currentIndex + 1} de {modelsList.length}
                        </span>
                      </div>

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

                      {/* Rotação XYZ */}
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

                      {/* Escala & Altura com Range Negativo de -10 a +10 */}
                      <div className="pt-2 border-t border-white/10 space-y-2.5">
                        <div className="flex justify-between items-center text-xs font-mono">
                          <span className="text-white font-bold">Tamanho / Escala</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0.01"
                              max="20.0"
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
                          max="20.0"
                          step="0.05"
                          value={activeModel.scale}
                          onChange={(e) => updateModelScale(currentIndex, parseFloat(e.target.value))}
                          className="w-full accent-yellow-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                        />

                        <div className="space-y-1 pt-1 border-t border-white/5">
                          <div className="flex justify-between items-center text-[11px] text-on-surface-variant">
                            <span>Altura em Relação ao Pedestal (Y)</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="-10.0"
                                max="10.0"
                                step="0.01"
                                value={activeModel.offsetY}
                                onChange={(e) => updateModelOffsetY(currentIndex, parseFloat(e.target.value))}
                                className="w-16 px-1.5 py-0.5 bg-black/60 border border-emerald-400/40 rounded text-emerald-400 font-mono font-bold text-right text-xs focus:outline-none"
                              />
                              <span className="text-emerald-400 font-bold font-mono">m</span>
                            </div>
                          </div>
                          <input
                            type="range"
                            min="-10.0"
                            max="10.0"
                            step="0.01"
                            value={activeModel.offsetY}
                            onChange={(e) => updateModelOffsetY(currentIndex, parseFloat(e.target.value))}
                            className="w-full accent-emerald-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
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
                          {copyFeedback === 'rotation' ? 'Rotações Copiadas!' : 'COPIAR SÓ A ROTAÇÃO DOS OBJETOS'}
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

                {/* ABA: PEDESTAL / CILINDRO */}
                {activeTab === 'pedestal' && (
                  <div className="space-y-3">
                    <div className="bg-surface-container/60 p-3 rounded-xl border border-white/5 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">circle</span>
                          Pedestal de Vidro
                        </span>
                      </div>

                      {/* Posição X, Y, Z do Pedestal */}
                      <div className="space-y-2">
                        {/* Pos X */}
                        <div className="space-y-1 bg-black/30 p-2 rounded-lg border border-white/5">
                          <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-white font-semibold">Posição X (Lateral)</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="-10.0"
                                max="10.0"
                                step="0.05"
                                value={cylinderState.position.x}
                                onChange={(e) => updateCylinderPos('x', parseFloat(e.target.value))}
                                className="w-16 px-1.5 py-0.5 bg-black/60 border border-yellow-400/40 rounded text-yellow-400 font-mono font-bold text-right text-xs focus:outline-none"
                              />
                              <span className="text-yellow-400 font-bold">m</span>
                            </div>
                          </div>
                          <input
                            type="range"
                            min="-10.0"
                            max="10.0"
                            step="0.05"
                            value={cylinderState.position.x}
                            onChange={(e) => updateCylinderPos('x', parseFloat(e.target.value))}
                            className="w-full accent-yellow-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                          />
                        </div>

                        {/* Pos Y - com range de -10 a +10 */}
                        <div className="space-y-1 bg-black/30 p-2 rounded-lg border border-white/5">
                          <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-emerald-400 font-semibold">Altura Y (Elevação)</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="-10.0"
                                max="10.0"
                                step="0.05"
                                value={cylinderState.position.y}
                                onChange={(e) => updateCylinderPos('y', parseFloat(e.target.value))}
                                className="w-16 px-1.5 py-0.5 bg-black/60 border border-emerald-400/40 rounded text-emerald-400 font-mono font-bold text-right text-xs focus:outline-none"
                              />
                              <span className="text-emerald-400 font-bold">m</span>
                            </div>
                          </div>
                          <input
                            type="range"
                            min="-10.0"
                            max="10.0"
                            step="0.05"
                            value={cylinderState.position.y}
                            onChange={(e) => updateCylinderPos('y', parseFloat(e.target.value))}
                            className="w-full accent-emerald-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                          />
                        </div>

                        {/* Pos Z */}
                        <div className="space-y-1 bg-black/30 p-2 rounded-lg border border-white/5">
                          <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-blue-400 font-semibold">Profundidade Z</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="-10.0"
                                max="10.0"
                                step="0.05"
                                value={cylinderState.position.z}
                                onChange={(e) => updateCylinderPos('z', parseFloat(e.target.value))}
                                className="w-16 px-1.5 py-0.5 bg-black/60 border border-blue-400/40 rounded text-blue-400 font-mono font-bold text-right text-xs focus:outline-none"
                              />
                              <span className="text-blue-400 font-bold">m</span>
                            </div>
                          </div>
                          <input
                            type="range"
                            min="-10.0"
                            max="10.0"
                            step="0.05"
                            value={cylinderState.position.z}
                            onChange={(e) => updateCylinderPos('z', parseFloat(e.target.value))}
                            className="w-full accent-blue-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                          />
                        </div>

                        {/* Escala do Pedestal */}
                        <div className="space-y-1 bg-black/30 p-2 rounded-lg border border-white/5">
                          <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-white font-semibold">Escala Geral do Pedestal</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0.2"
                                max="5.0"
                                step="0.05"
                                value={cylinderState.scale.sx}
                                onChange={(e) => updateCylinderScale(parseFloat(e.target.value))}
                                className="w-16 px-1.5 py-0.5 bg-black/60 border border-yellow-400/40 rounded text-yellow-400 font-mono font-bold text-right text-xs focus:outline-none"
                              />
                              <span className="text-yellow-400 font-bold">x</span>
                            </div>
                          </div>
                          <input
                            type="range"
                            min="0.2"
                            max="5.0"
                            step="0.05"
                            value={cylinderState.scale.sx}
                            onChange={(e) => updateCylinderScale(parseFloat(e.target.value))}
                            className="w-full accent-yellow-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                          />
                        </div>
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
                            Yaw: {liveCameraRotation.ry}° | Pitch: {liveCameraRotation.rx}° | Roll: {liveCameraRotation.rz}°
                          </span>
                        </div>
                        <div className="flex justify-between text-outline pt-1 border-t border-white/5">
                          <span>Ângulo Salvo:</span>
                          <span className="text-yellow-400 font-bold">
                            Yaw: {cameraInitialRotation.ry}° | Pitch: {cameraInitialRotation.rx}° | Roll: {cameraInitialRotation.rz}°
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
                    {copied ? 'JSON Completo Copiado!' : 'COPIAR JSON GERAL COMPLETO'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
