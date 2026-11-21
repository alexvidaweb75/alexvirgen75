import React, { useEffect, useRef, useState } from 'react';
import {
  Download,
  Film,
  ImagePlus,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { sharedAudioEngine } from '../audio/musicEngine';
import { VIDEO_RHYTHMS, VIDEO_STYLES } from '../data/catalog';
import type { SongProject, VideoProject, VideoStoryboardScene } from '../types/studio';

interface VideoStudioViewProps {
  songs: SongProject[];
  activeSong: SongProject | null;
  isAudioPlaying: boolean;
  audioTime: number;
  audioDuration: number;
  onSelectSong: (song: SongProject, autoPlay?: boolean) => void;
  onPlayAudio: () => void;
  onPauseAudio: () => void;
  onSeekAudio: (time: number) => void;
  onSaveVideoProject: (project: VideoProject) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  hueShift: number;
}

export const VideoStudioView: React.FC<VideoStudioViewProps> = ({
  songs,
  activeSong,
  isAudioPlaying,
  audioTime,
  audioDuration,
  onSelectSong,
  onPlayAudio,
  onPauseAudio,
  onSeekAudio,
  onSaveVideoProject,
}) => {
  const [selectedSongId, setSelectedSongId] = useState<string>(activeSong?.id || songs[0]?.id || '');
  const linkedSong = songs.find((s) => s.id === selectedSongId) || activeSong || songs[0] || null;

  const [title, setTitle] = useState(linkedSong?.title || 'Cumbia Futurista');
  const [dedicatee, setDedicatee] = useState(linkedSong?.dedicatee || 'Valeria');
  const [visualPrompt, setVisualPrompt] = useState(
    linkedSong
      ? `Pista de baile neón futurista y destellos tropicales para ${linkedSong.dedicatee}: ${linkedSong.traits}.`
      : 'Luces neón holográficas, fiesta tropical y ritmo futurista.'
  );
  const [visualStyleId, setVisualStyleId] = useState(VIDEO_STYLES[0].id);
  const [videoRhythmId, setVideoRhythmId] = useState(VIDEO_RHYTHMS[0].id);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [showLyrics, setShowLyrics] = useState(true);
  const [photos, setPhotos] = useState<string[]>([]);

  const [scenes, setScenes] = useState<VideoStoryboardScene[]>([
    {
      sceneNumber: 1,
      startSec: 0,
      endSec: 8,
      title: 'Horizonte Holográfico',
      visualDescription: 'Rejilla luminosa neón pulsando al ritmo de la introducción.',
      cameraMotion: 'zoom-in',
      caption: `Para ${linkedSong?.dedicatee || 'ti'}`,
    },
    {
      sceneNumber: 2,
      startSec: 8,
      endSec: 16,
      title: 'Pulso Tropical',
      visualDescription: 'Destellos cian y ámbar acompañando cada paso de baile.',
      cameraMotion: 'pan-right',
      caption: 'Sabor y energía en la pista',
    },
    {
      sceneNumber: 3,
      startSec: 16,
      endSec: 24,
      title: 'Clímax Cyber-Fiesta',
      visualDescription: 'Anillo espectral reactivo y partículas doradas en movimiento.',
      cameraMotion: 'slow-drift',
      caption: 'Tu sonrisa enciende todo',
    },
    {
      sceneNumber: 4,
      startSec: 24,
      endSec: 32,
      title: 'Cierre Estelar',
      visualDescription: 'Destello final bajo cielo futurista lleno de estrellas.',
      cameraMotion: 'pan-left',
      caption: 'Un recuerdo para siempre',
    },
  ]);

  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false);
  const [storyboardError, setStoryboardError] = useState<string | null>(null);
  const [isPreviewingStandalone, setIsPreviewingStandalone] = useState(false);
  const [standaloneTime, setStandaloneTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loadedImagesRef = useRef<HTMLImageElement[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const clockRef = useRef(0);

  const handleSongSelectChange = (id: string) => {
    setSelectedSongId(id);
    const found = songs.find((s) => s.id === id);
    if (found) {
      onSelectSong(found, false);
      setTitle(found.title);
      setDedicatee(found.dedicatee);
      setVisualPrompt(`Videoclip neón y tropical para ${found.dedicatee}: ${found.traits}`);
    }
  };

  useEffect(() => {
    const sources = photos.length > 0 ? photos : linkedSong?.coverImage ? [linkedSong.coverImage] : [];
    const imgs: HTMLImageElement[] = [];
    sources.forEach((src) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = src;
      imgs.push(img);
    });
    loadedImagesRef.current = imgs;
  }, [photos, linkedSong?.coverImage]);

  useEffect(() => {
    const pool: Particle[] = [];
    for (let i = 0; i < 48; i++) {
      pool.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.0016,
        vy: -0.0006 - Math.random() * 0.0018,
        size: 1.5 + Math.random() * 4.2,
        alpha: 0.25 + Math.random() * 0.6,
        hueShift: i % 2,
      });
    }
    particlesRef.current = pool;
  }, []);

  const totalDuration = linkedSong
    ? Math.max(16, audioDuration || linkedSong.arrangement.durationSeconds)
    : 24;
  const activeTime = linkedSong ? audioTime : standaloneTime;
  const isPlayingAny = linkedSong ? isAudioPlaying : isPreviewingStandalone;

  useEffect(() => {
    if (!isPreviewingStandalone || linkedSong) return;
    const interval = window.setInterval(() => {
      setStandaloneTime((prev) => (prev + 0.05 >= totalDuration ? 0 : prev + 0.05));
    }, 50);
    return () => clearInterval(interval);
  }, [isPreviewingStandalone, linkedSong, totalDuration]);

  useEffect(() => {
    let rafId = 0;
    const freqData = new Uint8Array(64);

    const drawFrame = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        rafId = requestAnimationFrame(drawFrame);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        rafId = requestAnimationFrame(drawFrame);
        return;
      }

      clockRef.current += 0.016;
      const w = canvas.width;
      const h = canvas.height;
      const style = VIDEO_STYLES.find((s) => s.id === visualStyleId) || VIDEO_STYLES[0];
      const rhythmPreset =
        VIDEO_RHYTHMS.find((r) => r.id === videoRhythmId) || VIDEO_RHYTHMS[0];

      let avgEnergy = 0.14;
      let bassEnergy = 0.14;
      if (isPlayingAny && sharedAudioEngine.getFrequencyData(freqData)) {
        let sum = 0;
        for (let i = 0; i < 24; i++) sum += freqData[i];
        avgEnergy = Math.min(1, sum / (24 * 210));
        bassEnergy = Math.min(1, (freqData[0] + freqData[1] + freqData[2]) / (3 * 235));
      } else if (isPlayingAny) {
        const bpm = linkedSong?.arrangement.bpm || 100;
        const beatPhase = (activeTime * (bpm / 60)) % 1;
        bassEnergy = Math.max(0.15, 1 - beatPhase * 1.4);
      }

      const beatPulse = bassEnergy * rhythmPreset.pulseIntensity;

      // 1. Background gradient
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, style.palette[0]);
      grad.addColorStop(0.55, style.palette[1]);
      grad.addColorStop(1, style.palette[0]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // 2. Futuristic Perspective Grid when neon-grid mode is active
      if (style.particleMode === 'neon-grid') {
        ctx.save();
        ctx.strokeStyle = `${style.accent}44`;
        ctx.lineWidth = 1;
        const horizonY = h * 0.54;
        const gridScroll = (activeTime * rhythmPreset.motionSpeed * 0.5) % 1;
        for (let i = -8; i <= 8; i++) {
          ctx.beginPath();
          ctx.moveTo(w / 2 + i * (w * 0.03), horizonY);
          ctx.lineTo(w / 2 + i * (w * 0.18), h);
          ctx.stroke();
        }
        for (let row = 0; row < 10; row++) {
          const t = ((row + gridScroll) / 10) ** 1.7;
          const y = horizonY + t * (h - horizonY);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 3. Ken Burns photo / cover background with beat-sync zoom
      const imgs = loadedImagesRef.current.filter((img) => img.complete && img.naturalWidth > 0);
      if (imgs.length > 0) {
        const sceneDuration = totalDuration / Math.max(1, scenes.length);
        const currentSceneIdx = Math.min(scenes.length - 1, Math.floor(activeTime / sceneDuration));
        const img = imgs[currentSceneIdx % imgs.length];
        const progress = (activeTime % sceneDuration) / sceneDuration;
        const motion = scenes[currentSceneIdx]?.cameraMotion || 'zoom-in';

        let scale = 1.05 + progress * 0.1 * rhythmPreset.motionSpeed + beatPulse * 0.04;
        let offsetX = 0;
        let offsetY = 0;
        if (motion === 'pan-right') {
          scale = 1.15 + beatPulse * 0.03;
          offsetX = (progress - 0.5) * 48 * rhythmPreset.motionSpeed;
        } else if (motion === 'pan-left') {
          scale = 1.15 + beatPulse * 0.03;
          offsetX = (0.5 - progress) * 48 * rhythmPreset.motionSpeed;
        } else if (motion === 'slow-drift') {
          scale = 1.11 + beatPulse * 0.03;
          offsetY = (progress - 0.5) * 32;
        }

        const imgAspect = img.naturalWidth / img.naturalHeight;
        const canvasAspect = w / h;
        let drawW = w;
        let drawH = h;
        if (imgAspect > canvasAspect) {
          drawH = h * scale;
          drawW = drawH * imgAspect;
        } else {
          drawW = w * scale;
          drawH = drawW / imgAspect;
        }

        ctx.save();
        ctx.globalAlpha = style.particleMode === 'neon-grid' ? 0.42 : 0.56;
        ctx.drawImage(
          img,
          (w - drawW) / 2 + offsetX,
          (h - drawH) / 2 + offsetY,
          drawW,
          drawH
        );
        ctx.restore();
      }

      // 4. Contrast scrim
      const scrim = ctx.createLinearGradient(0, 0, 0, h);
      scrim.addColorStop(0, 'rgba(6, 7, 11, 0.58)');
      scrim.addColorStop(0.5, 'rgba(6, 7, 11, 0.25)');
      scrim.addColorStop(1, 'rgba(6, 7, 11, 0.90)');
      ctx.fillStyle = scrim;
      ctx.fillRect(0, 0, w, h);

      // 5. Holographic Orbital Ring reactive to audio beat
      const ringRadius = Math.min(w, h) * (0.19 + beatPulse * 0.04);
      ctx.save();
      ctx.strokeStyle = `${style.accent}66`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.46, ringRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `${style.secondaryAccent}44`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.46, ringRadius * 1.18, clockRef.current, clockRef.current + Math.PI * 1.3);
      ctx.stroke();
      ctx.restore();

      // 6. Particles
      particlesRef.current.forEach((p) => {
        if (isPlayingAny) {
          const spd = rhythmPreset.motionSpeed;
          p.x += p.vx * spd;
          p.y += p.vy * (style.particleMode === 'rain' ? 5 : spd * (1 + avgEnergy * 2.4));
          if (p.y < -0.05) p.y = 1.05;
          if (p.x < -0.05) p.x = 1.05;
          if (p.x > 1.05) p.x = -0.05;
        }
        ctx.save();
        ctx.globalAlpha = p.alpha * (0.65 + avgEnergy * 0.45);
        ctx.fillStyle = p.hueShift === 0 ? style.accent : style.secondaryAccent;
        if (style.particleMode === 'rain') {
          ctx.fillRect(p.x * w, p.y * h, 1.5, p.size * 4);
        } else if (style.particleMode === 'confetti') {
          ctx.fillRect(p.x * w, p.y * h, p.size * 1.6, p.size * 0.9);
        } else {
          ctx.beginPath();
          ctx.arc(p.x * w, p.y * h, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // 7. Dedication Title Header
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = style.accent;
      ctx.font = `600 ${Math.round(w * 0.017)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillText(`DEDICADA A ${dedicatee.toUpperCase()}`, w / 2, h * 0.1);

      ctx.fillStyle = '#F4F4F5';
      ctx.font = `700 ${Math.round(w * 0.036)}px "Outfit", sans-serif`;
      ctx.fillText(title, w / 2, h * 0.165);
      ctx.restore();

      // 8. Dual-tone Spectrum Bars
      const barCount = 34;
      const barWidth = Math.max(3, (w * 0.48) / barCount);
      const startX = (w - barCount * (barWidth + 3)) / 2;
      for (let i = 0; i < barCount; i++) {
        const val = isPlayingAny ? (freqData[i % 32] || 24) / 255 : 0.14;
        const barH = Math.max(4, val * (h * 0.13) * (0.85 + beatPulse * 0.35));
        ctx.fillStyle = i % 2 === 0 ? `${style.accent}DD` : `${style.secondaryAccent}DD`;
        ctx.fillRect(startX + i * (barWidth + 3), h * 0.72 - barH / 2, barWidth, barH);
      }

      // 9. Synchronized Lyric / Scene Caption Overlay
      let displayLine = '';
      if (showLyrics && linkedSong && linkedSong.sections.length > 0) {
        const allLines = linkedSong.sections.flatMap((s) => s.lines);
        if (allLines.length > 0) {
          const idx = Math.min(
            allLines.length - 1,
            Math.floor((activeTime / totalDuration) * allLines.length)
          );
          displayLine = allLines[idx];
        }
      } else if (scenes.length > 0) {
        const scIdx = Math.min(
          scenes.length - 1,
          Math.floor((activeTime / totalDuration) * scenes.length)
        );
        displayLine = scenes[scIdx]?.caption || '';
      }

      if (displayLine) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `600 ${Math.round(w * 0.025)}px "Outfit", sans-serif`;
        ctx.fillText(displayLine, w / 2, h * 0.87, w * 0.86);
        ctx.restore();
      }

      rafId = requestAnimationFrame(drawFrame);
    };

    rafId = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(rafId);
  }, [
    activeTime,
    dedicatee,
    isPlayingAny,
    linkedSong,
    scenes,
    showLyrics,
    title,
    totalDuration,
    videoRhythmId,
    visualStyleId,
  ]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 5);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPhotos((prev) => [...prev.slice(0, 4), reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleGenerateStoryboard = async () => {
    setIsGeneratingStoryboard(true);
    setStoryboardError(null);
    try {
      const styleObj = VIDEO_STYLES.find((s) => s.id === visualStyleId) || VIDEO_STYLES[0];
      const rhythmObj = VIDEO_RHYTHMS.find((r) => r.id === videoRhythmId) || VIDEO_RHYTHMS[0];
      const res = await fetch('/api/video/storyboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          dedicatee,
          prompt: visualPrompt,
          visualStyleName: styleObj.name,
          videoRhythmName: rhythmObj.name,
          durationSeconds: Math.round(totalDuration),
          lyricsSummary: linkedSong?.fullLyrics.slice(0, 450) || visualPrompt,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo generar el guion visual.');
      }
      if (Array.isArray(data.scenes) && data.scenes.length > 0) {
        setScenes(data.scenes);
        onSaveVideoProject({
          id: `video-${Date.now()}`,
          songId: linkedSong?.id,
          title,
          dedicatee,
          prompt: visualPrompt,
          visualStyleId,
          videoRhythmId,
          aspectRatio,
          durationSeconds: Math.round(totalDuration),
          scenes: data.scenes,
          photos: [],
          showLyrics,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      setStoryboardError(err instanceof Error ? err.message : 'Error al generar escenas.');
    } finally {
      setIsGeneratingStoryboard(false);
    }
  };

  const togglePreview = () => {
    if (linkedSong) {
      if (isAudioPlaying) onPauseAudio();
      else onPlayAudio();
    } else {
      setIsPreviewingStandalone((prev) => !prev);
    }
  };

  const handleExportVideoWebm = async () => {
    const canvas = canvasRef.current;
    if (!canvas || isRecording) return;

    setIsRecording(true);
    setRecordProgress(0);

    try {
      const canvasStream = canvas.captureStream(30);
      const audioStream = sharedAudioEngine.getAudioStream();
      const tracks = [...canvasStream.getVideoTracks()];
      if (audioStream) {
        audioStream.getAudioTracks().forEach((t) => tracks.push(t));
      }
      const combinedStream = new MediaStream(tracks);

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm';
      const recorder = new MediaRecorder(combinedStream, { mimeType });
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunks.push(ev.data);
      };

      const recordSec = Math.min(20, Math.round(totalDuration));

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.toLowerCase().replace(/\s+/g, '-')}-video.webm`;
        a.click();
        URL.revokeObjectURL(url);
        setIsRecording(false);
        setRecordProgress(0);
      };

      if (linkedSong) {
        onSeekAudio(0);
        onPlayAudio();
      } else {
        setStandaloneTime(0);
        setIsPreviewingStandalone(true);
      }

      recorder.start(250);
      const started = Date.now();
      const timer = window.setInterval(() => {
        const elapsed = (Date.now() - started) / 1000;
        setRecordProgress(Math.min(100, Math.round((elapsed / recordSec) * 100)));
        if (elapsed >= recordSec) {
          clearInterval(timer);
          recorder.stop();
          if (linkedSong) onPauseAudio();
          else setIsPreviewingStandalone(false);
        }
      }, 200);
    } catch {
      setIsRecording(false);
      setStoryboardError('Tu navegador no permite grabar stream de video WebM en este contexto.');
    }
  };

  const canvasDims =
    aspectRatio === '16:9'
      ? { w: 960, h: 540, cls: 'aspect-video max-w-full' }
      : aspectRatio === '9:16'
        ? { w: 540, h: 960, cls: 'aspect-[9/16] max-h-[540px] mx-auto' }
        : { w: 720, h: 720, cls: 'aspect-square max-h-[520px] mx-auto' };

  return (
    <div className="mx-auto max-w-[1440px] px-4 pt-6 pb-32 sm:px-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* LEFT COLUMN: Video Director Controls */}
        <section
          aria-label="Configurador de video"
          className="lg:col-span-5 rounded-xl studio-panel p-5 space-y-5"
        >
          <div className="space-y-1 border-b border-white/10 pb-4">
            <h1 className="font-display text-xl font-bold tracking-tight text-zinc-100">
              Crear Video Musical Futurista
            </h1>
            <p className="text-sm text-zinc-400">
              Ritmos visuales sincronizados al beat, estilo holograma o fiesta tropical y letras animadas.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="video-song-select" className="block text-xs font-medium text-zinc-300">
                Canción de fondo
              </label>
              <select
                id="video-song-select"
                value={selectedSongId}
                onChange={(e) => handleSongSelectChange(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#06070B] px-3 py-2.5 text-sm text-zinc-100 focus:border-cyan-400 focus:outline-none"
              >
                {songs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} — Para {s.dedicatee} ({s.genreName})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="video-title" className="block text-xs font-medium text-zinc-300">
                  Título en video
                </label>
                <input
                  id="video-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#06070B] px-3 py-2 text-sm text-zinc-100 focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="video-dedicatee" className="block text-xs font-medium text-zinc-300">
                  Dedicatoria
                </label>
                <input
                  id="video-dedicatee"
                  type="text"
                  value={dedicatee}
                  onChange={(e) => setDedicatee(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#06070B] px-3 py-2 text-sm text-zinc-100 focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="video-prompt" className="block text-xs font-medium text-zinc-300">
                Idea o atmósfera visual
              </label>
              <textarea
                id="video-prompt"
                rows={2}
                value={visualPrompt}
                onChange={(e) => setVisualPrompt(e.target.value)}
                className="w-full resize-none rounded-lg border border-white/10 bg-[#06070B] px-3 py-2 text-sm text-zinc-100 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            {/* Deevid-inspired Video Rhythm Modes */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-300">Ritmo de Movimiento (Deevid)</p>
              <div className="grid grid-cols-2 gap-2">
                {VIDEO_RHYTHMS.map((vr) => {
                  const active = vr.id === videoRhythmId;
                  return (
                    <button
                      key={vr.id}
                      type="button"
                      onClick={() => setVideoRhythmId(vr.id)}
                      className={`text-left rounded-lg border p-2.5 transition-colors ${
                        active
                          ? 'border-cyan-400 bg-cyan-400/10'
                          : 'border-white/10 bg-[#080B12] hover:border-white/25'
                      }`}
                    >
                      <p className={`text-xs font-semibold ${active ? 'text-cyan-300' : 'text-zinc-100'}`}>
                        {vr.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-zinc-400 line-clamp-1">
                        {vr.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visual Style Presets */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-300">Estilo Visual</p>
              <div className="grid grid-cols-2 gap-2">
                {VIDEO_STYLES.map((st) => {
                  const active = st.id === visualStyleId;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setVisualStyleId(st.id)}
                      className={`text-left rounded-lg border p-2.5 transition-colors ${
                        active
                          ? 'border-amber-400 bg-amber-400/10'
                          : 'border-white/10 bg-[#080B12] hover:border-white/25'
                      }`}
                    >
                      <p className={`text-xs font-semibold ${active ? 'text-amber-300' : 'text-zinc-100'}`}>
                        {st.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-zinc-400 line-clamp-1">
                        {st.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Aspect Ratio & Lyrics Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-1.5">
                {(['16:9', '9:16', '1:1'] as const).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    className={`px-3 py-1.5 font-mono text-xs rounded-md border transition-colors ${
                      aspectRatio === ratio
                        ? 'border-cyan-400 bg-cyan-400 text-zinc-950 font-semibold'
                        : 'border-white/10 bg-[#080B12] text-zinc-300 hover:border-white/25'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showLyrics}
                  onChange={(e) => setShowLyrics(e.target.checked)}
                  className="accent-cyan-400 h-4 w-4 rounded"
                />
                <span>Letras sincronizadas</span>
              </label>
            </div>

            {/* Personal Photo Upload */}
            <div className="space-y-2 border-t border-white/10 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-300">
                  Fotos personales (hasta 5)
                </span>
                {photos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPhotos([])}
                    className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Quitar fotos</span>
                  </button>
                )}
              </div>
              <label className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 bg-[#080B12] hover:border-cyan-400/60 px-4 py-3 text-xs text-zinc-300 cursor-pointer transition-colors">
                <ImagePlus className="w-4 h-4 text-cyan-400" />
                <span>Subir imágenes para animar al compás</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
              {photos.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pt-1">
                  {photos.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`Foto subida ${i + 1}`}
                      className="h-12 w-12 rounded-md object-cover border border-white/10 shrink-0"
                    />
                  ))}
                </div>
              )}
            </div>

            {storyboardError && (
              <div
                role="alert"
                className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200"
              >
                {storyboardError}
              </div>
            )}

            <button
              type="button"
              disabled={isGeneratingStoryboard}
              onClick={handleGenerateStoryboard}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-[#0E121B] hover:bg-zinc-800 disabled:opacity-60 px-4 py-2.5 text-sm font-medium text-zinc-100 transition-colors"
            >
              {isGeneratingStoryboard ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>Creando guion visual...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Generar Guion de Escenas con IA</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* RIGHT COLUMN: Live Cinema Canvas & WebM Export */}
        <section
          aria-label="Vista previa y exportación de video"
          className="lg:col-span-7 space-y-5"
        >
          <div className="rounded-xl studio-panel p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-zinc-100">
                  Estudio de Renderizado Holográfico
                </h2>
                <p className="text-xs text-zinc-400">
                  Formato {aspectRatio} · Audio sincronizado · Exportación directa en WebM
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={togglePreview}
                  className="flex items-center gap-2 rounded-lg border border-white/15 bg-[#0E121B] hover:bg-zinc-800 px-3.5 py-2 text-xs font-medium text-zinc-100 transition-colors whitespace-nowrap"
                >
                  {isPlayingAny ? (
                    <>
                      <Pause className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Pausar Vista</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Previsualizar</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={isRecording}
                  onClick={handleExportVideoWebm}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-400 to-amber-400 hover:brightness-110 disabled:opacity-60 px-4 py-2 text-xs font-semibold text-zinc-950 transition-all whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    {isRecording ? `Grabando ${recordProgress}%` : 'Exportar Video (.WebM)'}
                  </span>
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#040508] p-3 overflow-hidden">
              <canvas
                ref={canvasRef}
                width={canvasDims.w}
                height={canvasDims.h}
                className={`w-full rounded-lg object-contain ${canvasDims.cls}`}
              />
            </div>

            {/* Scene Timeline Strip */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                <Film className="w-3.5 h-3.5 text-cyan-400" />
                <span>Guion por Escenas</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {scenes.map((scene) => (
                  <div
                    key={scene.sceneNumber}
                    className="rounded-lg studio-card p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] text-cyan-300 font-mono tabular-nums">
                      <span>Escena {scene.sceneNumber}</span>
                      <span>
                        {scene.startSec}s–{scene.endSec}s
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-zinc-100 truncate">{scene.title}</p>
                    <p className="text-[11px] text-zinc-400 line-clamp-2">
                      {scene.visualDescription}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
