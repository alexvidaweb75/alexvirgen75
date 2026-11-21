import type { SongProject, VideoProject } from '../types/studio';

const SONGS_KEY = 'sonora_studio_songs_v1';
const VIDEOS_KEY = 'sonora_studio_videos_v1';
const DB_NAME = 'sonora_studio_media';
const STORE_NAME = 'audio_blobs';

function openMediaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveVocalDataUrl(songId: string, dataUrl: string): Promise<void> {
  try {
    const db = await openMediaDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(dataUrl, songId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // IndexedDB unavailable in restricted mode; keep in memory
  }
}

export async function loadVocalDataUrl(songId: string): Promise<string | undefined> {
  try {
    const db = await openMediaDb();
    return await new Promise<string | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(songId);
      req.onsuccess = () => resolve(typeof req.result === 'string' ? req.result : undefined);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return undefined;
  }
}

export function loadSavedSongs(): SongProject[] {
  try {
    const raw = localStorage.getItem(SONGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSongsMetadata(songs: SongProject[]): void {
  try {
    // Strip large base64 vocalAudioUrl from localStorage (stored in IndexedDB instead)
    const compact = songs.map(({ vocalAudioUrl: _omit, ...rest }) => rest);
    localStorage.setItem(SONGS_KEY, JSON.stringify(compact));
  } catch {
    // ignore quota errors
  }
}

export function loadSavedVideos(): VideoProject[] {
  try {
    const raw = localStorage.getItem(VIDEOS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveVideosMetadata(videos: VideoProject[]): void {
  try {
    localStorage.setItem(VIDEOS_KEY, JSON.stringify(videos.slice(0, 20)));
  } catch {
    // ignore quota errors
  }
}
