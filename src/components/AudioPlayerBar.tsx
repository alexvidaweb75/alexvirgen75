import React, { useEffect, useRef, useState } from 'react';
import {
  Download,
  Film,
  Pause,
  Play,
  Repeat,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { sharedAudioEngine } from '../audio/musicEngine';
import type { SongProject } from '../types/studio';

interface AudioPlayerBarProps {
  song: SongProject | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  loop: boolean;
  masterVolume: number;
  vocalVolume: number;
  instrumentalVolume: number;
  playbackRate: number;
  isMuted: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleLoop: () => void;
  onMasterVolumeChange: (val: number) => void;
  onVocalVolumeChange: (val: number) => void;
  onInstrumentalVolumeChange: (val: number) => void;
  onPlaybackRateChange: (rate: number) => void;
  onToggleMute: () => void;
  onExportWav: () => void;
  isExportingWav: boolean;
  onSendToVideo: () => void;
}

function formatClock(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({
  song,
  isPlaying,
  currentTime,
  duration,
  loop,
  masterVolume,
  vocalVolume,
  instrumentalVolume,
  playbackRate,
  isMuted,
  onTogglePlay,
  onSeek,
  onPrev,
  onNext,
  onToggleLoop,
  onMasterVolumeChange,
  onVocalVolumeChange,
  onInstrumentalVolumeChange,
  onPlaybackRateChange,
  onToggleMute,
  onExportWav,
  isExportingWav,
  onSendToVideo,
}) => {
  const [showMixer, setShowMixer] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let rafId = 0;
    const freqData = new Uint8Array(64);

    const draw = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);

          const hasData = isPlaying && sharedAudioEngine.getFrequencyData(freqData);
          const bars = 24;
          const barW = Math.max(2, Math.floor((w - (bars - 1) * 2) / bars));
          for (let i = 0; i < bars; i++) {
            const val = hasData ? freqData[i] / 255 : 0.12 + 0.06 * Math.sin(i * 0.6);
            const barH = Math.max(3, Math.round(val * h));
            const x = i * (barW + 2);
            const y = h - barH;
            ctx.fillStyle = isPlaying
              ? i % 2 === 0
                ? '#22D3EE'
                : '#F59E0B'
              : 'rgba(255,255,255,0.18)';
            ctx.fillRect(x, y, barW, barH);
          }
        }
      }
      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying]);

  if (!song) return null;

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <footer className="fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-[#080A10]/95 backdrop-blur-xl">
      {showMixer && (
        <div className="mx-auto max-w-[1440px] border-b border-white/10 px-4 py-3 sm:px-6 bg-[#0E121B]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3 min-w-[180px]">
                <span className="text-xs font-medium text-zinc-300 whitespace-nowrap">
                  Voz y Coros
                </span>
                <input
                  type="range"
                  aria-label="Volumen de voz y coros"
                  min={0}
                  max={1}
                  step={0.01}
                  value={vocalVolume}
                  onChange={(e) => onVocalVolumeChange(Number(e.target.value))}
                  className="studio-slider w-24"
                />
                <span className="font-mono text-xs text-cyan-300 tabular-nums w-9 text-right">
                  {Math.round(vocalVolume * 100)}%
                </span>
              </div>

              <div className="flex items-center gap-3 min-w-[200px]">
                <span className="text-xs font-medium text-zinc-300 whitespace-nowrap">
                  Ritmo e Instrumentos
                </span>
                <input
                  type="range"
                  aria-label="Volumen de ritmo e instrumentos"
                  min={0}
                  max={1}
                  step={0.01}
                  value={instrumentalVolume}
                  onChange={(e) => onInstrumentalVolumeChange(Number(e.target.value))}
                  className="studio-slider w-24"
                />
                <span className="font-mono text-xs text-amber-300 tabular-nums w-9 text-right">
                  {Math.round(instrumentalVolume * 100)}%
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-zinc-300 whitespace-nowrap">
                  Velocidad
                </span>
                <div className="flex items-center gap-1 rounded-md bg-[#06070B] p-0.5 border border-white/10">
                  {[0.85, 1.0, 1.15].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => onPlaybackRateChange(rate)}
                      className={`px-2 py-1 font-mono text-[11px] rounded transition-colors ${
                        playbackRate === rate
                          ? 'bg-cyan-400 text-zinc-950 font-semibold'
                          : 'text-zinc-400 hover:text-zinc-100'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSendToVideo}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-200 bg-zinc-800/80 hover:bg-zinc-700 rounded-md transition-colors whitespace-nowrap"
              >
                <Film className="w-3.5 h-3.5 text-cyan-400" />
                <span>Llevar a Video</span>
              </button>
              <button
                type="button"
                onClick={onExportWav}
                disabled={isExportingWav}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-60 rounded-md transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExportingWav ? 'Renderizando WAV...' : 'Descargar WAV'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-3 min-w-0 w-1/4 sm:w-64">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-zinc-900 border border-white/15">
            <img
              src={song.coverImage}
              alt={`Portada de ${song.title}`}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-100">{song.title}</p>
            <p className="truncate text-xs text-zinc-400">
              Para {song.dedicatee} <span aria-hidden="true">·</span> {song.genreName}
            </p>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center max-w-xl gap-1.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onPrev}
              aria-label="Canción anterior"
              className="p-1.5 text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onTogglePlay}
              aria-label={isPlaying ? 'Pausar reproducción' : 'Reproducir canción'}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-amber-400 text-zinc-950 hover:brightness-110 transition-transform active:scale-95"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>
            <button
              type="button"
              onClick={onNext}
              aria-label="Siguiente canción"
              className="p-1.5 text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <SkipForward className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onToggleLoop}
              aria-label="Repetir canción"
              aria-pressed={loop}
              className={`p-1.5 rounded transition-colors ${
                loop ? 'text-cyan-400' : 'text-zinc-500 hover:text-zinc-200'
              }`}
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>

          <div className="flex w-full items-center gap-2.5">
            <span className="font-mono text-[11px] text-zinc-400 tabular-nums w-10 text-right">
              {formatClock(currentTime)}
            </span>
            <div className="relative flex-1 flex items-center">
              <input
                type="range"
                aria-label="Progreso de reproducción"
                min={0}
                max={Math.max(1, duration)}
                step={0.1}
                value={currentTime}
                onChange={(e) => onSeek(Number(e.target.value))}
                className="studio-slider w-full z-10"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-0 h-1 rounded-full bg-gradient-to-r from-cyan-400 to-amber-400"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="font-mono text-[11px] text-zinc-400 tabular-nums w-10">
              {formatClock(duration)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 shrink-0">
          <canvas
            ref={canvasRef}
            width={110}
            height={26}
            aria-hidden="true"
            className="hidden lg:block opacity-95"
          />

          <div className="hidden sm:flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
              className="p-1.5 text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              {isMuted || masterVolume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              aria-label="Volumen maestro"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : masterVolume}
              onChange={(e) => onMasterVolumeChange(Number(e.target.value))}
              className="studio-slider w-20"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowMixer((prev) => !prev)}
            aria-expanded={showMixer}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
              showMixer
                ? 'border-cyan-400/60 bg-cyan-400/15 text-cyan-200'
                : 'border-white/10 bg-[#0E121B] text-zinc-300 hover:text-zinc-100'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Mezcla & Audio</span>
          </button>
        </div>
      </div>
    </footer>
  );
};
