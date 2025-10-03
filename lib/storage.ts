import { StoredAudio } from '@/types/storage';

const STORAGE_KEY = 'vorlesen_audios';
const MAX_STORAGE_BYTES = 5 * 1024 * 1024; // 5MB limit
const EVICTION_THRESHOLD = 0.8; // Trigger LRU eviction at 80%

/**
 * Save audio to localStorage with LRU eviction if needed
 */
export function saveAudio(audio: StoredAudio): void {
  const audios = getAllAudios();

  // Update existing or add new
  const existingIndex = audios.findIndex((a) => a.id === audio.id);
  if (existingIndex >= 0) {
    audios[existingIndex] = audio;
  } else {
    audios.push(audio);
  }

  // Check storage capacity and evict if necessary
  let serialized = JSON.stringify(audios);
  let currentSize = new Blob([serialized]).size;

  while (currentSize > MAX_STORAGE_BYTES * EVICTION_THRESHOLD && audios.length > 1) {
    // Find least recently accessed audio
    const lruIndex = audios.reduce(
      (minIdx, curr, idx, arr) =>
        curr.lastAccessedAt < arr[minIdx].lastAccessedAt ? idx : minIdx,
      0
    );

    audios.splice(lruIndex, 1);
    serialized = JSON.stringify(audios);
    currentSize = new Blob([serialized]).size;
  }

  try {
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // QuotaExceededError - try removing items until it fits or give up
    console.warn('localStorage quota exceeded, attempting to free space...');

    while (audios.length > 0) {
      audios.shift(); // Remove oldest
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(audios));
        console.log(`Successfully saved after removing ${audios.length} old audio(s)`);
        return; // Success!
      } catch {
        // Still too big, keep trying
        continue;
      }
    }

    // If we get here, even empty array won't fit - localStorage is completely full
    // Don't throw error, just log warning - storage is optional
    console.warn('Cannot save to localStorage - storage completely full');
  }
}

/**
 * Load a specific audio by ID
 */
export function loadAudio(id: string): StoredAudio | null {
  const audios = getAllAudios();
  const audio = audios.find((a) => a.id === id);

  if (audio) {
    // Update last accessed timestamp
    audio.lastAccessedAt = Date.now();
    saveAudio(audio);
    return audio;
  }

  return null;
}

/**
 * List all stored audios (summary info only)
 */
export function listAudios(): Array<{
  id: string;
  textPreview: string;
  createdAt: number;
  totalDuration: number;
  voice: string;
}> {
  const audios = getAllAudios();

  return audios
    .map((audio) => ({
      id: audio.id,
      textPreview: audio.textPreview,
      createdAt: audio.createdAt,
      totalDuration: audio.totalDuration,
      voice: audio.voice,
    }))
    .sort((a, b) => b.createdAt - a.createdAt); // Most recent first
}

/**
 * Delete a specific audio by ID
 */
export function deleteAudio(id: string): void {
  const audios = getAllAudios();
  const filtered = audios.filter((a) => a.id !== id);

  if (filtered.length === audios.length) {
    return; // Audio not found, nothing to delete
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * Estimate current storage usage in bytes
 */
export function estimateStorageUsage(): number {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return 0;
    return new Blob([data]).size;
  } catch {
    return 0;
  }
}

/**
 * Get storage usage as percentage (0-100)
 */
export function getStoragePercentage(): number {
  const used = estimateStorageUsage();
  return Math.round((used / MAX_STORAGE_BYTES) * 100);
}

/**
 * Clear all stored audios
 */
export function clearAllAudios(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Internal helper to get all audios from localStorage
 */
function getAllAudios(): StoredAudio[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as StoredAudio[];
  } catch (error) {
    console.error('Failed to parse stored audios:', error);
    return [];
  }
}
