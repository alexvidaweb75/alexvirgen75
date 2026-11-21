import React from 'react';
import type { AppSection } from '../types/studio';

interface TopNavProps {
  activeSection: AppSection;
  onSelectSection: (section: AppSection) => void;
  onNewDedication: () => void;
  songCount: number;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeSection,
  onSelectSection,
  onNewDedication,
  songCount,
}) => {
  const navItems: Array<{ id: AppSection; label: string }> = [
    { id: 'music', label: 'Crear Música' },
    { id: 'video', label: 'Crear Video' },
    { id: 'lyrics', label: 'Estudio de Letras' },
    { id: 'library', label: `Mi Biblioteca (${songCount})` },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#06070B]/88 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
        {/* Zone 1: Single-element wordmark */}
        <button
          type="button"
          onClick={() => onSelectSection('music')}
          className="font-display text-lg font-bold tracking-tight bg-gradient-to-r from-zinc-100 via-cyan-200 to-amber-300 bg-clip-text text-transparent whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-sm"
        >
          Sonora Studio
        </button>

        {/* Zone 2: Clean single-line navigation links */}
        <nav
          aria-label="Menú principal"
          className="flex items-center gap-5 sm:gap-7 overflow-x-auto no-scrollbar"
        >
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                className={`relative py-1 text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-sm ${
                  isActive
                    ? 'text-cyan-300'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[15px] h-[2px] bg-gradient-to-r from-cyan-400 to-amber-400"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="hidden sm:flex items-center shrink-0">
          <button
            type="button"
            onClick={onNewDedication}
            className="px-4 py-2 text-xs font-semibold text-zinc-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-lg transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            Nueva Dedicatoria
          </button>
        </div>
      </div>
    </header>
  );
};
