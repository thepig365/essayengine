import type { TranscriptSegment } from "@/types/engine";

export const TRANSCRIPT_FOLDERS_KEY = "essayengine.transcriptFolders";
export const TRANSCRIPTS_KEY = "essayengine.transcripts";

export type TranscriptFolder = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type SavedTranscript = {
  id: string;
  folderId: string;
  title: string;
  sourceUrl?: string;
  videoId?: string;
  transcriptText: string;
  transcriptSegments?: TranscriptSegment[];
  timestampChaptersText?: string;
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
};

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function makeId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function now(): string {
  return new Date().toISOString();
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function normalizeFolderName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function compareCreatedAt(a: { createdAt: string }, b: { createdAt: string }): number {
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

function ensureDefaultFolder(folders: TranscriptFolder[]): TranscriptFolder[] {
  if (folders.some((folder) => normalizeFolderName(folder.name) === "unsorted")) return folders;
  const timestamp = now();
  const unsorted: TranscriptFolder = {
    id: makeId("folder"),
    name: "Unsorted",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const nextFolders = [unsorted, ...folders];
  writeJson(TRANSCRIPT_FOLDERS_KEY, nextFolders);
  return nextFolders;
}

export function cleanupTranscriptLibrary(): { folders: TranscriptFolder[]; transcripts: SavedTranscript[] } {
  const rawFolders = readJson<TranscriptFolder[]>(TRANSCRIPT_FOLDERS_KEY, []);
  const rawTranscripts = readJson<SavedTranscript[]>(TRANSCRIPTS_KEY, []);
  const timestamp = now();
  const seededFolders = ensureDefaultFolder(rawFolders).map((folder) => ({
    ...folder,
    name: folder.name.trim() || "Untitled Folder",
    createdAt: folder.createdAt || timestamp,
    updatedAt: folder.updatedAt || folder.createdAt || timestamp,
  }));

  const sortedFolders = [...seededFolders].sort(compareCreatedAt);
  const keptByName = new Map<string, TranscriptFolder>();
  const duplicateToKept = new Map<string, string>();

  for (const folder of sortedFolders) {
    const key = normalizeFolderName(folder.name);
    const kept = keptByName.get(key);
    if (kept) {
      duplicateToKept.set(folder.id, kept.id);
    } else {
      keptByName.set(key, folder);
    }
  }

  const folders = Array.from(keptByName.values());
  let unsorted = folders.find((folder) => normalizeFolderName(folder.name) === "unsorted");
  if (!unsorted) {
    unsorted = {
      id: makeId("folder"),
      name: "Unsorted",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    folders.unshift(unsorted);
  }

  const validFolderIds = new Set(folders.map((folder) => folder.id));
  const transcripts = rawTranscripts.map((transcript) => {
    const mappedFolderId = duplicateToKept.get(transcript.folderId) ?? transcript.folderId;
    return {
      ...transcript,
      folderId: validFolderIds.has(mappedFolderId) ? mappedFolderId : unsorted.id,
    };
  });

  folders.sort((a, b) => (normalizeFolderName(a.name) === "unsorted" ? -1 : normalizeFolderName(b.name) === "unsorted" ? 1 : compareCreatedAt(a, b)));
  writeJson(TRANSCRIPT_FOLDERS_KEY, folders);
  writeJson(TRANSCRIPTS_KEY, transcripts);
  return { folders, transcripts };
}

export function getTranscriptFolders(): TranscriptFolder[] {
  return cleanupTranscriptLibrary().folders;
}

export function createTranscriptFolder(name: string): TranscriptFolder {
  const folders = getTranscriptFolders();
  const timestamp = now();
  const trimmedName = name.trim().replace(/\s+/g, " ");
  if (!trimmedName) {
    throw new Error("Folder name is required.");
  }
  if (folders.some((folder) => normalizeFolderName(folder.name) === normalizeFolderName(trimmedName))) {
    throw new Error("Folder name already exists.");
  }
  const folder: TranscriptFolder = {
    id: makeId("folder"),
    name: trimmedName,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  writeJson(TRANSCRIPT_FOLDERS_KEY, [...folders, folder]);
  return folder;
}

export function renameTranscriptFolder(id: string, name: string): TranscriptFolder[] {
  const trimmedName = name.trim().replace(/\s+/g, " ");
  if (!trimmedName) {
    throw new Error("Folder name is required.");
  }
  const currentFolders = getTranscriptFolders();
  const targetFolder = currentFolders.find((folder) => folder.id === id);
  if (!targetFolder) return currentFolders;
  if (normalizeFolderName(targetFolder.name) === "unsorted") {
    throw new Error("Unsorted cannot be renamed.");
  }
  if (currentFolders.some((folder) => folder.id !== id && normalizeFolderName(folder.name) === normalizeFolderName(trimmedName))) {
    throw new Error("Folder name already exists.");
  }
  const folders = currentFolders.map((folder) =>
    folder.id === id ? { ...folder, name: trimmedName, updatedAt: now() } : folder,
  );
  writeJson(TRANSCRIPT_FOLDERS_KEY, folders);
  return folders;
}

export function deleteTranscriptFolder(id: string): TranscriptFolder[] {
  const folders = getTranscriptFolders();
  const targetFolder = folders.find((folder) => folder.id === id);
  if (!targetFolder || normalizeFolderName(targetFolder.name) === "unsorted") {
    return folders;
  }
  const remainingFolders = folders.filter((folder) => folder.id !== id);
  const nextFolders = ensureDefaultFolder(remainingFolders);
  const fallbackFolderId = nextFolders.find((folder) => normalizeFolderName(folder.name) === "unsorted")?.id ?? nextFolders[0].id;
  const transcripts = getTranscripts().map((transcript) =>
    transcript.folderId === id ? { ...transcript, folderId: fallbackFolderId, updatedAt: now() } : transcript,
  );
  writeJson(TRANSCRIPTS_KEY, transcripts);
  writeJson(TRANSCRIPT_FOLDERS_KEY, nextFolders);
  return nextFolders;
}

export function getTranscripts(folderId?: string): SavedTranscript[] {
  const transcripts = readJson<SavedTranscript[]>(TRANSCRIPTS_KEY, []);
  return folderId ? transcripts.filter((transcript) => transcript.folderId === folderId) : transcripts;
}

export function saveTranscript(transcript: Omit<SavedTranscript, "id" | "createdAt" | "updatedAt"> & Partial<Pick<SavedTranscript, "id" | "createdAt" | "updatedAt">>): SavedTranscript {
  const transcripts = getTranscripts();
  const timestamp = now();
  const saved: SavedTranscript = {
    ...transcript,
    id: transcript.id ?? makeId("transcript"),
    title: transcript.title.trim() || "Untitled Transcript",
    createdAt: transcript.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
  const index = transcripts.findIndex((item) => item.id === saved.id);
  if (index >= 0) {
    transcripts[index] = saved;
  } else {
    transcripts.unshift(saved);
  }
  writeJson(TRANSCRIPTS_KEY, transcripts);
  return saved;
}

export function loadTranscript(id: string): SavedTranscript | null {
  return getTranscripts().find((transcript) => transcript.id === id) ?? null;
}

export function deleteTranscript(id: string): SavedTranscript[] {
  const transcripts = getTranscripts().filter((transcript) => transcript.id !== id);
  writeJson(TRANSCRIPTS_KEY, transcripts);
  return transcripts;
}

export function duplicateTranscript(id: string): SavedTranscript | null {
  const transcript = loadTranscript(id);
  if (!transcript) return null;
  return saveTranscript({
    ...transcript,
    id: makeId("transcript"),
    title: `${transcript.title} Copy`,
    createdAt: now(),
  });
}
