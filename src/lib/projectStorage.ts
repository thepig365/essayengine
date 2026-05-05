import type {
  EngineResponse,
  EngineTask,
  LLMProvider,
  OutputMode,
  ProviderResult,
  TranscriptSegment,
} from "@/types/engine";

export const PROJECTS_KEY = "essayengine.projects";
export const ACTIVE_PROJECT_KEY = "essayengine.activeProjectId";

export type ResultStatus = "Draft" | "Needs Rewrite" | "Accepted" | "Final";

export type FinalResultSelection = {
  output: string;
  provider?: LLMProvider;
  providerLabel?: string;
  updatedAt: string;
  sourceVersionId?: string;
};

export type SourceVersionOrigin =
  | "manual_input"
  | "transcript_selection"
  | "topic_filter"
  | "timestamp_chapters"
  | "manual_range"
  | "generated_result"
  | "continued_result"
  | "essay_draft";

export type SourceVersion = {
  id: string;
  versionNumber: number;
  label: string;
  origin: SourceVersionOrigin;
  task?: EngineTask;
  provider?: LLMProvider;
  content: string;
  createdAt: string;
  wordCount: number;
  parentVersionId?: string;
};

export type MobileWorkflowStructureSection = {
  id: string;
  label: string;
  purpose: string;
  contentGuidance: string;
  order: number;
};

export type MobileWorkflowStructure = {
  id: string;
  title: string;
  outline: string[];
  angle: string;
  name?: string;
  recommendedReason?: string;
  sections?: MobileWorkflowStructureSection[];
};

export type MobileWorkflowPolishVersion = {
  id: string;
  label: string;
  content: string;
  notes?: string[];
};

export type MobileWorkflowRepurposeOutput = {
  id: string;
  format: string;
  content: string;
  title?: string;
  notes?: string[];
};

export type MobileWorkflowVoiceCapture = {
  type: "voice";
  rawContent: string;
  audioUrl?: string;
  audioMimeType?: string;
  durationSeconds?: number;
  transcribed?: boolean;
  transcriptionText?: string;
  createdAt: string;
  persisted?: boolean;
};

export type MobileWorkflowLinkUse = {
  use: "hook" | "example" | "argument" | "counterpoint" | "ending" | "source" | string;
  explanation: string;
};

export type MobileWorkflowLinkCapture = {
  type: "link";
  url: string;
  sourceTitle: string;
  sourceExcerpt: string;
  extractedSourceText?: string;
  coreIdea: string;
  usefulClaims: string[];
  quotableLines: string[];
  possibleEssayAngles: string[];
  possibleUses: MobileWorkflowLinkUse[];
  readerPainPoints: string[];
  relationToCurrentEssay: string;
  cautions: string[];
  createdAt: string;
};

export type MobileWorkflowState = {
  captureIdea: string;
  voiceCapture?: MobileWorkflowVoiceCapture | null;
  linkCapture?: MobileWorkflowLinkCapture | null;
  coreValue: string;
  clarifyIntent: string;
  clarifyAudience: string;
  clarifyTone: string;
  structures: MobileWorkflowStructure[];
  selectedStructureId: string | null;
  markedParagraphs: number[];
  revisionInstruction: string;
  diagnosis: string[];
  selectedPolishDirections?: string[];
  polishVersions: MobileWorkflowPolishVersion[];
  selectedRepurposeFormats?: string[];
  repurposeOutputs: MobileWorkflowRepurposeOutput[];
};

export type SavedEssayEngineProjectState = {
  sourceText: string;
  sourceType: string;
  sourceVersions: SourceVersion[];
  currentSourceVersionId: string | null;
  finalVersionId: string | null;
  essayDraftTitle: string;
  essayDraftContent: string;
  essayDraftUpdatedAt: string | null;
  transcriptText: string;
  transcriptSegments: TranscriptSegment[];
  selectedRangeStart: string;
  selectedRangeEnd: string;
  task: EngineTask;
  sourceLanguage: string;
  targetLanguage: string;
  tone: string;
  instructionPreset: string;
  customInstruction: string;
  outputMode: OutputMode;
  providers: LLMProvider[];
  generatedOutput: string;
  providerOutputs: ProviderResult[];
  validationWarnings: string[];
  result: EngineResponse | null;
  finalResult: FinalResultSelection | null;
  resultStatus: ResultStatus;
  ttsVoice: string;
  ttsSpeed: number;
  ttsStyle: string;
  mobileWorkflow?: MobileWorkflowState;
};

export type SavedEssayEngineProject = {
  id: string;
  name: string;
  updatedAt: string;
  state: SavedEssayEngineProjectState;
};

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `project-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function defaultState(): SavedEssayEngineProjectState {
  return {
    sourceText: "",
    sourceType: "manual_input",
    sourceVersions: [],
    currentSourceVersionId: null,
    finalVersionId: null,
    essayDraftTitle: "",
    essayDraftContent: "",
    essayDraftUpdatedAt: null,
    transcriptText: "",
    transcriptSegments: [],
    selectedRangeStart: "",
    selectedRangeEnd: "",
    task: "translate",
    sourceLanguage: "",
    targetLanguage: "Chinese Simplified",
    tone: "",
    instructionPreset: "",
    customInstruction: "",
    outputMode: "auto",
    providers: ["openai"],
    generatedOutput: "",
    providerOutputs: [],
    validationWarnings: [],
    result: null,
    finalResult: null,
    resultStatus: "Draft",
    ttsVoice: "echo",
    ttsSpeed: 1,
    ttsStyle: "Default",
    mobileWorkflow: {
      captureIdea: "",
      voiceCapture: null,
      linkCapture: null,
      coreValue: "",
      clarifyIntent: "",
      clarifyAudience: "",
      clarifyTone: "",
      structures: [],
      selectedStructureId: null,
      markedParagraphs: [],
      revisionInstruction: "",
      diagnosis: [],
      selectedPolishDirections: ["More personal", "More direct", "Less AI-sounding"],
      polishVersions: [],
      selectedRepurposeFormats: ["Short post", "Newsletter", "YouTube script"],
      repurposeOutputs: [],
    },
  };
}

export function getProjects(): SavedEssayEngineProject[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(PROJECTS_KEY);
    return raw ? (JSON.parse(raw) as SavedEssayEngineProject[]) : [];
  } catch {
    return [];
  }
}

function writeProjects(projects: SavedEssayEngineProject[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function getActiveProjectId(): string | null {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(ACTIVE_PROJECT_KEY);
}

export function setActiveProjectId(id: string | null) {
  if (!canUseStorage()) return;
  if (id) {
    window.localStorage.setItem(ACTIVE_PROJECT_KEY, id);
  } else {
    window.localStorage.removeItem(ACTIVE_PROJECT_KEY);
  }
}

export function saveProject(project: SavedEssayEngineProject): SavedEssayEngineProject {
  const updatedProject = { ...project, updatedAt: new Date().toISOString() };
  const projects = getProjects();
  const index = projects.findIndex((p) => p.id === updatedProject.id);
  if (index >= 0) {
    projects[index] = updatedProject;
  } else {
    projects.unshift(updatedProject);
  }
  writeProjects(projects);
  setActiveProjectId(updatedProject.id);
  return updatedProject;
}

export function loadProject(id: string): SavedEssayEngineProject | null {
  return getProjects().find((project) => project.id === id) ?? null;
}

export function deleteProject(id: string): SavedEssayEngineProject[] {
  const projects = getProjects().filter((project) => project.id !== id);
  writeProjects(projects);
  if (getActiveProjectId() === id) {
    setActiveProjectId(projects[0]?.id ?? null);
  }
  return projects;
}

export function createProject(name: string): SavedEssayEngineProject {
  const project: SavedEssayEngineProject = {
    id: makeId(),
    name: name.trim() || "Untitled Project",
    updatedAt: new Date().toISOString(),
    state: defaultState(),
  };
  return saveProject(project);
}

export function duplicateProject(id: string): SavedEssayEngineProject | null {
  const project = loadProject(id);
  if (!project) return null;
  return saveProject({
    ...project,
    id: makeId(),
    name: `${project.name} Copy`,
    updatedAt: new Date().toISOString(),
  });
}
