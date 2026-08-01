import { create } from 'zustand';
import * as THREE from 'three';

// Definindo os materiais PBR que você quer usar
const materials = {
  veludo: new THREE.MeshStandardMaterial({ color: '#800080', roughness: 0.4, metalness: 0.1, name: 'veludo' }),
  couro: new THREE.MeshStandardMaterial({ color: '#8B4513', roughness: 0.2, metalness: 0.3, name: 'couro' }),
  tecido: new THREE.MeshStandardMaterial({ color: '#808080', roughness: 0.8, metalness: 0.0, name: 'tecido' }),
};

type MaterialKey = keyof typeof materials;

interface SofaState {
  materials: typeof materials;
  currentMaterialName: MaterialKey;
  setMaterial: (materialName: MaterialKey) => void;
}

export const useSofaStore = create<SofaState>((set) => ({
  materials,
  currentMaterialName: 'veludo',
  setMaterial: (materialName) => set({
    currentMaterialName: materialName
  }),
}));