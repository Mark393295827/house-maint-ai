import { execFileSync } from 'node:child_process';

const forbiddenPatterns = [
  'coverage/**',
  'output/**',
  'test-results/**',
  'server/data/**',
  'tmp/pdfs/**',
];

const tracked = execFileSync('git', ['ls-files', ...forbiddenPatterns], {
  encoding: 'utf8',
})
  .split(/\r?\n/)
  .filter(Boolean);

if (tracked.length > 0) {
  console.error('Generated or runtime artifacts are tracked:');
  for (const file of tracked) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

console.log('No generated/runtime artifacts are tracked.');
