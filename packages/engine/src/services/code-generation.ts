import type { HonoEnv } from '../types';
import { executeTask } from './executor';

export interface CodeGenerationRequest {
  instruction: string;
  language?: string;
  framework?: string;
  projectId?: string;
  existingContext?: string;
}

const MAX_INSTRUCTION = 30_000;
const MAX_CONTEXT = 50_000;

export async function generateCode(env: HonoEnv['Bindings'], tenantId: string, request: CodeGenerationRequest) {
  if (!request.instruction || typeof request.instruction !== 'string' || !request.instruction.trim()) {
    throw new Error('Code generation instruction is required');
  }
  if (request.instruction.length > MAX_INSTRUCTION) throw new Error(`Code generation instruction must be at most ${MAX_INSTRUCTION} characters`);
  if (request.existingContext && request.existingContext.length > MAX_CONTEXT) throw new Error(`Existing code context must be at most ${MAX_CONTEXT} characters`);

  const language = request.language?.trim().slice(0, 100) || 'unspecified';
  const framework = request.framework?.trim().slice(0, 100) || 'unspecified';
  const context = request.existingContext?.trim() || '(none provided)';
  const prompt = [
    'You are Uden Code Engineer. Generate production-ready code for the requested task.',
    'Return the implementation directly. Do not invent APIs, dependencies, credentials, test results, or files that were not provided.',
    'Preserve existing behavior unless the instruction explicitly requests a change.',
    'Prefer secure, typed, maintainable code. Include necessary imports and error handling.',
    `Language: ${language}`,
    `Framework/runtime: ${framework}`,
    `Existing project context:\n${context}`,
    `Task:\n${request.instruction.trim()}`,
  ].join('\n\n');

  const result = await executeTask(env, tenantId, prompt, true, request.projectId);
  return {
    ...result,
    generatedFor: { language, framework, projectId: request.projectId || null },
  };
}
