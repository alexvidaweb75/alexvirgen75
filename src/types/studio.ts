export type AppSection = 'music' | 'video' | 'lyrics' | 'library';

export type DrumPattern =
  | 'ballad'
  | 'dembow'
  | 'pop-four'
  | 'tropical'
  | 'lofi'
  | 'rock'
  | 'waltz'
  | 'lullaby'
  | 'funk'
  | 'cumbia'
  | 'cumbia-sonidera'
  | 'electrocumbia'
  | 'merengue'
  | 'bachata'
  | 'salsa-timba'
  | 'future-dance';

export type SynthTimbre =
  | 'warm-piano'
  | 'acoustic-pluck'
  | 'analog-synth'
  | 'electric-rhodes'
  | 'orchestral-strings'
  | 'music-box'
  | 'cumbia-accordion'
  | 'tropical-brass'
  | 'future-synth';

export type PrebuiltVoiceName = 'Kore' | 'Charon' | 'Puck' | 'Zephyr' | 'Fenrir';

export interface GenreOption {
  id: string;
  name: string;
  category: 'tropical' | 'bailable' | 'futurista' | 'emotivo';
  description: string;
  defaultBpm: number;
  defaultDrum: DrumPattern;
  defaultTimbre: SynthTimbre;
  defaultChords: string[];
  coverImage: string;
}

export interface RhythmOption {
  id: string;
  name: string;
  meter: '4/4' | '3/4' | '6/8';
  drumPattern: DrumPattern;
  feel: string;
  recommendedBpm: number;
}

export interface StyleOption {
  id: string;
  name: string;
  timbre: SynthTimbre;
  atmosphere: string;
}

export interface VoiceOption {
  id: string;
  name: string;
  voiceName: PrebuiltVoiceName;
  timbreDescription: string;
  register: string;
}

export interface ChoirOption {
  id: string;
  name: string;
  isDualVoice: boolean;
  secondaryVoiceName?: PrebuiltVoiceName;
  arrangementNote: string;
}

export interface ArtistOption {
  id: string;
  name: string;
  era: string;
  signatureSound: string;
}

export interface LyricMoodOption {
  id: string;
  name: string;
  description: string;
}

export interface RhymeFlowOption {
  id: string;
  name: string;
  description: string;
}

export interface VideoStyleOption {
  id: string;
  name: string;
  description: string;
  palette: [string, string, string];
  accent: string;
  secondaryAccent: string;
  particleMode: 'dust' | 'stars' | 'rain' | 'bokeh' | 'confetti' | 'neon-grid';
}

export interface VideoRhythmOption {
  id: string;
  name: string;
  description: string;
  pulseIntensity: number;
  motionSpeed: number;
}

export interface LyricSection {
  tag: string;
  title: string;
  lines: string[];
}

export interface MusicalArrangement {
  keySignature: string;
  bpm: number;
  timeSignature: '4/4' | '3/4' | '6/8';
  chordProgression: string[];
  bassPattern: string;
  synthTimbre: SynthTimbre;
  drumPattern: DrumPattern;
  durationSeconds: number;
  instruments: string[];
}

export interface SongProject {
  id: string;
  title: string;
  dedicatee: string;
  occasion: string;
  traits: string;
  genreId: string;
  genreName: string;
  rhythmId: string;
  rhythmName: string;
  styleId: string;
  styleName: string;
  voiceId: string;
  voiceName: string;
  choirId: string;
  choirName: string;
  artistId: string;
  artistName: string;
  moodName?: string;
  rhymeFlowName?: string;
  language: string;
  sections: LyricSection[];
  fullLyrics: string;
  arrangement: MusicalArrangement;
  vocalAudioUrl?: string;
  coverImage: string;
  createdAt: string;
  isStarter?: boolean;
}

export interface VideoStoryboardScene {
  sceneNumber: number;
  startSec: number;
  endSec: number;
  title: string;
  visualDescription: string;
  cameraMotion: 'zoom-in' | 'pan-right' | 'pan-left' | 'slow-drift';
  caption: string;
}

export interface VideoProject {
  id: string;
  songId?: string;
  title: string;
  dedicatee: string;
  prompt: string;
  visualStyleId: string;
  videoRhythmId?: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
  durationSeconds: number;
  scenes: VideoStoryboardScene[];
  photos: string[];
  showLyrics: boolean;
  createdAt: string;
}

export interface ComposeRequestPayload {
  dedicatee: string;
  occasion: string;
  traits: string;
  genre: GenreOption;
  rhythm: RhythmOption;
  style: StyleOption;
  voice: VoiceOption;
  choir: ChoirOption;
  artist: ArtistOption;
  mood: LyricMoodOption;
  rhymeFlow: RhymeFlowOption;
  bpm: number;
  language: string;
  lyricsOnly?: boolean;
}
