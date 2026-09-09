import { CatalogCategory, MaterialType } from '../types/furniture';

export const CATALOG: CatalogCategory[] = [
  {
    id: 'kitchen',
    label: 'Cozinha & Armários',
    icon: 'CookingPot',
    items: [
      { id: 'cab-base-2', name: 'Balcão Base 2 Portas', w: 0.8, d: 0.6, h: 0.85, by: 0, pr: 'base', dm: { t: 'wood', c: '#ffffff' } },
      { id: 'cab-base-3', name: 'Balcão Triplo com Gavetas', w: 1.2, d: 0.6, h: 0.85, by: 0, pr: 'base', dm: { t: 'wood', c: '#ffffff' } },
      { id: 'cab-wall-1', name: 'Armário Aéreo 2 Portas', w: 0.8, d: 0.35, h: 0.65, by: 1.5, pr: 'wall', dm: { t: 'wood', c: '#ffffff' } },
      { id: 'cab-wall-glass', name: 'Aéreo com Vidro / Basculante', w: 1.0, d: 0.35, h: 0.45, by: 1.6, pr: 'wall', dm: { t: 'wood', c: '#18181b' } },
      { id: 'cab-corner', name: 'Armário de Canto em L', w: 0.9, d: 0.9, h: 0.85, by: 0, pr: 'base', dm: { t: 'wood', c: '#ffffff' } },
      { id: 'cab-island', name: 'Ilha Gourmet Central', w: 1.6, d: 0.9, h: 0.9, by: 0, pr: 'base', dm: { t: 'wood', c: '#2c2c2c' } },
    ],
  },
  {
    id: 'appliances',
    label: 'Eletrodomésticos',
    icon: 'Zap',
    items: [
      { id: 'app-fridge', name: 'Geladeira Inverse Inox', w: 0.75, d: 0.8, h: 1.9, by: 0, pr: 'fr', dm: { t: 'metal', c: '#d4d4d8' } },
      { id: 'app-stove', name: 'Fogão Cooktop / Forno', w: 0.6, d: 0.6, h: 0.9, by: 0, pr: 'fr', dm: { t: 'metal', c: '#18181b' } },
      { id: 'app-microwave', name: 'Forno Micro-ondas', w: 0.55, d: 0.4, h: 0.35, by: 1.0, pr: 'wall', dm: { t: 'metal', c: '#27272a' } },
      { id: 'app-hood', name: 'Coifa Ilha Inox', w: 0.9, d: 0.6, h: 0.8, by: 1.8, pr: 'ce', dm: { t: 'metal', c: '#e4e4e7' } },
    ],
  },
  {
    id: 'living',
    label: 'Salas & Estar',
    icon: 'Sofa',
    items: [
      { id: 'sofa-3p', name: 'Sofá 3 Lugares Confort', w: 2.1, d: 0.95, h: 0.85, by: 0, pr: 'up', dm: { t: 'fabric', c: '#8C8578' } },
      { id: 'sofa-lounge', name: 'Poltrona Minimalista', w: 0.85, d: 0.85, h: 0.75, by: 0, pr: 'up', dm: { t: 'leather', c: '#C4853A' } },
      { id: 'tbl-coffee', name: 'Mesa de Centro Carvalho', w: 1.1, d: 0.6, h: 0.38, by: 0, pr: 'fr', dm: { t: 'wood', c: '#C4A67D' } },
      { id: 'rack-tv', name: 'Rack TV Suspenso', w: 1.8, d: 0.4, h: 0.45, by: 0.2, pr: 'wall', dm: { t: 'wood', c: '#3A3A3A' } },
    ],
  },
  {
    id: 'dining',
    label: 'Mesas & Jantar',
    icon: 'Utensils',
    items: [
      { id: 'tbl-dining-6', name: 'Mesa de Jantar 6 Lugares', w: 1.8, d: 0.9, h: 0.76, by: 0, pr: 'fr', dm: { t: 'wood', c: '#5C4033' } },
      { id: 'chair-dining', name: 'Cadeira Estofada', w: 0.48, d: 0.52, h: 0.88, by: 0, pr: 'up', dm: { t: 'fabric', c: '#D4C5A9' } },
      { id: 'tbl-desk', name: 'Escrivaninha Studio Pro', w: 1.4, d: 0.7, h: 0.75, by: 0, pr: 'fr', dm: { t: 'wood', c: '#ffffff' } },
    ],
  },
  {
    id: 'decor',
    label: 'Iluminação & Decoração',
    icon: 'Sparkles',
    items: [
      { id: 'dec-lamp-floor', name: 'Luminária de Chão Arc', w: 0.45, d: 0.45, h: 1.85, by: 0, pr: 'mt', dm: { t: 'metal', c: '#2C2C2C' } },
      { id: 'dec-clock', name: 'Relógio de Parede Minimal', w: 0.35, d: 0.05, h: 0.35, by: 1.7, pr: 'wall', dm: { t: 'metal', c: '#000000' } },
      { id: 'dec-rug-large', name: 'Tapete Geométrico 2x3m', w: 3.0, d: 2.0, h: 0.015, by: 0.005, pr: 'up', dm: { t: 'fabric', c: '#4a4a4a' } },
    ],
  },
];

export const MATERIAL_OPTIONS: Record<MaterialType, { n: string; c: string }[]> = {
  fabric: [
    { n: 'Linho Bege', c: '#D4C5A9' },
    { n: 'Veludo Teal', c: '#2A9D8F' },
    { n: 'Algodão Cinza', c: '#8C8578' },
    { n: 'Azul Petróleo', c: '#1d3557' },
  ],
  leather: [
    { n: 'Couro Caramelo (Tan)', c: '#C4853A' },
    { n: 'Couro Preto', c: '#2C2C2C' },
    { n: 'Couro Café', c: '#4a2c11' },
  ],
  wood: [
    { n: 'Branco Acetinado', c: '#FFFFFF' },
    { n: 'Carvalho Natural', c: '#C4A67D' },
    { n: 'Nogueira Escura', c: '#5C4033' },
    { n: 'Grafite / Chumbo', c: '#3A3A3A' },
  ],
  metal: [
    { n: 'Inox Escovado', c: '#E0E0E0' },
    { n: 'Preto Fosco (Matte Black)', c: '#2C2C2C' },
    { n: 'Dourado Champanhe', c: '#d4af37' },
  ],
  ceramic: [
    { n: 'Branco Glazed', c: '#FFFFFF' },
    { n: 'Mármore Calacatta', c: '#F0F0F0' },
  ],
  gltf: [],
};
