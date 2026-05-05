"use client";

import { useMemo, useState } from "react";
import type {
  FinalResultSelection,
  MobileWorkflowPolishVersion,
  MobileWorkflowRepurposeOutput,
  MobileWorkflowState,
  MobileWorkflowStructureSection,
  MobileWorkflowStructure,
  MobileWorkflowLinkCapture,
  MobileWorkflowLinkUse,
  MobileWorkflowVoiceCapture,
  SourceVersion,
  SourceVersionOrigin,
} from "@/lib/projectStorage";
import { useVoiceCapture } from "@/hooks/useVoiceCapture";
import type { EngineRequest, EngineResponse, EngineTask, LLMProvider, OutputMode } from "@/types/engine";

type CreateSourceVersionInput = {
  content: string;
  origin: SourceVersionOrigin;
  label: string;
  task?: EngineTask;
  provider?: LLMProvider;
  parentVersionId?: string;
};

type UseMobileWorkflowParams = {
  input: string;
  sourceLanguage: string;
  targetLanguage: string;
  tone: string;
  providers: LLMProvider[];
  currentSourceVersionId: string | null;
  essayDraftContent: string;
  setError: (message: string | null) => void;
  onResult: (result: EngineResponse | null) => void;
  setResultStatus: (status: "Draft" | "Needs Rewrite" | "Accepted" | "Final") => void;
  createSourceVersion: (input: CreateSourceVersionInput) => SourceVersion | null;
  replaceSourceWithCapture: (text: string, status: (message: string) => void) => void;
  replaceEssayDraftDirect: (text: string, message: string) => void;
  setEssayDraftStatus: (message: string | null) => void;
  runTtsAction: (action: "play" | "parts" | "merged", text: string, baseFilename: string, mergedFilename: string) => void;
  setMobileActiveTab: (tab: "source" | "draft" | "result") => void;
};

const DEFAULT_WORKFLOW: MobileWorkflowState = {
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
};

export const POLISH_DIRECTIONS = [
  "More personal",
  "More literary",
  "More direct",
  "More emotional",
  "More concise",
  "More suitable for audio",
  "More suitable for book chapter",
  "More suitable for social post",
  "More like my voice",
  "Less AI-sounding",
];

export const REPURPOSE_FORMATS = [
  "Short post",
  "Newsletter",
  "YouTube script",
  "App daily reflection",
  "Podcast/audio script",
];

function compactText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function countWords(text: string): number {
  return text.trim().match(/[\p{L}\p{N}'-]+/gu)?.length ?? 0;
}

function draftParagraphs(text: string): string[] {
  return text.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
}

async function runEngineRequest(request: EngineRequest): Promise<EngineResponse> {
  const res = await fetch("/api/run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status}).`);
  }
  return data as EngineResponse;
}

type ParsedBodyOutput = {
  title?: string;
  body: string;
  notes: string[];
};

type UnknownRecord = Record<string, unknown>;

type ExtractLinkResponse = {
  url?: string;
  title?: string;
  text?: string;
  excerpt?: string;
  siteName?: string;
  contentType?: "webpage" | "youtube" | "unknown";
  warnings?: string[];
  error?: string;
};

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return [];
}

function extractJsonPayload(raw: string): unknown | null {
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced ?? raw.match(/\{[\s\S]*\}/)?.[0]?.trim();
  if (!candidate) return null;
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function parseBodyOutput(raw: string): ParsedBodyOutput {
  const parsed = extractJsonPayload(raw);
  if (isRecord(parsed)) {
    const title = typeof parsed.title === "string" ? parsed.title.trim() : undefined;
    const body = firstStringField(parsed, ["body", "content", "text", "draft", "essay"]);
    const notes = toStringArray(parsed.notes);
    if (body) return { title, body, notes };
  }
  return { body: raw.trim(), notes: [] };
}

function firstStringField(record: UnknownRecord, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function parsePossibleUses(value: unknown): MobileWorkflowLinkUse[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<MobileWorkflowLinkUse[]>((items, item) => {
    if (typeof item === "string" && item.trim()) {
      items.push({ use: "source", explanation: item.trim() });
      return items;
    }
    if (!isRecord(item)) return items;
    const use = firstStringField(item, ["use", "type", "role"]) || "source";
    const explanation = firstStringField(item, ["explanation", "reason", "description"]);
    if (explanation) items.push({ use, explanation });
    return items;
  }, []);
}

function parseLinkMaterial(raw: string, fallback: Pick<MobileWorkflowLinkCapture, "url" | "sourceTitle" | "sourceExcerpt">): MobileWorkflowLinkCapture {
  const parsed = extractJsonPayload(raw);
  if (isRecord(parsed)) {
    return {
      type: "link",
      ...fallback,
      extractedSourceText: undefined,
      coreIdea: firstStringField(parsed, ["coreIdea", "core", "summary"]),
      usefulClaims: toStringArray(parsed.usefulClaims),
      quotableLines: toStringArray(parsed.quotableLines),
      possibleEssayAngles: toStringArray(parsed.possibleEssayAngles),
      possibleUses: parsePossibleUses(parsed.possibleUses),
      readerPainPoints: toStringArray(parsed.readerPainPoints),
      relationToCurrentEssay: firstStringField(parsed, ["relationToCurrentEssay", "relation", "fit"]),
      cautions: toStringArray(parsed.cautions),
      createdAt: new Date().toISOString(),
    };
  }

  return {
    type: "link",
    ...fallback,
    coreIdea: fallback.sourceExcerpt || "AI extraction was not parseable.",
    usefulClaims: [],
    quotableLines: [],
    possibleEssayAngles: [],
    possibleUses: [{ use: "source", explanation: "Use the extracted excerpt as source material, but review it manually." }],
    readerPainPoints: [],
    relationToCurrentEssay: "",
    cautions: ["AI extraction was not parseable. Review the source manually before drafting."],
    createdAt: new Date().toISOString(),
  };
}

function formatLinkCaptureForCapture(capture: MobileWorkflowLinkCapture): string {
  const sections = [
    `## Link Capture: ${capture.sourceTitle}`,
    `URL: ${capture.url}`,
    capture.coreIdea ? `Core idea: ${capture.coreIdea}` : "",
    capture.usefulClaims.length > 0 ? `Useful claims:\n${capture.usefulClaims.map((item) => `- ${item}`).join("\n")}` : "",
    capture.quotableLines.length > 0 ? `Quotable lines:\n${capture.quotableLines.map((item) => `- ${item}`).join("\n")}` : "",
    capture.possibleEssayAngles.length > 0 ? `Possible essay angles:\n${capture.possibleEssayAngles.map((item) => `- ${item}`).join("\n")}` : "",
    capture.possibleUses.length > 0
      ? `Possible uses:\n${capture.possibleUses.map((item) => `- ${item.use}: ${item.explanation}`).join("\n")}`
      : "",
    capture.readerPainPoints.length > 0 ? `Reader pain points:\n${capture.readerPainPoints.map((item) => `- ${item}`).join("\n")}` : "",
    capture.relationToCurrentEssay ? `Relation to current essay: ${capture.relationToCurrentEssay}` : "",
    capture.cautions.length > 0 ? `Cautions:\n${capture.cautions.map((item) => `- ${item}`).join("\n")}` : "",
    capture.sourceExcerpt ? `Source excerpt:\n${capture.sourceExcerpt}` : "",
  ];
  return sections.filter(Boolean).join("\n\n");
}

function formatStructureOutline(structure: MobileWorkflowStructure): string {
  return [
    structure.title,
    structure.angle,
    structure.recommendedReason ? `Recommended reason: ${structure.recommendedReason}` : "",
    ...structure.outline.map((item, index) => `${index + 1}. ${item}`),
  ].filter(Boolean).join("\n");
}

function makeLocalWorkflowStructures(seed: string): MobileWorkflowStructure[] {
  const topic = seed.replace(/^Core value:\s*/i, "").slice(0, 96);
  return [
    {
      id: "personal",
      title: "Personal Essay",
      name: "Personal Essay",
      angle: "Start with lived experience, then draw out the meaning.",
      recommendedReason: "Best when the idea needs intimacy, scene, and personal change.",
      outline: [`Open with a concrete personal scene: ${topic}`, "Name the tension or problem", "Show the turning point", "End with the practical insight"],
      sections: [
        { id: "hook", label: "Hook", purpose: "Invite the reader into a concrete moment.", contentGuidance: `Open with a specific scene around ${topic}.`, order: 1 },
        { id: "tension", label: "Tension", purpose: "Explain what felt unresolved.", contentGuidance: "Show the question, discomfort, or contradiction behind the idea.", order: 2 },
        { id: "turn", label: "Turn", purpose: "Reveal the change in perspective.", contentGuidance: "Describe what shifted and why it mattered.", order: 3 },
        { id: "landing", label: "Landing", purpose: "Leave the reader with meaning.", contentGuidance: "Close with the insight in practical, human language.", order: 4 },
      ],
    },
    {
      id: "argument",
      title: "Argument Essay",
      name: "Argument Essay",
      angle: "Make a clear claim, then support it with reasoning and examples.",
      recommendedReason: "Best when the idea needs a sharper thesis and persuasive structure.",
      outline: [`State the claim around: ${topic}`, "Support it with evidence, examples, or lived detail", "Address the likely objection", "Finish with a concise takeaway"],
      sections: [
        { id: "claim", label: "Claim", purpose: "Give the essay a clear position.", contentGuidance: `State the main claim about ${topic}.`, order: 1 },
        { id: "proof", label: "Proof", purpose: "Make the claim credible.", contentGuidance: "Add evidence, examples, or lived observations.", order: 2 },
        { id: "objection", label: "Objection", purpose: "Show nuance.", contentGuidance: "Address what a thoughtful reader might question.", order: 3 },
        { id: "takeaway", label: "Takeaway", purpose: "Make the argument useful.", contentGuidance: "Close with what the reader can rethink or do.", order: 4 },
      ],
    },
    {
      id: "reflective",
      title: "Reflective / Poetic Essay",
      name: "Reflective / Poetic Essay",
      angle: "Use rhythm, image, and reflection to carry the idea.",
      recommendedReason: "Best when the idea needs emotional texture and a lyrical pace.",
      outline: ["Begin with an image or mood", "Circle the central question", "Layer reflection with concrete details", "Close on a resonant image or line"],
      sections: [
        { id: "image", label: "Image", purpose: "Set the emotional field.", contentGuidance: "Begin with an image, moment, or sensory detail.", order: 1 },
        { id: "question", label: "Question", purpose: "Give the reflection direction.", contentGuidance: "Name the question the essay circles.", order: 2 },
        { id: "deepening", label: "Deepening", purpose: "Let the meaning unfold.", contentGuidance: "Move between thought, memory, and concrete detail.", order: 3 },
        { id: "echo", label: "Echo", purpose: "End with resonance.", contentGuidance: "Close with a quiet insight or image that lingers.", order: 4 },
      ],
    },
  ];
}

function normalizeStructureId(value: string, fallback: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return normalized || fallback;
}

function parseStructureSections(value: unknown): MobileWorkflowStructureSection[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<MobileWorkflowStructureSection[]>((items, item, index) => {
    if (!isRecord(item)) return items;
    const label = firstStringField(item, ["label", "name", "title"]);
    const purpose = firstStringField(item, ["purpose", "goal"]);
    const contentGuidance = firstStringField(item, ["contentGuidance", "guidance", "content", "description"]);
    if (!label && !purpose && !contentGuidance) return items;
    const orderValue = item.order;
    items.push({
      id: normalizeStructureId(firstStringField(item, ["id", "label"]), `section-${index + 1}`),
      label: label || `Section ${index + 1}`,
      purpose,
      contentGuidance,
      order: typeof orderValue === "number" && Number.isFinite(orderValue) ? orderValue : index + 1,
    });
    return items;
  }, []).sort((a, b) => a.order - b.order);
}

function parseWorkflowStructures(raw: string): { structures: MobileWorkflowStructure[]; recommendedStructureId?: string } | null {
  const parsed = extractJsonPayload(raw);
  if (!isRecord(parsed) || !Array.isArray(parsed.structures)) return null;
  const structures = parsed.structures.reduce<MobileWorkflowStructure[]>((items, item, index) => {
    if (!isRecord(item)) return items;
    const id = normalizeStructureId(firstStringField(item, ["id", "name", "title"]), `structure-${index + 1}`);
    const name = firstStringField(item, ["name", "title"]) || `Structure ${index + 1}`;
    const recommendedReason = firstStringField(item, ["recommendedReason", "reason", "angle"]);
    const sections = parseStructureSections(item.sections);
    const outline = sections.length > 0
      ? sections.map((section) => `${section.label}: ${[section.purpose, section.contentGuidance].filter(Boolean).join(" ")}`.trim())
      : toStringArray(item.outline);
    if (outline.length === 0) return items;
    items.push({
      id,
      title: name,
      name,
      angle: recommendedReason || "AI-generated structure option.",
      recommendedReason,
      outline,
      sections,
    });
    return items;
  }, []);
  if (structures.length === 0) return null;
  const recommendedStructureId = firstStringField(parsed, ["recommendedStructureId", "recommendedId", "selectedStructureId"]);
  return { structures, recommendedStructureId: recommendedStructureId ? normalizeStructureId(recommendedStructureId, "") : undefined };
}

function localDraftDiagnosis(text: string, markedParagraphCount: number): string[] {
  const paragraphs = draftParagraphs(text);
  const words = countWords(text);
  const longParagraphs = paragraphs.filter((paragraph) => countWords(paragraph) > 140).length;
  const genericSignals = (text.match(/\b(?:important|significant|various|moreover|furthermore|in conclusion|it is worth noting)\b/gi) ?? []).length;
  return [
    words < 300 ? "Draft may be too short for a full essay." : "Draft has enough length for a review pass.",
    longParagraphs > 0 ? `${longParagraphs} paragraph(s) may be too dense on mobile.` : "Paragraph length looks readable.",
    genericSignals > 2 ? "Some generic transitions or inflated phrasing may need human cleanup." : "AI-sounding transition density looks low.",
    markedParagraphCount > 0 ? `${markedParagraphCount} paragraph(s) are marked for revision.` : "No paragraphs are marked yet.",
  ];
}

function parseDraftDiagnosis(raw: string): string[] | null {
  const parsed = extractJsonPayload(raw);
  if (!isRecord(parsed)) return null;
  const result: string[] = [];
  const summary = firstStringField(parsed, ["summary", "overall"]);
  if (summary) result.push(`Overall: ${summary}`);

  function appendStringList(label: string, value: unknown) {
    for (const item of toStringArray(value)) {
      result.push(`${label}: ${item}`);
    }
  }

  appendStringList("Top problem", parsed.topProblems);
  appendStringList("Top fix", parsed.topFixes);
  appendStringList("Recommended next action", parsed.recommendedNextAction);

  if (Array.isArray(parsed.paragraphNotes)) {
    for (const note of parsed.paragraphNotes) {
      if (typeof note === "string" && note.trim()) {
        result.push(`Paragraph note: ${note.trim()}`);
        continue;
      }
      if (!isRecord(note)) continue;
      const paragraph = firstStringField(note, ["paragraph", "paragraphNumber", "index"]);
      const observation = firstStringField(note, ["note", "observation", "finding", "issue"]);
      const recommendation = firstStringField(note, ["recommendation", "suggestion", "fix", "action"]);
      const message = [
        paragraph ? `Paragraph ${paragraph}:` : "Paragraph note:",
        observation,
        recommendation ? `Recommendation: ${recommendation}` : "",
      ].filter(Boolean).join(" ");
      if (message.trim()) result.push(message.trim());
    }
  }

  const findings = Array.isArray(parsed.findings)
    ? parsed.findings
    : Array.isArray(parsed.diagnosis)
      ? parsed.diagnosis
      : Array.isArray(parsed.items)
        ? parsed.items
        : [];
  findings.reduce<string[]>((items, item) => {
    if (typeof item === "string" && item.trim()) {
      items.push(item.trim());
      return items;
    }
    if (!isRecord(item)) return items;
    const label = firstStringField(item, ["label", "area", "category", "name"]);
    const finding = firstStringField(item, ["finding", "issue", "observation", "summary"]);
    const recommendation = firstStringField(item, ["recommendation", "suggestion", "fix", "action"]);
    const severity = firstStringField(item, ["severity", "priority"]);
    const message = [
      label ? `${label}:` : "",
      finding,
      recommendation ? `Recommendation: ${recommendation}` : "",
      severity ? `(${severity})` : "",
    ].filter(Boolean).join(" ");
    if (message.trim()) items.push(message.trim());
    return items;
  }, result);
  return result.filter(Boolean);
}

function withParsedOutput(result: EngineResponse, output: string): EngineResponse {
  return { ...result, output };
}

function jsonContract(schema: string): string {
  return [
    "Return only one fenced JSON block.",
    "Do not include markdown prose outside the JSON block.",
    "The JSON must be valid and parseable.",
    "Use this exact shape:",
    "```json",
    schema,
    "```",
  ].join("\n");
}

function parsePolishVersions(raw: string): MobileWorkflowPolishVersion[] {
  const parsed = extractJsonPayload(raw);
  if (isRecord(parsed) && Array.isArray(parsed.versions)) {
    const versions = parsed.versions.reduce<MobileWorkflowPolishVersion[]>((items, item, index) => {
      if (!isRecord(item)) return items;
      const title = typeof item.title === "string" ? item.title.trim() : "";
      const body = firstStringField(item, ["body", "content", "text", "draft", "essay"]);
      const notes = toStringArray(item.notes);
      if (!body) return items;
      const letter = String.fromCharCode(65 + index);
      items.push({
        id: `polish-${letter.toLowerCase()}`,
        label: title ? `Version ${letter}: ${title}` : `Version ${letter}`,
        content: body,
        notes,
      });
      return items;
    }, []);
    if (versions.length > 0) return versions;
  }
  const matches = [...raw.matchAll(/Version\s+([A-C])\s*:\s*([\s\S]*?)(?=Version\s+[A-C]\s*:|$)/gi)];
  if (matches.length === 0) {
    return [{ id: "polish-raw", label: "Generated polish options", content: raw.trim() }];
  }
  return matches.map((match) => {
    const label = `Version ${match[1].toUpperCase()}`;
    const block = match[2].trim();
    const title = block.match(/Title:\s*(.*)/i)?.[1]?.trim();
    return {
      id: `polish-${match[1].toLowerCase()}`,
      label: title ? `${label}: ${title}` : label,
      content: block,
    };
  });
}

function parseRepurposeOutputs(raw: string): MobileWorkflowRepurposeOutput[] {
  const parsed = extractJsonPayload(raw);
  if (isRecord(parsed) && Array.isArray(parsed.outputs)) {
    const outputs = parsed.outputs.reduce<MobileWorkflowRepurposeOutput[]>((items, item, index) => {
      if (!isRecord(item)) return items;
      const format = typeof item.format === "string" ? item.format.trim() : `Output ${index + 1}`;
      const title = typeof item.title === "string" ? item.title.trim() : "";
      const content = firstStringField(item, ["content", "body", "text", "copy", "script"]);
      const notes = toStringArray(item.notes);
      if (!content) return items;
      items.push({
        id: `repurpose-${format.toLowerCase().replace(/[^a-z0-9]+/g, "-") || index + 1}`,
        format,
        title,
        content,
        notes,
      });
      return items;
    }, []);
    if (outputs.length > 0) return outputs;
  }
  const formats = REPURPOSE_FORMATS;
  const outputs: MobileWorkflowRepurposeOutput[] = [];
  for (const format of formats) {
    const escaped = format.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?:^|\\n)(?:#+\\s*)?${escaped}\\s*:?\\s*\\n([\\s\\S]*?)(?=\\n(?:#+\\s*)?(?:${formats.map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\s*:?\\s*\\n|$)`, "i");
    const match = raw.match(re);
    if (match?.[1]?.trim()) {
      outputs.push({ id: `repurpose-${format.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, format, content: match[1].trim() });
    }
  }
  if (outputs.length > 0) return outputs;
  return [{ id: "repurpose-raw", format: "Generated repurpose pack", content: raw.trim() }];
}

export function useMobileWorkflow({
  input,
  sourceLanguage,
  targetLanguage,
  tone,
  providers,
  currentSourceVersionId,
  essayDraftContent,
  setError,
  onResult,
  setResultStatus,
  createSourceVersion,
  replaceSourceWithCapture,
  replaceEssayDraftDirect,
  setEssayDraftStatus,
  runTtsAction,
  setMobileActiveTab,
}: UseMobileWorkflowParams) {
  const [captureIdea, setCaptureIdea] = useState(DEFAULT_WORKFLOW.captureIdea);
  const [coreValue, setCoreValue] = useState(DEFAULT_WORKFLOW.coreValue);
  const [clarifyIntent, setClarifyIntent] = useState(DEFAULT_WORKFLOW.clarifyIntent);
  const [clarifyAudience, setClarifyAudience] = useState(DEFAULT_WORKFLOW.clarifyAudience);
  const [clarifyTone, setClarifyTone] = useState(DEFAULT_WORKFLOW.clarifyTone);
  const [workflowStructures, setWorkflowStructures] = useState<MobileWorkflowStructure[]>([]);
  const [selectedWorkflowStructureId, setSelectedWorkflowStructureId] = useState<string | null>(null);
  const [markedParagraphs, setMarkedParagraphs] = useState<number[]>([]);
  const [revisionInstruction, setRevisionInstruction] = useState("");
  const [workflowDiagnosis, setWorkflowDiagnosis] = useState<string[]>([]);
  const [selectedPolishDirections, setSelectedPolishDirections] = useState<string[]>(DEFAULT_WORKFLOW.selectedPolishDirections ?? []);
  const [polishVersions, setPolishVersions] = useState<MobileWorkflowPolishVersion[]>([]);
  const [selectedRepurposeFormats, setSelectedRepurposeFormats] = useState<string[]>(DEFAULT_WORKFLOW.selectedRepurposeFormats ?? []);
  const [repurposeOutputs, setRepurposeOutputs] = useState<MobileWorkflowRepurposeOutput[]>([]);
  const [mobileWorkflowStatus, setMobileWorkflowStatus] = useState<string | null>(null);
  const [mobileWorkflowBusy, setMobileWorkflowBusy] = useState(false);
  const [voiceCapture, setVoiceCapture] = useState<MobileWorkflowVoiceCapture | null>(null);
  const [linkCaptureUrl, setLinkCaptureUrl] = useState("");
  const [linkCapture, setLinkCapture] = useState<MobileWorkflowLinkCapture | null>(null);
  const voiceRecorder = useVoiceCapture();

  const selectedWorkflowStructure = useMemo(
    () => workflowStructures.find((structure) => structure.id === selectedWorkflowStructureId) ?? null,
    [workflowStructures, selectedWorkflowStructureId],
  );

  const workflowInstruction = useMemo(() => {
    if (!selectedWorkflowStructure) return "";
    return [
      "Use this mobile workflow brief when drafting or revising.",
      `Core value: ${coreValue || captureIdea}`,
      `Intent: ${clarifyIntent || "not specified"}`,
      `Audience: ${clarifyAudience || "not specified"}`,
      `Tone: ${clarifyTone || tone || "not specified"}`,
      `Structure: ${selectedWorkflowStructure.title}`,
      ...selectedWorkflowStructure.outline.map((item, index) => `${index + 1}. ${item}`),
    ].join("\n");
  }, [captureIdea, clarifyAudience, clarifyIntent, clarifyTone, coreValue, selectedWorkflowStructure, tone]);

  function workflowState(): MobileWorkflowState {
    return {
      captureIdea,
      voiceCapture: voiceCapture ? { ...voiceCapture, audioUrl: undefined, persisted: false } : null,
      linkCapture,
      coreValue,
      clarifyIntent,
      clarifyAudience,
      clarifyTone,
      structures: workflowStructures,
      selectedStructureId: selectedWorkflowStructureId,
      markedParagraphs,
      revisionInstruction,
      diagnosis: workflowDiagnosis,
      selectedPolishDirections,
      polishVersions,
      selectedRepurposeFormats,
      repurposeOutputs,
    };
  }

  function applyWorkflowState(state?: MobileWorkflowState) {
    const next = state ?? DEFAULT_WORKFLOW;
    setCaptureIdea(next.captureIdea ?? "");
    setVoiceCapture(next.voiceCapture ? { ...next.voiceCapture, audioUrl: undefined, persisted: false } : null);
    setLinkCapture(next.linkCapture ?? null);
    setLinkCaptureUrl(next.linkCapture?.url ?? "");
    setCoreValue(next.coreValue ?? "");
    setClarifyIntent(next.clarifyIntent ?? "");
    setClarifyAudience(next.clarifyAudience ?? "");
    setClarifyTone(next.clarifyTone ?? "");
    setWorkflowStructures(next.structures ?? []);
    setSelectedWorkflowStructureId(next.selectedStructureId ?? null);
    setMarkedParagraphs(next.markedParagraphs ?? []);
    setRevisionInstruction(next.revisionInstruction ?? "");
    setWorkflowDiagnosis(next.diagnosis ?? []);
    setSelectedPolishDirections(next.selectedPolishDirections ?? DEFAULT_WORKFLOW.selectedPolishDirections ?? []);
    setPolishVersions(next.polishVersions ?? []);
    setSelectedRepurposeFormats(next.selectedRepurposeFormats ?? DEFAULT_WORKFLOW.selectedRepurposeFormats ?? []);
    setRepurposeOutputs(next.repurposeOutputs ?? []);
    setMobileWorkflowStatus(null);
  }

  function togglePolishDirection(direction: string) {
    setSelectedPolishDirections((items) =>
      items.includes(direction) ? items.filter((item) => item !== direction) : [...items, direction],
    );
  }

  function toggleRepurposeFormat(format: string) {
    setSelectedRepurposeFormats((items) =>
      items.includes(format) ? items.filter((item) => item !== format) : [...items, format],
    );
  }

  function resetWorkflow() {
    applyWorkflowState(DEFAULT_WORKFLOW);
  }

  function extractCoreWritingValue() {
    const text = captureIdea.trim();
    if (!text) {
      setMobileWorkflowStatus("Capture an idea first.");
      return;
    }
    const sentences = text.match(/[^.!?。！？]+[.!?。！？]+|[^.!?。！？]+$/g)?.map((item) => item.trim()).filter(Boolean) ?? [text];
    const strongest = sentences.find((sentence) => /because|but|however|why|problem|learned|realized|changed|need|should/i.test(sentence)) ?? sentences[0] ?? text;
    setCoreValue(`Core value: ${compactText(strongest)}`);
    setMobileWorkflowStatus("Core writing value extracted locally. This is a lightweight heuristic.");
  }

  function useCaptureAsSource() {
    const text = captureIdea.trim();
    if (!text) {
      setMobileWorkflowStatus("Capture an idea first.");
      return;
    }
    if (input.trim() && input.trim() !== text && !window.confirm("Replace the current Source with Capture Inbox? The new source will be saved as a source version.")) {
      setMobileWorkflowStatus("Source replace cancelled.");
      return;
    }
    replaceSourceWithCapture(text, setMobileWorkflowStatus);
  }

  function saveVoiceCapture() {
    const snapshot = voiceRecorder.voiceCaptureSnapshot();
    if (!snapshot) {
      setMobileWorkflowStatus("Record a voice note before saving it.");
      return;
    }
    if (voiceCapture?.audioUrl === snapshot.audioUrl) {
      setMobileWorkflowStatus("This voice capture is already saved.");
      return;
    }
    const rawContent = snapshot.transcriptionText?.trim() || "[Voice note recorded - transcription pending]";
    setVoiceCapture({
      type: "voice",
      rawContent,
      audioUrl: snapshot.audioUrl,
      audioMimeType: snapshot.mimeType,
      durationSeconds: snapshot.durationSeconds,
      transcribed: snapshot.transcribed,
      transcriptionText: snapshot.transcriptionText,
      createdAt: snapshot.createdAt,
      persisted: false,
    });
    setCaptureIdea((current) => [current.trim(), rawContent].filter(Boolean).join("\n\n"));
    setMobileWorkflowStatus(
      snapshot.transcribed
        ? "Voice transcript saved as capture text. Audio preview is temporary for this session."
        : "Voice capture saved. Transcription will be added later; audio preview is temporary for this session.",
    );
  }

  function discardVoiceCapture() {
    voiceRecorder.discardVoiceRecording();
    setVoiceCapture(null);
    setMobileWorkflowStatus("Voice capture discarded.");
  }

  async function analyzeLinkCapture() {
    const url = linkCaptureUrl.trim();
    if (!url) {
      setMobileWorkflowStatus("Paste a link first.");
      return;
    }

    setMobileWorkflowBusy(true);
    setError(null);
    setMobileWorkflowStatus("Fetching link and extracting readable text...");
    try {
      const extractResponse = await fetch("/api/extract-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const extracted = (await extractResponse.json().catch(() => null)) as ExtractLinkResponse | null;
      if (!extractResponse.ok) {
        throw new Error(extracted?.error ?? `Link extraction failed (${extractResponse.status}).`);
      }

      const sourceText = (extracted?.text ?? "").trim();
      const sourceExcerpt = (extracted?.excerpt ?? sourceText.slice(0, 600)).trim();
      if (!sourceText && !sourceExcerpt) {
        throw new Error("No readable source material was extracted from this link.");
      }

      setMobileWorkflowStatus("Asking AI to extract useful essay material from the link...");
      const engineResult = await runEngineRequest({
        input: [
          `URL: ${extracted?.url ?? url}`,
          `TITLE: ${extracted?.title ?? "Untitled source"}`,
          `CONTENT TYPE: ${extracted?.contentType ?? "unknown"}`,
          `CURRENT ESSAY CONTEXT: ${captureIdea || input || "(not provided)"}`,
          "",
          "SOURCE TEXT:",
          sourceText || sourceExcerpt,
        ].join("\n"),
        task: "extract",
        outputMode: "content_only",
        sourceLanguage: sourceLanguage || undefined,
        targetLanguage: targetLanguage || "English",
        tone: clarifyTone || tone || undefined,
        providers: providers.length > 0 ? providers : undefined,
        userInstruction: [
          "Extract writing material from this linked source for the Essay Engine guided workflow.",
          "Do not write the essay.",
          "Do not hallucinate claims not supported by the source text.",
          "If the source is weak, thin, promotional, or mostly navigation, say so in cautions.",
          "Identify what the source supports and how it may be useful as a hook, example, argument, counterpoint, ending, or source.",
          "Separate what the source actually says from what the writer might feel or infer.",
          "Prefer concrete claims, images, tensions, and reader pain points over broad inspirational lessons.",
          "If a quotable line is not directly present or tightly grounded in the source, leave it out rather than inventing one.",
          "Cautions should be specific: weak evidence, missing context, thin source text, promotional framing, or claims the essay should not overstate.",
          jsonContract(`{
  "coreIdea": "main idea supported by the source",
  "usefulClaims": ["claim supported by the source"],
  "quotableLines": ["short line from or tightly grounded in the source"],
  "possibleEssayAngles": ["essay angle this source could support"],
  "possibleUses": [
    {
      "use": "hook",
      "explanation": "how to use this source"
    }
  ],
  "readerPainPoints": ["reader concern or tension this source speaks to"],
  "relationToCurrentEssay": "how this source relates to the current capture or essay",
  "cautions": ["limits, weak evidence, missing context, or claims to avoid"]
}`),
        ].join("\n"),
      });

      const parsed = parseLinkMaterial(engineResult.output, {
        url: extracted?.url ?? url,
        sourceTitle: extracted?.title?.trim() || new URL(url).hostname,
        sourceExcerpt,
      });
      setLinkCapture({
        ...parsed,
        extractedSourceText: sourceText.length > 2_000 ? `${sourceText.slice(0, 2_000).trimEnd()}...` : sourceText,
        cautions: [...(extracted?.warnings ?? []), ...parsed.cautions].filter(Boolean),
      });
      setMobileWorkflowStatus("Link analyzed. Review the extracted material, then save it as capture text.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Link analysis failed.";
      setError(message);
      setMobileWorkflowStatus(message);
    } finally {
      setMobileWorkflowBusy(false);
    }
  }

  function saveLinkCapture() {
    if (!linkCapture) {
      setMobileWorkflowStatus("Analyze a link before saving it as capture material.");
      return;
    }
    const content = formatLinkCaptureForCapture(linkCapture);
    setCaptureIdea((current) => {
      if (current.includes(`URL: ${linkCapture.url}`)) return current;
      return [current.trim(), content].filter(Boolean).join("\n\n");
    });
    setCoreValue((current) => current || (linkCapture.coreIdea ? `Core value: ${linkCapture.coreIdea}` : ""));
    setMobileWorkflowStatus("Link material saved as capture text. It can now feed Clarify, Structure, and Draft.");
  }

  async function copyWorkflowText(text: string, successMessage: string) {
    if (!text.trim()) {
      setMobileWorkflowStatus("Nothing to copy.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setMobileWorkflowStatus(successMessage);
    } catch {
      setMobileWorkflowStatus("Copy failed. Select the text manually.");
    }
  }

  function copyLinkCapture() {
    if (!linkCapture) {
      setMobileWorkflowStatus("Analyze a link before copying extracted material.");
      return;
    }
    void copyWorkflowText(formatLinkCaptureForCapture(linkCapture), "Link material copied.");
  }

  function copyVoiceTranscript() {
    void copyWorkflowText(voiceRecorder.transcriptionText, "Voice transcript copied.");
  }

  function copySelectedStructureOutline() {
    if (!selectedWorkflowStructure) {
      setMobileWorkflowStatus("Choose a structure before copying the outline.");
      return;
    }
    void copyWorkflowText(formatStructureOutline(selectedWorkflowStructure), "Selected structure outline copied.");
  }

  function copyDiagnosis() {
    void copyWorkflowText(workflowDiagnosis.map((item, index) => `${index + 1}. ${item}`).join("\n"), "Diagnosis copied.");
  }

  function copyPolishVersion(version: MobileWorkflowPolishVersion) {
    void copyWorkflowText(version.content, `${version.label} copied.`);
  }

  async function createWorkflowStructures() {
    const seed = (coreValue || captureIdea).trim();
    if (!seed) {
      setMobileWorkflowStatus("Capture an idea or extract core value first.");
      return;
    }
    setMobileWorkflowBusy(true);
    setError(null);
    setMobileWorkflowStatus("Generating AI structure options...");
    try {
      const engineResult = await runEngineRequest({
        input: [
          "CAPTURED IDEA:",
          captureIdea || "(not provided)",
          "",
          "EXTRACTED CORE IDEA:",
          coreValue || "(not provided)",
          "",
          "CURRENT SOURCE CONTEXT:",
          input || "(not provided)",
          "",
          `INTENT: ${clarifyIntent || "not specified"}`,
          `AUDIENCE: ${clarifyAudience || "not specified"}`,
          `TONE: ${clarifyTone || tone || "not specified"}`,
          `TARGET LANGUAGE: ${targetLanguage || "English"}`,
        ].join("\n"),
        task: "extract",
        outputMode: "content_only",
        sourceLanguage: sourceLanguage || undefined,
        targetLanguage: targetLanguage || "English",
        tone: clarifyTone || tone || undefined,
        providers: providers.length > 0 ? providers : undefined,
        userInstruction: [
          "Create exactly 3 essay structure options for the guided writing workflow.",
          "The options must be Personal Essay, Argument Essay, and Reflective / Poetic Essay.",
          "Keep section guidance concrete and useful for drafting.",
          "Do not write the essay. Only design the structure.",
          "Each structure must name the core tension, likely reader pain, emotional arc, and a possible closing image through section purpose or contentGuidance.",
          "Do not use generic self-help, productivity, healing-journey, or motivational framing unless the user explicitly asked for it.",
          "Make each section tell the writer what kind of scene, example, claim, turn, or image belongs there.",
          "Recommended reasons should explain why this structure fits the user's specific material, not why the genre is generally useful.",
          jsonContract(`{
  "recommendedStructureId": "personal",
  "structures": [
    {
      "id": "personal",
      "name": "Personal Essay",
      "recommendedReason": "why this structure fits the user's idea",
      "sections": [
        {
          "id": "hook",
          "label": "Hook",
          "purpose": "what this section should achieve",
          "contentGuidance": "what the writer should put here",
          "order": 1
        }
      ]
    },
    {
      "id": "argument",
      "name": "Argument Essay",
      "recommendedReason": "why this structure fits the user's idea",
      "sections": []
    },
    {
      "id": "reflective",
      "name": "Reflective / Poetic Essay",
      "recommendedReason": "why this structure fits the user's idea",
      "sections": []
    }
  ]
}`),
        ].join("\n"),
      });
      const parsed = parseWorkflowStructures(engineResult.output);
      if (!parsed) throw new Error("AI structure response was not parseable.");
      setWorkflowStructures(parsed.structures);
      setSelectedWorkflowStructureId(
        parsed.recommendedStructureId && parsed.structures.some((structure) => structure.id === parsed.recommendedStructureId)
          ? parsed.recommendedStructureId
          : parsed.structures[0].id,
      );
      setMobileWorkflowStatus("AI structure options generated.");
    } catch (err) {
      const fallbackStructures = makeLocalWorkflowStructures(seed);
      setWorkflowStructures(fallbackStructures);
      setSelectedWorkflowStructureId(fallbackStructures[0].id);
      setMobileWorkflowStatus(
        `AI structure generation failed; local fallback structures were used. ${err instanceof Error ? err.message : ""}`.trim(),
      );
    } finally {
      setMobileWorkflowBusy(false);
    }
  }

  async function generateStructuredDraft() {
    const seed = (captureIdea || input).trim();
    if (!seed || !selectedWorkflowStructure) {
      setMobileWorkflowStatus("Capture an idea and choose a structure first.");
      return;
    }
    if (essayDraftContent.trim() && !window.confirm("Generate a structured draft and replace the current Essay Draft? The current draft will be preserved as a source version.")) {
      setMobileWorkflowStatus("Structured draft generation cancelled.");
      return;
    }
    setMobileWorkflowBusy(true);
    setError(null);
    setMobileWorkflowStatus("Generating structured draft with the existing engine...");
    try {
      const engineResult = await runEngineRequest({
        input: seed,
        task: "rewrite",
        outputMode: "content_only",
        sourceLanguage: sourceLanguage || undefined,
        targetLanguage: targetLanguage || "English",
        tone: clarifyTone || tone || undefined,
        providers: providers.length > 0 ? providers : undefined,
        userInstruction: [
          "Write a complete essay draft from this captured idea.",
          coreValue,
          `Intent: ${clarifyIntent || "make the idea clear and useful"}`,
          `Audience: ${clarifyAudience || "general thoughtful readers"}`,
          `Tone: ${clarifyTone || tone || "clear, human, reflective"}`,
          `Use this structure: ${selectedWorkflowStructure.title}`,
          ...selectedWorkflowStructure.outline.map((item, index) => `${index + 1}. ${item}`),
          "Use readable paragraphs.",
          "Preserve the user's voice and core tension. Do not flatten the essay into generic advice.",
          "Open with a concrete scene, image, or felt moment when possible; avoid abstract throat-clearing.",
          "Use specific examples and emotional truth instead of therapy cliches, productivity language, or motivational slogans.",
          "Make the argument/insight clear, but let the essay breathe through scene, contrast, and reflection.",
          "Give the ending a concrete closing image or quiet turn, not a neat lesson.",
          "Avoid phrases like 'in today's fast-paced world', 'it's important to', 'embrace the journey', 'unlock your potential', and similar AI filler.",
          jsonContract(`{
  "title": "short working title",
  "body": "complete draft text with readable paragraphs",
  "notes": ["brief note about how the structure was used"]
}`),
        ].filter(Boolean).join("\n"),
      });
      const parsed = parseBodyOutput(engineResult.output);
      const output = parsed.body.trim();
      onResult(withParsedOutput(engineResult, output));
      if (output) {
        if (essayDraftContent.trim()) {
          createSourceVersion({
            content: essayDraftContent,
            origin: "essay_draft",
            label: "Draft before structured generation",
            parentVersionId: currentSourceVersionId ?? undefined,
          });
        }
        replaceEssayDraftDirect(output, `Structured draft generated: ${selectedWorkflowStructure.title}. Previous draft preserved as a source version if present.`);
        createSourceVersion({
          content: output,
          origin: "generated_result",
          label: `Structured draft: ${selectedWorkflowStructure.title}`,
          task: "rewrite",
          parentVersionId: currentSourceVersionId ?? undefined,
        });
      }
      setResultStatus("Draft");
      setMobileWorkflowStatus("Structured draft generated and placed in Essay Draft.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error.";
      setError(message);
      setMobileWorkflowStatus(message);
    } finally {
      setMobileWorkflowBusy(false);
    }
  }

  function enterListenAndMarkMode() {
    const text = essayDraftContent.trim();
    if (!text) {
      setMobileWorkflowStatus("Create or paste a draft before listening.");
      return;
    }
    runTtsAction("play", text, "essayengine-draft", "essayengine-draft.mp3");
    setMobileActiveTab("draft");
    setMobileWorkflowStatus("Listen mode started. Tap paragraphs to mark revision targets.");
  }

  function toggleDraftParagraphMark(index: number) {
    setMarkedParagraphs((items) => (items.includes(index) ? items.filter((item) => item !== index) : [...items, index].sort((a, b) => a - b)));
  }

  async function reviseMarkedDraft() {
    const paragraphs = draftParagraphs(essayDraftContent);
    if (paragraphs.length === 0) {
      setMobileWorkflowStatus("No draft available to revise.");
      return;
    }
    const marked = markedParagraphs.length > 0 ? markedParagraphs : paragraphs.map((_, index) => index);
    setMobileWorkflowBusy(true);
    setError(null);
    setMobileWorkflowStatus("Revising marked draft with the existing engine...");
    try {
      const engineResult = await runEngineRequest({
        input: [
          "CURRENT DRAFT:",
          essayDraftContent,
          "",
          "CAPTURED IDEA:",
          captureIdea || "(not provided)",
          "",
          "CORE IDEA:",
          coreValue || "(not provided)",
          "",
          `INTENT: ${clarifyIntent || "not specified"}`,
          `AUDIENCE: ${clarifyAudience || "not specified"}`,
          `TONE: ${clarifyTone || tone || "not specified"}`,
          selectedWorkflowStructure ? `STRUCTURE: ${selectedWorkflowStructure.title}\n${selectedWorkflowStructure.outline.map((item, index) => `${index + 1}. ${item}`).join("\n")}` : "",
          "",
          `MARKED PARAGRAPHS: ${marked.map((index) => index + 1).join(", ")}`,
          marked.map((index) => `Paragraph ${index + 1}: ${paragraphs[index] ?? ""}`).join("\n\n"),
        ].join("\n"),
        task: "rewrite",
        outputMode: "content_only",
        sourceLanguage: sourceLanguage || undefined,
        targetLanguage: targetLanguage || "English",
        tone: clarifyTone || tone || undefined,
        providers: providers.length > 0 ? providers : undefined,
        userInstruction: [
          "Revise the draft using the user's marks and instruction.",
          "Do not insert revision notes.",
          "Produce a clean revised draft.",
          "Preserve the original core idea and user voice.",
          "Remove generic AI filler.",
          "Make concrete improvements.",
          "Prioritize the marked paragraphs, but keep the whole draft coherent.",
          "Improve specificity: replace broad claims with scenes, images, examples, or sharper emotional observations.",
          "Remove preachy, therapeutic, or motivational language unless it is clearly the user's own phrasing.",
          "Strengthen the emotional arc and paragraph transitions without over-polishing the voice.",
          "If the draft has a weak ending, land on a concrete image or honest unresolved note instead of a slogan.",
          revisionInstruction ? `User revision instruction: ${revisionInstruction}` : "User revision instruction: improve clarity, rhythm, and specificity.",
          jsonContract(`{
  "title": "short revision title",
  "body": "clean revised draft only, without revision notes inside the draft",
  "notes": ["short summary of concrete changes"]
}`),
        ].join("\n"),
      });
      const parsed = parseBodyOutput(engineResult.output);
      const output = parsed.body.trim();
      onResult(withParsedOutput(engineResult, output));
      if (output) {
        createSourceVersion({
          content: essayDraftContent,
          origin: "essay_draft",
          label: "Draft before AI revision",
          parentVersionId: currentSourceVersionId ?? undefined,
        });
        replaceEssayDraftDirect(output, "AI revision applied to Essay Draft. Previous draft preserved as a source version.");
        createSourceVersion({
          content: output,
          origin: "essay_draft",
          label: "AI revised draft from marks",
          task: "rewrite",
          parentVersionId: currentSourceVersionId ?? undefined,
        });
      }
      setResultStatus("Needs Rewrite");
      setMobileWorkflowStatus("AI revision complete.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error.";
      setError(message);
      setMobileWorkflowStatus(message);
    } finally {
      setMobileWorkflowBusy(false);
    }
  }

  async function diagnoseDraftQuality() {
    const text = essayDraftContent.trim();
    if (!text) {
      setMobileWorkflowStatus("No draft to diagnose.");
      return;
    }
    setMobileWorkflowBusy(true);
    setError(null);
    setMobileWorkflowStatus("Diagnosing draft with the existing engine...");
    try {
      const paragraphs = draftParagraphs(text);
      const engineResult = await runEngineRequest({
        input: [
          "CURRENT DRAFT:",
          text,
          "",
          "CAPTURED IDEA:",
          captureIdea || "(not provided)",
          "",
          "CORE IDEA:",
          coreValue || "(not provided)",
          "",
          `INTENT: ${clarifyIntent || "not specified"}`,
          `AUDIENCE: ${clarifyAudience || "not specified"}`,
          `TONE: ${clarifyTone || tone || "not specified"}`,
          selectedWorkflowStructure ? `STRUCTURE: ${selectedWorkflowStructure.title}\n${selectedWorkflowStructure.outline.map((item, index) => `${index + 1}. ${item}`).join("\n")}` : "",
          markedParagraphs.length > 0 ? `MARKED PARAGRAPHS: ${markedParagraphs.map((index) => index + 1).join(", ")}` : "MARKED PARAGRAPHS: none",
          markedParagraphs.map((index) => `Paragraph ${index + 1}: ${paragraphs[index] ?? ""}`).join("\n\n"),
        ].join("\n"),
        task: "extract",
        outputMode: "content_only",
        sourceLanguage: sourceLanguage || undefined,
        targetLanguage: targetLanguage || "English",
        tone: clarifyTone || tone || undefined,
        providers: providers.length > 0 ? providers : undefined,
        userInstruction: [
          "Diagnose this essay draft for a mobile guided writing workflow.",
          "Do not rewrite the draft.",
          "Focus on clarity, structure, voice, specificity, paragraph density, and next revision actions.",
          "Keep findings concise and directly useful.",
          "Make the diagnosis actionable: identify the problem, why it matters to the reader, and the next concrete edit.",
          "Call out generic AI filler, therapy cliches, vague emotional language, weak scene work, missing examples, unclear core tension, or a flat ending if present.",
          "Avoid bland praise. Mention what works only when it helps the writer know what to preserve.",
          "Recommendations should be specific enough to edit from: add a scene, cut a sentence type, sharpen a claim, reorder a paragraph, or replace a generic line.",
          jsonContract(`{
  "summary": "one sentence overall diagnosis",
  "findings": [
    {
      "label": "Structure",
      "finding": "what is working or weak",
      "recommendation": "specific next action",
      "severity": "low | medium | high"
    }
  ]
}`),
        ].join("\n"),
      });
      const diagnosis = parseDraftDiagnosis(engineResult.output);
      if (!diagnosis || diagnosis.length === 0) throw new Error("AI diagnosis response was not parseable.");
      setWorkflowDiagnosis(diagnosis);
      setMobileWorkflowStatus("AI draft diagnosis completed.");
    } catch (err) {
      setWorkflowDiagnosis(localDraftDiagnosis(text, markedParagraphs.length));
      setMobileWorkflowStatus(
        `AI diagnosis failed; local fallback diagnosis was used. ${err instanceof Error ? err.message : ""}`.trim(),
      );
    } finally {
      setMobileWorkflowBusy(false);
    }
  }

  async function createPolishVersions() {
    const text = essayDraftContent.trim();
    if (!text) {
      setMobileWorkflowStatus("No draft to polish.");
      return;
    }
    const directions = selectedPolishDirections.length > 0 ? selectedPolishDirections : DEFAULT_WORKFLOW.selectedPolishDirections ?? [];
    setMobileWorkflowBusy(true);
    setError(null);
    setMobileWorkflowStatus("Generating polish versions with the existing engine...");
    try {
      const engineResult = await runEngineRequest({
        input: text,
        task: "improve",
        outputMode: "content_only",
        sourceLanguage: sourceLanguage || undefined,
        targetLanguage: targetLanguage || "English",
        tone: clarifyTone || tone || undefined,
        providers: providers.length > 0 ? providers : undefined,
        userInstruction: [
          `Generate 3 alternative polished versions based on these selected directions: ${directions.join(", ")}.`,
          "Do not erase the user's voice.",
          "Do not make the prose sound like generic motivational AI writing.",
          "Preserve the core idea and emotional direction.",
          "Make the three versions meaningfully different in strategy, not just wording.",
          "At least one version should be more intimate and scene-based, one more direct/argumentative, and one more literary or rhythm-focused when compatible with the selected directions.",
          "Do not add unsupported life lessons, therapy cliches, or productivity framing.",
          "Keep concrete images, reader pain, emotional tension, and closing resonance stronger than polish.",
          "Notes must explain when to use each version and what changed in voice, structure, or emotional emphasis.",
          jsonContract(`{
  "versions": [
    {
      "title": "Version A title",
      "body": "complete polished version A",
      "notes": ["what changed and when to use it"]
    },
    {
      "title": "Version B title",
      "body": "complete polished version B",
      "notes": ["what changed and when to use it"]
    },
    {
      "title": "Version C title",
      "body": "complete polished version C",
      "notes": ["what changed and when to use it"]
    }
  ]
}`),
        ].join("\n"),
      });
      const versions = parsePolishVersions(engineResult.output);
      onResult(withParsedOutput(engineResult, versions.map((version) => `${version.label}\n\n${version.content}`).join("\n\n---\n\n")));
      setPolishVersions(versions);
      setMobileWorkflowStatus("AI polish versions generated.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error.";
      setError(message);
      setMobileWorkflowStatus(message);
    } finally {
      setMobileWorkflowBusy(false);
    }
  }

  function usePolishAsDraft(version: MobileWorkflowPolishVersion) {
    if (essayDraftContent.trim() && !window.confirm(`Replace the current Essay Draft with ${version.label}? The current draft will be preserved as a source version.`)) {
      setMobileWorkflowStatus("Polish version selection cancelled.");
      return;
    }
    if (essayDraftContent.trim()) {
      createSourceVersion({
        content: essayDraftContent,
        origin: "essay_draft",
        label: "Draft before polish selection",
        parentVersionId: currentSourceVersionId ?? undefined,
      });
    }
    replaceEssayDraftDirect(version.content, `${version.label} is now the Essay Draft.`);
    createSourceVersion({
      content: version.content,
      origin: "essay_draft",
      label: version.label,
      parentVersionId: currentSourceVersionId ?? undefined,
    });
  }

  async function createRepurposeOutputs() {
    const text = essayDraftContent.trim();
    if (!text) {
      setMobileWorkflowStatus("No draft to repurpose.");
      return;
    }
    const formats = selectedRepurposeFormats.length > 0 ? selectedRepurposeFormats : ["Short post", "Newsletter", "YouTube script"];
    setMobileWorkflowBusy(true);
    setError(null);
    setMobileWorkflowStatus("Generating repurpose outputs with the existing engine...");
    try {
      const engineResult = await runEngineRequest({
        input: text,
        task: "rewrite",
        outputMode: "content_only",
        sourceLanguage: sourceLanguage || undefined,
        targetLanguage: targetLanguage || "English",
        tone: clarifyTone || tone || undefined,
        providers: providers.length > 0 ? providers : undefined,
        userInstruction: [
          "Adapt the draft into the selected formats.",
          "Do not simply summarize.",
          "Preserve the core idea, audience, emotional direction, and useful concrete examples.",
          "Format each output for the selected channel.",
          "Adapt by changing shape, pacing, hook, and call-to-action for the channel; do not compress the essay into generic summary bullets.",
          "Short posts should have a sharp human hook and a clean landing line.",
          "YouTube scripts should include spoken pacing, a hook, segment flow, and natural transitions.",
          "App daily reflections should feel intimate, brief, and usable, with a gentle prompt or closing thought.",
          "Avoid motivational filler and keep the user's emotional truth intact.",
          "Generate these selected formats with a title, content, and notes or suggested use:",
          ...formats,
          jsonContract(`{
  "outputs": [
    {
      "format": "${formats[0] ?? "Short post"}",
      "title": "channel-ready title",
      "content": "adapted content for this format",
      "notes": ["suggested use or publishing note"]
    }
  ]
}`),
        ].join("\n"),
      });
      const outputs = parseRepurposeOutputs(engineResult.output);
      onResult(withParsedOutput(engineResult, outputs.map((output) => `${output.format}${output.title ? `: ${output.title}` : ""}\n\n${output.content}`).join("\n\n---\n\n")));
      setRepurposeOutputs(outputs);
      setMobileWorkflowStatus("AI repurpose outputs generated.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error.";
      setError(message);
      setMobileWorkflowStatus(message);
    } finally {
      setMobileWorkflowBusy(false);
    }
  }

  async function copyRepurposeOutput(output: MobileWorkflowRepurposeOutput) {
    try {
      await navigator.clipboard.writeText(output.content);
      setMobileWorkflowStatus(`${output.format} copied.`);
    } catch {
      setMobileWorkflowStatus("Copy failed. Select the text manually.");
    }
  }

  return {
    captureIdea,
    voiceCapture,
    linkCaptureUrl,
    linkCapture,
    coreValue,
    clarifyIntent,
    clarifyAudience,
    clarifyTone,
    workflowStructures,
    selectedWorkflowStructureId,
    selectedWorkflowStructure,
    markedParagraphs,
    revisionInstruction,
    workflowDiagnosis,
    selectedPolishDirections,
    polishVersions,
    selectedRepurposeFormats,
    repurposeOutputs,
    mobileWorkflowStatus,
    mobileWorkflowBusy,
    voiceRecorder,
    workflowInstruction,
    setCaptureIdea,
    setLinkCaptureUrl,
    setClarifyIntent,
    setClarifyAudience,
    setClarifyTone,
    setSelectedWorkflowStructureId,
    setRevisionInstruction,
    togglePolishDirection,
    toggleRepurposeFormat,
    workflowState,
    applyWorkflowState,
    resetWorkflow,
    extractCoreWritingValue,
    useCaptureAsSource,
    saveVoiceCapture,
    discardVoiceCapture,
    analyzeLinkCapture,
    saveLinkCapture,
    copyLinkCapture,
    copyVoiceTranscript,
    copySelectedStructureOutline,
    copyDiagnosis,
    copyPolishVersion,
    createWorkflowStructures,
    generateStructuredDraft,
    enterListenAndMarkMode,
    toggleDraftParagraphMark,
    reviseMarkedDraft,
    diagnoseDraftQuality,
    createPolishVersions,
    usePolishAsDraft,
    createRepurposeOutputs,
    copyRepurposeOutput,
  };
}
