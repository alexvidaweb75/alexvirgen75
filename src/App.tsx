import { useCallback, useEffect, useState } from 'react';
import { sharedAudioEngine } from './audio/musicEngine';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import { LibraryView } from './components/LibraryView';
import { LyricsWorkshopView } from './components/LyricsWorkshopView';
import { MusicStudioView } from './components/MusicStudioView';
import { TopNav } from './components/TopNav';
import { VideoStudioView } from './components/VideoStudioView';
import { CHOIRS, GENRES, STARTER_SONGS, VOICES } from './data/catalog';
import type {
  AppSection,
  ComposeRequestPayload,
  LyricSection,
  SongProject,
  VideoProject,
} from './types/studio';
import {
  loadSavedSongs,
  loadSavedVideos,
  loadVocalDataUrl,
  saveSongsMetadata,
  saveVideosMetadata,
  saveVocalDataUrl,
} from './utils/storage';

function sectionsToText(sections: LyricSection[]): string {
  return sections.map((s) => `[${s.title}]\n${s.lines.join('\n')}`).join('\n\n');
}

export default function App() {
  const [activeSection, setActiveSection] = useState<AppSection>('music');
  const [songs, setSongs] = useState<SongProject[]>(() => {
    const saved = loadSavedSongs();
    const savedIds = new Set(saved.map((s) => s.id));
    const starters = STARTER_SONGS.filter((s) => !savedIds.has(s.id));
    return [...saved, ...starters];
  });
  const [videos, setVideos] = useState<VideoProject[]>(() => loadSavedVideos());
  const [activeSongId, setActiveSongId] = useState<string>(() => {
    const saved = loadSavedSongs();
    return saved[0]?.id || STARTER_SONGS[0].id;
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(36);
  const [loop, setLoop] = useState(true);
  const [masterVolume, setMasterVolume] = useState(0.85);
  const [vocalVolume, setVocalVolume] = useState(0.95);
  const [instrumentalVolume, setInstrumentalVolume] = useState(0.65);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExportingWav, setIsExportingWav] = useState(false);

  const activeSong = songs.find((s) => s.id === activeSongId) || songs[0] || null;

  // Hydrate cached WAV vocals from IndexedDB on initial mount
  useEffect(() => {
    let mounted = true;
    async function hydrateVocals() {
      const updates: Record<string, string> = {};
      for (const s of songs) {
        if (!s.vocalAudioUrl) {
          const cached = await loadVocalDataUrl(s.id);
          if (cached) updates[s.id] = cached;
        }
      }
      if (mounted && Object.keys(updates).length > 0) {
        setSongs((prev) =>
          prev.map((item) =>
            updates[item.id] ? { ...item, vocalAudioUrl: updates[item.id] } : item
          )
        );
      }
    }
    void hydrateVocals();
    return () => {
      mounted = false;
    };
    // Run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wire audio engine callbacks
  useEffect(() => {
    sharedAudioEngine.setCallbacks(
      (t, dur) => {
        setCurrentTime(t);
        setDuration(dur);
      },
      () => {
        setIsPlaying(false);
      }
    );
  }, []);

  // Load initial active song into engine cleanly (paused)
  useEffect(() => {
    if (activeSong) {
      void sharedAudioEngine.loadSong(activeSong, false);
    }
    // Only reload when activeSongId or vocalAudioUrl changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSongId, activeSong?.vocalAudioUrl]);

  const persistSongs = useCallback((nextSongs: SongProject[]) => {
    const userOnly = nextSongs.filter((s) => !s.isStarter);
    saveSongsMetadata(userOnly);
  }, []);

  const handleSelectSong = async (song: SongProject, autoPlay = false) => {
    setActiveSongId(song.id);
    setErrorMessage(null);
    await sharedAudioEngine.loadSong(song, autoPlay);
    if (autoPlay) {
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  };

  const handleTogglePlay = async () => {
    if (!activeSong) return;
    if (isPlaying) {
      sharedAudioEngine.pause();
      setIsPlaying(false);
    } else {
      await sharedAudioEngine.play();
      setIsPlaying(true);
    }
  };

  const handlePrevNext = (dir: -1 | 1) => {
    if (songs.length === 0) return;
    const idx = songs.findIndex((s) => s.id === activeSongId);
    const nextIdx = (idx + dir + songs.length) % songs.length;
    void handleSelectSong(songs[nextIdx], isPlaying);
  };

  const handleComposeSong = async (payload: ComposeRequestPayload) => {
    setIsGenerating(true);
    setErrorMessage(null);
    setGenerationStage('Escribiendo letra y armonía...');

    try {
      const composeRes = await fetch('/api/music/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dedicatee: payload.dedicatee,
          occasion: payload.occasion,
          traits: payload.traits,
          genreName: payload.genre.name,
          rhythmName: payload.rhythm.name,
          meter: payload.rhythm.meter,
          styleName: payload.style.name,
          voiceName: payload.voice.name,
          choirName: payload.choir.name,
          artistName: payload.artist.name,
          moodName: payload.mood.name,
          rhymeFlowName: payload.rhymeFlow.name,
          bpm: payload.bpm,
          language: payload.language,
        }),
      });

      const composeData = await composeRes.json();
      if (!composeRes.ok) {
        throw new Error(composeData.error || 'No se pudo componer la canción.');
      }

      const sections: LyricSection[] = Array.isArray(composeData.sections)
        ? composeData.sections
        : [];
      const newId = `song-${Date.now()}`;
      const matchedGenre = GENRES.find((g) => g.id === payload.genre.id) || GENRES[0];

      let newSong: SongProject = {
        id: newId,
        title: String(composeData.title || `Canción para ${payload.dedicatee}`),
        dedicatee: payload.dedicatee,
        occasion: payload.occasion,
        traits: payload.traits,
        genreId: payload.genre.id,
        genreName: payload.genre.name,
        rhythmId: payload.rhythm.id,
        rhythmName: payload.rhythm.name,
        styleId: payload.style.id,
        styleName: payload.style.name,
        voiceId: payload.voice.id,
        voiceName: payload.voice.name,
        choirId: payload.choir.id,
        choirName: payload.choir.name,
        artistId: payload.artist.id,
        artistName: payload.artist.name,
        moodName: payload.mood.name,
        rhymeFlowName: payload.rhymeFlow.name,
        language: payload.language,
        sections,
        fullLyrics: sectionsToText(sections),
        coverImage: matchedGenre.coverImage,
        createdAt: new Date().toISOString(),
        arrangement: {
          keySignature: String(composeData.keySignature || 'La Menor (Am)'),
          bpm: payload.bpm,
          timeSignature: payload.rhythm.meter,
          chordProgression: Array.isArray(composeData.chordProgression)
            ? composeData.chordProgression
            : payload.genre.defaultChords,
          bassPattern: String(composeData.bassPattern || 'Tumbao cumbiero al compás'),
          synthTimbre: payload.style.timbre,
          drumPattern: payload.rhythm.drumPattern,
          durationSeconds: 34,
          instruments: Array.isArray(composeData.instruments)
            ? composeData.instruments
            : ['Acordeón', 'Bajo', 'Güiro & Campana', 'Tumbadora'],
        },
      };

      setSongs((prev) => {
        const updated = [newSong, ...prev];
        persistSongs(updated);
        return updated;
      });
      setActiveSongId(newId);

      if (!payload.lyricsOnly) {
        setGenerationStage('Sintetizando voz y coros...');
        try {
          const vocalRes = await fetch('/api/music/vocal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sections,
              prebuiltVoice: payload.voice.voiceName,
              isDualVoice: payload.choir.isDualVoice,
              secondaryVoice: payload.choir.secondaryVoiceName,
              genreName: payload.genre.name,
              styleName: payload.style.name,
              artistName: payload.artist.name,
              choirName: payload.choir.name,
              bpm: payload.bpm,
            }),
          });
          const vocalData = await vocalRes.json();
          if (!vocalRes.ok) {
            throw new Error(vocalData.error || 'No se pudo sintetizar la voz.');
          }
          if (vocalData.audioDataUrl) {
            await saveVocalDataUrl(newId, vocalData.audioDataUrl);
            newSong = { ...newSong, vocalAudioUrl: vocalData.audioDataUrl };
            setSongs((prev) =>
              prev.map((s) => (s.id === newId ? { ...s, vocalAudioUrl: vocalData.audioDataUrl } : s))
            );
          }
        } catch (vocalErr) {
          setErrorMessage(
            `Letra y arreglo musical listos. Nota de voz IA: ${
              vocalErr instanceof Error ? vocalErr.message : 'Error al sintetizar voz'
            }`
          );
        }
      }

      await sharedAudioEngine.loadSong(newSong, !payload.lyricsOnly);
      if (!payload.lyricsOnly) {
        setIsPlaying(true);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Ocurrió un error al generar.');
    } finally {
      setIsGenerating(false);
      setGenerationStage('');
    }
  };

  const handleSynthesizeVocalForSong = async (song: SongProject) => {
    setIsGenerating(true);
    setGenerationStage('Sintetizando voz y coros...');
    setErrorMessage(null);
    try {
      const voiceObj = VOICES.find((v) => v.id === song.voiceId) || VOICES[0];
      const choirObj = CHOIRS.find((c) => c.id === song.choirId) || CHOIRS[0];
      const vocalRes = await fetch('/api/music/vocal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sections: song.sections,
          prebuiltVoice: voiceObj.voiceName,
          isDualVoice: choirObj.isDualVoice,
          secondaryVoice: choirObj.secondaryVoiceName,
          genreName: song.genreName,
          styleName: song.styleName,
          artistName: song.artistName,
          choirName: song.choirName,
          bpm: song.arrangement.bpm,
        }),
      });
      const vocalData = await vocalRes.json();
      if (!vocalRes.ok) {
        throw new Error(vocalData.error || 'No se pudo generar la pista vocal.');
      }
      if (vocalData.audioDataUrl) {
        await saveVocalDataUrl(song.id, vocalData.audioDataUrl);
        const updatedSong = { ...song, vocalAudioUrl: vocalData.audioDataUrl };
        setSongs((prev) => prev.map((s) => (s.id === song.id ? updatedSong : s)));
        await sharedAudioEngine.loadSong(updatedSong, true);
        setIsPlaying(true);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al sintetizar voz.');
    } finally {
      setIsGenerating(false);
      setGenerationStage('');
    }
  };

  const handleUpdateSongSections = (songId: string, sections: LyricSection[]) => {
    setSongs((prev) => {
      const updated = prev.map((s) =>
        s.id === songId ? { ...s, sections, fullLyrics: sectionsToText(sections) } : s
      );
      persistSongs(updated);
      return updated;
    });
  };

  const handleDeleteSong = (songId: string) => {
    setSongs((prev) => {
      const next = prev.filter((s) => s.id !== songId);
      persistSongs(next);
      if (activeSongId === songId && next.length > 0) {
        setActiveSongId(next[0].id);
      }
      return next;
    });
  };

  const handleExportWav = async (song: SongProject) => {
    setIsExportingWav(true);
    try {
      const wavBlob = await sharedAudioEngine.exportSongToWav(song);
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${song.title.toLowerCase().replace(/\s+/g, '-')}.wav`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setErrorMessage('No se pudo exportar el archivo WAV.');
    } finally {
      setIsExportingWav(false);
    }
  };

  const handleSaveVideoProject = (project: VideoProject) => {
    setVideos((prev) => {
      const next = [project, ...prev];
      saveVideosMetadata(next);
      return next;
    });
  };

  return (
    <div className="min-h-screen studio-ambient-bg text-zinc-100 flex flex-col">
      <TopNav
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        onNewDedication={() => {
          setActiveSection('music');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        songCount={songs.length}
      />

      <main className="flex-1">
        {activeSection === 'music' && (
          <MusicStudioView
            songs={songs}
            activeSong={activeSong}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            isGenerating={isGenerating}
            generationStage={generationStage}
            errorMessage={errorMessage}
            onSelectSong={handleSelectSong}
            onTogglePlay={handleTogglePlay}
            onComposeSong={handleComposeSong}
            onSynthesizeVocalForSong={handleSynthesizeVocalForSong}
            onOpenLyricsEditor={() => setActiveSection('lyrics')}
            onOpenVideoStudio={() => setActiveSection('video')}
            onExportWav={handleExportWav}
            isExportingWav={isExportingWav}
          />
        )}

        {activeSection === 'video' && (
          <VideoStudioView
            songs={songs}
            activeSong={activeSong}
            isAudioPlaying={isPlaying}
            audioTime={currentTime}
            audioDuration={duration}
            onSelectSong={handleSelectSong}
            onPlayAudio={async () => {
              await sharedAudioEngine.play();
              setIsPlaying(true);
            }}
            onPauseAudio={() => {
              sharedAudioEngine.pause();
              setIsPlaying(false);
            }}
            onSeekAudio={(t) => sharedAudioEngine.seek(t)}
            onSaveVideoProject={handleSaveVideoProject}
          />
        )}

        {activeSection === 'lyrics' && (
          <LyricsWorkshopView
            song={activeSong}
            onUpdateSongSections={handleUpdateSongSections}
            onSynthesizeVocalForSong={handleSynthesizeVocalForSong}
            isGeneratingVocal={isGenerating}
          />
        )}

        {activeSection === 'library' && (
          <LibraryView
            songs={songs}
            videos={videos}
            activeSongId={activeSong?.id}
            onSelectSong={handleSelectSong}
            onDeleteSong={handleDeleteSong}
            onOpenLyrics={(song) => {
              void handleSelectSong(song, false);
              setActiveSection('lyrics');
            }}
            onOpenVideo={(song) => {
              void handleSelectSong(song, false);
              setActiveSection('video');
            }}
          />
        )}
      </main>

      <AudioPlayerBar
        song={activeSong}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        loop={loop}
        masterVolume={masterVolume}
        vocalVolume={vocalVolume}
        instrumentalVolume={instrumentalVolume}
        playbackRate={playbackRate}
        isMuted={isMuted}
        onTogglePlay={handleTogglePlay}
        onSeek={(t) => sharedAudioEngine.seek(t)}
        onPrev={() => handlePrevNext(-1)}
        onNext={() => handlePrevNext(1)}
        onToggleLoop={() => {
          const next = !loop;
          setLoop(next);
          sharedAudioEngine.setLoop(next);
        }}
        onMasterVolumeChange={(v) => {
          setMasterVolume(v);
          setIsMuted(v === 0);
          sharedAudioEngine.setMuted(v === 0);
          sharedAudioEngine.setMasterVolume(v);
        }}
        onVocalVolumeChange={(v) => {
          setVocalVolume(v);
          sharedAudioEngine.setVocalVolume(v);
        }}
        onInstrumentalVolumeChange={(v) => {
          setInstrumentalVolume(v);
          sharedAudioEngine.setInstrumentalVolume(v);
        }}
        onPlaybackRateChange={(rate) => {
          setPlaybackRate(rate);
          sharedAudioEngine.setPlaybackRate(rate);
        }}
        onToggleMute={() => {
          const next = !isMuted;
          setIsMuted(next);
          sharedAudioEngine.setMuted(next);
        }}
        onExportWav={() => {
          if (activeSong) void handleExportWav(activeSong);
        }}
        isExportingWav={isExportingWav}
        onSendToVideo={() => setActiveSection('video')}
      />
    </div>
  );
}
