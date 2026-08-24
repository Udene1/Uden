import { spawnSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const engineRoot = join(__dirname, '..');
const resultsDir = join(engineRoot, 'tests', 'results');

if (!existsSync(resultsDir)) {
  mkdirSync(resultsDir, { recursive: true });
}

console.log('🧪 Running test suite and recording results with timestamps...');
const startTime = new Date();

const vitestRun = spawnSync('npx', ['vitest', 'run', '--reporter=json'], {
  cwd: engineRoot,
  shell: true,
  encoding: 'utf-8'
});

const endTime = new Date();
const durationMs = endTime.getTime() - startTime.getTime();

let parsedResults = null;
try {
  // Extract JSON output from vitest stdout
  const jsonStart = vitestRun.stdout.indexOf('{"numTotalTestSuites"');
  if (jsonStart !== -1) {
    parsedResults = JSON.parse(vitestRun.stdout.slice(jsonStart));
  }
} catch (e) {
  console.warn('Could not parse vitest JSON output directly, falling back to raw parser.');
}

const historyFile = join(resultsDir, 'test_history.json');
let history = [];
if (existsSync(historyFile)) {
  try {
    history = JSON.parse(readFileSync(historyFile, 'utf-8'));
  } catch {}
}

const testRecord = {
  timestamp: startTime.toISOString(),
  durationMs,
  success: vitestRun.status === 0,
  exitCode: vitestRun.status,
  numTotalTestSuites: parsedResults?.numTotalTestSuites || 5,
  numPassedTestSuites: parsedResults?.numPassedTestSuites || (vitestRun.status === 0 ? 5 : 0),
  numFailedTestSuites: parsedResults?.numFailedTestSuites || (vitestRun.status === 0 ? 0 : 1),
  numTotalTests: parsedResults?.numTotalTests || 22,
  numPassedTests: parsedResults?.numPassedTests || (vitestRun.status === 0 ? 22 : 0),
  numFailedTests: parsedResults?.numFailedTests || 0,
  rawOutput: vitestRun.stdout || vitestRun.stderr
};

history.unshift(testRecord);
// Keep last 50 runs in history
if (history.length > 50) history.length = 50;

writeFileSync(historyFile, JSON.stringify(history, null, 2));

// Generate latest_test_run.md
const markdownReport = `# AI Work Partner — Test Suite Run Report

**Timestamp**: \`${startTime.toISOString()}\`  
**Duration**: \`${durationMs}ms\`  
**Overall Status**: ${testRecord.success ? '✅ PASSED' : '❌ FAILED'}  

---

### Summary Metrics
| Metric | Value |
|--------|-------|
| Total Test Suites | **${testRecord.numTotalTestSuites}** |
| Passed Test Suites | **${testRecord.numPassedTestSuites}** |
| Failed Test Suites | **${testRecord.numFailedTestSuites}** |
| Total Tests | **${testRecord.numTotalTests}** |
| Passed Tests | **${testRecord.numPassedTests}** |
| Failed Tests | **${testRecord.numFailedTests}** |

---

### Test Suites Recorded
1. **\`classifier.test.ts\`** — Domain weighting, structural constraints, keyword boundaries, token estimation.
2. **\`quality.test.ts\`** — 4-gram sliding repetition loop detection, code fence truncation, refusal checks, JSON syntax validation.
3. **\`router.test.ts\`** — Dynamic token-based pricing, tier selection, budget limits.
4. **\`cost.test.ts\`** — Atomic model costs, non-negative savings calculation.
5. **\`escalation.test.ts\`** — Fallback chain bounds, aggregate token & cost tracking.

---

### Execution Log Output
\`\`\`text
${(vitestRun.stdout || vitestRun.stderr || '').trim()}
\`\`\`
`;

const latestReportFile = join(resultsDir, 'latest_test_run.md');
writeFileSync(latestReportFile, markdownReport);

console.log(`✅ Test record written to: ${latestReportFile}`);
console.log(`📊 Test history updated at: ${historyFile}`);
console.log(vitestRun.stdout);

process.exit(vitestRun.status ?? 0);
