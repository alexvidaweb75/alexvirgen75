import React, { useState } from 'react';
import { Check, Copy, Mic, RefreshCw, Sparkles } from 'lucide-react';
import type { LyricSection, SongProject } from '../types/studio';

interface LyricsWorkshopViewProps {
  song: SongProject | null;
  onUpdateSongSections: (songId: string, sections: LyricSection[]) => void;
  onSynthesizeVocalForSong: (song: SongProject) => void;
  isGeneratingVocal: boolean;
}

const REWRITE_PRESETS = [
  'Hazlo más bailable, alegre y con sabor tropical',
  'Destaca más las características de la persona',
  'Usa rimas más pegajosas para cantar y bailar',
  'Hazlo más poético y futurista',
];

export const LyricsWorkshopView: React.FC<LyricsWorkshopViewProps> = ({
  song,
  onUpdateSongSections,
  onSynthesizeVocalForSong,
  isGeneratingVocal,
}) => {
  const [rewritingIdx, setRewritingIdx] = useState<number | null>(null);
  const [customInstruction, setCustomInstruction] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!song) {
    return (
      <div className="mx-auto max-w-[1000px] px-4 py-16 text-center">
        <p className="text-sm text-zinc-400">
          Selecciona o genera una canción en Crear Música para perfeccionar su letra aquí.
        </p>
      </div>
    );
  }

  const totalWords = song.sections
    .flatMap((s) => s.lines)
    .join(' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  const handleLineChange = (secIdx: number, lineIdx: number, val: string) => {
    const next = song.sections.map((sec, idx) => {
      if (idx !== secIdx) return sec;
      const newLines = [...sec.lines];
      newLines[lineIdx] = val;
      return { ...sec, lines: newLines };
    });
    onUpdateSongSections(song.id, next);
  };

  const handleRewriteSection = async (secIdx: number, instruction: string) => {
    const sec = song.sections[secIdx];
    if (!sec) return;
    setRewritingIdx(secIdx);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/lyrics/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dedicatee: song.dedicatee,
          traits: song.traits,
          genreName: song.genreName,
          sectionTitle: sec.title,
          currentLines: sec.lines,
          instruction,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo reescribir la estrofa.');
      if (Array.isArray(data.lines)) {
        const next = song.sections.map((item, idx) =>
          idx === secIdx ? { ...item, lines: data.lines } : item
        );
        onUpdateSongSections(song.id, next);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al reescribir la sección.');
    } finally {
      setRewritingIdx(null);
    }
  };

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(`${song.title}\n\n${song.fullLyrics}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="mx-auto max-w-[1100px] px-4 pt-6 pb-32 sm:px-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="space-y-1">
          <p className="text-xs font-medium text-cyan-300">
            Estudio de Letras · Para {song.dedicatee}
          </p>
          <h1 className="font-display text-2xl font-bold text-zinc-100">{song.title}</h1>
          <p className="text-xs text-zinc-400">
            {song.genreName} <span aria-hidden="true">·</span> {song.rhythmName}{' '}
            <span aria-hidden="true">·</span>{' '}
            <span className="font-mono tabular-nums">{totalWords} palabras</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleCopyAll}
            className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#0E121B] hover:bg-zinc-800 px-3.5 py-2 text-xs font-medium text-zinc-200 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiada' : 'Copiar Letra'}</span>
          </button>

          <button
            type="button"
            disabled={isGeneratingVocal}
            onClick={() => onSynthesizeVocalForSong(song)}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-400 to-amber-400 hover:brightness-110 disabled:opacity-60 px-4 py-2 text-xs font-semibold text-zinc-950 transition-all"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>{isGeneratingVocal ? 'Sintetizando Voz...' : 'Actualizar Voz con Esta Letra'}</span>
          </button>
        </div>
      </div>

      <div className="rounded-xl studio-panel p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <input
          type="text"
          value={customInstruction}
          onChange={(e) => setCustomInstruction(e.target.value)}
          placeholder="Instrucción personalizada para reescribir (ej. Añade sabor de cumbia y menciona su sonrisa)..."
          className="flex-1 rounded-lg border border-white/10 bg-[#06070B] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-cyan-400 focus:outline-none"
        />
        <div className="flex flex-wrap gap-1.5">
          {REWRITE_PRESETS.slice(0, 2).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setCustomInstruction(preset)}
              className="rounded-md border border-white/10 bg-[#0D1018] px-2.5 py-1.5 text-xs text-zinc-300 hover:border-cyan-400/50 transition-colors whitespace-nowrap"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-200">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {song.sections.map((sec, secIdx) => (
          <div
            key={`${sec.tag}-${secIdx}`}
            className="rounded-xl border border-white/10 bg-[#14151B] p-4 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-semibold text-amber-400">
                [{sec.title}]
              </span>
              <button
                type="button"
                disabled={rewritingIdx !== null}
                onClick={() =>
                  handleRewriteSection(
                    secIdx,
                    customInstruction.trim() || REWRITE_PRESETS[0]
                  )
                }
                className="flex items-center gap-1.5 rounded-md border border-white/10 bg-[#1B1D26] hover:border-amber-500/60 px-2.5 py-1 text-xs text-zinc-200 transition-colors whitespace-nowrap"
              >
                {rewritingIdx === secIdx ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                    <span>Reescribiendo...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Mejorar con IA</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-2">
              {sec.lines.map((line, lIdx) => (
                <input
                  key={lIdx}
                  type="text"
                  value={line}
                  onChange={(e) => handleLineChange(secIdx, lIdx, e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#09090B] px-3 py-2 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
