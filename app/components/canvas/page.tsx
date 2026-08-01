'use client';

import { useSofaStore } from '../../stores/sofaStore';

export default function SofaPage() {
  const { materials, currentMaterialName, setMaterial } = useSofaStore();
  const materialKeys = Object.keys(materials) as (keyof typeof materials)[];

  return (
    <main className="h-screen flex items-end justify-center pb-20 md:pb-32">
      <div className="text-center text-white p-4 bg-black/20 backdrop-blur-md rounded-lg">
        <h1 className="text-4xl font-bold">Customizador de Sofá</h1>
        <p className="mt-2 text-gray-300">
          Troque os materiais e veja a renderização PBR em tempo real.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          {materialKeys.map((key) => (
            <button
              key={key}
              onClick={() => setMaterial(key)}
              className={`px-4 py-2 font-semibold rounded-lg transition-all ${
                currentMaterialName === key ? 'bg-blue-600 text-white shadow-lg scale-110' : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}