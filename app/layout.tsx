import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Scene from "./components/canvas/Scene";
import LayoutCanvas from "./components/canvas/LayoutCanvas";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Meu Portfólio 3D",
  description: "Uma vitrine interativa construída com Next.js e Three.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        {/* O conteúdo da página (children) é renderizado aqui */}
        {children}

        {/* O Canvas 3D é gerenciado por um Client Component para evitar erros */}
        <LayoutCanvas>
          <Scene />
        </LayoutCanvas>
      </body>
    </html>
  );
}
