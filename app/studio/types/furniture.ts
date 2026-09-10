export type MaterialType = 'fabric' | 'leather' | 'wood' | 'metal' | 'ceramic' | 'gltf';

export interface FurnitureSpec {
  id: string;
  name: string;
  w: number;
  d: number;
  h: number;
  by?: number; // Base Y (elevation from floor in meters)
  pr: 'up' | 'fr' | 'mt' | 'ce' | 'wall' | 'base'; // wall = wall unit, base = counter/floor base
  modelUrl?: string; // Optional GLB / GLTF model URL
  dm: {
    t: MaterialType;
    c: string;
  };
}

export interface FurnitureInstance extends FurnitureSpec {
  uid: number;
  rot: number;
  scl: number;
  x: number;
  z: number;
  by: number; // dynamically updated elevation
}

export interface CatalogCategory {
  id: string;
  label: string;
  icon: string;
  items: FurnitureSpec[];
}

export interface WallSettings {
  color: string;
  textureUrl?: string;
  tileX: number;
  tileY: number;
  roughness?: number;
  metalness?: number;
}

export interface RoomSettings {
  width: number;
  depth: number;
  height: number;
  floorColor: string;
  floorTextureUrl?: string;
  floorTileX: number;
  floorTileY: number;
  floorRoughness?: number;
  floorMetalness?: number;
  walls: {
    back: WallSettings;
    front: WallSettings;
    left: WallSettings;
    right: WallSettings;
  };
  lightIntensity: number;
  reflectionOpacity: number;
}
