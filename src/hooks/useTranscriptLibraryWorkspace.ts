"use client";

import { useEffect, useMemo, useState } from "react";
import type { TranscriptSegment } from "@/types/engine";
import {
  cleanupTranscriptLibrary,
  createTranscriptFolder,
  deleteTranscript,
  deleteTranscriptFolder,
  duplicateTranscript,
  getTranscriptFolders,
  renameTranscriptFolder,
  saveTranscript,
  type SavedTranscript,
  type TranscriptFolder,
} from "@/lib/transcriptLibraryStorage";

type FolderFormMode = "idle" | "create" | "rename";

type CurrentTranscriptState = {
  input: string;
  transcriptText: string;
  transcriptSegments: TranscriptSegment[];
  timestampChapterInput: string;
  youtubeSourceUrl: string;
};

type UseTranscriptLibraryWorkspaceParams = {
  currentTranscriptState: () => CurrentTranscriptState;
  applyTranscriptToWorkspace: (transcript: SavedTranscript) => void;
};

const YOUTUBE_RE = /^https?:\/\/(?:(?:www\.|m\.)?youtube\.com\/(?:watch\?[^ ]*v=|shorts\/)|youtu\.be\/)[\w-]{11}/i;

function extractYouTubeVideoId(url: string): string | undefined {
  return (
    url.match(/[?&]v=([\w-]{11})/)?.[1] ??
    url.match(/youtu\.be\/([\w-]{11})/)?.[1] ??
    url.match(/shorts\/([\w-]{11})/)?.[1]
  );
}

function normalizeFolderName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function useTranscriptLibraryWorkspace({
  currentTranscriptState,
  applyTranscriptToWorkspace,
}: UseTranscriptLibraryWorkspaceParams) {
  const [transcriptFolders, setTranscriptFolders] = useState<TranscriptFolder[]>([]);
  const [savedTranscripts, setSavedTranscripts] = useState<SavedTranscript[]>([]);
  const [selectedTranscriptFolderId, setSelectedTranscriptFolderId] = useState("");
  const [newTranscriptFolderName, setNewTranscriptFolderName] = useState("");
  const [folderFormMode, setFolderFormMode] = useState<FolderFormMode>("idle");
  const [folderRenameName, setFolderRenameName] = useState("");
  const [transcriptLibraryTitle, setTranscriptLibraryTitle] = useState("");
  const [selectedTranscriptId, setSelectedTranscriptId] = useState("");
  const [transcriptLibraryStatus, setTranscriptLibraryStatus] = useState<string | null>(null);

  const folderTranscripts = useMemo(
    () => savedTranscripts.filter((transcript) => transcript.folderId === selectedTranscriptFolderId),
    [savedTranscripts, selectedTranscriptFolderId],
  );

  const transcriptFolderCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const transcript of savedTranscripts) {
      counts.set(transcript.folderId, (counts.get(transcript.folderId) ?? 0) + 1);
    }
    return counts;
  }, [savedTranscripts]);

  const selectedTranscriptFolder = transcriptFolders.find((folder) => folder.id === selectedTranscriptFolderId) ?? null;
  const selectedFolderIsUnsorted = selectedTranscriptFolder?.name.trim().toLowerCase() === "unsorted";
  const normalizedNewFolderName = normalizeFolderName(newTranscriptFolderName);
  const normalizedRenameFolderName = normalizeFolderName(folderRenameName);
  const canCreateTranscriptFolder = Boolean(normalizedNewFolderName)
    && !transcriptFolders.some((folder) => normalizeFolderName(folder.name) === normalizedNewFolderName);
  const canRenameTranscriptFolder = Boolean(normalizedRenameFolderName)
    && Boolean(selectedTranscriptFolder)
    && !selectedFolderIsUnsorted
    && !transcriptFolders.some((folder) => folder.id !== selectedTranscriptFolderId && normalizeFolderName(folder.name) === normalizedRenameFolderName);

  function refreshTranscriptLibrary(nextFolderId?: string) {
    const { folders, transcripts } = cleanupTranscriptLibrary();
    const folderId = nextFolderId ?? selectedTranscriptFolderId ?? folders[0]?.id ?? "";
    setTranscriptFolders(folders);
    setSelectedTranscriptFolderId(folders.some((folder) => folder.id === folderId) ? folderId : folders[0]?.id ?? "");
    setSavedTranscripts(transcripts);
  }

  function createLibraryFolder() {
    if (!canCreateTranscriptFolder) {
      setTranscriptLibraryStatus("Enter a unique folder name.");
      return;
    }
    try {
      const folder = createTranscriptFolder(newTranscriptFolderName);
      setNewTranscriptFolderName("");
      setFolderFormMode("idle");
      refreshTranscriptLibrary(folder.id);
      setTranscriptLibraryStatus(`Folder created: ${folder.name}.`);
    } catch (err) {
      setTranscriptLibraryStatus(err instanceof Error ? err.message : "Folder could not be created.");
    }
  }

  function renameCurrentLibraryFolder() {
    if (!selectedTranscriptFolderId || !canRenameTranscriptFolder) {
      setTranscriptLibraryStatus("Enter a unique folder name.");
      return;
    }
    try {
      renameTranscriptFolder(selectedTranscriptFolderId, folderRenameName);
      setFolderRenameName("");
      setFolderFormMode("idle");
      refreshTranscriptLibrary(selectedTranscriptFolderId);
      setTranscriptLibraryStatus("Folder renamed.");
    } catch (err) {
      setTranscriptLibraryStatus(err instanceof Error ? err.message : "Folder could not be renamed.");
    }
  }

  function deleteCurrentLibraryFolder() {
    if (!selectedTranscriptFolderId || selectedFolderIsUnsorted) {
      setTranscriptLibraryStatus("Unsorted cannot be deleted.");
      return;
    }
    if (!window.confirm("Delete this folder? Its transcripts will move to Unsorted.")) return;
    deleteTranscriptFolder(selectedTranscriptFolderId);
    const { folders } = cleanupTranscriptLibrary();
    const unsorted = folders.find((folder) => folder.name.trim().toLowerCase() === "unsorted");
    refreshTranscriptLibrary(unsorted?.id ?? folders[0]?.id);
    setSelectedTranscriptId("");
    setFolderFormMode("idle");
    setTranscriptLibraryStatus("Folder deleted. Transcripts moved to Unsorted.");
  }

  function saveCurrentTranscriptToLibrary() {
    const { input, transcriptText, transcriptSegments, timestampChapterInput, youtubeSourceUrl } = currentTranscriptState();
    if (!transcriptText.trim()) {
      setTranscriptLibraryStatus("Fetch or load a transcript before saving.");
      return;
    }
    const folders = transcriptFolders.length > 0 ? transcriptFolders : getTranscriptFolders();
    const folderId = selectedTranscriptFolderId || folders[0]?.id;
    if (!folderId) {
      setTranscriptLibraryStatus("Create a folder before saving a transcript.");
      return;
    }

    const sourceUrl = youtubeSourceUrl || (YOUTUBE_RE.test(input.trim()) ? input.trim() : undefined);
    const saved = saveTranscript({
      folderId,
      title: transcriptLibraryTitle.trim() || "Untitled Transcript",
      sourceUrl,
      videoId: sourceUrl ? extractYouTubeVideoId(sourceUrl) : undefined,
      transcriptText,
      transcriptSegments,
      timestampChaptersText: timestampChapterInput,
    });
    refreshTranscriptLibrary(folderId);
    setSelectedTranscriptId(saved.id);
    setTranscriptLibraryStatus(`Transcript saved: ${saved.title}.`);
  }

  function loadSelectedLibraryTranscript() {
    if (!selectedTranscriptId) {
      setTranscriptLibraryStatus("Choose a saved transcript to load.");
      return;
    }
    const saved = savedTranscripts.find((transcript) => transcript.id === selectedTranscriptId);
    if (!saved) {
      setTranscriptLibraryStatus("Saved transcript was not found.");
      return;
    }
    applyTranscriptToWorkspace(saved);
    setTranscriptLibraryTitle(saved.title);
    setTranscriptLibraryStatus(`Loaded transcript: ${saved.title}.`);
  }

  function deleteSelectedLibraryTranscript() {
    if (!selectedTranscriptId) {
      setTranscriptLibraryStatus("Choose a saved transcript to delete.");
      return;
    }
    deleteTranscript(selectedTranscriptId);
    refreshTranscriptLibrary(selectedTranscriptFolderId);
    setSelectedTranscriptId("");
    setTranscriptLibraryStatus("Saved transcript deleted.");
  }

  function duplicateSelectedLibraryTranscript() {
    if (!selectedTranscriptId) {
      setTranscriptLibraryStatus("Choose a saved transcript to duplicate.");
      return;
    }
    const duplicated = duplicateTranscript(selectedTranscriptId);
    refreshTranscriptLibrary(selectedTranscriptFolderId);
    if (duplicated) {
      setSelectedTranscriptId(duplicated.id);
      setTranscriptLibraryStatus(`Duplicated transcript: ${duplicated.title}.`);
    }
  }

  useEffect(() => {
    const { folders, transcripts } = cleanupTranscriptLibrary();
    setTranscriptFolders(folders);
    setSelectedTranscriptFolderId(folders[0]?.id ?? "");
    setSavedTranscripts(transcripts);
  }, []);

  return {
    transcriptFolders,
    savedTranscripts,
    selectedTranscriptFolderId,
    setSelectedTranscriptFolderId,
    newTranscriptFolderName,
    setNewTranscriptFolderName,
    folderFormMode,
    setFolderFormMode,
    folderRenameName,
    setFolderRenameName,
    transcriptLibraryTitle,
    setTranscriptLibraryTitle,
    selectedTranscriptId,
    setSelectedTranscriptId,
    transcriptLibraryStatus,
    setTranscriptLibraryStatus,
    folderTranscripts,
    transcriptFolderCounts,
    selectedTranscriptFolder,
    selectedFolderIsUnsorted,
    canCreateTranscriptFolder,
    canRenameTranscriptFolder,
    refreshTranscriptLibrary,
    createLibraryFolder,
    renameCurrentLibraryFolder,
    deleteCurrentLibraryFolder,
    saveCurrentTranscriptToLibrary,
    loadSelectedLibraryTranscript,
    deleteSelectedLibraryTranscript,
    duplicateSelectedLibraryTranscript,
  };
}
