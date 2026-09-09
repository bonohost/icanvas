import { create } from 'zustand';

export interface MugState {
  outerImage: string | null;
  useRender3Base: boolean;
  customText: string;
  useCanvasText: boolean;
  baseColor: string;
  alcaColor: string;
  interiorColor: string;
  roughness: number;
  metalness: number;
  autoRotate: boolean;
  
  // Actions
  setOuterImage: (image: string | null) => void;
  setUseRender3Base: (use: boolean) => void;
  setCustomText: (text: string) => void;
  setUseCanvasText: (use: boolean) => void;
  setBaseColor: (color: string) => void;
  setAlcaColor: (color: string) => void;
  setInteriorColor: (color: string) => void;
  setRoughness: (roughness: number) => void;
  setMetalness: (metalness: number) => void;
  setAutoRotate: (autoRotate: boolean) => void;
  reset: () => void;
}

const DEFAULT_STATE = {
  outerImage: null,
  useRender3Base: true,
  customText: 'iCanvas 3D',
  useCanvasText: false,
  baseColor: '#ffffff',
  alcaColor: '#ffffff',
  interiorColor: '#ffffff',
  roughness: 0.15,
  metalness: 0.05,
  autoRotate: true,
};

export const useMugStore = create<MugState>((set) => ({
  ...DEFAULT_STATE,
  
  setOuterImage: (image) => set({ outerImage: image, useRender3Base: false, useCanvasText: false }),
  setUseRender3Base: (use) => set({ useRender3Base: use, outerImage: null }),
  setCustomText: (text) => set({ customText: text, useCanvasText: true, useRender3Base: false }),
  setUseCanvasText: (use) => set({ useCanvasText: use, useRender3Base: false }),
  setBaseColor: (color) => set({ baseColor: color }),
  setAlcaColor: (color) => set({ alcaColor: color }),
  setInteriorColor: (color) => set({ interiorColor: color }),
  setRoughness: (roughness) => set({ roughness }),
  setMetalness: (metalness) => set({ metalness }),
  setAutoRotate: (autoRotate) => set({ autoRotate }),
  reset: () => set(DEFAULT_STATE),
}));
