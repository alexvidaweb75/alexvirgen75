import React, { useState } from 'react';
import { FileText, Film, Play, Search, Trash2 } from 'lucide-react';
import type { SongProject, VideoProject } from '../types/studio';

interface LibraryViewProps {
  songs: SongProject[];
  videos: VideoProject[];
  activeSongId?: string;
  onSelectSong: (song: SongProject, autoPlay?: boolean) => void;
  onDeleteSong: (songId: string) => void;
  onOpenLyrics: (song: SongProject) => void;
  onOpenVideo: (song: SongProject) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  songs,
  videos,
  activeSongId,
  onSelectSong,
  onDeleteSong,
  onOpenLyrics,
  onOpenVideo,
}) => {
  const [query, setQuery] = useState('');

  const filtered = songs.filter((s) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      s.title.toLowerCase().includes(q) ||
      s.dedicatee.toLowerCase().includes(q) ||
      s.genreName.toLowerCase().includes(q) ||
      s.traits.toLowerCase().includes(q)
    );
  });

  return (
    <div className="mx-auto max-w-[1280px] px-4 pt-6 pb-32 sm:px-6 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-zinc-100">Mi Biblioteca</h1>
          <p className="text-sm text-zinc-400">
            Canciones dedicadas, letras personalizadas y proyectos de video guardados localmente.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o género..."
            className="w-full rounded-lg border border-white/10 bg-[#14151B] pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[#14151B] p-12 text-center">
          <p className="text-sm text-zinc-400">No se encontraron canciones con ese filtro.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((song) => {
            const isActive = activeSongId === song.id;
            return (
              <article
                key={song.id}
                className={`rounded-xl studio-panel p-4 flex flex-col justify-between gap-4 transition-colors ${
                  isActive ? 'border-cyan-400/60' : ''
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <img
                    src={song.coverImage}
                    alt={`Portada de ${song.title}`}
                    referrerPolicy="no-referrer"
                    className="h-16 w-16 rounded-lg object-cover border border-white/15 shrink-0 bg-zinc-900"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-xs font-medium text-cyan-300 truncate">
                      Para {song.dedicatee}
                    </p>
                    <h2 className="font-display text-base font-bold text-zinc-100 truncate">
                      {song.title}
                    </h2>
                    <p className="text-xs text-zinc-400 truncate">
                      {song.genreName} · {song.arrangement.bpm} BPM
                    </p>
                  </div>
                </div>

                <p className="text-xs text-zinc-400 line-clamp-2">
                  Rasgos: {song.traits}
                </p>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => onSelectSong(song, true)}
                    className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-400 to-amber-400 hover:brightness-110 px-3 py-1.5 text-xs font-semibold text-zinc-950 transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Escuchar</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenLyrics(song)}
                      aria-label={`Editar letra de ${song.title}`}
                      className="p-2 rounded-lg border border-white/10 bg-[#0D0E13] text-zinc-300 hover:text-amber-400 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenVideo(song)}
                      aria-label={`Crear video de ${song.title}`}
                      className="p-2 rounded-lg border border-white/10 bg-[#0D0E13] text-zinc-300 hover:text-amber-400 transition-colors"
                    >
                      <Film className="w-3.5 h-3.5" />
                    </button>
                    {!song.isStarter && (
                      <button
                        type="button"
                        onClick={() => onDeleteSong(song.id)}
                        aria-label={`Eliminar ${song.title}`}
                        className="p-2 rounded-lg border border-white/10 bg-[#0D0E13] text-zinc-400 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {videos.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-white/10">
          <h2 className="font-display text-lg font-bold text-zinc-100">
            Guiones de Video Recientes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {videos.map((v) => (
              <div
                key={v.id}
                className="rounded-xl border border-white/10 bg-[#14151B] p-4 space-y-1.5"
              >
                <p className="text-xs text-amber-400 font-medium">
                  {v.aspectRatio} · {v.scenes.length} escenas
                </p>
                <p className="font-display text-sm font-bold text-zinc-100">{v.title}</p>
                <p className="text-xs text-zinc-400 line-clamp-2">{v.prompt}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
