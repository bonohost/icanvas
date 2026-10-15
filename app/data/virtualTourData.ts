export interface SphericalPosition {
  yaw: number;       // Longitude em graus (-180 a 180)
  pitch: number;     // Latitude em graus (-85 a 85)
  distance?: number; // Raio opcional (default 480)
  u?: number;        // Coordenada UV horizontal (0 a 1)
  v?: number;        // Coordenada UV vertical (0 a 1)
}

export interface NavigationHotspot {
  id: string;
  targetSceneId: string;
  position: SphericalPosition;
  targetEntryView?: { yaw: number; pitch: number; fov?: number };
  label: string;
  icon?: 'door' | 'arrow' | 'stairs' | 'sparkles';
  box2d?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] (0-1000)
}

export interface ObjectAnnotation {
  id: string;
  position: SphericalPosition;
  title: string;
  category: string;
  description?: string;
  price?: string;
  linkUrl?: string;
  box2d?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] (0-1000)
}

export interface VirtualTourScene {
  id: string;
  title: string;
  subtitle?: string;
  panoramaUrl: string;
  thumbnailUrl: string;
  initialView: {
    yaw: number;
    pitch: number;
    fov?: number;
  };
  navigationHotspots: NavigationHotspot[];
  objectAnnotations: ObjectAnnotation[];
}

export const INITIAL_TOUR_SCENES: Record<string, VirtualTourScene> = {
  kitchen: {
    id: "kitchen",
    title: "Cozinha Gourmet",
    subtitle: "Área Social Integrada",
    panoramaUrl: "/images/tour360/kitchen.jpg",
    thumbnailUrl: "/images/tour360/kitchen.jpg",
    initialView: {
      yaw: 0,
      pitch: 0,
      fov: 75
    },
    navigationHotspots: [
      {
        id: "kitchen_to_living",
        targetSceneId: "living_room",
        label: "Ir para a Sala de Estar",
        icon: "arrow",
        box2d: [
          440,
          215,
          595,
          360
        ],
        position: {
          u: 0.287,
          v: 0.517,
          yaw: -76.5,
          pitch: -3.1
        },
        targetEntryView: {
          yaw: -15,
          pitch: 0
        }
      },
      {
        id: "kitchen_to_balcony",
        targetSceneId: "balcony",
        label: "Sair para a Varanda e Piscina",
        icon: "door",
        box2d: [
          365,
          565,
          625,
          800
        ],
        position: {
          u: 0.682,
          v: 0.495,
          yaw: 65.7,
          pitch: 0.9
        },
        targetEntryView: {
          yaw: -60,
          pitch: -5
        }
      }
    ],
    objectAnnotations: [
      {
        id: "obj_ilha_central",
        title: "Ilha Gourmet Central em Mármore",
        category: "Marcenaria & Bancada",
        description: "Bancada esculpida em Mármore Calacatta com cuba dupla e área de cocção integrada.",
        price: "R$ 68.500",
        box2d: [
          565,
          285,
          895,
          710
        ],
        position: {
          u: 0.497,
          v: 0.73,
          yaw: -0.9,
          pitch: -41.4
        }
      },
      {
        id: "obj_coifa_ilha",
        title: "Coifa Suspensa em Inox Escovado",
        category: "Eletrodoméstico",
        description: "Sistema de exaustão industrial silencioso com iluminação LED embutida.",
        price: "R$ 19.200",
        box2d: [
          45,
          465,
          395,
          640
        ],
        position: {
          u: 0.552,
          v: 0.22,
          yaw: 18.9,
          pitch: 50.4
        }
      },
      {
        id: "obj_geladeira_inox",
        title: "Refrigerador Side-by-Side Inox Embutido",
        category: "Eletrodoméstico",
        description: "Refrigerador Sub-Zero revestido em aço inox com duplo compressor.",
        price: "R$ 84.000",
        box2d: [
          445,
          478,
          590,
          555
        ],
        position: {
          u: 0.521,
          v: 0.486,
          yaw: 7.4,
          pitch: 2.5,
          distance: 480
        }
      },
      {
        id: "obj_placa_inducao_ilha",
        title: "Cooktop por Indução na Ilha",
        category: "Eletrodoméstico",
        description: "Placa vitrocerâmica touch de 5 zonas com função booster.",
        price: "R$ 14.800",
        box2d: [
          628,
          520,
          710,
          632
        ],
        position: {
          u: 0.576,
          v: 0.669,
          yaw: 27.4,
          pitch: -30.4
        }
      }
    ]
  },
  living_room: {
    id: "living_room",
    title: "Sala de Estar Central",
    subtitle: "Living Integrado",
    panoramaUrl: "/images/tour360/living_room.jpg",
    thumbnailUrl: "/images/tour360/living_room.jpg",
    initialView: {
      yaw: 0,
      pitch: 0,
      fov: 75
    },
    navigationHotspots: [
      {
        id: "living_to_kitchen",
        targetSceneId: "kitchen",
        label: "Voltar para a Cozinha Gourmet",
        icon: "arrow",
        box2d: [
          350,
          95,
          610,
          310
        ],
        position: {
          u: 0.202,
          v: 0.48,
          yaw: -107.1,
          pitch: 3.6
        },
        targetEntryView: {
          yaw: 10,
          pitch: -10
        }
      },
      {
        id: "living_to_hallway",
        targetSceneId: "hallway",
        label: "Ir para o Hall Íntimo (Suítes)",
        icon: "door",
        box2d: [
          410,
          438,
          590,
          482
        ],
        position: {
          u: 0.46,
          v: 0.5,
          yaw: -14.4,
          pitch: 0
        },
        targetEntryView: {
          yaw: 10,
          pitch: 0
        }
      },
      {
        id: "living_to_balcony",
        targetSceneId: "balcony",
        label: "Sair para a Varanda e Piscina",
        icon: "door",
        box2d: [
          300,
          710,
          735,
          995
        ],
        position: {
          u: 0.852,
          v: 0.517,
          yaw: 126.9,
          pitch: -3.1
        },
        targetEntryView: {
          yaw: -90,
          pitch: 0
        }
      },
      {
        id: "hs_1792019515462",
        targetSceneId: "kitchen",
        label: "Ir para Cozinha Gourmet",
        icon: "door",
        position: {
          yaw: -115.9,
          pitch: -2.7,
          u: 0.178,
          v: 0.515,
          distance: 480
        }
      },
      {
        id: "hs_1792019545226",
        targetSceneId: "hallway",
        label: "Ir para Hall Íntimo e Galeria",
        icon: "door",
        position: {
          yaw: -41.6,
          pitch: 1.5,
          u: 0.385,
          v: 0.492,
          distance: 480
        }
      }
    ],
    objectAnnotations: [
      {
        id: "obj_sofa_curvo",
        title: "Sofá Modular Curvo em Linho Bege",
        category: "Mobiliário",
        description: "Sofá orgânico de 6 módulos estofado em linho belga impermeabilizado.",
        price: "R$ 42.900",
        box2d: [
          555,
          218,
          885,
          635
        ],
        position: {
          u: 0.426,
          v: 0.72,
          yaw: -26.5,
          pitch: -39.6
        }
      },
      {
        id: "obj_mesa_centro_madeira",
        title: "Mesa de Centro Orgânica em Madeira Maciça",
        category: "Mobiliário",
        description: "Tampo único em nogueira natural com acabamento em óleo mineral.",
        price: "R$ 11.500",
        box2d: [
          595,
          442,
          695,
          530
        ],
        position: {
          u: 0.49,
          v: 0.609,
          yaw: -3.6,
          pitch: -19.6,
          distance: 480
        }
      },
      {
        id: "obj_painel_tv_lareira",
        title: "Painel em Nogueira com TV 85\" e Lareira Linear",
        category: "Marcenaria & Equipamento",
        description: "Painel piso-teto em folha natural de nogueira americana e lareira ecológica.",
        price: "R$ 36.000",
        box2d: [
          248,
          615,
          660,
          695
        ],
        position: {
          u: 0.641,
          v: 0.409,
          yaw: 50.8,
          pitch: 16.5,
          distance: 480
        }
      }
    ]
  },
  balcony: {
    id: "balcony",
    title: "Varanda Gourmet e Piscina",
    subtitle: "Área Externa & Lazer",
    panoramaUrl: "/images/tour360/balcony.jpg",
    thumbnailUrl: "/images/tour360/balcony.jpg",
    initialView: {
      yaw: -45,
      pitch: 0,
      fov: 75
    },
    navigationHotspots: [
      {
        id: "hs_1792021366470",
        targetSceneId: "kitchen",
        label: "Ir para Cozinha Gourmet",
        icon: "door",
        position: {
          yaw: -113.5,
          pitch: 0.3,
          u: 0.185,
          v: 0.498,
          distance: 480
        }
      },
      {
        id: "hs_1792021383028",
        targetSceneId: "living_room",
        label: "Ir para Sala de Estar Central",
        icon: "door",
        position: {
          u: 0.24,
          v: 0.532,
          yaw: -93.4,
          pitch: -5.7,
          distance: 480
        }
      }
    ],
    objectAnnotations: [
      {
        id: "obj_piscina",
        title: "Piscina Exterior com Borda em Pedra Natural",
        category: "Lazer Externo",
        description: "Revestimento em pedra vulcânica e iluminação subaquática em fibra óptica.",
        box2d: [
          555,
          85,
          920,
          475
        ],
        position: {
          u: 0.28,
          v: 0.737,
          yaw: -79.2,
          pitch: -42.7
        }
      },
      {
        id: "obj_espreguicadeiras_piscina",
        title: "Espreguiçadeiras Duplas com Guarda-Sóis",
        category: "Mobiliário Externo",
        description: "Estrutura em alumínio naval e tecido acrílico resistente a raios UV.",
        price: "R$ 18.400",
        box2d: [
          465,
          225,
          555,
          360
        ],
        position: {
          u: 0.292,
          v: 0.51,
          yaw: -74.7,
          pitch: -1.8
        }
      },
      {
        id: "obj_mesa_jantar_externa",
        title: "Mesa de Jantar Externa em Teca (8 Lugares)",
        category: "Mobiliário Externo",
        description: "Madeira teca certificada tratada para áreas abertas com cadeiras em corda náutica.",
        price: "R$ 24.900",
        box2d: [
          545,
          585,
          730,
          775
        ],
        position: {
          u: 0.68,
          v: 0.637,
          yaw: 64.8,
          pitch: -24.7
        }
      },
      {
        id: "obj_churrasqueira_inox",
        title: "Bancada de Barbecue Gourmet a Gás em Inox",
        category: "Eletrodoméstico Externo",
        description: "Churrasqueira profissional a gás embutida em bancada de concreto arquitetônico.",
        price: "R$ 31.000",
        box2d: [
          520,
          915,
          735,
          998
        ],
        position: {
          u: 0.956,
          v: 0.627,
          yaw: 164.3,
          pitch: -22.9
        }
      }
    ]
  },
  hallway: {
    id: "hallway",
    title: "Hall Íntimo e Galeria",
    subtitle: "Circulação para Suítes",
    panoramaUrl: "/images/tour360/hallway.jpg",
    thumbnailUrl: "/images/tour360/hallway.jpg",
    initialView: {
      yaw: 10,
      pitch: 0,
      fov: 75
    },
    navigationHotspots: [
      {
        id: "hallway_to_living",
        targetSceneId: "living_room",
        label: "Voltar para a Sala de Estar",
        icon: "arrow",
        box2d: [
          250,
          0,
          740,
          290
        ],
        position: {
          u: 0.299,
          v: 0.52,
          yaw: -72.5,
          pitch: -3.5,
          distance: 480
        },
        targetEntryView: {
          yaw: 165,
          pitch: 0
        }
      },
      {
        id: "hallway_to_master_bath",
        targetSceneId: "master_bath",
        label: "Acesso Direto ao Banheiro Spa",
        icon: "door",
        box2d: [
          195,
          860,
          795,
          998
        ],
        position: {
          u: 0.929,
          v: 0.495,
          yaw: 154.4,
          pitch: 0.9
        },
        targetEntryView: {
          yaw: -45,
          pitch: -5
        }
      },
      {
        id: "hs_1792019579481",
        targetSceneId: "master_suite",
        label: "Ir para Suíte Master",
        icon: "stairs",
        position: {
          yaw: 8.5,
          pitch: 2.7,
          u: 0.524,
          v: 0.485,
          distance: 480
        }
      },
      {
        id: "hs_1792022963742",
        targetSceneId: "kitchen",
        label: "Ir para Cozinha Gourmet",
        icon: "stairs",
        position: {
          yaw: -96.2,
          pitch: 1.4,
          u: 0.233,
          v: 0.492,
          distance: 480
        }
      }
    ],
    objectAnnotations: [
      {
        id: "obj_galeria_quadros_hall",
        title: "Tríptico de Arte Abstrata Contemporânea",
        category: "Decoração & Arte",
        description: "Série exclusiva em tinta acrílica e pigmentos minerais sobre tela.",
        price: "R$ 15.600",
        box2d: [
          410,
          610,
          540,
          675
        ],
        position: {
          u: 0.642,
          v: 0.475,
          yaw: 51.3,
          pitch: 4.5
        }
      }
    ]
  },
  master_suite: {
    id: "master_suite",
    title: "Suíte Master",
    subtitle: "Área Íntima Principal",
    panoramaUrl: "/images/tour360/master_suite.jpg",
    thumbnailUrl: "/images/tour360/master_suite.jpg",
    initialView: {
      yaw: 0,
      pitch: 0,
      fov: 75
    },
    navigationHotspots: [
      {
        id: "suite_to_bath",
        targetSceneId: "master_bath",
        label: "Entrar no Banheiro Spa",
        icon: "door",
        box2d: [
          185,
          0,
          780,
          195
        ],
        position: {
          u: 0.097,
          v: 0.482,
          yaw: -144.9,
          pitch: 3.2
        },
        targetEntryView: {
          yaw: 0,
          pitch: -5
        }
      },
      {
        id: "hs_1792019603049",
        targetSceneId: "hallway",
        label: "Ir para Hall Íntimo e Galeria",
        icon: "stairs",
        position: {
          yaw: 159.4,
          pitch: 8.2,
          u: 0.943,
          v: 0.455,
          distance: 480
        }
      }
    ],
    objectAnnotations: [
      {
        id: "obj_cama_king_suite",
        title: "Cama King Size com Cabeceira Estofada",
        category: "Mobiliário",
        description: "Cabeceira modular em veludo boucle e base estofada com enxoval 600 fios.",
        price: "R$ 29.800",
        box2d: [
          465,
          295,
          775,
          560
        ],
        position: {
          u: 0.616,
          v: 0.581,
          yaw: 41.9,
          pitch: -14.6,
          distance: 480
        }
      },
      {
        id: "obj_poltronas_leitura",
        title: "Poltronas de Leitura com Mesa Lateral",
        category: "Mobiliário",
        description: "Lounge de leitura voltado para o jardim com poltronas giratórias em linho.",
        price: "R$ 12.400",
        box2d: [
          565,
          535,
          705,
          650
        ],
        position: {
          u: 0.509,
          v: 0.6,
          yaw: 3.1,
          pitch: -17.9,
          distance: 480
        }
      },
      {
        id: "obj_closet_nogueira",
        title: "Closet Embutido em Nogueira Natural",
        category: "Marcenaria",
        description: "Portas piso-teto com puxadores ocultos e iluminação interna com sensor.",
        price: "R$ 54.000",
        box2d: [
          330,
          765,
          650,
          830
        ],
        position: {
          u: 0.797,
          v: 0.49,
          yaw: 107.1,
          pitch: 1.8
        }
      }
    ]
  },
  master_bath: {
    id: "master_bath",
    title: "Banheiro Spa Master",
    subtitle: "Sala de Banho em Mármore",
    panoramaUrl: "/images/tour360/master_bath.jpg",
    thumbnailUrl: "/images/tour360/master_bath.jpg",
    initialView: {
      yaw: 0,
      pitch: -5,
      fov: 75
    },
    navigationHotspots: [
      {
        id: "bath_to_hallway",
        targetSceneId: "hallway",
        label: "Sair para a Galeria / Hall",
        icon: "door",
        box2d: [
          320,
          642,
          650,
          705
        ],
        position: {
          u: 0.673,
          v: 0.485,
          yaw: 62.5,
          pitch: 2.7
        },
        targetEntryView: {
          yaw: -125,
          pitch: 0
        }
      },
      {
        id: "hs_1792023099569",
        targetSceneId: "master_suite",
        label: "Ir para Suíte Master",
        icon: "stairs",
        position: {
          yaw: -170.3,
          pitch: 3.3,
          u: 0.027,
          v: 0.482,
          distance: 480
        }
      }
    ],
    objectAnnotations: [
      {
        id: "obj_banheira_imersao",
        title: "Banheira de Imersão Freestanding Ovada",
        category: "Hidráulica & Spa",
        description: "Banheira esculpida em rocha vulcânica e resina mineral branca fosca.",
        price: "R$ 34.500",
        box2d: [
          605,
          185,
          765,
          365
        ],
        position: {
          u: 0.275,
          v: 0.685,
          yaw: -81,
          pitch: -33.3
        }
      },
      {
        id: "obj_bancada_dupla_marmore",
        title: "Bancada Curva Dupla em Mármore Calacatta",
        category: "Marcenaria & Bancada",
        description: "Cuba dupla esculpida, gabinete suspenso em nogueira e espelhos retroiluminados.",
        price: "R$ 41.200",
        box2d: [
          365,
          388,
          635,
          628
        ],
        position: {
          u: 0.508,
          v: 0.5,
          yaw: 2.9,
          pitch: 0
        }
      },
      {
        id: "obj_box_duche_vidro",
        title: "Cabine Walk-in Curva com Duche Duplo de Teto",
        category: "Hidráulica & Spa",
        description: "Fechamento em vidro temperado curvo extra-clear e piso em mármore antiderrapante.",
        price: "R$ 22.800",
        box2d: [
          115,
          668,
          845,
          920
        ],
        position: {
          u: 0.794,
          v: 0.48,
          yaw: 105.8,
          pitch: 3.6
        }
      }
    ]
  }
};
