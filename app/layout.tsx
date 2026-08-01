import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from 'next/font/google';
import Scene from "./components/canvas/Scene";
import Header from "./components/ui/Header";
import "./globals.css";

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: "iCanvas - Visualização 3D de Próxima Geração",
  description: "Simuladores interativos WebGL para canecas, móveis e ambientes 360.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br" className={`dark ${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Header />
        {/* O conteúdo da página (children) é renderizado aqui */}
        {children}

        {/* O Canvas 3D é gerenciado por um Client Component para evitar erros */}
        <Scene />
      </body>
    </html>
  );
}
