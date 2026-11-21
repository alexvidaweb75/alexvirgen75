import React, { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  FileText,
  Film,
  Mic,
  Music,
  Pause,
  Play,
  RefreshCw,
  Sliders,
  Volume2,
} from 'lucide-react';
import {
  ARTISTS,
  CHOIRS,
  COVER_IMAGES,
  GENRES,
  LYRIC_MOODS,
  OCCASIONS,
  RHYME_FLOWS,
  RHYTHMS,
  STYLES,
  TRAIT_SUGGESTIONS,
  VOICES,
} from '../data/catalog';
import type {
  ArtistOption,
  ChoirOption,
  ComposeRequestPayload,
  GenreOption,
  LyricMoodOption,
  RhymeFlowOption,
  RhythmOption,
  SongProject,
  StyleOption,
  VoiceOption,
} from '../types/studio';

interface MusicStudioViewProps {
  songs: SongProject[];
  activeSong: SongProject | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isGenerating: boolean;
  generationStage: string;
  errorMessage: string | null;
  onSelectSong: (song: SongProject, autoPlay?: boolean) => void;
  onTogglePlay: () => void;
  onComposeSong: (payload: ComposeRequestPayload) => void;
  onSynthesizeVocalForSong: (song: SongProject) => void;
  onOpenLyricsEditor: () => void;
  onOpenVideoStudio: () => void;
  onExportWav: (song: SongProject) => void;
  isExportingWav: boolean;
}

type StudioParamTab = 'genre' | 'rhythm' | 'style' | 'voice' | 'artist';
type GenreCategoryFilter = 'all' | 'tropical' | 'bailable' | 'futurista' | 'emotivo';

export const MusicStudioView: React.FC<MusicStudioViewProps> = ({
  songs,
  activeSong,
  isPlaying,
  currentTime,
  duration,
  isGenerating,
  generationStage,
  errorMessage,
  onSelectSong,
  onTogglePlay,
  onComposeSong,
  onSynthesizeVocalForSong,
  onOpenLyricsEditor,
  onOpenVideoStudio,
  onExportWav,
  isExportingWav,
}) => {
  const [dedicatee, setDedicatee] = useState('');
  const [occasion, setOccasion] = useState(OCCASIONS[0]);
  const [traits, setTraits] = useState('');
  const [language, setLanguage] = useState('Español');

  const [selectedGenre, setSelectedGenre] = useState<GenreOption>(GENRES[0]);
  const [genreFilter, setGenreFilter] = useState<GenreCategoryFilter>('all');
  const [selectedRhythm, setSelectedRhythm] = useState<RhythmOption>(RHYTHMS[0]);
  const [selectedStyle, setSelectedStyle] = useState<StyleOption>(STYLES[0]);
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>(VOICES[2]);
  const [selectedChoir, setSelectedChoir] = useState<ChoirOption>(CHOIRS[0]);
  const [selectedArtist, setSelectedArtist] = useState<ArtistOption>(ARTISTS[0]);
  const [selectedMood, setSelectedMood] = useState<LyricMoodOption>(LYRIC_MOODS[0]);
  const [selectedRhymeFlow, setSelectedRhymeFlow] = useState<RhymeFlowOption>(RHYME_FLOWS[0]);
  const [bpm, setBpm] = useState<number>(GENRES[0].defaultBpm);

  const [activeTab, setActiveTab] = useState<StudioParamTab>('genre');
  const [copiedLyrics, setCopiedLyrics] = useState(false);

  const handleGenreSelect = (genre: GenreOption) => {
    setSelectedGenre(genre);
    setBpm(genre.defaultBpm);
    const matchingRhythm = RHYTHMS.find((r) => r.drumPattern === genre.defaultDrum);
    if (matchingRhythm) setSelectedRhythm(matchingRhythm);
    const matchingStyle = STYLES.find((s) => s.timbre === genre.defaultTimbre);
    if (matchingStyle) setSelectedStyle(matchingStyle);
  };

  const handleRhythmSelect = (rhythm: RhythmOption) => {
    setSelectedRhythm(rhythm);
    setBpm(rhythm.recommendedBpm);
  };

  const addTraitWord = (word: string) => {
    setTraits((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return word;
      if (trimmed.toLowerCase().includes(word.toLowerCase())) return prev;
      return `${trimmed}, ${word}`;
    });
  };

  const triggerCompose = (lyricsOnly: boolean) => {
    const cleanName = dedicatee.trim() || 'Valeria';
    const cleanTraits =
      traits.trim() || 'sonrisa luminosa, alegre para bailar, ritmo en la sangre, enciende la pista';

    onComposeSong({
      dedicatee: cleanName,
      occasion,
      traits: cleanTraits,
      genre: selectedGenre,
      rhythm: selectedRhythm,
      style: selectedStyle,
      voice: selectedVoice,
      choir: selectedChoir,
      artist: selectedArtist,
      mood: selectedMood,
      rhymeFlow: selectedRhymeFlow,
      bpm,
      language,
      lyricsOnly,
    });
  };

  const handleCopyLyrics = async () => {
    if (!activeSong) return;
    try {
      await navigator.clipboard.writeText(`${activeSong.title}\n\n${activeSong.fullLyrics}`);
      setCopiedLyrics(true);
      setTimeout(() => setCopiedLyrics(false), 2000);
    } catch {
      // clipboard blocked
    }
  };

  const handleDownloadLyricsTxt = () => {
    if (!activeSong) return;
    const content = `${activeSong.title}\nDedicada a: ${activeSong.dedicatee}\nGénero: ${activeSong.genreName} · Ritmo: ${activeSong.rhythmName} · ${activeSong.arrangement.bpm} BPM\n\n${activeSong.fullLyrics}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeSong.title.toLowerCase().replace(/\s+/g, '-')}-letra.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredGenres =
    genreFilter === 'all' ? GENRES : GENRES.filter((g) => g.category === genreFilter);

  const activeSectionIdx =
    activeSong && activeSong.sections.length > 0 && duration > 0
      ? Math.min(
          activeSong.sections.length - 1,
          Math.floor((currentTime / duration) * activeSong.sections.length)
        )
      : -1;

  return (
    <div className="mx-auto max-w-[1440px] px-4 pt-6 pb-32 sm:px-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* LEFT COLUMN: Dedication, Wrizzle Mood/Flow & Multi-Genre Studio */}
        <section
          aria-label="Configurador de canción y letra"
          className="lg:col-span-5 rounded-xl studio-panel p-5 space-y-5"
        >
          <div className="space-y-1 border-b border-white/10 pb-4">
            <h1 className="font-display text-xl font-bold tracking-tight text-zinc-100">
              Laboratorio Musical Futurista
            </h1>
            <p className="text-sm text-zinc-400">
              Crea cumbias, ritmos tropicales, bailables o baladas desde los rasgos de quien amas.
            </p>
          </div>

          {/* Dedication Inputs */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="dedicatee-name" className="block text-xs font-medium text-zinc-300">
                  Nombre de la persona o personita
                </label>
                <input
                  id="dedicatee-name"
                  type="text"
                  value={dedicatee}
                  onChange={(e) => setDedicatee(e.target.value)}
                  placeholder="Ej. Valeria, Mateo, Mamá..."
                  className="w-full rounded-lg border border-white/10 bg-[#06070B] px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="occasion-select" className="block text-xs font-medium text-zinc-300">
                  Motivo u ocasión
                </label>
                <select
                  id="occasion-select"
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#06070B] px-3 py-2.5 text-sm text-zinc-100 focus:border-cyan-400 focus:outline-none"
                >
                  {OCCASIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="traits-input" className="block text-xs font-medium text-zinc-300">
                  Palabras y características personales
                </label>
                <select
                  aria-label="Idioma de la letra"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="rounded border border-white/10 bg-[#06070B] px-2 py-1 text-xs text-zinc-300 focus:border-cyan-400 focus:outline-none"
                >
                  <option value="Español">Español</option>
                  <option value="Spanglish">Spanglish</option>
                  <option value="Inglés">Inglés</option>
                </select>
              </div>
              <textarea
                id="traits-input"
                rows={2}
                value={traits}
                onChange={(e) => setTraits(e.target.value)}
                placeholder="Ej. Sonrisa luminosa, enciende la pista, ojos color miel, corazón valiente..."
                className="w-full resize-none rounded-lg border border-white/10 bg-[#06070B] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-cyan-400 focus:outline-none"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {TRAIT_SUGGESTIONS.map((word) => (
                  <button
                    key={word}
                    type="button"
                    onClick={() => addTraitWord(word)}
                    className="rounded-md border border-white/10 bg-[#0D1018] px-2 py-1 text-[11px] text-zinc-300 hover:border-cyan-400/60 hover:text-cyan-300 transition-colors whitespace-nowrap"
                  >
                    + {word}
                  </button>
                ))}
              </div>
            </div>

            {/* Wrizzle-inspired Mood & Rhyme Flow Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <label htmlFor="lyric-mood" className="block text-xs font-medium text-zinc-300">
                  Ánimo / Energía de Letra
                </label>
                <select
                  id="lyric-mood"
                  value={selectedMood.id}
                  onChange={(e) => {
                    const found = LYRIC_MOODS.find((m) => m.id === e.target.value);
                    if (found) setSelectedMood(found);
                  }}
                  className="w-full rounded-lg border border-white/10 bg-[#06070B] px-3 py-2 text-xs text-zinc-100 focus:border-cyan-400 focus:outline-none"
                >
                  {LYRIC_MOODS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="rhyme-flow" className="block text-xs font-medium text-zinc-300">
                  Flujo y Rima (Wrizzle)
                </label>
                <select
                  id="rhyme-flow"
                  value={selectedRhymeFlow.id}
                  onChange={(e) => {
                    const found = RHYME_FLOWS.find((r) => r.id === e.target.value);
                    if (found) setSelectedRhymeFlow(found);
                  }}
                  className="w-full rounded-lg border border-white/10 bg-[#06070B] px-3 py-2 text-xs text-zinc-100 focus:border-cyan-400 focus:outline-none"
                >
                  {RHYME_FLOWS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Musical Parameters Tabs */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-300">
                Ritmos, Géneros y Voces
              </span>
              <span className="font-mono text-xs text-cyan-300 tabular-nums">
                {bpm} BPM
              </span>
            </div>

            <div
              role="tablist"
              aria-label="Categorías musicales"
              className="grid grid-cols-5 gap-1 rounded-lg bg-[#06070B] p-1 border border-white/10"
            >
              {[
                { id: 'genre' as const, label: 'Género' },
                { id: 'rhythm' as const, label: 'Ritmo' },
                { id: 'style' as const, label: 'Estilo' },
                { id: 'voice' as const, label: 'Voz/Coro' },
                { id: 'artist' as const, label: 'Artista' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  type="button"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-1.5 px-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap truncate ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-cyan-400 to-amber-400 text-zinc-950 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Panel Content */}
            <div className="max-h-[255px] overflow-y-auto pr-1 space-y-2.5">
              {activeTab === 'genre' && (
                <>
                  <div className="flex items-center gap-1 overflow-x-auto pb-1">
                    {[
                      { id: 'all' as const, label: 'Todos' },
                      { id: 'tropical' as const, label: 'Cumbia y Tropical' },
                      { id: 'bailable' as const, label: 'Para Bailar' },
                      { id: 'futurista' as const, label: 'Futurista' },
                      { id: 'emotivo' as const, label: 'Emotivo' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setGenreFilter(cat.id)}
                        className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                          genreFilter === cat.id
                            ? 'border-cyan-400/60 bg-cyan-400/15 text-cyan-200'
                            : 'border-white/10 bg-[#06070B] text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {filteredGenres.map((g) => {
                      const active = selectedGenre.id === g.id;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => handleGenreSelect(g)}
                          className={`text-left rounded-lg border p-2.5 transition-colors ${
                            active
                              ? 'border-cyan-400 bg-cyan-400/10'
                              : 'border-white/10 bg-[#080B12] hover:border-white/25'
                          }`}
                        >
                          <p className={`text-xs font-semibold ${active ? 'text-cyan-300' : 'text-zinc-100'}`}>
                            {g.name}
                          </p>
                          <p className="mt-0.5 text-[11px] text-zinc-400 line-clamp-2">
                            {g.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {activeTab === 'rhythm' && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-white/10 bg-[#080B12] p-3">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-zinc-300 font-medium">Velocidad / Tempo</span>
                      <span className="font-mono text-cyan-300 tabular-nums">{bpm} BPM</span>
                    </div>
                    <input
                      type="range"
                      aria-label="Tempo en pulsos por minuto"
                      min={62}
                      max={148}
                      value={bpm}
                      onChange={(e) => setBpm(Number(e.target.value))}
                      className="studio-slider w-full"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {RHYTHMS.map((r) => {
                      const active = selectedRhythm.id === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => handleRhythmSelect(r)}
                          className={`text-left rounded-lg border p-2.5 transition-colors ${
                            active
                              ? 'border-cyan-400 bg-cyan-400/10'
                              : 'border-white/10 bg-[#080B12] hover:border-white/25'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-xs font-semibold truncate ${active ? 'text-cyan-300' : 'text-zinc-100'}`}>
                              {r.name}
                            </span>
                            <span className="font-mono text-[10px] text-zinc-400">{r.meter}</span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-zinc-400 line-clamp-2">
                            {r.feel}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'style' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {STYLES.map((s) => {
                    const active = selectedStyle.id === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedStyle(s)}
                        className={`text-left rounded-lg border p-2.5 transition-colors ${
                          active
                            ? 'border-cyan-400 bg-cyan-400/10'
                            : 'border-white/10 bg-[#080B12] hover:border-white/25'
                        }`}
                      >
                        <p className={`text-xs font-semibold ${active ? 'text-cyan-300' : 'text-zinc-100'}`}>
                          {s.name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-zinc-400">{s.atmosphere}</p>
                      </button>
                    );
                  })}
                </div>
              )}

              {activeTab === 'voice' && (
                <div className="space-y-3">
                  <div>
                    <p className="text-[11px] font-medium text-zinc-400 mb-1.5">Voz Principal</p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {VOICES.map((v) => {
                        const active = selectedVoice.id === v.id;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setSelectedVoice(v)}
                            className={`flex items-center justify-between text-left rounded-lg border px-3 py-2 transition-colors ${
                              active
                                ? 'border-cyan-400 bg-cyan-400/10'
                                : 'border-white/10 bg-[#080B12] hover:border-white/25'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <p className={`text-xs font-semibold ${active ? 'text-cyan-300' : 'text-zinc-100'}`}>
                                {v.name}
                              </p>
                              <p className="text-[11px] text-zinc-400 truncate">{v.timbreDescription}</p>
                            </div>
                            <span className="text-[11px] text-zinc-400 shrink-0">{v.register}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-medium text-zinc-400 mb-1.5">Coros y Pregones</p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {CHOIRS.map((c) => {
                        const active = selectedChoir.id === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedChoir(c)}
                            className={`text-left rounded-lg border px-3 py-2 transition-colors ${
                              active
                                ? 'border-cyan-400 bg-cyan-400/10'
                                : 'border-white/10 bg-[#080B12] hover:border-white/25'
                            }`}
                          >
                            <p className={`text-xs font-semibold ${active ? 'text-cyan-300' : 'text-zinc-100'}`}>
                              {c.name}
                            </p>
                            <p className="text-[11px] text-zinc-400">{c.arrangementNote}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'artist' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ARTISTS.map((a) => {
                    const active = selectedArtist.id === a.id;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setSelectedArtist(a)}
                        className={`text-left rounded-lg border p-2.5 transition-colors ${
                          active
                            ? 'border-cyan-400 bg-cyan-400/10'
                            : 'border-white/10 bg-[#080B12] hover:border-white/25'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className={`text-xs font-semibold truncate ${active ? 'text-cyan-300' : 'text-zinc-100'}`}>
                            {a.name}
                          </span>
                          <span className="text-[10px] text-zinc-500 shrink-0">{a.era}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-zinc-400 line-clamp-2">
                          {a.signatureSound}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Active Selections Summary Line */}
            <p className="text-xs text-zinc-400 pt-1">
              {selectedGenre.name} <span aria-hidden="true">·</span> {selectedRhythm.name}{' '}
              <span aria-hidden="true">·</span> {selectedMood.name}{' '}
              <span aria-hidden="true">·</span> {selectedVoice.name.split('·')[0].trim()}
            </p>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-200"
            >
              {errorMessage}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              disabled={isGenerating}
              onClick={() => triggerCompose(false)}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-400 to-amber-400 hover:brightness-110 disabled:opacity-60 px-4 py-3 text-sm font-semibold text-zinc-950 transition-all whitespace-nowrap"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{generationStage || 'Componiendo...'}</span>
                </>
              ) : (
                <>
                  <Music className="w-4 h-4" />
                  <span>Generar Canción y Letra</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isGenerating}
              onClick={() => triggerCompose(true)}
              className="flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-[#0E121B] hover:bg-zinc-800 disabled:opacity-60 px-4 py-3 text-sm font-medium text-zinc-200 transition-colors whitespace-nowrap"
            >
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Solo Letra</span>
            </button>
          </div>
        </section>

        {/* RIGHT COLUMN: Studio Showcase, Active Song, Lyrics & Arrangement */}
        <section
          aria-label="Reproductor de canción, letra y arreglo"
          className="lg:col-span-7 space-y-5"
        >
          {/* Futuristic Studio Header Banner */}
          <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#0D1018]">
            <img
              src={COVER_IMAGES.studioHero}
              alt="Estudio de grabación Sonora"
              referrerPolicy="no-referrer"
              className="h-36 w-full object-cover opacity-45"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#06070B]/95 via-[#06070B]/80 to-cyan-950/35" />
            <div className="absolute inset-0 flex flex-col justify-center px-6">
              <p className="text-xs font-medium text-cyan-300">
                Producción Musical · Ritmos Tropicales y Futuristas
              </p>
              <h2 className="font-display text-2xl font-bold text-zinc-100 text-balance mt-0.5">
                Cumbias, ritmos bailables y dedicatorias con voz real
              </h2>
              <p className="mt-1 max-w-xl text-xs sm:text-sm text-zinc-300">
                Explora la cumbia sonidera lista para reproducir o crea una nueva pista personalizada al instante.
              </p>
            </div>
          </div>

          {/* Quick Session Track Selector Strip */}
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
            {songs.map((item) => {
              const isSelected = activeSong?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectSong(item, false)}
                  className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors shrink-0 max-w-[245px] ${
                    isSelected
                      ? 'border-cyan-400 bg-cyan-400/10'
                      : 'border-white/10 bg-[#0D1018] hover:border-white/25'
                  }`}
                >
                  <img
                    src={item.coverImage}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="h-9 w-9 rounded object-cover shrink-0 bg-zinc-900"
                  />
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold truncate ${isSelected ? 'text-cyan-300' : 'text-zinc-100'}`}>
                      {item.title}
                    </p>
                    <p className="text-[11px] text-zinc-400 truncate">
                      {item.dedicatee} · {item.genreName}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Song Workspace */}
          {activeSong ? (
            <div className="rounded-xl studio-panel p-5 sm:p-6 space-y-6">
              <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between border-b border-white/10 pb-5">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-xl border border-white/15 bg-zinc-900">
                    <img
                      src={activeSong.coverImage}
                      alt={`Portada de ${activeSong.title}`}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs font-medium text-cyan-300">
                      Dedicada a {activeSong.dedicatee} · {activeSong.occasion}
                    </p>
                    <h3 className="font-display text-2xl font-bold text-zinc-100 truncate">
                      {activeSong.title}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      {activeSong.genreName} <span aria-hidden="true">·</span> {activeSong.rhythmName}{' '}
                      <span aria-hidden="true">·</span>{' '}
                      <span className="font-mono tabular-nums text-amber-300">
                        {activeSong.arrangement.bpm} BPM
                      </span>{' '}
                      <span aria-hidden="true">·</span> {activeSong.arrangement.keySignature}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">
                      {activeSong.voiceName} · {activeSong.choirName}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={onTogglePlay}
                    className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-400 to-amber-400 hover:brightness-110 px-4 py-2.5 text-xs font-semibold text-zinc-950 transition-all whitespace-nowrap"
                  >
                    {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                    <span>{isPlaying ? 'Pausar Audio' : 'Escuchar Pista'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={() => onSynthesizeVocalForSong(activeSong)}
                    className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#0E121B] hover:bg-zinc-800 disabled:opacity-50 px-3 py-2.5 text-xs font-medium text-zinc-200 transition-colors whitespace-nowrap"
                  >
                    <Mic className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{activeSong.vocalAudioUrl ? 'Regenerar Voz' : 'Generar Voz IA'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenVideoStudio}
                    className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#0E121B] hover:bg-zinc-800 px-3 py-2.5 text-xs font-medium text-zinc-200 transition-colors whitespace-nowrap"
                  >
                    <Film className="w-3.5 h-3.5 text-amber-400" />
                    <span>Crear Video</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-display text-sm font-semibold text-zinc-200">
                      Letra Personalizada
                    </h4>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={onOpenLyricsEditor}
                        className="text-xs text-zinc-400 hover:text-cyan-300 transition-colors whitespace-nowrap"
                      >
                        Editar en Estudio
                      </button>
                      <span aria-hidden="true" className="text-zinc-700">|</span>
                      <button
                        type="button"
                        onClick={handleCopyLyrics}
                        className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100 transition-colors whitespace-nowrap"
                      >
                        {copiedLyrics ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Copiada</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                      <span aria-hidden="true" className="text-zinc-700">|</span>
                      <button
                        type="button"
                        onClick={handleDownloadLyricsTxt}
                        className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100 transition-colors whitespace-nowrap"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>.TXT</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2">
                    {activeSong.sections.map((sec, idx) => {
                      const isCurrent = isPlaying && idx === activeSectionIdx;
                      return (
                        <div
                          key={`${sec.tag}-${idx}`}
                          className={`rounded-lg border p-3.5 transition-colors ${
                            isCurrent
                              ? 'border-cyan-400/60 bg-cyan-400/10'
                              : 'border-white/5 bg-[#07090F]'
                          }`}
                        >
                          <p className="font-mono text-[11px] font-medium text-cyan-300 mb-1.5">
                            [{sec.title}]
                          </p>
                          <div className="space-y-1">
                            {sec.lines.map((line, lIdx) => (
                              <p key={lIdx} className="text-sm leading-relaxed text-zinc-200">
                                {line}
                              </p>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="md:col-span-4 space-y-4">
                  <div className="rounded-lg studio-card p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                      <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Partitura y Arreglo</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Progresión</span>
                        <span className="font-mono text-amber-300">
                          {activeSong.arrangement.chordProgression.join(' · ')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Compás</span>
                        <span className="font-mono text-zinc-100 tabular-nums">
                          {activeSong.arrangement.timeSignature} · {activeSong.arrangement.bpm} BPM
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Estilo</span>
                        <span className="text-zinc-100 truncate max-w-[140px]">
                          {activeSong.styleName}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Inspiración</span>
                        <span className="text-zinc-100 truncate max-w-[140px]">
                          {activeSong.artistName}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/10">
                      <p className="text-[11px] text-zinc-400 mb-1">Instrumentación activa</p>
                      <p className="text-xs text-zinc-200 leading-relaxed">
                        {activeSong.arrangement.instruments.join(' · ')}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-white/10">
                      <p className="text-[11px] text-zinc-400 mb-1">Estado de Audio</p>
                      <p className="text-xs text-zinc-200 flex items-center gap-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>
                          {activeSong.vocalAudioUrl
                            ? 'Voz IA + Acompañamiento Multi-Pista'
                            : 'Base Instrumental Sintetizada (pulsa Generar Voz IA para añadir canto)'}
                        </span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onExportWav(activeSong)}
                    disabled={isExportingWav}
                    className="w-full flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-[#0E121B] hover:bg-zinc-800 disabled:opacity-50 px-3 py-2.5 text-xs font-medium text-zinc-100 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isExportingWav ? 'Exportando WAV...' : 'Descargar Mezcla (.WAV)'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl studio-panel p-12 text-center">
              <p className="text-sm text-zinc-400">
                Selecciona una canción o crea tu primera dedicatoria en el panel izquierdo.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
