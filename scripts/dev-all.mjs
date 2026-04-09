import { spawn } from 'node:child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function prefixStream(stream, prefix) {
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    const lines = chunk.split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      process.stdout.write(`[${prefix}] ${line}\n`);
    }
  });
}

const children = [
  {
    name: 'FE',
    child: spawn(npmCommand, ['run', 'dev'], {
      stdio: ['inherit', 'pipe', 'pipe'],
      cwd: process.cwd(),
      env: process.env,
      shell: process.platform === 'win32',
    }),
  },
  {
    name: 'BE',
    child: spawn(npmCommand, ['run', 'dev'], {
      stdio: ['inherit', 'pipe', 'pipe'],
      cwd: new URL('../server/', import.meta.url),
      env: process.env,
      shell: process.platform === 'win32',
    }),
  },
];

for (const { name, child } of children) {
  prefixStream(child.stdout, name);
  prefixStream(child.stderr, name);
  child.on('exit', (code, signal) => {
    if (signal) {
      process.stdout.write(`[${name}] exited with signal ${signal}\n`);
      return;
    }
    process.stdout.write(`[${name}] exited with code ${code ?? 0}\n`);
    if (code && code !== 0) {
      shutdown(code);
    }
  });
}

let isShuttingDown = false;

function shutdown(exitCode = 0) {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  for (const { child } of children) {
    if (!child.killed) {
      child.kill('SIGINT');
    }
  }
  setTimeout(() => process.exit(exitCode), 250);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
