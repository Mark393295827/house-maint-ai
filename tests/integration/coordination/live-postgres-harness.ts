import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import type { SqlClient, SqlResult, TransactionalSql } from '../../../packages/persistence/src/runs/types.js';

interface PgClientLike {
    connect(): Promise<void>;
    end(): Promise<void>;
    query<Row = unknown>(text: string, params?: unknown[]): Promise<{ rows: Row[]; rowCount: number | null }>;
}

interface EmbeddedLike {
    initialise(): Promise<void>;
    start(): Promise<void>;
    stop(): Promise<void>;
    createDatabase(name: string): Promise<void>;
    getPgClient(database?: string, host?: string): PgClientLike;
}

type EmbeddedConstructor = new(options: Record<string, unknown>) => EmbeddedLike;

interface WindowsProcess {
    processId: number;
    parentProcessId: number;
    executablePath: string | null;
    commandLine: string | null;
}

export interface ShutdownEvidence {
    root_pid: number;
    tracked_pids: number[];
    exact_fallback_pids: number[];
    library_stop_timed_out: boolean;
    library_stop_error: string | null;
    verified_remaining_pids: number[];
}

export interface HarnessCleanupEvidence {
    shutdowns: ShutdownEvidence[];
    directory_removed: boolean;
}

export const DEFAULT_EMBEDDED_ENTRY = 'C:/tmp/house-maint-pg-harness/node_modules/embedded-postgres/dist/index.js';

async function availablePort(): Promise<number> {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            const port = typeof address === 'object' && address ? address.port : 0;
            server.close((error) => error ? reject(error) : resolve(port));
        });
    });
}

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function runExecutable(file: string, args: string[], timeout = 5_000): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
        execFile(file, args, { windowsHide: true, timeout }, (error, stdout, stderr) => {
            if (error) reject(error);
            else resolve({ stdout, stderr });
        });
    });
}

async function windowsPostgresProcesses(): Promise<WindowsProcess[]> {
    if (process.platform !== 'win32') return [];
    const script = [
        "$ErrorActionPreference='Stop'",
        "$items=@(Get-CimInstance Win32_Process -Filter \"Name = 'postgres.exe'\" | Select-Object @{Name='processId';Expression={[int]$_.ProcessId}},@{Name='parentProcessId';Expression={[int]$_.ParentProcessId}},@{Name='executablePath';Expression={$_.ExecutablePath}},@{Name='commandLine';Expression={$_.CommandLine}})",
        'ConvertTo-Json -InputObject $items -Compress',
    ].join('; ');
    const { stdout } = await runExecutable('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script]);
    const parsed = JSON.parse(stdout.trim() || '[]') as WindowsProcess[] | WindowsProcess;
    return Array.isArray(parsed) ? parsed : [parsed];
}

function normalized(value: string): string {
    return path.resolve(value).replaceAll('\\', '/').toLowerCase();
}

function commandNormalized(value: string | null): string {
    return (value ?? '').replaceAll('\\', '/').toLowerCase();
}

function processTree(records: WindowsProcess[], rootPid: number, knownPids: ReadonlySet<number>): WindowsProcess[] {
    const tree = new Set<number>([rootPid, ...knownPids]);
    let changed = true;
    while (changed) {
        changed = false;
        for (const record of records) {
            if (tree.has(record.parentProcessId) && !tree.has(record.processId)) {
                tree.add(record.processId);
                changed = true;
            }
        }
    }
    return records.filter((record) => tree.has(record.processId));
}

function verifyExactProcesses(
    records: WindowsProcess[],
    rootPid: number,
    postgresExecutable: string,
    databaseDir: string,
): void {
    const executable = normalized(postgresExecutable);
    const dataDirectory = normalized(databaseDir);
    for (const record of records) {
        const command = commandNormalized(record.commandLine);
        const reportedExecutable = record.executablePath ? normalized(record.executablePath) : null;
        if (!command.includes(executable) && reportedExecutable !== executable) {
            throw new Error(`Refusing non-harness PostgreSQL PID ${record.processId}`);
        }
        if (record.processId === rootPid && !command.includes(dataDirectory)) {
            throw new Error(`PostgreSQL root PID ${rootPid} is not bound to ${databaseDir}`);
        }
        if (record.processId !== rootPid && !command.includes('--forkchild=')) {
            throw new Error(`PostgreSQL descendant PID ${record.processId} is not a verified forkchild`);
        }
    }
}

function postmasterIdentity(databaseDir: string, expectedPort: number): { rootPid: number } {
    const file = path.join(databaseDir, 'postmaster.pid');
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    const rootPid = Number(lines[0]);
    const recordedDirectory = normalized(lines[1] ?? '');
    const recordedPort = Number(lines[3]);
    if (!Number.isInteger(rootPid) || rootPid <= 0 || recordedDirectory !== normalized(databaseDir)
        || recordedPort !== expectedPort) {
        throw new Error('postmaster.pid does not match the exact live harness');
    }
    return { rootPid };
}

async function inspectExactTree(
    rootPid: number,
    knownPids: ReadonlySet<number>,
    postgresExecutable: string,
    databaseDir: string,
): Promise<WindowsProcess[]> {
    const records = processTree(await windowsPostgresProcesses(), rootPid, knownPids);
    verifyExactProcesses(records, rootPid, postgresExecutable, databaseDir);
    return records;
}

async function pollExactExit(
    rootPid: number,
    knownPids: ReadonlySet<number>,
    postgresExecutable: string,
    databaseDir: string,
    timeoutMs: number,
): Promise<WindowsProcess[]> {
    const deadline = Date.now() + timeoutMs;
    let remaining: WindowsProcess[] = [];
    do {
        remaining = await inspectExactTree(rootPid, knownPids, postgresExecutable, databaseDir);
        if (remaining.length === 0) return [];
        await wait(100);
    } while (Date.now() < deadline);
    return remaining;
}

async function boundedLibraryStop(embedded: EmbeddedLike, timeoutMs: number): Promise<{
    timedOut: boolean;
    error: string | null;
}> {
    return new Promise((resolve) => {
        let settled = false;
        const finish = (value: { timedOut: boolean; error: string | null }) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve(value);
        };
        const timer = setTimeout(() => finish({ timedOut: true, error: null }), timeoutMs);
        embedded.stop().then(
            () => finish({ timedOut: false, error: null }),
            (error: unknown) => finish({
                timedOut: false,
                error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
            }),
        );
    });
}

async function stopExactWindowsCluster(input: {
    embedded: EmbeddedLike;
    databaseDir: string;
    port: number;
    postgresExecutable: string;
}): Promise<ShutdownEvidence> {
    const { rootPid } = postmasterIdentity(input.databaseDir, input.port);
    const before = await inspectExactTree(rootPid, new Set(), input.postgresExecutable, input.databaseDir);
    if (!before.some((record) => record.processId === rootPid)) {
        throw new Error(`Exact PostgreSQL root PID ${rootPid} was not running before shutdown`);
    }
    const knownPids = new Set(before.map((record) => record.processId));
    const library = await boundedLibraryStop(input.embedded, 10_000);
    let remaining = await pollExactExit(
        rootPid, knownPids, input.postgresExecutable, input.databaseDir, 5_000,
    );
    const fallbackPids: number[] = [];
    if (remaining.length) {
        // Deepest forkchildren are listed first. Every PID was rediscovered as
        // part of the exact root tree and revalidated against the pinned binary.
        for (const process of [...remaining].reverse()) {
            const current = await inspectExactTree(rootPid, knownPids, input.postgresExecutable, input.databaseDir);
            if (!current.some((record) => record.processId === process.processId)) continue;
            try {
                await runExecutable('taskkill.exe', ['/pid', String(process.processId), '/f'], 5_000);
            } catch {
                // A concurrent clean exit is accepted only after the next exact poll.
            }
            fallbackPids.push(process.processId);
        }
        remaining = await pollExactExit(
            rootPid, knownPids, input.postgresExecutable, input.databaseDir, 5_000,
        );
    }
    if (remaining.length) {
        throw new Error(`Exact PostgreSQL PIDs failed to exit: ${remaining.map((item) => item.processId).join(',')}`);
    }
    return {
        root_pid: rootPid,
        tracked_pids: [...knownPids].sort((left, right) => left - right),
        exact_fallback_pids: fallbackPids,
        library_stop_timed_out: library.timedOut,
        library_stop_error: library.error,
        verified_remaining_pids: [],
    };
}

async function removeHarnessDirectory(databaseDir: string): Promise<void> {
    const target = normalized(databaseDir);
    const prefix = normalized('C:/tmp/house-maint-g7-live-');
    if (!target.startsWith(prefix)) throw new Error(`Refusing unexpected cleanup target ${databaseDir}`);
    let lastError: unknown;
    for (let attempt = 1; attempt <= 30; attempt += 1) {
        try {
            fs.rmSync(databaseDir, { recursive: true, force: true });
            if (!fs.existsSync(databaseDir)) return;
        } catch (error) {
            lastError = error;
        }
        await wait(100);
    }
    const detail = lastError instanceof Error ? `${lastError.name}: ${lastError.message}` : String(lastError);
    throw new Error(`Bounded removal failed for exact harness directory: ${detail}`, { cause: lastError });
}

export class LiveSqlDatabase implements TransactionalSql {
    constructor(private readonly clientFactory: () => PgClientLike) {}

    async query<Row = unknown>(text: string, params?: unknown[]): Promise<SqlResult<Row>> {
        const client = this.clientFactory();
        await client.connect();
        try { return await client.query<Row>(text, params); } finally { await client.end(); }
    }

    async withTransaction<T>(work: (client: SqlClient) => Promise<T>): Promise<T> {
        const connection = this.clientFactory();
        await connection.connect();
        try {
            await connection.query('BEGIN');
            const result = await work({ query: (text, params) => connection.query(text, params) });
            await connection.query('COMMIT');
            return result;
        } catch (error) {
            try { await connection.query('ROLLBACK'); } catch { /* preserve the original failure */ }
            throw error;
        } finally {
            await connection.end();
        }
    }
}

export interface LivePostgresHarness {
    databaseDir: string;
    port: number;
    databaseName: string;
    database: LiveSqlDatabase;
    stop(): Promise<void>;
    restart(): Promise<LiveSqlDatabase>;
    cleanup(): Promise<void>;
    cleanupEvidence(): HarnessCleanupEvidence;
}

export async function startLivePostgres(entryPath = DEFAULT_EMBEDDED_ENTRY): Promise<LivePostgresHarness> {
    const imported = await import(/* @vite-ignore */ pathToFileURL(entryPath).href) as { default: EmbeddedConstructor };
    const EmbeddedPostgres = imported.default;
    const databaseDir = fs.mkdtempSync('C:/tmp/house-maint-g7-live-');
    const port = await availablePort();
    const databaseName = 'g7_coordination';
    const postgresExecutable = path.resolve(
        path.dirname(entryPath), '..', '..', '@embedded-postgres', 'windows-x64', 'native', 'bin', 'postgres.exe',
    );
    const options = {
        databaseDir, port, user: 'g7_synthetic', password: 'g7_synthetic_password',
        persistent: true, onLog: () => undefined, onError: () => undefined,
    };
    let embedded = new EmbeddedPostgres(options);
    let stopped = false;
    let directoryRemoved = false;
    const shutdowns: ShutdownEvidence[] = [];
    const databaseFor = (): LiveSqlDatabase => new LiveSqlDatabase(
        () => embedded.getPgClient(databaseName, '127.0.0.1'),
    );
    try {
        await embedded.initialise();
        await embedded.start();
        stopped = false;
        await embedded.createDatabase(databaseName);
    } catch (error) {
        try {
            if (fs.existsSync(path.join(databaseDir, 'postmaster.pid')) && process.platform === 'win32') {
                shutdowns.push(await stopExactWindowsCluster({ embedded, databaseDir, port, postgresExecutable }));
            } else {
                await boundedLibraryStop(embedded, 10_000);
            }
        } catch { /* preserve the initialization failure */ }
        await removeHarnessDirectory(databaseDir);
        directoryRemoved = true;
        throw error;
    }
    const stopCurrent = async (): Promise<void> => {
        if (stopped) return;
        if (process.platform === 'win32') {
            shutdowns.push(await stopExactWindowsCluster({ embedded, databaseDir, port, postgresExecutable }));
        } else {
            const result = await boundedLibraryStop(embedded, 10_000);
            if (result.timedOut || result.error) throw new Error(`Embedded PostgreSQL stop failed: ${result.error ?? 'timeout'}`);
        }
        stopped = true;
    };
    return {
        databaseDir, port, databaseName, database: databaseFor(),
        async stop() {
            await stopCurrent();
        },
        async restart() {
            await stopCurrent();
            embedded = new EmbeddedPostgres(options);
            stopped = false;
            await embedded.start();
            return databaseFor();
        },
        async cleanup() {
            await stopCurrent();
            await removeHarnessDirectory(databaseDir);
            directoryRemoved = !fs.existsSync(databaseDir);
        },
        cleanupEvidence() {
            return {
                shutdowns: structuredClone(shutdowns),
                directory_removed: directoryRemoved,
            };
        },
    };
}

export function readWorkspace(relativePath: string): string {
    return fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}
