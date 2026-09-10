import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FurnitureSpec, MaterialType } from '../types/furniture';

const loader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader().setCrossOrigin('anonymous');

const gltfCache = new Map<string, Promise<THREE.Group>>();
const textureCache = new Map<string, THREE.Texture>();

export const PBR_SETTINGS: Record<MaterialType, { roughness: number; metalness: number; opacity?: number }> = {
  wood: { roughness: 0.65, metalness: 0.05 },
  metal: { roughness: 0.25, metalness: 0.85 },
  fabric: { roughness: 0.95, metalness: 0.0 },
  leather: { roughness: 0.5, metalness: 0.08 },
  ceramic: { roughness: 0.15, metalness: 0.05 },
  gltf: { roughness: 0.7, metalness: 0.1 },
};

// Preset texture maps from /textures/ webp assets
const PRESET_TEXTURES: Record<string, string> = {
  '#c4a67d': '/textures/floor-light-oak.webp',
  '#5c4033': '/textures/floor-walnut.webp',
  '#b45309': '/textures/wood-panel.webp',
  '#f0f0f0': '/textures/floor-marble-white.webp',
  '#1c1917': '/textures/floor-marble-dark.webp',
  '#78716c': '/textures/concrete.webp',
  '#d4c5a9': '/textures/floor-carpet-beige.webp',
  '#8c8578': '/textures/floor-carpet-gray.webp',
};

export function getLoadedTexture(url: string, repeatX = 1, repeatY = 1): THREE.Texture {
  const key = `${url}_${repeatX}_${repeatY}`;
  if (!textureCache.has(key)) {
    const tex = textureLoader.load(url);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.colorSpace = THREE.SRGBColorSpace;
    textureCache.set(key, tex);
  }
  return textureCache.get(key)!;
}

export function createProceduralTexture(type: MaterialType, color: string, size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);

  if (type === 'wood') {
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = `rgba(0,0,0,${Math.random() * 0.14})`;
      ctx.lineWidth = Math.random() * 2.5 + 0.5;
      ctx.beginPath();
      let y = Math.random() * size;
      ctx.moveTo(0, y);
      for (let p = 0; p < size; p += 6) {
        y += (Math.random() - 0.5) * 3;
        ctx.lineTo(p, y);
      }
      ctx.stroke();
    }
  } else if (type === 'fabric') {
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < size; i += 3) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }
  } else if (type === 'leather') {
    for (let i = 0; i < 2000; i++) {
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.04})`;
      const rx = Math.random() * size;
      const ry = Math.random() * size;
      ctx.fillRect(rx, ry, 2, 2);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createMaterial(type: MaterialType, color: string, textureUrl?: string): THREE.MeshStandardMaterial {
  const c = new THREE.Color(color);
  const pbr = PBR_SETTINGS[type] || PBR_SETTINGS.wood;

  const mat = new THREE.MeshStandardMaterial({
    color: c,
    roughness: pbr.roughness,
    metalness: pbr.metalness,
  });

  const matchingPreset = textureUrl || PRESET_TEXTURES[color.toLowerCase()];
  if (matchingPreset) {
    mat.map = getLoadedTexture(matchingPreset, 1, 1);
  } else if (type === 'fabric' || type === 'wood' || type === 'leather') {
    mat.map = createProceduralTexture(type, color);
  }

  return mat;
}

export function cloneModel(source: THREE.Group): THREE.Group {
  const clone = source.clone(true);
  const geometries = new Map<THREE.BufferGeometry, THREE.BufferGeometry>();
  const materials = new Map<THREE.Material, THREE.Material>();

  clone.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if (!geometries.has(child.geometry)) {
        geometries.set(child.geometry, child.geometry.clone());
      }
      child.geometry = geometries.get(child.geometry)!;

      if (Array.isArray(child.material)) {
        child.material = child.material.map((m) => {
          if (!materials.has(m)) materials.set(m, m.clone());
          return materials.get(m)!;
        });
      } else if (child.material) {
        if (!materials.has(child.material)) {
          materials.set(child.material, child.material.clone());
        }
        child.material = materials.get(child.material)!;
      }
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return clone;
}

export async function loadGLTFModel(url: string): Promise<THREE.Group> {
  if (!gltfCache.has(url)) {
    gltfCache.set(
      url,
      new Promise((resolve, reject) => {
        loader.load(
          url,
          (gltf) => resolve(gltf.scene),
          undefined,
          (err) => reject(err)
        );
      })
    );
  }
  const source = await gltfCache.get(url)!;
  return cloneModel(source);
}

/**
 * Ported directly from OpenPlan3D:
 * Match the complete model's footprint, center it, and place its bottom at zero (ground).
 */
export function fitFurnitureModel(
  model: THREE.Group,
  width: number,
  height: number,
  depth: number
) {
  model.position.set(0, 0, 0);
  model.rotation.set(0, 0, 0);
  model.scale.set(1, 1, 1);
  model.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());

  if (
    [size.x, size.y, size.z, width, height, depth].some(
      (v) => !Number.isFinite(v) || v <= 0
    )
  ) {
    return;
  }

  model.scale.multiply(
    new THREE.Vector3(width / size.x, height / size.y, depth / size.z)
  );
  model.updateMatrixWorld(true);

  bounds.setFromObject(model);
  const center = bounds.getCenter(new THREE.Vector3());
  model.position.sub(new THREE.Vector3(center.x, bounds.min.y, center.z));
  model.updateMatrixWorld(true);
}

/**
 * Applies custom PBR materials, roughness, metalness, and color tints directly to the 3D GLB mesh.
 */
export function applyPBRToModel(
  model: THREE.Group,
  type: MaterialType,
  colorHex: string,
  textureUrl?: string
) {
  const pbr = PBR_SETTINGS[type] || PBR_SETTINGS.wood;
  const tintColor = new THREE.Color(colorHex);
  const matchingPreset = textureUrl || PRESET_TEXTURES[colorHex.toLowerCase()];
  const presetTex = matchingPreset ? getLoadedTexture(matchingPreset, 1, 1) : null;

  const seen = new Set<THREE.Material>();

  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = true;
    child.receiveShadow = true;

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((mat) => {
      if (!mat || seen.has(mat)) return;
      seen.add(mat);

      if (mat instanceof THREE.MeshStandardMaterial) {
        mat.roughness = pbr.roughness;
        mat.metalness = pbr.metalness;

        if (presetTex) {
          mat.map = presetTex;
          mat.color.set('#ffffff');
        } else if (colorHex && colorHex !== '#ffffff') {
          // If custom tint is given, multiply to keep details and shading
          mat.color.set(tintColor);
        }

        mat.needsUpdate = true;
      }
    });
  });
}

function addPart(
  group: THREE.Group,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  pos: [number, number, number],
  behavior: string
) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(...pos);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.behavior = behavior;
  group.add(mesh);
  return mesh;
}

export async function buildFurniture(spec: FurnitureSpec): Promise<THREE.Group> {
  const group = new THREE.Group();

  if (spec.modelUrl) {
    try {
      const model = await loadGLTFModel(spec.modelUrl);

      // 1. Auto-fit model to exact target dimensions and center base
      fitFurnitureModel(model, spec.w, spec.h, spec.d);

      // 2. Apply PBR material finishes & tint
      applyPBRToModel(model, spec.dm.t, spec.dm.c);

      group.add(model);
      return group;
    } catch (e) {
      console.warn('Fallback to procedural geometry for', spec.id, e);
    }
  }

  // Procedural Fallback Builder
  const mat = createMaterial(spec.dm.t, spec.dm.c);

  if (spec.id.startsWith('sofa')) {
    const baseH = spec.h * 0.4;
    addPart(group, new THREE.BoxGeometry(spec.w, baseH, spec.d), mat, [0, baseH / 2, 0], 'up');
    addPart(
      group,
      new THREE.BoxGeometry(spec.w - 0.1, spec.h * 0.2, spec.d * 0.6),
      mat,
      [0, baseH + spec.h * 0.1, spec.d * 0.1],
      'up'
    );
    addPart(
      group,
      new THREE.BoxGeometry(spec.w, spec.h * 0.6, 0.15),
      mat,
      [0, spec.h * 0.7, -spec.d * 0.4],
      'up'
    );
  } else if (spec.id.startsWith('tbl') || spec.pr === 'base') {
    // Top surface
    addPart(group, new THREE.BoxGeometry(spec.w, 0.04, spec.d), mat, [0, spec.h - 0.02, 0], 'fr');
    const legW = 0.04;
    // Four legs
    [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ].forEach(([sx, sz]) => {
      addPart(
        group,
        new THREE.BoxGeometry(legW, spec.h, legW),
        mat,
        [sx * (spec.w / 2 - legW), spec.h / 2, sz * (spec.d / 2 - legW)],
        'fr'
      );
    });
  } else {
    // Generic cabinet / appliance / decor
    addPart(group, new THREE.BoxGeometry(spec.w, spec.h, spec.d), mat, [0, spec.h / 2, 0], spec.pr);
  }

  return group;
}
