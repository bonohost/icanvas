'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';

interface CoffeeBubblePaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (texture: THREE.Texture) => void;
  onLivePreview?: (texture: THREE.Texture) => void;
}

export type BrushStyleType = 'organic' | 'spray' | 'soft' | 'solid';

// Vertex shader para quad fullscreen
const fullscreenVS = `
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

// Fragment shader Principal (Main - Bolhas de Café Procedurais 3D & Especular)
const mainFS = `
  precision highp float;
  uniform sampler2D uMask;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uDensityG;
  uniform float uDensityP;
  varying vec2 vUv;

  vec2 hash22(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453123);
  }

  void main() {
    vec2 uv = vUv;
    vec2 centeredUv = uv - vec2(0.5);
    float distFromCenter = length(centeredUv);

    // Borda circular da caneca
    if (distFromCenter > 0.5) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
      return;
    }

    // Coleta a máscara de pintura desenhada pelo usuário (0.0 = sem espuma, 1.0 = espuma cheia)
    float mascara = texture2D(uMask, uv).r;

    // Cores base do café líquido e crema dourada
    vec3 corCafeBase = vec3(0.35, 0.16, 0.07);
    vec3 corEspumaBorda = vec3(0.92, 0.70, 0.46);
    vec3 corLuzEspecular = vec3(1.0, 0.98, 0.92);

    if (mascara < 0.005) {
      // 100% transparente para permitir que o café base e arte latte apareçam limpos
      gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
      return;
    }

    // Direção da luz simulada (vinda do topo-esquerdo)
    vec2 direcaoLuz = normalize(vec2(-1.0, 1.0));

    // Variáveis acumuladoras dos efeitos visuais 3D
    float contornoBolha = 0.0;
    float brilhoSpecular = 0.0;
    float sombraBump = 0.0;

    // =========================================================
    // PASSAGEM 0: MACRO-BOLHAS GIGANTES (Dobro do tamanho - 30% de ocorrência)
    // =========================================================
    float densidadeMacro = 19.0; // Grid espaçado = bolhas fisicamente 2x maiores
    float raioMinMacro = 0.22;
    float raioMaxMacro = 0.45;

    vec2 stMacro = uv * densidadeMacro;
    vec2 idCelMacro = floor(stMacro);
    vec2 uvLocalMacro = fract(stMacro);

    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 vizinho = vec2(float(x), float(y));
        vec2 rand = hash22(idCelMacro + vizinho);
        
        // 30% de chance em cada célula macro
        if (rand.x > 0.70) {
          // Posição contida no interior seguro da célula para evitar invasão de vizinhas
          vec2 centroBolha = vizinho + vec2(0.3 + 0.4 * rand.x, 0.3 + 0.4 * rand.y) + sin(uTime * 0.20 + rand * 6.28) * 0.02;
          vec2 vetorParaPixel = uvLocalMacro - centroBolha;
          float dist = length(vetorParaPixel);
          float raio = mix(raioMinMacro, raioMaxMacro, rand.y);
          
          if (dist < raio) {
            float alfaCirculo = smoothstep(raio, raio - 0.025, dist);
            // Anel de contorno esbelto e nítido
            float bordaAnel = pow(dist / raio, 3.2) * alfaCirculo;
            
            contornoBolha = max(contornoBolha, bordaAnel * 1.1);
            
            float bump = dot(vetorParaPixel / raio, direcaoLuz);
            float spec = smoothstep(raio * 0.30, 0.0, length(vetorParaPixel - direcaoLuz * raio * 0.32));
            brilhoSpecular = max(brilhoSpecular, spec * alfaCirculo * 1.15);
            
            float sombra = smoothstep(-0.2, -0.85, bump);
            sombraBump = max(sombraBump, sombra * alfaCirculo * 0.55);
          }
        }
      }
    }

    // =========================================================
    // PASSAGEM 1: BOLHAS MÉDIAS (Grid Principal)
    // =========================================================
    float densidadeG = uDensityG; 
    float raioMinG = 0.18;
    float raioMaxG = 0.42;

    vec2 stG = uv * densidadeG;
    vec2 idCelG = floor(stG);
    vec2 uvLocalG = fract(stG);

    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 vizinho = vec2(float(x), float(y));
        vec2 rand = hash22(idCelG + vizinho);
        
        vec2 centroBolha = vizinho + vec2(0.25 + 0.5 * rand.x, 0.25 + 0.5 * rand.y) + sin(uTime * 0.25 + rand * 6.28) * 0.02;
        vec2 vetorParaPixel = uvLocalG - centroBolha;
        float dist = length(vetorParaPixel);
        float raio = mix(raioMinG, raioMaxG, rand.y);
        
        if (dist < raio) {
          float alfaCirculo = smoothstep(raio, raio - 0.025, dist);
          float bordaAnel = pow(dist / raio, 3.0) * alfaCirculo;
          
          contornoBolha = max(contornoBolha, bordaAnel * 0.95);
          
          float bump = dot(vetorParaPixel / raio, direcaoLuz);
          float spec = smoothstep(raio * 0.35, 0.0, length(vetorParaPixel - direcaoLuz * raio * 0.35));
          brilhoSpecular = max(brilhoSpecular, spec * alfaCirculo);
          
          float sombra = smoothstep(-0.2, -0.8, bump);
          sombraBump = max(sombraBump, sombra * alfaCirculo * 0.45);
        }
      }
    }

    // =========================================================
    // PASSAGEM 2: ADICIONANDO AS BOLHAS MINÚSCULAS (Micro-espuma)
    // =========================================================
    float densidadeP = uDensityP;
    float raioMinP = 0.10;
    float raioMaxP = 0.26;

    vec2 stP = uv * densidadeP;
    vec2 idCelP = floor(stP);
    vec2 uvLocalP = fract(stP);

    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 vizinho = vec2(float(x), float(y));
        vec2 rand = hash22(idCelP + vizinho);
        
        vec2 centroBolha = vizinho + vec2(0.2 + 0.6 * rand.x, 0.2 + 0.6 * rand.y) + sin(uTime * 0.4 + rand * 6.28) * 0.03;
        vec2 vetorParaPixel = uvLocalP - centroBolha;
        float dist = length(vetorParaPixel);
        float raio = mix(raioMinP, raioMaxP, rand.x);
        
        if (dist < raio) {
          float alfaCirculo = smoothstep(raio, raio - 0.03, dist);
          float bordaAnel = pow(dist / raio, 2.2) * alfaCirculo;
          
          contornoBolha = max(contornoBolha, bordaAnel * 0.75);
          
          float spec = smoothstep(raio * 0.4, 0.0, length(vetorParaPixel - direcaoLuz * raio * 0.3));
          brilhoSpecular = max(brilhoSpecular, spec * alfaCirculo * 0.85);
        }
      }
    }

    // Aplica a intensidade da máscara pintada pelo usuário
    contornoBolha *= mascara;
    brilhoSpecular *= mascara;
    sombraBump *= mascara;

    // =========================================================
    // COMPOSIÇÃO FINAL
    // =========================================================
    vec3 corFinal = corCafeBase;
    
    // Sombra do relevo (Bump)
    corFinal = mix(corFinal, corCafeBase * 0.3, sombraBump);
    
    // Anéis translúcidos de espuma (Grandes + Minúsculas)
    corFinal = mix(corFinal, corEspumaBorda, contornoBolha);
    
    // Pontos de brilho reflexivo (Specular)
    corFinal += corLuzEspecular * brilhoSpecular * 0.85;

    // Alfa proporcional à presença e relevo real da espuma/bolhas
    float foamPresence = clamp(mascara * (0.60 + contornoBolha * 0.80 + brilhoSpecular * 0.50), 0.0, 1.0);
    float alphaMug = smoothstep(0.50, 0.48, distFromCenter);
    float alpha = foamPresence * alphaMug;

    gl_FragColor = vec4(corFinal, alpha);
  }
`;

export function CoffeeBubblePaintModal({
  isOpen,
  onClose,
  onApply,
  onLivePreview,
}: CoffeeBubblePaintModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [brushSize, setBrushSize] = useState<number>(46);
  const [brushMode, setBrushMode] = useState<'paint' | 'erase'>('paint');
  const [brushStyle, setBrushStyle] = useState<BrushStyleType>('organic');
  const [brushJitter, setBrushJitter] = useState<number>(0.75);
  const [bubbleDensity, setBubbleDensity] = useState<number>(38);
  const [microDensity, setMicroDensity] = useState<number>(95);
  const [isLivePreview, setIsLivePreview] = useState<boolean>(true);
  const [activePreset, setActivePreset] = useState<string>('empty');
  const [canUndo, setCanUndo] = useState<boolean>(false);

  // Callback Refs para garantir estabilidade máxima
  const onLivePreviewRef = useRef(onLivePreview);
  onLivePreviewRef.current = onLivePreview;

  const onApplyRef = useRef(onApply);
  onApplyRef.current = onApply;

  // Refs de estado para ler no render loop
  const brushSizeRef = useRef<number>(brushSize);
  brushSizeRef.current = brushSize;

  const brushModeRef = useRef<'paint' | 'erase'>(brushMode);
  brushModeRef.current = brushMode;

  const brushStyleRef = useRef<BrushStyleType>(brushStyle);
  brushStyleRef.current = brushStyle;

  const brushJitterRef = useRef<number>(brushJitter);
  brushJitterRef.current = brushJitter;

  const bubbleDensityRef = useRef<number>(bubbleDensity);
  bubbleDensityRef.current = bubbleDensity;

  const microDensityRef = useRef<number>(microDensity);
  microDensityRef.current = microDensity;

  const isLivePreviewRef = useRef<boolean>(isLivePreview);
  isLivePreviewRef.current = isLivePreview;

  // Distância acumulada no traço atual (para dinâmica do Aerógrafo: escala atual -> 50)
  const strokeDistanceRef = useRef<number>(0);

  // Offscreen 2D Canvas da Máscara (768x768)
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const maskNeedsUpdateRef = useRef<boolean>(false);
  const needsSyncTo3DRef = useRef<boolean>(false);

  // Histórico para Desfazer (Undo)
  const historyStackRef = useRef<ImageData[]>([]);

  // Estado do ponteiro do mouse
  const isPointerDownRef = useRef<boolean>(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Canvas 2D permanente de exportação para evitar que o unmount do WebGL destrua a textura da caneca 3D
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const exportTextureRef = useRef<THREE.CanvasTexture | null>(null);

  // Export Texture helper (cria/atualiza cópia 2D segura e independente para a GPU Three.js)
  const getSnapshotTexture = useCallback((): THREE.Texture | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    if (!exportCanvasRef.current) {
      const snapCanvas = document.createElement('canvas');
      snapCanvas.width = canvas.width;
      snapCanvas.height = canvas.height;
      exportCanvasRef.current = snapCanvas;
    }

    const snapCanvas = exportCanvasRef.current;
    const ctx = snapCanvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, snapCanvas.width, snapCanvas.height);
      ctx.drawImage(canvas, 0, 0);
    }

    if (!exportTextureRef.current) {
      const tex = new THREE.CanvasTexture(snapCanvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
      exportTextureRef.current = tex;
    } else {
      exportTextureRef.current.image = snapCanvas;
      exportTextureRef.current.needsUpdate = true;
    }

    return exportTextureRef.current;
  }, []);

  // Salva snapshot no histórico antes de começar um novo traço
  const pushHistorySnapshot = useCallback(() => {
    const ctx = maskCtxRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!ctx || !maskCanvas) return;
    const snapshot = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    historyStackRef.current.push(snapshot);
    if (historyStackRef.current.length > 15) {
      historyStackRef.current.shift();
    }
    setCanUndo(true);
  }, []);

  // Desfazer (Undo)
  const handleUndo = useCallback(() => {
    const ctx = maskCtxRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!ctx || !maskCanvas || historyStackRef.current.length === 0) return;

    const previousState = historyStackRef.current.pop();
    if (previousState) {
      ctx.putImageData(previousState, 0, 0);
      maskNeedsUpdateRef.current = true;
      needsSyncTo3DRef.current = true;
    }
    setCanUndo(historyStackRef.current.length > 0);
  }, []);

  // Inicializa o Canvas da Máscara (100% VAZIO)
  const ensureMaskCanvas = useCallback(() => {
    if (!maskCanvasRef.current) {
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = 768;
      maskCanvas.height = 768;
      const ctx = maskCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 768, 768);
        maskCtxRef.current = ctx;
      }
      maskCanvasRef.current = maskCanvas;
    }
    maskNeedsUpdateRef.current = true;
  }, []);

  // Pincel Irregular Orgânico estilo Photoshop com Splatter / Dapple / Noise e Dinâmica de Aerógrafo
  const applyBrushDab = (ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, style: BrushStyleType, jitter: number, isErase: boolean) => {
    ctx.save();

    if (isErase) {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    const radius = size * 0.5;

    if (style === 'organic') {
      const numDabs = Math.max(8, Math.floor(size * 0.35));
      
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.85);
      coreGrad.addColorStop(0, isErase ? 'rgba(0,0,0,1.0)' : 'rgba(255,255,255,0.85)');
      coreGrad.addColorStop(0.7, isErase ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.5)');
      coreGrad.addColorStop(1, isErase ? 'rgba(0,0,0,0.0)' : 'rgba(255,255,255,0.0)');

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.85, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 0; i < numDabs; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = (0.2 + 0.8 * Math.pow(Math.random(), 0.6)) * radius * (1.0 + (Math.random() - 0.5) * jitter * 0.6);
        const dabX = cx + Math.cos(angle) * dist;
        const dabY = cy + Math.sin(angle) * dist;
        const dabR = (0.15 + 0.35 * Math.random()) * radius * (0.8 + jitter * 0.4);

        const dabGrad = ctx.createRadialGradient(dabX, dabY, 0, dabX, dabY, dabR);
        dabGrad.addColorStop(0, isErase ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)');
        dabGrad.addColorStop(0.8, isErase ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)');
        dabGrad.addColorStop(1, isErase ? 'rgba(0,0,0,0.0)' : 'rgba(255,255,255,0.0)');

        ctx.fillStyle = dabGrad;
        ctx.beginPath();
        ctx.arc(dabX, dabY, dabR, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (style === 'spray') {
      const particles = Math.max(16, Math.floor(size * 0.6));
      ctx.fillStyle = isErase ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.9)';

      for (let i = 0; i < particles; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.sqrt(Math.random()) * radius * (1.0 + (Math.random() - 0.5) * jitter * 0.8);
        const px = cx + Math.cos(angle) * dist;
        const py = cy + Math.sin(angle) * dist;
        const pr = Math.max(1.5, Math.random() * radius * 0.22);

        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (style === 'soft') {
      // Aerógrafo: Gradiente difuso aveludado com transição de pressão suave
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grad.addColorStop(0, isErase ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)');
      grad.addColorStop(0.45, isErase ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.45)');
      grad.addColorStop(0.8, isErase ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)');
      grad.addColorStop(1, isErase ? 'rgba(0,0,0,0.0)' : 'rgba(255,255,255,0.0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = isErase ? '#000000' : '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  // Helper para desenhar segmentos com interpolação suave e escala dinâmica no Aerógrafo
  const drawStrokeOnMask = (x1: number, y1: number, x2: number, y2: number) => {
    const ctx = maskCtxRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!ctx || !maskCanvas) return;

    const baseSize = brushSizeRef.current;
    const mode = brushModeRef.current;
    const style = brushStyleRef.current;
    const jitter = brushJitterRef.current;
    const isErase = mode === 'erase';

    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const stepSize = Math.max(3, baseSize * 0.16);
    const steps = Math.max(1, Math.ceil(dist / stepSize));

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x1 + dx * t;
      const y = y1 + dy * t;

      // Dinâmica do Aerógrafo: Começa na escala atual e termina suavemente em 50 ao mover
      let currentDabSize = baseSize;
      if (style === 'soft') {
        const stepDist = (dist / steps);
        strokeDistanceRef.current += stepDist;
        // Transição suave ao longo dos primeiros 160 pixels de movimento
        const moveProgress = Math.min(1.0, strokeDistanceRef.current / 160.0);
        currentDabSize = baseSize + (50 - baseSize) * moveProgress;
      }

      applyBrushDab(ctx, x, y, currentDabSize, style, jitter, isErase);
    }

    // Mantém a área dentro do círculo do café
    const cx = maskCanvas.width / 2;
    const cy = maskCanvas.height / 2;
    const r = maskCanvas.width * 0.49;

    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    maskNeedsUpdateRef.current = true;
    needsSyncTo3DRef.current = true;
  };

  // Suporte a atalho Ctrl+Z / Cmd+Z
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleUndo]);

  // Inicialização estável do WebGL (executa APENAS quando isOpen muda)
  useEffect(() => {
    if (!isOpen) return;

    ensureMaskCanvas();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      preserveDrawingBuffer: true,
      alpha: true,
      antialias: true,
    });
    if (!gl) return;

    if (gl.isContextLost()) return;

    const width = canvas.width;
    const height = canvas.height;

    // Compiler helper
    const createShader = (type: number, src: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader);
        if (info) console.error('Shader compile error:', info);
        return null;
      }
      return shader;
    };

    const vs = createShader(gl.VERTEX_SHADER, fullscreenVS);
    const fs = createShader(gl.FRAGMENT_SHADER, mainFS);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    if (!prog) return;

    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(prog);
      if (info) console.error('Program link error:', info);
      return;
    }

    gl.useProgram(prog);

    // Quad Buffer
    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const posLoc = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Setup Mask Texture
    const maskTexture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, maskTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // INVERSÃO CORRETA DE Y: Sincronia 1:1 entre coordenadas do mouse e WebGL
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    if (maskCanvasRef.current) {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        maskCanvasRef.current
      );
    }

    const uMaskLoc = gl.getUniformLocation(prog, 'uMask');
    const uResolutionLoc = gl.getUniformLocation(prog, 'uResolution');
    const uTimeLoc = gl.getUniformLocation(prog, 'uTime');
    const uDensityGLoc = gl.getUniformLocation(prog, 'uDensityG');
    const uDensityPLoc = gl.getUniformLocation(prog, 'uDensityP');

    gl.uniform1i(uMaskLoc, 0);
    gl.uniform2f(uResolutionLoc, width, height);

    let animationId: number;
    let startTime = performance.now();
    let lastSyncTime = 0;

    const render = (timeNow: number) => {
      const elapsedTime = (timeNow - startTime) * 0.001;

      gl.viewport(0, 0, width, height);

      // Atualiza textura da máscara quando houver modificação
      if (maskNeedsUpdateRef.current && maskCanvasRef.current) {
        gl.bindTexture(gl.TEXTURE_2D, maskTexture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          maskCanvasRef.current
        );
        maskNeedsUpdateRef.current = false;
      }

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, maskTexture);

      gl.uniform1f(uTimeLoc, elapsedTime);
      gl.uniform1f(uDensityGLoc, bubbleDensityRef.current);
      gl.uniform1f(uDensityPLoc, microDensityRef.current);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // Live Sync inteligente com a caneca 3D
      if (
        needsSyncTo3DRef.current &&
        isLivePreviewRef.current &&
        onLivePreviewRef.current &&
        timeNow - lastSyncTime > 120
      ) {
        lastSyncTime = timeNow;
        needsSyncTo3DRef.current = false;
        const liveTex = getSnapshotTexture();
        if (liveTex) {
          onLivePreviewRef.current(liveTex);
        }
      }

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
      gl.deleteProgram(prog);
      gl.deleteBuffer(quadBuffer);
      gl.deleteTexture(maskTexture);
    };
  }, [isOpen, ensureMaskCanvas, getSnapshotTexture]);

  // Eventos de Mouse e Touch
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Reseta a distância acumulada para o novo traço
    strokeDistanceRef.current = 0;

    // Salva snapshot no histórico antes de desenhar
    pushHistorySnapshot();

    isPointerDownRef.current = true;
    lastPointRef.current = { x, y };

    drawStrokeOnMask(x, y, x, y);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPointerDownRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const last = lastPointRef.current || { x, y };
    drawStrokeOnMask(last.x, last.y, x, y);
    lastPointRef.current = { x, y };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isPointerDownRef.current = false;
    lastPointRef.current = null;
    strokeDistanceRef.current = 0;
    needsSyncTo3DRef.current = true;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  // Presets Instantâneos
  const handleApplyPreset = (presetName: string) => {
    const ctx = maskCtxRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!ctx || !maskCanvas) return;

    pushHistorySnapshot();
    setActivePreset(presetName);
    const w = maskCanvas.width;
    const h = maskCanvas.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    if (presetName === 'rim') {
      const r = w * 0.38;
      const steps = 70;
      for (let i = 0; i < steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        applyBrushDab(ctx, x, y, w * 0.18, 'organic', 0.8, false);
      }
    } else if (presetName === 'crescent') {
      const r = w * 0.37;
      const steps = 40;
      for (let i = 0; i < steps; i++) {
        const angle = -Math.PI * 0.3 + (i / steps) * Math.PI * 0.9;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        applyBrushDab(ctx, x, y, w * 0.22, 'organic', 0.85, false);
      }
    } else if (presetName === 'full') {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, w * 0.47, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.49, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    maskNeedsUpdateRef.current = true;
    needsSyncTo3DRef.current = true;
  };

  // Limpar / Resetar Máscara
  const handleClear = () => {
    const ctx = maskCtxRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!ctx || !maskCanvas) return;

    pushHistorySnapshot();
    setActivePreset('empty');
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    maskNeedsUpdateRef.current = true;
    needsSyncTo3DRef.current = true;
  };

  const handleSaveAndApply = () => {
    const canvas = canvasRef.current;
    if (canvas && onApplyRef.current) {
      // Cria um Canvas 2D permanente e independente com o snapshot final renderizado
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = canvas.width;
      finalCanvas.height = canvas.height;
      const ctx = finalCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(canvas, 0, 0);
      }

      const finalTex = new THREE.CanvasTexture(finalCanvas);
      finalTex.colorSpace = THREE.SRGBColorSpace;
      finalTex.generateMipmaps = true;
      finalTex.minFilter = THREE.LinearMipmapLinearFilter;
      finalTex.magFilter = THREE.LinearFilter;
      finalTex.needsUpdate = true;

      onApplyRef.current(finalTex);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-white/15 rounded-3xl shadow-2xl max-w-4xl w-full flex flex-col md:flex-row overflow-hidden max-h-[92vh]">
        {/* Left Side: Interactive 2D Circular Coffee Shader Canvas */}
        <div className="flex-1 bg-gradient-to-b from-neutral-950 via-stone-950 to-black p-6 flex flex-col items-center justify-center relative select-none">
          {/* Quick Floating Actions on Top-Right of Canvas (Reset & Undo) */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            {/* Botão Desfazer (Ctrl+Z) */}
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canUndo}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all backdrop-blur-md border shadow-lg ${
                canUndo
                  ? 'bg-neutral-800/90 hover:bg-neutral-700 text-neutral-200 border-white/15 cursor-pointer'
                  : 'bg-neutral-900/60 text-neutral-500 border-white/5 cursor-not-allowed opacity-50'
              }`}
              title="Desfazer último traço (Ctrl+Z)"
            >
              <span>↩️</span>
              <span className="hidden sm:inline">Desfazer</span>
            </button>

            {/* Botão Limpar / Resetar */}
            <button
              type="button"
              onClick={handleClear}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold text-rose-300 hover:text-white bg-rose-950/70 hover:bg-rose-600 border border-rose-500/40 hover:border-rose-400 backdrop-blur-md shadow-lg shadow-rose-950/40 transition-all flex items-center gap-1.5 cursor-pointer group"
              title="Limpar e resetar toda a espuma do café"
            >
              <span className="group-hover:rotate-180 transition-transform duration-300">🔄</span>
              <span>Limpar / Resetar</span>
            </button>
          </div>

          {/* Circular Mug Guide Rim */}
          <div className="relative w-[320px] h-[320px] sm:w-[380px] sm:h-[380px] rounded-full p-2 bg-gradient-to-tr from-stone-800 via-stone-700 to-stone-900 shadow-[0_0_50px_rgba(0,0,0,0.9)] border-4 border-amber-900/40 flex items-center justify-center">
            {/* Ceramic Inner Lip Shadow */}
            <div className="absolute inset-2 rounded-full shadow-[inset_0_0_24px_rgba(0,0,0,0.95)] z-10 pointer-events-none" />

            {/* WebGL Canvas */}
            <canvas
              ref={canvasRef}
              width={768}
              height={768}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="w-full h-full rounded-full cursor-crosshair touch-none select-none"
              style={{ background: '#0a0301' }}
            />

            {/* Visual Helper Center Guide */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 opacity-30">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400/80" />
            </div>
          </div>

          <p className="text-[11px] text-neutral-400 mt-4 text-center font-mono">
            {brushStyle === 'soft' 
              ? '☁️ Aerógrafo dinâmico: inicia na escala atual e suaviza até 50 ao mover o mouse'
              : `🖌️ Pincel ${brushStyle === 'organic' ? '🌿 Orgânico' : brushStyle === 'spray' ? '💦 Spray' : '⏺️ Sólido'} &bull; Arraste o mouse para pintar`}
          </p>
        </div>

        {/* Right Side: Tools & Presets Controls */}
        <div className="w-full md:w-80 bg-neutral-900/95 border-t md:border-t-0 md:border-l border-white/10 p-6 flex flex-col justify-between overflow-y-auto">
          <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-mono uppercase font-bold tracking-wider mb-1">
                  <span>✨</span> Photoshop Brush Studio
                </div>
                <h2 className="text-xl font-extrabold text-white">
                  Pintar Bolhas de Café
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Esculpa ilhas de espuma com texturas orgânicas e irregulares.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Ferramentas de Desenho (Pincel / Borracha) */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-neutral-300">
                Ação
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBrushMode('paint')}
                  className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                    brushMode === 'paint'
                      ? 'bg-amber-500 text-white shadow-lg ring-2 ring-amber-400/50'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  <span>🖌️</span> Pincel
                </button>
                <button
                  type="button"
                  onClick={() => setBrushMode('erase')}
                  className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                    brushMode === 'erase'
                      ? 'bg-rose-600 text-white shadow-lg ring-2 ring-rose-400/50'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  <span>🧹</span> Borracha
                </button>
              </div>
            </div>

            {/* Estilos de Pincel Photoshop (Orgânico, Spray, Aerógrafo, Sólido) */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-neutral-300">
                Estilo da Ponta do Pincel
              </span>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setBrushStyle('organic')}
                  className={`py-2 px-2.5 rounded-xl border flex items-center gap-1.5 transition-all ${
                    brushStyle === 'organic'
                      ? 'bg-amber-500/25 border-amber-500 text-amber-300 font-bold shadow'
                      : 'bg-neutral-800 border-white/5 text-neutral-400 hover:text-white'
                  }`}
                  title="Pincel com cerdas e bordas irregulares naturais de espuma de café"
                >
                  <span>🌿</span> Orgânico
                </button>
                <button
                  type="button"
                  onClick={() => setBrushStyle('spray')}
                  className={`py-2 px-2.5 rounded-xl border flex items-center gap-1.5 transition-all ${
                    brushStyle === 'spray'
                      ? 'bg-amber-500/25 border-amber-500 text-amber-300 font-bold shadow'
                      : 'bg-neutral-800 border-white/5 text-neutral-400 hover:text-white'
                  }`}
                  title="Splatter com gotículas e micro-bolhas espalhadas"
                >
                  <span>💦</span> Spray
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBrushStyle('soft');
                  }}
                  className={`py-2 px-2.5 rounded-xl border flex items-center gap-1.5 transition-all ${
                    brushStyle === 'soft'
                      ? 'bg-gradient-to-r from-amber-600 to-amber-500 border-amber-400 text-white font-bold shadow-lg shadow-amber-500/25 ring-1 ring-amber-300/40'
                      : 'bg-neutral-800 border-white/5 text-neutral-400 hover:text-white'
                  }`}
                  title="Aerógrafo: inicia na escala atual e suaviza até 50 ao mover"
                >
                  <span>☁️</span> Aerógrafo (50)
                </button>
                <button
                  type="button"
                  onClick={() => setBrushStyle('solid')}
                  className={`py-2 px-2.5 rounded-xl border flex items-center gap-1.5 transition-all ${
                    brushStyle === 'solid'
                      ? 'bg-amber-500/25 border-amber-500 text-amber-300 font-bold shadow'
                      : 'bg-neutral-800 border-white/5 text-neutral-400 hover:text-white'
                  }`}
                  title="Traço sólido direto"
                >
                  <span>⏺️</span> Sólido
                </button>
              </div>
            </div>

            {/* Sliders: Tamanho & Irregularidade (Jitter) */}
            <div className="space-y-2.5 bg-black/30 p-3 rounded-xl border border-white/5">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-neutral-300">
                  <span>
                    {brushStyle === 'soft' ? 'Escala Inicial do Aerógrafo' : 'Tamanho do Pincel'}
                  </span>
                  <span className="font-mono text-amber-400 font-bold">
                    {brushSize}px {brushStyle === 'soft' ? '➔ 50px' : ''}
                  </span>
                </div>
                <input
                  type="range"
                  min="16"
                  max="120"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-neutral-700 rounded appearance-none cursor-pointer accent-amber-500"
                />
                {brushStyle === 'soft' && (
                  <p className="text-[10px] text-amber-300/90 font-mono">
                    ✨ Inicia em {brushSize}px e transita suavemente para 50px ao mover o traço
                  </p>
                )}
              </div>

              {brushStyle !== 'solid' && brushStyle !== 'soft' && (
                <div className="space-y-1 pt-1 border-t border-white/5">
                  <div className="flex justify-between text-xs text-neutral-300">
                    <span>Irregularidade / Textura</span>
                    <span className="font-mono text-amber-400 font-bold">
                      {Math.round(brushJitter * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={brushJitter}
                    onChange={(e) => setBrushJitter(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-neutral-700 rounded appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
                    <span>Suave</span>
                    <span>Ultra Irregular</span>
                  </div>
                </div>
              )}
            </div>

            {/* Presets Rápidos de Espuma */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-neutral-300">
                  Modelos Rápidos (Presets)
                </span>
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                >
                  Limpar
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleApplyPreset('rim')}
                  className={`p-2 rounded-xl border transition-all text-center ${
                    activePreset === 'rim'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                      : 'bg-neutral-800/80 border-white/5 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  ⭕ Borda
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('crescent')}
                  className={`p-2 rounded-xl border transition-all text-center ${
                    activePreset === 'crescent'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                      : 'bg-neutral-800/80 border-white/5 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  🌙 Meia-Lua
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('full')}
                  className={`p-2 rounded-xl border transition-all text-center ${
                    activePreset === 'full'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                      : 'bg-neutral-800/80 border-white/5 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  ☕ Crema
                </button>
              </div>
            </div>

            {/* Ajuste de Densidade de Bolhas */}
            <div className="space-y-2 border-t border-white/10 pt-2">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-neutral-300">
                  <span>Densidade Bolhas Grandes</span>
                  <span className="font-mono text-amber-400 font-semibold">
                    {bubbleDensity}
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="60"
                  value={bubbleDensity}
                  onChange={(e) => setBubbleDensity(parseInt(e.target.value))}
                  className="w-full h-1 bg-neutral-700 rounded appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-neutral-300">
                  <span>Densidade Micro-Espuma</span>
                  <span className="font-mono text-amber-400 font-semibold">
                    {microDensity}
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="140"
                  value={microDensity}
                  onChange={(e) => setMicroDensity(parseInt(e.target.value))}
                  className="w-full h-1 bg-neutral-700 rounded appearance-none cursor-pointer accent-amber-500"
                />
              </div>
            </div>

            {/* Live Sync Toggle */}
            <label className="flex items-center gap-2 p-2 rounded-xl bg-amber-500/[0.08] border border-amber-500/20 cursor-pointer">
              <input
                type="checkbox"
                checked={isLivePreview}
                onChange={(e) => setIsLivePreview(e.target.checked)}
                className="rounded text-amber-500 focus:ring-amber-500 accent-amber-500"
              />
              <span className="text-xs text-amber-200 font-medium">
                Pré-visualização ao vivo na caneca 3D
              </span>
            </label>
          </div>

          {/* Action Footer Buttons */}
          <div className="flex gap-2 pt-3 border-t border-white/10 mt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveAndApply}
              className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 shadow-lg shadow-amber-500/25 transition-all"
            >
              ✨ Aplicar na Caneca
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
