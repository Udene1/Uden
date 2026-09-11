import type { RuntimeExecutionRequest, RuntimeExecutionResult } from '@ai-work-partner/shared';
import { runLocalCommand, type LocalCommandResult } from './local-command';
import { DurableRuntimeClient } from './runtime-client';

export interface DurableLocalCommand extends RuntimeExecutionRequest {
  workspaceRoot: string;
  cwd: string;
  program: string;
  args?: string[];
  timeoutMs?: number;
  approvalToken?: string;
}

export async function executeDurableLocalCommand(
  client: DurableRuntimeClient,
  request: DurableLocalCommand,
): Promise<RuntimeExecutionResult> {
  await client.authorize(request);
  await client.markInFlight(request);

  try {
    const local: LocalCommandResult = await runLocalCommand({
      workspaceRoot: request.workspaceRoot,
      cwd: request.cwd,
      program: request.program,
      args: request.args,
      timeoutMs: request.timeoutMs,
      approvalToken: request.approvalToken,
    });

    return await client.complete(request, {
      outcome: local.timedOut ? 'timed_out' : local.success ? 'completed' : 'failed',
      exitCode: local.status,
      stdout: local.stdout,
      stderr: local.stderr,
      finishedAt: new Date().toISOString(),
      error: local.success ? undefined : local.stderr || `Command exited with status ${local.status}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    try {
      return await client.complete(request, {
        outcome: 'unknown',
        finishedAt: new Date().toISOString(),
        error: message,
      });
    } catch {
      // The server-side attempt remains in-flight/unknown and is recoverable.
      // Never convert a lost completion acknowledgement into a false failure.
      throw error;
    }
  }
}
