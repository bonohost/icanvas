import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'iCanvas 3D - Pitch Deck & Captação Pre-Seed (Confidencial)',
  description: 'Apresentação restrita para investidores. Rodada Pre-Seed de R$ 300.000 para desenvolvimento da engine de geração de modelos 3D.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function PitchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
