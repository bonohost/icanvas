import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FurnitureSpec, MaterialType } from '../types/furniture';

const loader = new GLTFLoader();

function createTexture(type: MaterialType, color: string, size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);

  if (type === 'wood') {
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = `rgba(0,0,0,${Math.random() * 0.12})`;
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
    ctx.strokeStyle = 'rgba(0,0,0,0.04)';
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
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createMaterial(type: MaterialType, color: string) {
  const c = new THREE.Color(color);
  const options: THREE.MeshStandardMaterialParameters = { color: c, roughness: 0.8, metalness: 0 };

  if (type === 'fabric') {
    options.roughness = 0.95;
    options.map = createTexture('fabric', color);
  } else if (type === 'leather') {
    options.roughness = 0.5;
    options.metalness = 0.05;
  } else if (type === 'wood') {
    options.roughness = 0.65;
    options.map = createTexture('wood', color);
  } else if (type === 'metal') {
    options.roughness = 0.25;
    options.metalness = 0.85;
  } else if (type === 'ceramic') {
    options.roughness = 0.1;
    options.metalness = 0.05;
  }

  return new THREE.MeshStandardMaterial(options);
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
      const gltf = await new Promise<any>((resolve, reject) => {
        loader.load(spec.modelUrl!, resolve, undefined, reject);
      });
      const model = gltf.scene;

      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      box.getSize(size);

      model.scale.set(spec.w / size.x, spec.h / size.y, spec.d / size.z);

      const centeredBox = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3();
      centeredBox.getCenter(center);
      model.position.x = -center.x;
      model.position.z = -center.z;
      model.position.y = -centeredBox.min.y;

      model.traverse((child: any) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      group.add(model);
      return group;
    } catch (e) {
      console.warn('Fallback to procedural geometry for', spec.id, e);
    }
  }

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
