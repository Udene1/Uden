import type { HonoEnv } from '../types';
import type { TaskNode } from '@ai-work-partner/shared';
import { generateCode } from './code-generation';
import { previewProjectDiff, readProjectFile, type ProjectPatchInput } from './project-context';

export const MAX_GRAPH_REPAIR_ATTEMPTS = 3;
const MAX_GENERATED_PATCH_FILES = 20;
const MAX_GENERATED_PATCH_BYTES = 2_000_000;

export interface RepairProposal {
  attempted: boolean;
  exhausted: boolean;
  instruction?: string;
  generated?: string;
  files?: ProjectPatchInput[];
  reason: string;
}

export function canRepair(node: TaskNode): boolean {
  return node.kind === 'project-tool' && node.tool === 'execute' && (node.repairAttempts || 0) < MAX_GRAPH_REPAIR_ATTEMPTS;
}

export function parseRepairPatchDocument(value: string): Array<{ path: string; content: string }> {
  const trimmed = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  let parsed: unknown;
  try { parsed = JSON.parse(trimmed); } catch { throw new Error('Repair model did not return a valid patch document'); }
  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as { files?: unknown }).files)) throw new Error('Repair model must return a files array');
  const files = (parsed as { files: unknown[] }).files;
  if (files.length === 0 || files.length > MAX_GENERATED_PATCH_FILES) throw new Error('Repair patch contains an invalid number of files');
  const result = files.map((entry) => {
    if (!entry || typeof entry !== 'object') throw new Error('Repair patch contains an invalid file');
    const file = entry as { path?: unknown; content?: unknown };
    if (typeof file.path !== 'string' || !file.path.trim() || typeof file.content !== 'string') throw new Error('Repair patch file must contain path and content');
    return { path: file.path, content: file.content };
  });
  const bytes = result.reduce((sum, file) => sum + file.content.length, 0);
  if (bytes > MAX_GENERATED_PATCH_BYTES) throw new Error('Repair patch exceeds size limit');
  if (new Set(result.map(file => file.path)).size !== result.length) throw new Error('Repair patch contains duplicate paths');
  return result;
}

async function versionPatch(env: HonoEnv['Bindings'], tenantId: string, projectId: string, files: Array<{ path: string; content: string }>): Promise<ProjectPatchInput[]> {
  const versioned: ProjectPatchInput[] = [];
  for (const file of files) {
    try {
      const current = await readProjectFile(env, tenantId, projectId, file.path);
      versioned.push({ ...file, expectedVersion: current.version });
    } catch (error) {
      if (!(error instanceof Error) || error.message !== 'Project file not found') throw error;
      versioned.push(file);
    }
  }
  return versioned;
}

export async function buildRepairProposal(
  env: HonoEnv['Bindings'],
  tenantId: string,
  projectId: string,
  node: TaskNode,
): Promise<RepairProposal> {
  const attempts = node.repairAttempts || 0;
  if (attempts >= MAX_GRAPH_REPAIR_ATTEMPTS) return { attempted: false, exhausted: true, reason: 'Maximum repair attempts reached' };
  const failure = node.verification?.reason || node.error || 'Runtime verification failed';
  const instruction = [
    'Diagnose and repair the project so the failed execution objective can pass.',
    `Node: ${node.title}`,
    `Requested operation: ${node.prompt}`,
    `Failure: ${failure}`,
    `Repair attempt: ${attempts + 1} of ${MAX_GRAPH_REPAIR_ATTEMPTS}`,
    'Return ONLY JSON in this exact shape: {"files":[{"path":"relative/path","content":"complete file contents"}]}.',
    'Return complete replacement file contents, not diffs. Change only files necessary to address the observed failure.',
    'Do not claim tests passed unless they were actually executed.',
  ].join('\n');
  const generated = await generateCode(env, tenantId, {
    instruction,
    projectId,
    language: 'auto-detect',
    framework: 'existing project',
    existingContext: `Execution output:\n${node.output || '(none)'}\n\nVerification:\n${failure}`,
  });
  const generatedText = typeof generated.result === 'string' ? generated.result : JSON.stringify(generated.result);
  const files = await versionPatch(env, tenantId, projectId, parseRepairPatchDocument(generatedText));
  return {
    attempted: true,
    exhausted: false,
    instruction,
    generated: generatedText,
    files,
    reason: 'Repair proposal generated with optimistic file versions; it must pass the existing approval gate before mutation',
  };
}

export async function previewRepairDiff(env: HonoEnv['Bindings'], tenantId: string, projectId: string, path: string, content: string, expectedVersion?: number) {
  return previewProjectDiff(env, tenantId, projectId, path, content, expectedVersion);
}
