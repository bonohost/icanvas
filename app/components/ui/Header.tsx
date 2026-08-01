'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/mug-simulator', label: 'Caneca 3D' },
  { href: '/sofa-customizer', label: 'Sofá PBR' },
  { href: '/360-viewer', label: 'Visualizador 360' },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="absolute top-0 left-0 w-full z-10 p-4">
      <nav className="container mx-auto flex justify-center items-center gap-4 md:gap-8 p-2 bg-black/20 backdrop-blur-md rounded-lg">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={`text-sm md:text-base transition-colors hover:text-white ${
              pathname === item.href ? 'text-white font-bold' : 'text-gray-400'
            }`}>
              {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}