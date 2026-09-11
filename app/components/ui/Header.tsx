'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/mug-simulator', label: 'Mug Sim' },
  // { href: '/sofa-customizer', label: 'Configurator' },
  { href: '/360-viewer', label: '360 Viewer' },
  { href: '/studio', label: 'Studio' },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop TopNavBar */}
      <header className="bg-surface-glass dark:bg-surface-glass font-body-md text-body-md fixed top-0 w-full z-50 backdrop-blur-xl shadow-md shadow-electric-glow/10 border-b border-white/10 hidden md:flex">
        <div className="flex justify-between items-center h-20 px-margin-desktop max-w-full mx-auto w-full">
          <Link href="/" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
            <img alt="iCanvas" className="h-10 w-10 rounded-md" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBnFZQ2bFdaVbssT6uU1ZjtMrnHWlwq6wk6FR-dLrRtjjW0IH3RqgwSrgUL7N_ZYK_kDZB2EyJDf9ZdhOwudm06y5aaMhkxbof6NlrORz0liR2CBKl3BNrGSsNh4oyLcovE5XuzP2kBdwoUexur6W_Do7rWACIFW4hTD1gY11Z_DQcHH2j4I6DSLH_5o4aIug1QkDZ2Yg49gLwxZFUoIw_sIOZMzxT-igdo6wkaDnNNvaVDJNlbrhNN" />
            <span className="font-headline-lg text-headline-lg font-bold text-primary tracking-tighter">iCanvas</span>
          </Link>

          <nav className="flex gap-8 items-center h-full">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`font-medium transition-colors duration-300 h-full flex items-center ${isActive
                      ? 'text-primary font-bold border-b-2 border-primary mt-[2px]'
                      : 'text-on-surface-variant hover:text-primary active:scale-95 transition-transform'
                    }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex gap-4 items-center">
            <button className="font-button-md text-button-md text-on-surface-variant hover:text-primary transition-colors duration-300 active:scale-95 transition-transform">Contact</button>
            <button className="bg-primary-container text-on-primary-container font-button-md text-button-md px-6 py-2 rounded-DEFAULT hover:opacity-90 transition-opacity active:scale-95 transition-transform shadow-[0_4px_14px_0_rgba(37,99,235,0.39)]">Get Started</button>
          </div>
        </div>
      </header>

      {/* Mobile TopAppBar Shell */}
      <header className="bg-surface-glass dark:bg-surface-glass font-body-md text-body-md fixed top-0 w-full z-50 backdrop-blur-xl shadow-md shadow-electric-glow/10 border-b border-white/10 md:hidden flex justify-between items-center h-16 px-margin-mobile">
        <Link href="/" className="flex items-center gap-3">
          <img alt="iCanvas" className="h-8 w-8 rounded-md" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBnFZQ2bFdaVbssT6uU1ZjtMrnHWlwq6wk6FR-dLrRtjjW0IH3RqgwSrgUL7N_ZYK_kDZB2EyJDf9ZdhOwudm06y5aaMhkxbof6NlrORz0liR2CBKl3BNrGSsNh4oyLcovE5XuzP2kBdwoUexur6W_Do7rWACIFW4hTD1gY11Z_DQcHH2j4I6DSLH_5o4aIug1QkDZ2Yg49gLwxZFUoIw_sIOZMzxT-igdo6wkaDnNNvaVDJNlbrhNN" />
          <span className="font-headline-lg-mobile text-headline-lg-mobile font-bold text-primary tracking-tighter">iCanvas</span>
        </Link>
      </header>
    </>
  );
}