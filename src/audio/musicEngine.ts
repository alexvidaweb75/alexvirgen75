import type { DrumPattern, SongProject, SynthTimbre } from '../types/studio';

const NOTE_SEMITONES: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function parseChord(chordStr: string): {
  bassMidi: number;
  thirdMidi: number;
  fifthMidi: number;
  notesMidi: number[];
} {
  const clean = chordStr.trim().replace(/\s+/g, '');
  const match = clean.match(/^([A-G][#b]?)(.*)$/);
  if (!match) {
    return { bassMidi: 48, thirdMidi: 52, fifthMidi: 55, notesMidi: [60, 64, 67] };
  }
  const rootName = match[1];
  const quality = match[2].toLowerCase();
  const rootOffset = NOTE_SEMITONES[rootName] ?? 0;
  const bassMidi = 36 + rootOffset;
  const chordRoot = 60 + rootOffset;

  const isMinor = quality.startsWith('m') && !quality.startsWith('maj');
  const isDim = quality.includes('dim');
  const has7 = quality.includes('7');
  const isMaj7 = quality.includes('maj7');

  const third = isMinor || isDim ? 3 : 4;
  const fifth = isDim ? 6 : 7;
  const notes = [chordRoot, chordRoot + third, chordRoot + fifth];

  if (isMaj7) {
    notes.push(chordRoot + 11);
  } else if (has7) {
    notes.push(chordRoot + 10);
  }

  return {
    bassMidi,
    thirdMidi: bassMidi + third,
    fifthMidi: bassMidi + fifth,
    notesMidi: notes,
  };
}

function createNoiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const bufferSize = Math.floor(ctx.sampleRate * 0.5);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function triggerKick(ctx: BaseAudioContext, dest: AudioNode, time: number, gainVal = 0.58) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(140, time);
  osc.frequency.exponentialRampToValueAtTime(44, time + 0.12);
  gain.gain.setValueAtTime(gainVal, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.26);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(time);
  osc.stop(time + 0.28);
}

function triggerSnare(
  ctx: BaseAudioContext,
  dest: AudioNode,
  noiseBuffer: AudioBuffer,
  time: number,
  gainVal = 0.28
) {
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1900, time);
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(gainVal, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(dest);
  noise.start(time);
  noise.stop(time + 0.17);

  const tone = ctx.createOscillator();
  tone.type = 'triangle';
  tone.frequency.setValueAtTime(190, time);
  tone.frequency.exponentialRampToValueAtTime(95, time + 0.08);
  const toneGain = ctx.createGain();
  toneGain.gain.setValueAtTime(gainVal * 0.6, time);
  toneGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
  tone.connect(toneGain);
  toneGain.connect(dest);
  tone.start(time);
  tone.stop(time + 0.11);
}

function triggerHiHat(
  ctx: BaseAudioContext,
  dest: AudioNode,
  noiseBuffer: AudioBuffer,
  time: number,
  gainVal = 0.09,
  duration = 0.05
) {
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.setValueAtTime(7500, time);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(gainVal, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
  noise.connect(hp);
  hp.connect(gain);
  gain.connect(dest);
  noise.start(time);
  noise.stop(time + duration + 0.02);
}

function triggerGuiro(
  ctx: BaseAudioContext,
  dest: AudioNode,
  noiseBuffer: AudioBuffer,
  time: number,
  accent = false
) {
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(accent ? 5200 : 4200, time);
  bp.Q.setValueAtTime(3.2, time);
  const gain = ctx.createGain();
  const dur = accent ? 0.11 : 0.055;
  gain.gain.setValueAtTime(0.001, time);
  gain.gain.linearRampToValueAtTime(accent ? 0.2 : 0.11, time + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
  noise.connect(bp);
  bp.connect(gain);
  gain.connect(dest);
  noise.start(time);
  noise.stop(time + dur + 0.02);
}

function triggerCowbell(ctx: BaseAudioContext, dest: AudioNode, time: number, gainVal = 0.16) {
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const bp = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc1.type = 'square';
  osc2.type = 'square';
  osc1.frequency.setValueAtTime(545, time);
  osc2.frequency.setValueAtTime(815, time);
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(700, time);
  gain.gain.setValueAtTime(gainVal, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.11);
  osc1.connect(bp);
  osc2.connect(bp);
  bp.connect(gain);
  gain.connect(dest);
  osc1.start(time);
  osc2.start(time);
  osc1.stop(time + 0.12);
  osc2.stop(time + 0.12);
}

function triggerConga(ctx: BaseAudioContext, dest: AudioNode, time: number, high = true) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(high ? 310 : 210, time);
  osc.frequency.exponentialRampToValueAtTime(high ? 195 : 135, time + 0.09);
  gain.gain.setValueAtTime(0.28, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(time);
  osc.stop(time + 0.16);
}

function triggerClave(ctx: BaseAudioContext, dest: AudioNode, time: number, gainVal = 0.18) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(2200, time);
  osc.frequency.exponentialRampToValueAtTime(1600, time + 0.03);
  gain.gain.setValueAtTime(gainVal, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(time);
  osc.stop(time + 0.05);
}

function triggerBass(ctx: BaseAudioContext, dest: AudioNode, freq: number, time: number, duration: number) {
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, time);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(390, time);
  gain.gain.setValueAtTime(0.001, time);
  gain.gain.linearRampToValueAtTime(0.35, time + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  osc.start(time);
  osc.stop(time + duration + 0.03);
}

function triggerChordVoice(
  ctx: BaseAudioContext,
  dest: AudioNode,
  notesMidi: number[],
  timbre: SynthTimbre,
  time: number,
  duration: number
) {
  notesMidi.forEach((midi, idx) => {
    const freq = midiToFreq(midi);
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    let peak = 0.085;
    let attack = 0.03;

    if (timbre === 'cumbia-accordion') {
      // Bright reed-like accordion stabs on off-beats
      osc.type = 'sawtooth';
      osc.detune.setValueAtTime(idx % 2 === 0 ? -8 : 8, time);
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1550, time);
      filter.Q.setValueAtTime(1.2, time);
      const stabTime = time + 0.02;
      osc.frequency.setValueAtTime(freq, stabTime);
      gain.gain.setValueAtTime(0.001, stabTime);
      gain.gain.linearRampToValueAtTime(0.075, stabTime + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, stabTime + Math.min(duration * 0.75, 0.55));
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      osc.start(stabTime);
      osc.stop(stabTime + 0.65);
      return;
    } else if (timbre === 'tropical-brass') {
      osc.type = 'sawtooth';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, time);
      filter.frequency.linearRampToValueAtTime(2600, time + 0.09);
      filter.frequency.exponentialRampToValueAtTime(1100, time + Math.min(duration, 0.65));
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.07, time + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, time + Math.min(duration * 0.85, 0.7));
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      osc.start(time);
      osc.stop(time + 0.75);
      return;
    } else if (timbre === 'future-synth') {
      // Shimmering futuristic arpeggiated supersaw
      osc.type = 'sawtooth';
      osc.detune.setValueAtTime(idx % 2 === 0 ? -10 : 10, time);
      filter.type = 'lowpass';
      const noteTime = time + idx * 0.08;
      filter.frequency.setValueAtTime(3400, noteTime);
      filter.frequency.exponentialRampToValueAtTime(750, noteTime + 0.55);
      osc.frequency.setValueAtTime(freq, noteTime);
      gain.gain.setValueAtTime(0.001, noteTime);
      gain.gain.linearRampToValueAtTime(0.08, noteTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.65);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      osc.start(noteTime);
      osc.stop(noteTime + 0.7);
      return;
    } else if (timbre === 'warm-piano') {
      osc.type = 'triangle';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, time);
      filter.frequency.exponentialRampToValueAtTime(800, time + duration);
      attack = 0.015;
      peak = 0.1;
    } else if (timbre === 'acoustic-pluck') {
      osc.type = 'sawtooth';
      filter.type = 'lowpass';
      const offsetTime = time + idx * 0.045;
      filter.frequency.setValueAtTime(2600, offsetTime);
      filter.frequency.exponentialRampToValueAtTime(450, offsetTime + 0.45);
      gain.gain.setValueAtTime(0.001, offsetTime);
      gain.gain.linearRampToValueAtTime(0.065, offsetTime + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, offsetTime + Math.min(duration, 0.9));
      osc.frequency.setValueAtTime(freq, offsetTime);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      osc.start(offsetTime);
      osc.stop(offsetTime + duration + 0.05);
      return;
    } else if (timbre === 'analog-synth') {
      osc.type = 'sawtooth';
      osc.detune.setValueAtTime(idx % 2 === 0 ? -6 : 6, time);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, time);
      attack = 0.06;
      peak = 0.055;
    } else if (timbre === 'electric-rhodes') {
      osc.type = 'sine';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3200, time);
      attack = 0.01;
      peak = 0.11;
    } else if (timbre === 'orchestral-strings') {
      osc.type = 'sawtooth';
      osc.detune.setValueAtTime(idx % 2 === 0 ? -9 : 9, time);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1250, time);
      attack = 0.25;
      peak = 0.05;
    } else {
      osc.type = 'sine';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(5000, time);
      const chimeTime = time + idx * 0.12;
      osc.frequency.setValueAtTime(freq * 2, chimeTime);
      gain.gain.setValueAtTime(0.001, chimeTime);
      gain.gain.linearRampToValueAtTime(0.08, chimeTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, chimeTime + 0.65);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      osc.start(chimeTime);
      osc.stop(chimeTime + 0.7);
      return;
    }

    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(peak, time + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.96);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + duration + 0.05);
  });
}

function scheduleBeatDrums(
  ctx: BaseAudioContext,
  dest: AudioNode,
  noiseBuffer: AudioBuffer,
  pattern: DrumPattern,
  stepInBar: number,
  stepsPerBar: number,
  time: number
) {
  const step = stepInBar % stepsPerBar;

  if (pattern === 'cumbia-sonidera') {
    if (step === 0 || step === 4) triggerKick(ctx, dest, time, 0.56);
    if (step === 2 || step === 6) triggerCowbell(ctx, dest, time, 0.18);
    // Classic güiro cha-chaka-cha pattern
    if (step === 0 || step === 2 || step === 4 || step === 6) {
      triggerGuiro(ctx, dest, noiseBuffer, time, true);
    } else {
      triggerGuiro(ctx, dest, noiseBuffer, time, false);
    }
    if (step === 3 || step === 7) triggerConga(ctx, dest, time, step === 3);
  } else if (pattern === 'electrocumbia') {
    if (step % 2 === 0) triggerKick(ctx, dest, time, 0.64);
    if (step === 2 || step === 6) triggerSnare(ctx, dest, noiseBuffer, time, 0.24);
    triggerGuiro(ctx, dest, noiseBuffer, time, step % 2 === 1);
    if (step === 3 || step === 7) triggerCowbell(ctx, dest, time, 0.13);
  } else if (pattern === 'cumbia') {
    if (step === 0 || step === 4) triggerKick(ctx, dest, time, 0.5);
    triggerGuiro(ctx, dest, noiseBuffer, time, step % 2 === 0);
    if (step === 2 || step === 6) triggerConga(ctx, dest, time, true);
    if (step === 4) triggerClave(ctx, dest, time, 0.14);
  } else if (pattern === 'salsa-timba') {
    if (step === 0 || step === 3 || step === 6) triggerClave(ctx, dest, time, 0.2);
    if (step % 2 === 0) triggerCowbell(ctx, dest, time, 0.14);
    if (step === 2 || step === 5 || step === 7) triggerConga(ctx, dest, time, step !== 7);
    if (step === 0 || step === 4) triggerKick(ctx, dest, time, 0.42);
  } else if (pattern === 'merengue') {
    if (step % 2 === 0) triggerKick(ctx, dest, time, 0.58);
    if (step === 2 || step === 6) triggerSnare(ctx, dest, noiseBuffer, time, 0.3);
    triggerGuiro(ctx, dest, noiseBuffer, time, step % 2 === 1);
    if (step === 3 || step === 7) triggerConga(ctx, dest, time, true);
  } else if (pattern === 'bachata') {
    if (step === 0 || step === 4) triggerKick(ctx, dest, time, 0.46);
    if (step === 1 || step === 3 || step === 5) triggerConga(ctx, dest, time, true);
    if (step === 7) triggerConga(ctx, dest, time, false);
    triggerGuiro(ctx, dest, noiseBuffer, time, step % 2 === 0);
  } else if (pattern === 'future-dance') {
    if (step % 2 === 0) triggerKick(ctx, dest, time, 0.65);
    if (step === 2 || step === 6) triggerSnare(ctx, dest, noiseBuffer, time, 0.32);
    triggerHiHat(ctx, dest, noiseBuffer, time, step % 2 === 1 ? 0.13 : 0.05, 0.07);
  } else if (pattern === 'ballad') {
    if (step === 0 || step === 5) triggerKick(ctx, dest, time, 0.35);
    if (step === 4) triggerSnare(ctx, dest, noiseBuffer, time, 0.16);
    if (step % 2 === 0) triggerHiHat(ctx, dest, noiseBuffer, time, 0.05);
  } else if (pattern === 'dembow') {
    if (step === 0 || step === 4) triggerKick(ctx, dest, time, 0.62);
    if (step === 3 || step === 6) triggerSnare(ctx, dest, noiseBuffer, time, 0.34);
    triggerHiHat(ctx, dest, noiseBuffer, time, step % 2 === 0 ? 0.08 : 0.04);
  } else if (pattern === 'pop-four') {
    if (step % 2 === 0) triggerKick(ctx, dest, time, 0.55);
    if (step === 2 || step === 6) triggerSnare(ctx, dest, noiseBuffer, time, 0.25);
    if (step % 2 === 1) triggerHiHat(ctx, dest, noiseBuffer, time, 0.11, 0.08);
  } else if (pattern === 'tropical') {
    if (step === 0 || step === 3 || step === 6) triggerKick(ctx, dest, time, 0.45);
    if (step === 0 || step === 3 || step === 5) triggerClave(ctx, dest, time, 0.18);
    if (step === 2 || step === 6) triggerConga(ctx, dest, time, true);
    triggerGuiro(ctx, dest, noiseBuffer, time, step % 2 === 0);
  } else if (pattern === 'waltz') {
    if (step === 0) triggerKick(ctx, dest, time, 0.42);
    if (step === 2 || step === 4) triggerHiHat(ctx, dest, noiseBuffer, time, 0.08);
  } else if (pattern === 'lullaby') {
    if (step === 0) triggerKick(ctx, dest, time, 0.22);
    if (step === 3) triggerHiHat(ctx, dest, noiseBuffer, time, 0.04, 0.09);
  } else if (pattern === 'funk') {
    if (step === 0 || step === 3 || step === 5) triggerKick(ctx, dest, time, 0.52);
    if (step === 2 || step === 6) triggerSnare(ctx, dest, noiseBuffer, time, 0.3);
    triggerHiHat(ctx, dest, noiseBuffer, time, step % 2 === 0 ? 0.1 : 0.05);
  } else if (pattern === 'rock') {
    if (step === 0 || step === 4 || step === 5) triggerKick(ctx, dest, time, 0.58);
    if (step === 2 || step === 6) triggerSnare(ctx, dest, noiseBuffer, time, 0.35);
    triggerHiHat(ctx, dest, noiseBuffer, time, 0.1);
  } else {
    if (step === 0 || step === 5) triggerKick(ctx, dest, time, 0.44);
    if (step === 2 || step === 6) triggerSnare(ctx, dest, noiseBuffer, time, 0.2);
    triggerHiHat(ctx, dest, noiseBuffer, time, 0.06);
  }
}

function scheduleBassAndChords(
  ctx: BaseAudioContext,
  dest: AudioNode,
  song: SongProject,
  parsed: ReturnType<typeof parseChord>,
  stepInBar: number,
  stepsPerBar: number,
  stepSec: number,
  time: number
) {
  const isCumbiaOrTropical =
    song.arrangement.drumPattern === 'cumbia' ||
    song.arrangement.drumPattern === 'cumbia-sonidera' ||
    song.arrangement.drumPattern === 'electrocumbia' ||
    song.arrangement.drumPattern === 'merengue' ||
    song.arrangement.drumPattern === 'salsa-timba' ||
    song.arrangement.drumPattern === 'tropical';

  if (isCumbiaOrTropical) {
    // Classic root - 3rd - 5th dancing cumbia/tropical bassline & off-beat chord chops
    if (stepInBar === 0) {
      triggerBass(ctx, dest, midiToFreq(parsed.bassMidi), time, stepSec * 2.2);
    } else if (stepInBar === 3) {
      triggerBass(ctx, dest, midiToFreq(parsed.thirdMidi), time, stepSec * 1.4);
    } else if (stepInBar === 5) {
      triggerBass(ctx, dest, midiToFreq(parsed.fifthMidi), time, stepSec * 1.8);
    }

    if (stepInBar === 2 || stepInBar === 6) {
      triggerChordVoice(
        ctx,
        dest,
        parsed.notesMidi,
        song.arrangement.synthTimbre,
        time,
        stepSec * 2.5
      );
    }
    return;
  }

  if (stepInBar === 0) {
    triggerChordVoice(
      ctx,
      dest,
      parsed.notesMidi,
      song.arrangement.synthTimbre,
      time,
      stepSec * stepsPerBar
    );
    triggerBass(ctx, dest, midiToFreq(parsed.bassMidi), time, stepSec * (stepsPerBar / 2));
  } else if (stepInBar === Math.floor(stepsPerBar / 2)) {
    triggerBass(ctx, dest, midiToFreq(parsed.bassMidi + 7), time, stepSec * (stepsPerBar / 2 - 0.3));
  }
}

export class SonoraAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private vocalGain: GainNode | null = null;
  private instrumentalGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private streamDest: MediaStreamAudioDestinationNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private activeSong: SongProject | null = null;
  private vocalBuffer: AudioBuffer | null = null;
  private vocalSource: AudioBufferSourceNode | null = null;

  private isPlaying = false;
  private startOffset = 0;
  private startedAtCtxTime = 0;
  private duration = 32;
  private loop = true;
  private playbackRate = 1.0;

  private masterVolume = 0.85;
  private vocalVolume = 0.95;
  private instrumentalVolume = 0.65;
  private isMuted = false;

  private schedulerTimer: number | null = null;
  private nextStepTime = 0;
  private currentStep = 0;

  private onTimeUpdate?: (time: number, duration: number) => void;
  private onEnded?: () => void;

  private ensureContext() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.vocalGain = this.ctx.createGain();
      this.instrumentalGain = this.ctx.createGain();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 128;
      this.streamDest = this.ctx.createMediaStreamDestination();
      this.noiseBuffer = createNoiseBuffer(this.ctx);

      this.vocalGain.connect(this.masterGain);
      this.instrumentalGain.connect(this.masterGain);
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      this.analyser.connect(this.streamDest);

      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  public setCallbacks(
    onTimeUpdate: (time: number, duration: number) => void,
    onEnded: () => void
  ) {
    this.onTimeUpdate = onTimeUpdate;
    this.onEnded = onEnded;
  }

  public getAudioStream(): MediaStream | null {
    this.ensureContext();
    return this.streamDest?.stream ?? null;
  }

  public getFrequencyData(target: Uint8Array<ArrayBuffer>): boolean {
    if (!this.analyser) return false;
    this.analyser.getByteFrequencyData(target);
    return true;
  }

  private applyVolumes() {
    if (!this.ctx || !this.masterGain || !this.vocalGain || !this.instrumentalGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.masterVolume, now, 0.02);
    this.vocalGain.gain.setTargetAtTime(this.vocalVolume, now, 0.02);
    this.instrumentalGain.gain.setTargetAtTime(this.instrumentalVolume, now, 0.02);
  }

  public setMasterVolume(v: number) {
    this.masterVolume = Math.max(0, Math.min(1, v));
    this.applyVolumes();
  }

  public setVocalVolume(v: number) {
    this.vocalVolume = Math.max(0, Math.min(1, v));
    this.applyVolumes();
  }

  public setInstrumentalVolume(v: number) {
    this.instrumentalVolume = Math.max(0, Math.min(1, v));
    this.applyVolumes();
  }

  public setMuted(m: boolean) {
    this.isMuted = m;
    this.applyVolumes();
  }

  public setLoop(l: boolean) {
    this.loop = l;
  }

  public setPlaybackRate(rate: number) {
    const wasPlaying = this.isPlaying;
    const pos = this.getCurrentTime();
    this.playbackRate = rate;
    if (wasPlaying && this.activeSong) {
      this.pause();
      this.startOffset = pos;
      void this.play();
    }
  }

  public async loadSong(song: SongProject, autoPlay = false) {
    this.stop();
    this.activeSong = song;
    this.vocalBuffer = null;
    this.duration = song.arrangement.durationSeconds || 32;

    if (song.vocalAudioUrl) {
      try {
        this.ensureContext();
        const res = await fetch(song.vocalAudioUrl);
        const arrayBuf = await res.arrayBuffer();
        if (this.ctx) {
          this.vocalBuffer = await this.ctx.decodeAudioData(arrayBuf);
          this.duration = Math.max(this.vocalBuffer.duration, 24);
        }
      } catch {
        this.vocalBuffer = null;
      }
    }

    this.onTimeUpdate?.(0, this.duration);
    if (autoPlay) {
      await this.play();
    }
  }

  public getCurrentTime(): number {
    if (!this.isPlaying || !this.ctx) return this.startOffset;
    const elapsed = (this.ctx.currentTime - this.startedAtCtxTime) * this.playbackRate;
    return Math.min(this.duration, this.startOffset + elapsed);
  }

  public async play() {
    if (!this.activeSong) return;
    this.ensureContext();
    if (!this.ctx || !this.vocalGain || !this.instrumentalGain) return;

    this.clearNodes();

    if (this.startOffset >= this.duration - 0.1) {
      this.startOffset = 0;
    }

    this.isPlaying = true;
    this.startedAtCtxTime = this.ctx.currentTime;

    if (this.vocalBuffer && this.startOffset < this.vocalBuffer.duration) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.vocalBuffer;
      src.playbackRate.value = this.playbackRate;
      src.connect(this.vocalGain);
      src.start(this.ctx.currentTime, this.startOffset);
      this.vocalSource = src;
    }

    const bpm = (this.activeSong.arrangement.bpm || 90) * this.playbackRate;
    const eighthDur = 60 / bpm / 2;
    const stepsPerBar = this.activeSong.arrangement.timeSignature === '4/4' ? 8 : 6;
    this.currentStep = Math.floor(this.startOffset / eighthDur);
    this.nextStepTime = this.ctx.currentTime + 0.03;

    this.schedulerTimer = window.setInterval(() => {
      if (!this.isPlaying || !this.ctx || !this.activeSong || !this.instrumentalGain || !this.noiseBuffer) {
        return;
      }

      const nowTime = this.getCurrentTime();
      this.onTimeUpdate?.(nowTime, this.duration);

      if (nowTime >= this.duration - 0.05) {
        if (this.loop) {
          this.startOffset = 0;
          void this.play();
        } else {
          this.stop();
          this.onEnded?.();
        }
        return;
      }

      const effBpm = (this.activeSong.arrangement.bpm || 90) * this.playbackRate;
      const stepSec = 60 / effBpm / 2;
      const chords = this.activeSong.arrangement.chordProgression.length
        ? this.activeSong.arrangement.chordProgression
        : ['Am', 'G', 'F', 'E7'];

      while (this.nextStepTime < this.ctx.currentTime + 0.16) {
        const barIdx = Math.floor(this.currentStep / stepsPerBar);
        const stepInBar = this.currentStep % stepsPerBar;
        const chordStr = chords[barIdx % chords.length];
        const parsed = parseChord(chordStr);

        scheduleBeatDrums(
          this.ctx,
          this.instrumentalGain,
          this.noiseBuffer,
          this.activeSong.arrangement.drumPattern,
          stepInBar,
          stepsPerBar,
          this.nextStepTime
        );

        scheduleBassAndChords(
          this.ctx,
          this.instrumentalGain,
          this.activeSong,
          parsed,
          stepInBar,
          stepsPerBar,
          stepSec,
          this.nextStepTime
        );

        this.nextStepTime += stepSec;
        this.currentStep += 1;
      }
    }, 40);
  }

  public pause() {
    if (!this.isPlaying) return;
    this.startOffset = this.getCurrentTime();
    this.isPlaying = false;
    this.clearNodes();
    this.onTimeUpdate?.(this.startOffset, this.duration);
  }

  public stop() {
    this.isPlaying = false;
    this.startOffset = 0;
    this.clearNodes();
    this.onTimeUpdate?.(0, this.duration);
  }

  public seek(seconds: number) {
    const clamped = Math.max(0, Math.min(this.duration, seconds));
    const wasPlaying = this.isPlaying;
    this.pause();
    this.startOffset = clamped;
    this.onTimeUpdate?.(clamped, this.duration);
    if (wasPlaying) {
      void this.play();
    }
  }

  private clearNodes() {
    if (this.schedulerTimer !== null) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    if (this.vocalSource) {
      try {
        this.vocalSource.stop();
      } catch {
        // already stopped
      }
      this.vocalSource.disconnect();
      this.vocalSource = null;
    }
  }

  public async exportSongToWav(song: SongProject): Promise<Blob> {
    const sampleRate = 44100;
    let decodedVocal: AudioBuffer | null = null;
    let totalDuration = song.arrangement.durationSeconds || 32;

    if (song.vocalAudioUrl) {
      const tempCtx = new AudioContext();
      try {
        const res = await fetch(song.vocalAudioUrl);
        const ab = await res.arrayBuffer();
        decodedVocal = await tempCtx.decodeAudioData(ab);
        totalDuration = Math.max(decodedVocal.duration + 1.5, 24);
      } finally {
        await tempCtx.close();
      }
    }

    const offline = new OfflineAudioContext(2, Math.ceil(totalDuration * sampleRate), sampleRate);
    const instGain = offline.createGain();
    instGain.gain.value = this.instrumentalVolume;
    instGain.connect(offline.destination);

    const vocGain = offline.createGain();
    vocGain.gain.value = this.vocalVolume;
    vocGain.connect(offline.destination);

    if (decodedVocal) {
      const src = offline.createBufferSource();
      src.buffer = decodedVocal;
      src.connect(vocGain);
      src.start(0);
    }

    const noiseBuf = createNoiseBuffer(offline);
    const bpm = song.arrangement.bpm || 90;
    const stepSec = 60 / bpm / 2;
    const stepsPerBar = song.arrangement.timeSignature === '4/4' ? 8 : 6;
    const chords = song.arrangement.chordProgression.length
      ? song.arrangement.chordProgression
      : ['Am', 'G', 'F', 'E7'];

    const totalSteps = Math.floor(totalDuration / stepSec);
    for (let s = 0; s < totalSteps; s++) {
      const t = s * stepSec;
      const barIdx = Math.floor(s / stepsPerBar);
      const stepInBar = s % stepsPerBar;
      const parsed = parseChord(chords[barIdx % chords.length]);

      scheduleBeatDrums(offline, instGain, noiseBuf, song.arrangement.drumPattern, stepInBar, stepsPerBar, t);
      scheduleBassAndChords(offline, instGain, song, parsed, stepInBar, stepsPerBar, stepSec, t);
    }

    const rendered = await offline.startRendering();
    return encodeAudioBufferToWav(rendered);
  }
}

function encodeAudioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numFrames = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numFrames * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export const sharedAudioEngine = new SonoraAudioEngine();
