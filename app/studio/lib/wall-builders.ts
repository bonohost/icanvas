import * as THREE from 'three';
import { WallOpening, WallSide, WallSettings } from '../types/furniture';

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
    wallGroup.add(mesh);
  });

  return wallGroup;
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

  const glassMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#93c5fd'),
    roughness: 0.05,
    metalness: 0.1,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
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
  leftJamb.castShadow = true;
  group.add(leftJamb);

  // Right jamb
  const rightJamb = new THREE.Mesh(
    new THREE.BoxGeometry(jambThick, opening.height, jambDepth),
    frameMat
  );
  rightJamb.position.set(opening.width / 2 - jambThick / 2, opening.height / 2, 0);
  rightJamb.castShadow = true;
  group.add(rightJamb);

  // Header (Top jamb)
  const topJamb = new THREE.Mesh(
    new THREE.BoxGeometry(opening.width, jambThick, jambDepth),
    frameMat
  );
  topJamb.position.set(0, opening.height - jambThick / 2, 0);
  topJamb.castShadow = true;
  group.add(topJamb);

  // Bottom Sill for Windows
  if (opening.type.startsWith('window') || opening.sillHeight > 0) {
    const sill = new THREE.Mesh(
      new THREE.BoxGeometry(opening.width + 0.06, jambThick * 1.2, jambDepth + 0.04),
      frameMat
    );
    sill.position.set(0, jambThick / 2, 0);
    sill.castShadow = true;
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
    leafMesh.castShadow = true;
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

      const handleLever = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.015, 0.015),
        chromeMat
      );
      handleLever.position.set(innerW - 0.12, handleH, side * (leafThick / 2 + 0.04));

      leafGroup.add(handleBase);
      leafGroup.add(handleLever);
    });

    group.add(leafGroup);
  } else if (opening.type === 'door-sliding' || opening.type === 'door-glass') {
    // 2-Leaf Sliding Door (Half open / glass)
    const leafW = innerW / 2 + 0.02;
    const isGlass = opening.type === 'door-glass';

    [-1, 1].forEach((side, idx) => {
      const leafGroup = new THREE.Group();
      const slideOffset = idx === 1 ? (opening.leafOpenRatio ?? 0.3) * (leafW * 0.7) : 0;
      leafGroup.position.set(side * (innerW / 4) - slideOffset, innerCenterY, side * 0.015);

      // Frame around sash
      const sashFrame = new THREE.Mesh(
        new THREE.BoxGeometry(leafW, innerH, 0.03),
        frameMat
      );
      leafGroup.add(sashFrame);

      if (isGlass) {
        const glassPane = new THREE.Mesh(
          new THREE.BoxGeometry(leafW - 0.08, innerH - 0.08, 0.01),
          glassMat
        );
        leafGroup.add(glassPane);
      } else {
        const panel = new THREE.Mesh(
          new THREE.BoxGeometry(leafW - 0.06, innerH - 0.06, 0.02),
          woodDoorMat
        );
        leafGroup.add(panel);
      }

      // Vertical bar pull handle
      const barHandle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.01, 0.4, 12),
        chromeMat
      );
      barHandle.position.set(side * (leafW / 2 - 0.04), 0, 0.025);
      leafGroup.add(barHandle);

      group.add(leafGroup);
    });
  } else if (opening.type.startsWith('window')) {
    // 2-Pane Window with Mullions and PBR Glass
    const paneW = (innerW - jambThick) / 2;

    [-1, 1].forEach((side) => {
      const paneCenter = side * (paneW / 2 + jambThick / 4);

      // Glass pane
      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(paneW, innerH, 0.008),
        glassMat
      );
      glass.position.set(paneCenter, innerCenterY, 0);
      group.add(glass);

      // Inner Sash Frame
      const sash = new THREE.Mesh(
        new THREE.BoxGeometry(paneW, innerH, 0.02),
        frameMat
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
    group.add(mullion);
  }

  return group;
}
