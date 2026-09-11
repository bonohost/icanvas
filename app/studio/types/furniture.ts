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

export type WallSide = 'back' | 'front' | 'left' | 'right';

export type WallOpeningType =
  | 'door-hinged'
  | 'door-sliding'
  | 'door-opening'
  | 'door-glass'
  | 'window-standard'
  | 'window-large'
  | 'window-sliding'
  | 'window-high';

export interface WallOpening {
  id: string;
  wallSide: WallSide;
  type: WallOpeningType;
  name: string;
  position: number; // 0.0 to 1.0 (normalized position along the wall)
  width: number; // meters
  height: number; // meters
  sillHeight: number; // meters (0 for doors)
  frameColor?: string; // hex
  frameMaterial?: 'metal' | 'wood' | 'pvc';
  leafOpenRatio?: number; // 0.0 to 1.0
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
  openings?: WallOpening[];
  lightIntensity: number;
  reflectionOpacity: number;
}

export interface StudioProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  thumbnailUrl?: string;
  room: RoomSettings;
  furniture: FurnitureInstance[];
  cameraSettings?: {
    id: string;
    x: number;
    y: number;
    z: number;
    fov: number;
  };
}

