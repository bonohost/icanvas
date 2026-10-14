# Resumo Técnico: Gallery 360 & Especificações para Passeio Virtual 360

Este documento reúne o estado da arte do módulo **Gallery 360** desenvolvido para o ecossistema **iCanvas**, detalhando as tecnologias empregadas, arquitetura 3D, recursos de UX/UI e as diretrizes para a evolução do módulo para o **Passeio Virtual 360** (com navegação por hotspots e marcação de objetos/POIs).

---

## 1. Visão Geral do Gallery 360 Atual

O **Gallery 360** é um visualizador e comparador imersivo de imagens equirretangulares (panoramas 360° em 4K/8K) focado em apresentações arquitetônicas, design de interiores e simulações de ambientes.

### Principais Diferenciais Implementados:
- **Visualização Esférica Imersiva**: Renderização WebGL em 60+ FPS com projeção invertida de fotos 360°.
- **Transição Suave por Transparência (Dual-Sphere Crossfade)**: Comparação em tempo real entre duas cenas (ex: Antes x Depois, Dia x Noite, Variações de Decoração) usando interpolação contínua de opacidade.
- **Sistema de Dois Slots (Foto 1 & Foto 2)**: Atribuição flexível de qualquer imagem da galeria ou upload local para o Slot 1 (Base) ou Slot 2 (Camada de Transparência).
- **Controle Multi-Dispositivo**: Suporte completo a mouse/trackpad (desktop), gestos de toque (mobile/tablet), giroscópio (Device Orientation) e headsets VR (WebXR e modo imersivo estéreo).

---

## 2. Tecnologias e Dependências Utilizadas

### Core & Framework
| Tecnologia | Versão | Papel no Projeto |
| :--- | :--- | :--- |
| **Next.js** | `16.2.12` | Framework React com App Router, Turbopack, compilação otimizada e rotas de aplicação (`/gallery360`). |
| **React** | `19.2.4` | Biblioteca de UI com Hooks modernos (`useRef`, `useState`, `useCallback`, `useEffect`). |
| **TypeScript** | `^5.0` | Tipagem estática rigorosa para interfaces de dados de galeria e referências 3D. |

### Renderização 3D & WebGL
| Tecnologia / Biblioteca | Versão | Utilização e Funcionalidade |
| :--- | :--- | :--- |
| **Three.js** | `^0.185.1` | Motor principal do Gallery 360. Criação de cenas, esferas geométricas (`SphereGeometry`), materiais básicos com textura (`MeshBasicMaterial`), câmera perspectiva, manipulação de quaternions e render loop. |
| **@react-three/fiber** | `^9.6.1` | Wrapper React para Three.js disponível na stack do iCanvas para cenas declarativas. |
| **@react-three/drei** | `^10.7.7` | Utilitários 3D (helpers, controles de câmera e loaders de assets). |
| **A-Frame / aframe-react** | `^1.8.0` / `^4.4.0` | Já integrado ao projeto (usado em protótipos de raycasting e arrasto de entidades 3D no `/360-viewer`). |

### Estilização & UI
| Tecnologia | Versão | Aplicação |
| :--- | :--- | :--- |
| **Tailwind CSS** | `^4.0` | Estilização utilitária de ponta, dock flutuante com *glassmorphism* (`backdrop-blur-2xl`), gradientes HSL e layouts flex/grid responsivos. |
| **Lucide React** | `^1.43.0` | Conjunto de ícones vetoriais modernos (Compass, Glasses/VR, Play/Pause, Upload, ArrowLeftRight, RotateCcw, Sparkles). |

### APIs Nativas do Navegador Integradas
- **WebGL 2.0 Engine**: Renderização gráfica acelerada por hardware.
- **HTML5 2D Canvas API**: Geração dinâmica de placeholders visuais com tipografia e gradiente antes do carregamento completo de texturas pesadas.
- **DeviceOrientationEvent API**: Controle giroscópico com cálculo de ângulo de tela (`window.screen.orientation`) e suporte a solicitação de permissão no iOS 13+ (`requestPermission`).
- **WebXR Device API**: Detecção de sessões imersivas VR (`immersive-vr`) para óculos de realidade virtual.
- **Fullscreen API**: Alternância nativa de tela cheia sem quebra de aspect ratio da câmera Three.js.
- **ResizeObserver API**: Redimensionamento fluido do canvas Three.js baseado nas dimensões do elemento contêiner.
- **File API & Blob Object URLs**: Upload local de panoramas 360° em tempo de execução sem dependência de storage externo.

---

## 3. Arquitetura Técnica do Gallery 360 (`Gallery360Viewer.tsx`)

### 3.1. A Técnica Dual-Sphere (Crossfade)
Ao contrário de visualizadores 360° tradicionais que utilizam apenas 1 esfera ou cubemap, o Gallery 360 emprega um sistema de **duas esferas concêntricas invertidas**:

- **Esfera 1 (Foto 1 - Base)**: Raio `500`, escala invertida no eixo X `(-1, 1, 1)` para visualização interna, `mat1.opacity = 1` fixo.
- **Esfera 2 (Foto 2 - Topo)**: Raio `499` (evita o problema de *z-fighting*), `transparent: true`, `opacity` atrelado ao estado `blendValue` (0.00 a 1.00) e `depthWrite: false` para transparência límpida.
- **Controle de Memória VRAM**: Descarte proativo das texturas anteriores (`material.map.dispose()`) sempre que uma nova foto é carregada, prevenindo vazamentos de memória da GPU.

### 3.2. Controle de Câmera e Matemática Esférica
- **Posição da Câmera**: Fixa no centro `(0, 0, 0)`.
- **Navegação Angular**: Baseada em Latitude (`lat` entre -85° e 85°) e Longitude (`lon`).
- **Cálculo Cartesiano**:
  $$\phi = \text{degToRad}(90 - lat)$$
  $$\theta = \text{degToRad}(lon)$$
  $$X = 500 \cdot \sin(\phi) \cdot \cos(\theta)$$
  $$Y = 500 \cdot \cos(\phi)$$
  $$Z = 500 \cdot \sin(\phi) \cdot \sin(\theta)$$
  $$\text{camera.lookAt}(X, Y, Z)$$
- **Zoom Dinâmico (FOV)**: FOV interpolado suavemente (`targetFov` de 30° a 100° com atenuação de 10% por frame no render loop).
- **Giroscópio**: Matriz de Euler `('YXZ')` convertida para Quaternion com compensação de orientação do aparelho.

### 3.3. Interface e UX
- **Dock Inferior Flutuante**:
  - Cards de Foto 1 e Foto 2 com indicador de slot ativo.
  - Botão de upload local para cada slot.
  - Botão de inversão instantânea (*Swap*) com ajuste dinâmico do slider (`blendValue = 1 - blendValue`).
  - Slider contínuo de transição com botões de salto direto (0% ou 100%).
  - Modo automático de transição oscilante (*ping-pong* a 40ms).
- **Galeria Lateral (Desktop)**: Colunas esquerda (itens 1-5) e direita (itens 6-10) com miniaturas, indicador de seleção por cor (Azul para Foto 1, Roxo para Foto 2) e atalhos rápidos `[1]` e `[2]` no hover.
- **Gaveta Mobile**: Carrossel horizontal compacto com scroll touch.

### 3.4. Catálogo Atual de Cenas (10 Fotos 360°)
1. `vibe1`: **Rave Lounge 1** (*Living*) — **Slot Inicial 1**
2. `vibe2`: **Rave Lounge 2** (*Varanda*) — **Slot Inicial 2**
3. `arch1`: **Arquitetura Luxo** (*Residencial*)
4. `arch2`: **Living Integrado** (*Interior*)
5. `arch3`: **Suíte Master** (*Interior*)
6. `arch4`: **Espaço Gourmet** (*Lazer*)
7. `arch5`: **Hall & Jardim** (*Paisagismo*)
8. `escritorio`: **Corporativo Premium** (*Comercial*)
9. `escritorio3`: **Studio Executivo** (*Office*)
10. `agro`: **Panorama Agro** (*Exterior*)

---

## 4. Diretrizes para o Novo Módulo: Passeio Virtual 360

O objetivo do **Passeio Virtual 360** é elevar a experiência de visualização estática para uma navegação espacial completa entre cômodos, adicionando interatividade contextualizada aos objetos.

### 4.1. Funcionalidades-Chave a Implementar

#### A. Hotspots de Navegação (Troca de Cômodos / Cenas)
- **O que é**: Marcadores tridimensionais (ícones circulares animados com pulso no piso ou em portas) que, ao serem clicados, levam o usuário para outra cena 360° (ex: Sala de Estar $\rightarrow$ Cozinha Gourmet).
- **Mecanismo Técnico Recomendado**:
  - Posição definida por ângulos esféricos `(yaw, pitch)` ou vetor espacial `(x, y, z)` no raio da esfera.
  - Implementação via `THREE.Sprite` ou plano com textura SVG animada voltada para a câmera (*billboarding* automático).
  - Detecção de clique via `THREE.Raycaster` a partir do clique/toque na tela.
  - Efeito de transição suave (animação de zoom-in/FOV reduction seguido de crossfade da nova textura para dar sensação de deslocamento físico).

#### B. Marcação de Objetos e Pontos de Interesse (POIs / Annotations)
- **O que é**: Marcadores clicáveis ou com hover posicionados diretamente sobre móveis, revestimentos ou elementos decorativos.
- **Tipos de Ação ao Clicar**:
  - Abrir Tooltip/Card com título, foto detalhada, medidas, material, preço e botão de ação ("Comprar", "Ver Variações", "Mais Detalhes").
  - Disparar áudio explicativo ou vídeo embutido.
- **Mecanismo de Projeção 3D $\rightarrow$ Tela (HTML/Tailwind Overlay)**:
  - Em vez de renderizar texto no Three.js, utiliza-se a projeção do vetor 3D na câmera:
    ```typescript
    const pos = marker3DPosition.clone().project(camera);
    const screenX = ((pos.x + 1) * width) / 2;
    const screenY = ((-pos.y + 1) * height) / 2;
    const isVisible = pos.z < 1; // apenas se estiver na frente da câmera
    ```
  - Permite criar cards com React e Tailwind CSS perfeitamente responsivos, acessíveis e customizáveis.

#### C. Modo Editor vs. Modo Visualizador (Tour Authoring)
- **Modo Visualizador**: Experiência limpa para o cliente final explorar o ambiente.
- **Modo Editor**: Permite ao arquiteto ou desenvolvedor clicar em qualquer ponto da foto 360° para capturar as coordenadas exatas `(yaw, pitch)` ou `(x, y, z)` e cadastrar um novo Hotspot ou POI via formulário.

#### D. Estrutura de Dados Sugerida (JSON Schema para o Tour)
```typescript
export interface VirtualTourScene {
  id: string;
  title: string;
  panoramaUrl: string;
  initialView: {
    yaw: number;   // Longitude inicial recomendada
    pitch: number; // Latitude inicial recomendada
    fov?: number;
  };
  navigationHotspots: {
    id: string;
    targetSceneId: string;
    position: { yaw: number; pitch: number; distance?: number };
    label: string;
    icon?: 'door' | 'arrow' | 'stairs' | 'elevator';
  }[];
  objectAnnotations: {
    id: string;
    position: { yaw: number; pitch: number; distance?: number };
    title: string;
    category?: string;
    description?: string;
    price?: string;
    linkUrl?: string;
    mediaUrl?: string;
  }[];
}
```

---

## 5. Roteiro Sugerido para Prompt de Estudo / Desenvolvimento

Ao gerar o prompt para iniciar o desenvolvimento do **Passeio Virtual 360**, inclua:
1. **Base Técnica Estabelecida**: Mencione que o projeto já possui o core Three.js configurado em Next.js 16 (App Router) + React 19 + Tailwind v4, com gerenciamento eficiente de VRAM e coordenadas esféricas (`lat`/`lon`).
2. **Requisitos de Hotspots**: Defina a biblioteca de ícones/sprites para hotspots, uso de `THREE.Raycaster`, e animação de transição entre cômodos.
3. **Requisitos de Marcação de Objetos**: Defina a projeção matemática 3D $\rightarrow$ tela 2D (`vector.project(camera)`) para tooltips ricas em Tailwind.
4. **Modo Criação/Edição**: Solicite uma ferramenta de debug/editor onde o clique na cena exiba as coordenadas no console ou num modal para adicionar novos pontos.
