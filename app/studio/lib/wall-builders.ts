import * as THREE from 'three';
import { WallOpening, WallSide, WallSettings, GlassType, WindowMullionStyle } from '../types/furniture';

export interface WallSegment {
  width: number;
  height: number;
  bottomY: number;
  offsetX: number; // Center offset from left edge of the wall (0 to wallLength)
}

export const OPENING_FRAME_COLORS = [
  { id: 'black-aluminum', name: 'Alumínio Preto', color: '#1e293b', roughness: 0.3, metalness: 0.8 },
  { id: 'white-pvc', name: 'PVC / Alumínio Branco', color: '#f8fafc', roughness: 0.4, metalness: 0.1 },
  { id: 'natural-wood', name: 'Madeira Natural', color: '#8b5a2b', roughness: 0.7, metalness: 0.05 },
  { id: 'dark-wood', name: 'Madeira Imbuia', color: '#452a16', roughness: 0.7, metalness: 0.05 },
  { id: 'brushed-inox', name: 'Inox Escovado', color: '#d1d5db', roughness: 0.2, metalness: 0.9 },
  { id: 'champagne', name: 'Alumínio Champagne', color: '#c5b39a', roughness: 0.35, metalness: 0.75 },
];

export interface RawWallInput {
  id?: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
  thickness?: number;
  height?: number;
}

export interface AdjustedWallOutput {
  id: string;
  originalStart: { x: number; y: number };
  originalEnd: { x: number; y: number };
  adjustedStart: { x: number; y: number };
  adjustedEnd: { x: number; y: number };
  length: number;
  centerX: number;
  centerZ: number;
  angle: number;
  thickness: number;
  height: number;
}

/**
 * Calculates seamless wall junction intersections.
 * At L-corners, one wall passes to the outer edge while the other abuts flush against its inner face.
 * At T-junctions and Cross-junctions, dividing walls abut flush against the main through-wall.
 */
export function calculateAdjustedWallJunctions(
  rawWalls?: RawWallInput[],
  defaultThickness = 0.15,
  defaultHeight = 2.6
): AdjustedWallOutput[] {
  if (!rawWalls || rawWalls.length === 0) return [];

  const wallsWithDir = rawWalls.map((w, idx) => {
    const dx = w.end.x - w.start.x;
    const dy = w.end.y - w.start.y;
    const rawLen = Math.hypot(dx, dy);
    const ux = rawLen > 0.0001 ? dx / rawLen : 1;
    const uy = rawLen > 0.0001 ? dy / rawLen : 0;
    const thickness = w.thickness || defaultThickness;
    const height = w.height || defaultHeight;
    const id = w.id || `w_${idx}`;
    return {
      id,
      start: { x: w.start.x, y: w.start.y },
      end: { x: w.end.x, y: w.end.y },
      rawLen,
      ux,
      uy,
      thickness,
      height,
      startTrim: 0,
      endTrim: 0,
    };
  });

  // Group endpoints into vertices by spatial proximity (tolerance 0.05m)
  interface VertexAttachment {
    wallIndex: number;
    isStart: boolean;
    dirX: number; // unit vector pointing away from vertex along the wall
    dirY: number;
    thickness: number;
    rawLen: number;
  }

  const vertices: { x: number; y: number; attachments: VertexAttachment[] }[] = [];

  const findOrCreateVertex = (pt: { x: number; y: number }) => {
    let found = vertices.find((v) => Math.hypot(v.x - pt.x, v.y - pt.y) < 0.05);
    if (!found) {
      found = { x: pt.x, y: pt.y, attachments: [] };
      vertices.push(found);
    }
    return found;
  };

  wallsWithDir.forEach((w, wallIndex) => {
    if (w.rawLen < 0.01) return;

    // Start attachment (direction points towards end: +ux, +uy)
    const vStart = findOrCreateVertex(w.start);
    vStart.attachments.push({
      wallIndex,
      isStart: true,
      dirX: w.ux,
      dirY: w.uy,
      thickness: w.thickness,
      rawLen: w.rawLen,
    });

    // End attachment (direction points towards start: -ux, -uy)
    const vEnd = findOrCreateVertex(w.end);
    vEnd.attachments.push({
      wallIndex,
      isStart: false,
      dirX: -w.ux,
      dirY: -w.uy,
      thickness: w.thickness,
      rawLen: w.rawLen,
    });
  });

  // Resolve junctions at each vertex
  vertices.forEach((v) => {
    const atts = v.attachments;
    if (atts.length < 2) {
      // Free end: no trimming needed
      return;
    }

    if (atts.length === 2) {
      const a = atts[0];
      const b = atts[1];
      const dot = a.dirX * b.dirX + a.dirY * b.dirY;

      // If collinear in straight line (dot ≈ -1), no corner trim needed
      if (dot < -0.92) {
        return;
      }

      // L-Junction: choose passante wall vs abutting wall
      // Prefer longer wall or horizontal wall for consistent room corners
      const isAHorizontal = Math.abs(a.dirX) >= Math.abs(a.dirY);
      const isBHorizontal = Math.abs(b.dirX) >= Math.abs(b.dirY);

      let passante = a;
      let encostada = b;

      if (Math.abs(a.rawLen - b.rawLen) > 0.3) {
        if (b.rawLen > a.rawLen) {
          passante = b;
          encostada = a;
        }
      } else if (isBHorizontal && !isAHorizontal) {
        passante = b;
        encostada = a;
      }

      // Passante wall extends by half of encostada thickness to cover outer corner
      // Encostada wall is shortened by half of passante thickness to sit flush
      const passanteTrim = -encostada.thickness / 2;
      const encostadaTrim = passante.thickness / 2;

      if (passante.isStart) {
        wallsWithDir[passante.wallIndex].startTrim = passanteTrim;
      } else {
        wallsWithDir[passante.wallIndex].endTrim = passanteTrim;
      }

      if (encostada.isStart) {
        wallsWithDir[encostada.wallIndex].startTrim = encostadaTrim;
      } else {
        wallsWithDir[encostada.wallIndex].endTrim = encostadaTrim;
      }
      return;
    }

    // 3 or more walls meeting (T-Junction or Cross):
    // Find the pair that are most collinear (dot closest to -1)
    let bestDot = 0;
    let mainA: VertexAttachment | null = null;
    let mainB: VertexAttachment | null = null;

    for (let i = 0; i < atts.length; i++) {
      for (let j = i + 1; j < atts.length; j++) {
        const dot = atts[i].dirX * atts[j].dirX + atts[i].dirY * atts[j].dirY;
        if (dot < bestDot) {
          bestDot = dot;
          mainA = atts[i];
          mainB = atts[j];
        }
      }
    }

    if (bestDot < -0.65 && mainA && mainB) {
      // Main through-wall (passante): no trim at this continuous intersection
      const mainThickness = (mainA.thickness + mainB.thickness) / 2;

      // Other branches (divisórias) abut against the main wall face
      atts.forEach((att) => {
        if (att === mainA || att === mainB) return;
        const trim = mainThickness / 2;
        if (att.isStart) {
          wallsWithDir[att.wallIndex].startTrim = trim;
        } else {
          wallsWithDir[att.wallIndex].endTrim = trim;
        }
      });
    } else {
      // If no straight through-wall found, longest wall passes, others abut
      let longest = atts[0];
      for (let i = 1; i < atts.length; i++) {
        if (atts[i].rawLen > longest.rawLen) longest = atts[i];
      }

      atts.forEach((att) => {
        if (att === longest) {
          const maxOtherThick = Math.max(...atts.filter((o) => o !== longest).map((o) => o.thickness));
          const trim = -maxOtherThick / 2;
          if (att.isStart) {
            wallsWithDir[att.wallIndex].startTrim = trim;
          } else {
            wallsWithDir[att.wallIndex].endTrim = trim;
          }
        } else {
          const trim = longest.thickness / 2;
          if (att.isStart) {
            wallsWithDir[att.wallIndex].startTrim = trim;
          } else {
            wallsWithDir[att.wallIndex].endTrim = trim;
          }
        }
      });
    }
  });

  // Calculate resulting adjusted 3D coordinates
  return wallsWithDir
    .map((w) => {
      // Adjusted start: start + startTrim * dir
      const adjStartX = w.start.x + w.startTrim * w.ux;
      const adjStartY = w.start.y + w.startTrim * w.uy;

      // Adjusted end: end - endTrim * dir
      const adjEndX = w.end.x - w.endTrim * w.ux;
      const adjEndY = w.end.y - w.endTrim * w.uy;

      const adjDx = adjEndX - adjStartX;
      const adjDz = adjEndY - adjStartY;
      const adjLen = Math.hypot(adjDx, adjDz);

      if (adjLen < 0.01) return null;

      const angle = Math.atan2(adjDz, adjDx);
      const centerX = (adjStartX + adjEndX) / 2;
      const centerZ = (adjStartY + adjEndY) / 2;

      return {
        id: w.id,
        originalStart: w.start,
        originalEnd: w.end,
        adjustedStart: { x: adjStartX, y: adjStartY },
        adjustedEnd: { x: adjEndX, y: adjEndY },
        length: adjLen,
        centerX,
        centerZ,
        angle,
        thickness: w.thickness,
        height: w.height,
      };
    })
    .filter((w): w is AdjustedWallOutput => w !== null);
}

/**
 * Procedural Wall Slicing: Slices a wall into solid rectangular segments around
 * all doors and windows without CSG boolean artifacts, running at 60+ FPS.
 */
export function calculateWallSegments(
  wallLength: number,
  wallHeight: number,
  openings: WallOpening[]
): WallSegment[] {
  if (wallLength <= 0 || wallHeight <= 0) return [];

  // Filter and normalize openings belonging to this wall
  const validOpenings = openings
    .map((o) => {
      const left = Math.max(0, o.position * wallLength - o.width / 2);
      const right = Math.min(wallLength, o.position * wallLength + o.width / 2);
      const bottom = Math.max(0, o.sillHeight || 0);
      const top = Math.min(wallHeight, bottom + o.height);
      return { ...o, left, right, bottom, top, w: right - left, h: top - bottom };
    })
    .filter((o) => o.right > o.left && o.top > o.bottom);

  if (validOpenings.length === 0) {
    return [
      {
        width: wallLength,
        height: wallHeight,
        bottomY: 0,
        offsetX: wallLength / 2,
      },
    ];
  }

  // Sorted unique X edge cuts along the wall length
  const edgeSet = new Set<number>([0, wallLength]);
  validOpenings.forEach((o) => {
    edgeSet.add(o.left);
    edgeSet.add(o.right);
  });
  const edges = Array.from(edgeSet).sort((a, b) => a - b);

  const segments: WallSegment[] = [];

  for (let i = 0; i < edges.length - 1; i++) {
    const left = edges[i];
    const right = edges[i + 1];
    const segWidth = right - left;
    if (segWidth <= 0.001) continue;

    const offsetX = (left + right) / 2;

    // Find openings that overlap with this horizontal span
    const overlapping = validOpenings.filter((o) => o.left < right - 0.0001 && o.right > left + 0.0001);

    if (overlapping.length === 0) {
      // Full solid vertical slice
      segments.push({
        width: segWidth,
        height: wallHeight,
        bottomY: 0,
        offsetX,
      });
    } else {
      // Sort holes by bottom elevation
      const sortedHoles = [...overlapping].sort((a, b) => a.bottom - b.bottom);
      let currentBottom = 0;

      for (const hole of sortedHoles) {
        // Solid wall slice below opening (e.g. window sill peitoril)
        if (hole.bottom > currentBottom + 0.005) {
          segments.push({
            width: segWidth,
            height: hole.bottom - currentBottom,
            bottomY: currentBottom,
            offsetX,
          });
        }
        currentBottom = Math.max(currentBottom, hole.top);
      }

      // Solid wall slice above highest opening (e.g. wall header verga)
      if (wallHeight > currentBottom + 0.005) {
        segments.push({
          width: segWidth,
          height: wallHeight - currentBottom,
          bottomY: currentBottom,
          offsetX,
        });
      }
    }
  }

  return segments;
}

/**
 * Creates the 3D Wall Group with all sliced wall segment meshes.
 */
export function buildParametricWallGroup(
  wallLength: number,
  wallHeight: number,
  wallThickness: number,
  wallConfig: WallSettings,
  openings: WallOpening[],
  wallMaterial: THREE.MeshStandardMaterial
): THREE.Group {
  const wallGroup = new THREE.Group();
  const segments = calculateWallSegments(wallLength, wallHeight, openings);

  segments.forEach((seg) => {
    const geo = new THREE.BoxGeometry(seg.width, seg.height, wallThickness);
    const mesh = new THREE.Mesh(geo, wallMaterial);

    // Local coordinate origin: center of the wall horizontally (X=0), bottom on floor (Y=0)
    const localX = seg.offsetX - wallLength / 2;
    const localY = seg.bottomY + seg.height / 2;

    mesh.position.set(localX, localY, 0);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.userData = { isWall: true, type: 'wall' };
    wallGroup.add(mesh);
  });

  return wallGroup;
}

export interface GlassPreset {
  id: GlassType;
  name: string;
  color: string;
  opacity: number;
  roughness: number;
  metalness: number;
  transmission: number;
}

export const GLASS_PRESETS: GlassPreset[] = [
  { id: 'clear', name: 'Incolor Cristal', color: '#dbeafe', opacity: 0.22, roughness: 0.04, metalness: 0.1, transmission: 0.9 },
  { id: 'smoke', name: 'Fumê Escuro', color: '#1e293b', opacity: 0.65, roughness: 0.05, metalness: 0.2, transmission: 0.5 },
  { id: 'frosted', name: 'Jateado / Fosco', color: '#f8fafc', opacity: 0.78, roughness: 0.45, metalness: 0.05, transmission: 0.4 },
  { id: 'mirror', name: 'Refletivo / Espelhado', color: '#94a3b8', opacity: 0.45, roughness: 0.02, metalness: 0.85, transmission: 0.35 },
  { id: 'bronze', name: 'Bronze Solar', color: '#d97706', opacity: 0.38, roughness: 0.05, metalness: 0.15, transmission: 0.7 },
  { id: 'green', name: 'Verde Float', color: '#10b981', opacity: 0.32, roughness: 0.05, metalness: 0.1, transmission: 0.75 },
];

/**
 * Builds a hollow rectangular sash frame with a glass pane inside and optional mullion grid.
 */
function createSashWithGlass(
  w: number,
  h: number,
  sashProfile: number,
  sashDepth: number,
  frameMat: THREE.Material,
  glassMat: THREE.Material,
  mullionStyle?: WindowMullionStyle
): THREE.Group {
  const sashGroup = new THREE.Group();
  const innerPaneW = Math.max(0.01, w - sashProfile * 2);
  const innerPaneH = Math.max(0.01, h - sashProfile * 2);

  // 1. Hollow perimeter frame (Rails & Stiles)
  // Top rail
  const topRail = new THREE.Mesh(new THREE.BoxGeometry(w, sashProfile, sashDepth), frameMat);
  topRail.position.set(0, h / 2 - sashProfile / 2, 0);
  topRail.castShadow = false;
  sashGroup.add(topRail);

  // Bottom rail
  const btmRail = new THREE.Mesh(new THREE.BoxGeometry(w, sashProfile, sashDepth), frameMat);
  btmRail.position.set(0, -h / 2 + sashProfile / 2, 0);
  btmRail.castShadow = false;
  sashGroup.add(btmRail);

  // Left stile
  const leftStile = new THREE.Mesh(new THREE.BoxGeometry(sashProfile, innerPaneH, sashDepth), frameMat);
  leftStile.position.set(-w / 2 + sashProfile / 2, 0, 0);
  leftStile.castShadow = false;
  sashGroup.add(leftStile);

  // Right stile
  const rightStile = new THREE.Mesh(new THREE.BoxGeometry(sashProfile, innerPaneH, sashDepth), frameMat);
  rightStile.position.set(w / 2 - sashProfile / 2, 0, 0);
  rightStile.castShadow = false;
  sashGroup.add(rightStile);

  // 2. Center Glass Pane
  const glass = new THREE.Mesh(new THREE.BoxGeometry(innerPaneW, innerPaneH, 0.008), glassMat);
  glass.position.set(0, 0, 0);
  glass.castShadow = false;
  sashGroup.add(glass);

  // 3. Optional architectural grids / mullions
  if (mullionStyle === 'colonial') {
    const barThick = 0.014;
    const vBar = new THREE.Mesh(new THREE.BoxGeometry(barThick, innerPaneH, sashDepth * 0.7), frameMat);
    const hBar = new THREE.Mesh(new THREE.BoxGeometry(innerPaneW, barThick, sashDepth * 0.7), frameMat);
    vBar.castShadow = false;
    hBar.castShadow = false;
    sashGroup.add(vBar);
    sashGroup.add(hBar);
  } else if (mullionStyle === 'industrial') {
    const barThick = 0.016;
    [-innerPaneH / 3.2, innerPaneH / 3.2].forEach((yOff) => {
      const hBar = new THREE.Mesh(new THREE.BoxGeometry(innerPaneW, barThick, sashDepth * 0.75), frameMat);
      hBar.position.y = yOff;
      hBar.castShadow = false;
      sashGroup.add(hBar);
    });
  }

  return sashGroup;
}

/**
 * Creates 3D Architectural Door / Window Meshes with Frames, Glass, and Handles.
 */
export function buildOpening3D(
  opening: WallOpening,
  wallThickness: number
): THREE.Group {
  const group = new THREE.Group();
  group.name = `opening_${opening.id}`;
  group.userData = { isOpening: true, openingId: opening.id, opening };

  const framePreset =
    OPENING_FRAME_COLORS.find((p) => p.color.toLowerCase() === opening.frameColor?.toLowerCase()) ||
    OPENING_FRAME_COLORS[0];

  const frameMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(opening.frameColor || framePreset.color),
    roughness: framePreset.roughness,
    metalness: framePreset.metalness,
  });

  const glassPreset =
    GLASS_PRESETS.find((g) => g.id === opening.glassType) ||
    GLASS_PRESETS[0];

  const glassColorHex = opening.glassColor || glassPreset.color;
  const glassOpacity = opening.glassOpacity ?? glassPreset.opacity;
  const glassRoughness = opening.glassRoughness ?? glassPreset.roughness;
  const glassMetalness = glassPreset.metalness ?? 0.1;
  const glassTransmission = glassPreset.transmission ?? 0.9;

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(glassColorHex),
    roughness: glassRoughness,
    metalness: glassMetalness,
    transmission: glassTransmission,
    ior: 1.52,
    reflectivity: 0.9,
    transparent: true,
    opacity: glassOpacity,
    depthWrite: false,
    specularIntensity: 1.0,
    specularColor: new THREE.Color('#ffffff'),
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#e2e8f0'),
    roughness: 0.15,
    metalness: 0.95,
  });

  const woodDoorMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#9a6237'),
    roughness: 0.65,
    metalness: 0.05,
  });

  const jambThick = 0.035; // Frame thickness
  const jambDepth = wallThickness + 0.015; // Slightly deeper than wall for casing reveal

  // 1. Outer Frame (Batentes / Esquadria)
  // Left jamb
  const leftJamb = new THREE.Mesh(
    new THREE.BoxGeometry(jambThick, opening.height, jambDepth),
    frameMat
  );
  leftJamb.position.set(-opening.width / 2 + jambThick / 2, opening.height / 2, 0);
  leftJamb.castShadow = false;
  group.add(leftJamb);

  // Right jamb
  const rightJamb = new THREE.Mesh(
    new THREE.BoxGeometry(jambThick, opening.height, jambDepth),
    frameMat
  );
  rightJamb.position.set(opening.width / 2 - jambThick / 2, opening.height / 2, 0);
  rightJamb.castShadow = false;
  group.add(rightJamb);

  // Header (Top jamb)
  const topJamb = new THREE.Mesh(
    new THREE.BoxGeometry(opening.width, jambThick, jambDepth),
    frameMat
  );
  topJamb.position.set(0, opening.height - jambThick / 2, 0);
  topJamb.castShadow = false;
  group.add(topJamb);

  // Bottom Sill for Windows
  if (opening.type.startsWith('window') || opening.sillHeight > 0) {
    const sill = new THREE.Mesh(
      new THREE.BoxGeometry(opening.width + 0.06, jambThick * 1.2, jambDepth + 0.04),
      frameMat
    );
    sill.position.set(0, jambThick / 2, 0);
    sill.castShadow = false;
    group.add(sill);
  }

  // 2. Door Leaves & Window Sashes
  const innerW = opening.width - jambThick * 2;
  const innerH = opening.height - jambThick * (opening.sillHeight > 0 ? 2 : 1);
  const innerCenterY = (opening.sillHeight > 0 ? jambThick : 0) + innerH / 2;

  if (opening.type === 'door-hinged') {
    // Single Hinged Door Leaf with Swing & Handle
    const leafThick = 0.035;
    const leafGroup = new THREE.Group();
    // Pivot hinge on the left edge
    leafGroup.position.set(-innerW / 2, 0, 0);

    const openAngle = (opening.leafOpenRatio ?? 0.35) * (Math.PI / 2.2);
    leafGroup.rotation.y = openAngle;

    const leafMesh = new THREE.Mesh(
      new THREE.BoxGeometry(innerW, innerH, leafThick),
      woodDoorMat
    );
    leafMesh.position.set(innerW / 2, innerCenterY, 0);
    leafMesh.castShadow = false;
    leafMesh.receiveShadow = true;
    leafGroup.add(leafMesh);

    // Door handles (inner and outer)
    const handleH = 0.95;
    [-1, 1].forEach((side) => {
      const handleBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.04, 16),
        chromeMat
      );
      handleBase.rotation.x = Math.PI / 2;
      handleBase.position.set(innerW - 0.07, handleH, side * (leafThick / 2 + 0.02));
      handleBase.castShadow = false;

      const handleLever = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.015, 0.015),
        chromeMat
      );
      handleLever.position.set(innerW - 0.12, handleH, side * (leafThick / 2 + 0.04));
      handleLever.castShadow = false;

      leafGroup.add(handleBase);
      leafGroup.add(handleLever);
    });

    group.add(leafGroup);
  } else if (opening.type === 'door-sliding' || opening.type === 'door-glass') {
    // 2-Leaf Sliding Door (Half open / glass)
    const leafW = innerW / 2 + 0.02;
    const isGlass = opening.type === 'door-glass';
    const sashBorder = 0.055;

    [-1, 1].forEach((side, idx) => {
      const leafGroup = new THREE.Group();
      const slideOffset = idx === 1 ? (opening.leafOpenRatio ?? 0.3) * (leafW * 0.7) : 0;
      leafGroup.position.set(side * (innerW / 4) - slideOffset, innerCenterY, side * 0.015);

      if (isGlass) {
        // Hollow glass sash leaf
        const sash = createSashWithGlass(leafW, innerH, sashBorder, 0.03, frameMat, glassMat, opening.mullionStyle);
        leafGroup.add(sash);
      } else {
        // Wood panel door leaf
        const panel = new THREE.Mesh(
          new THREE.BoxGeometry(leafW, innerH, 0.035),
          woodDoorMat
        );
        panel.castShadow = false;
        leafGroup.add(panel);
      }

      // Vertical bar pull handle
      const barHandle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.01, 0.4, 12),
        chromeMat
      );
      barHandle.position.set(side * (leafW / 2 - 0.04), 0, 0.025);
      barHandle.castShadow = false;
      leafGroup.add(barHandle);

      group.add(leafGroup);
    });
  } else if (opening.type.startsWith('window')) {
    const isPanoramic = opening.mullionStyle === 'panoramic';

    if (isPanoramic) {
      // 1-Piece Full Panoramic Glass Window
      const sash = createSashWithGlass(
        innerW,
        innerH,
        0.035,
        0.028,
        frameMat,
        glassMat,
        opening.mullionStyle
      );
      sash.position.set(0, innerCenterY, 0);
      group.add(sash);
    } else {
      // 2-Pane Window with Central Mullion
      const paneW = (innerW - jambThick) / 2;
      const sashProfile = 0.03;

      [-1, 1].forEach((side) => {
        const paneCenter = side * (paneW / 2 + jambThick / 4);
        const sash = createSashWithGlass(
          paneW,
          innerH,
          sashProfile,
          0.025,
          frameMat,
          glassMat,
          opening.mullionStyle
        );
        sash.position.set(paneCenter, innerCenterY, 0);
        group.add(sash);
      });

      // Center Vertical Mullion
      const mullion = new THREE.Mesh(
        new THREE.BoxGeometry(jambThick, innerH, jambDepth * 0.7),
        frameMat
      );
      mullion.position.set(0, innerCenterY, 0);
      mullion.castShadow = false;
      group.add(mullion);
    }
  }

  // Ensure all child meshes in doors and windows never cast shadows
  group.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = false;
    }
  });

  return group;
}
