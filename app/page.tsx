export default function HomePage() {
  return (
    <>
      {/* Seção Hero: Ocupa a tela inteira e centraliza o conteúdo */}
      <section className="h-screen flex flex-col justify-center items-center text-center p-4">
        <div className="max-w-3xl text-white">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            Construindo o Impossível
          </h1>
          <p className="mt-6 text-lg md:text-xl text-gray-300">
            Explore a intersecção entre design e tecnologia. Uma experiência web
            imersiva construída WebGL.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <button className="px-6 py-3 font-semibold text-white bg-blue-600 rounded-lg shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-105">
              Começar Projeto
            </button>
            <button className="px-6 py-3 font-semibold text-gray-200 bg-gray-800/50 border border-gray-700 rounded-lg hover:bg-gray-700/50 transition-colors">
              Ver GitHub
            </button>
          </div>
        </div>

        {/* Indicador de rolagem */}
        <div className="absolute bottom-8 text-white animate-bounce">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6 mx-auto"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m19.5 8.25-7.5 7.5-7.5-7.5"
            />
          </svg>
        </div>
      </section>

      {/* Seção de Conteúdo: Fundo sólido para cobrir o 3D e focar no texto */}
      <section className="bg-gray-900 py-20 md:py-32">
        <div className="container mx-auto px-4 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Sobre a Tecnologia</h2>
          <p className="max-w-2xl mx-auto text-gray-400">
            Ao rolar, o conteúdo da página assume o foco. A cena 3D do hero
            section desaparece suavemente sob o novo conteúdo, criando uma
            transição limpa e profissional.
          </p>
        </div>
      </section>
    </>
  );
}
