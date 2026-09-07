import type { HonoEnv } from '../types';
import type { TaskNode } from '@ai-work-partner/shared';
import { generateCode } from './code-generation';
import { listProjectFiles } from './project-runtime';
import { previewProjectDiff, readProjectFile, type ProjectPatchInput } from './project-context';

export const MAX_GRAPH_REPAIR_ATTEMPTS = 3;
const MAX_GENERATED_PATCH_FILES = 20;
const MAX_GENERATED_PATCH_BYTES = 2_000_000;
const MAX_REPAIR_CONTEXT_BYTES = 180_000;
const MAX_CONTEXT_FILE_BYTES = 30_000;

export interface RepairProposal { attempted: boolean; exhausted: boolean; instruction?: string; generated?: string; files?: ProjectPatchInput[]; reason: string; }

export function canRepair(node: TaskNode): boolean { return node.kind === 'project-tool' && node.tool === 'execute' && (node.repairAttempts || 0) < MAX_GRAPH_REPAIR_ATTEMPTS; }

export function parseRepairPatchDocument(value: string): Array<{ path: string; content: string }> {
  const trimmed = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  let parsed: unknown;
  try { parsed = JSON.parse(trimmed); } catch { throw new Error('Repair model did not return a valid patch document'); }
  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as { files?: unknown }).files)) throw new Error('Repair model must return a files array');
  const files = (parsed as { files: unknown[] }).files;
  if (files.length === 0 || files.length > MAX_GENERATED_PATCH_FILES) throw new Error('Repair patch contains an invalid number of files');
  const result = files.map(entry => {
    if (!entry || typeof entry !== 'object') throw new Error('Repair patch contains an invalid file');
    const file = entry as { path?: unknown; content?: unknown };
    if (typeof file.path !== 'string' || !file.path.trim() || typeof file.content !== 'string') throw new Error('Repair patch file must contain path and content');
    return { path: file.path, content: file.content };
  });
  if (result.reduce((sum, file) => sum + file.content.length, 0) > MAX_GENERATED_PATCH_BYTES) throw new Error('Repair patch exceeds size limit');
  if (new Set(result.map(file => file.path)).size !== result.length) throw new Error('Repair patch contains duplicate paths');
  return result;
}

async function versionPatch(env: HonoEnv['Bindings'], tenantId: string, projectId: string, files: Array<{ path: string; content: string }>): Promise<ProjectPatchInput[]> {
  const versioned: ProjectPatchInput[] = [];
  for (const file of files) {
    try { const current = await readProjectFile(env, tenantId, projectId, file.path); versioned.push({ ...file, expectedVersion: current.version }); }
    catch (error) { if (!(error instanceof Error) || error.message !== 'Project file not found') throw error; versioned.push(file); }
  }
  return versioned;
}

async function buildRepairContext(env: HonoEnv['Bindings'], tenantId: string, projectId: string, node: TaskNode, failure: string): Promise<string> {
  const files = await listProjectFiles(env, tenantId, projectId);
  const failureTerms = `${node.title} ${node.prompt} ${failure}`.toLowerCase().split(/[^a-z0-9_./-]+/).filter(term => term.length >= 4).slice(0, 20);
  const selected = files.filter(file => {
    const path = file.path.toLowerCase();
    return /(^|\/)(package\.json|tsconfig(?:\.[^/]+)?\.json|wrangler\.(?:json|jsonc)|dockerfile|vite\.config\.[^/]+)$/.test(path) || failureTerms.some(term => path.includes(term));
  }).slice(0, 12);
  let context = `Project tree (${files.length} files):\n${files.map(file => `${file.path} [v${file.version}, ${file.content.length} bytes]`).join('\n')}`;
  for (const file of selected) {
    if (context.length >= MAX_REPAIR_CONTEXT_BYTES) break;
    if (file.content.length > MAX_CONTEXT_FILE_BYTES) continue;
    context += `\n\n### ${file.path} (v${file.version})\n${file.content}`;
  }
  return context.slice(0, MAX_REPAIR_CONTEXT_BYTES);
}

export async function buildRepairProposal(env: HonoEnv['Bindings'], tenantId: string, projectId: string, node: TaskNode): Promise<RepairProposal> {
  const attempts = node.repairAttempts || 0;
  if (attempts >= MAX_GRAPH_REPAIR_ATTEMPTS) return { attempted: false, exhausted: true, reason: 'Maximum repair attempts reached' };
  const failure = node.verification?.reason || node.error || 'Runtime verification failed';
  const instruction = [
    'Diagnose and repair the project so the failed execution objective can pass.',
    `Node: ${node.title}`,
    `Requested operation: ${node.prompt}`,
    `Failure: ${failure}`,
    `Repair attempt: ${attempts + 1} of ${MAX_GRAPH_REPAIR_ATTEMPTS}`,
    'Return ONLY JSON in this exact shape: {"files":[{"path":"relative/path","content":"complete file contents"}]}',
    'Return complete replacement file contents, not diffs. Change only files necessary to address the observed failure.',
    'Do not claim tests passed unless they were actually executed.'
  ].join('\n');
  const existingContext = await buildRepairContext(env, tenantId, projectId, node, failure);
  const generated = await generateCode(env, tenantId, { instruction, projectId, language: 'auto-detect', framework: 'existing project', existingContext: `Execution output:\n${node.output || '(none)'}\n\nVerification:\n${failure}\n\n${existingContext}` });
  if (!('output' in generated) || typeof generated.output !== 'string') throw new Error('Code generation did not produce repair output');
  const generatedText = generated.output;
  const files = await versionPatch(env, tenantId, projectId, parseRepairPatchDocument(generatedText));
  return { attempted: true, exhausted: false, instruction, generated: generatedText, files, reason: 'Repair proposal generated with optimistic file versions; it must pass the existing approval gate before mutation' };
}

export async function previewRepairDiff(env: HonoEnv['Bindings'], tenantId: string, projectId: string, path: string, content: string, expectedVersion?: number) { return previewProjectDiff(env, tenantId, projectId, path, content, expectedVersion); }
