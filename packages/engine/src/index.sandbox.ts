import { Sandbox } from '@cloudflare/sandbox';
import worker, { AutonomousObjectiveWorkflow } from './index';

// Paid Cloudflare deployment entrypoint. The Free-tier deployment intentionally
// uses ./index directly and does not export the Sandbox container class.
export { Sandbox, AutonomousObjectiveWorkflow };
export default worker;
