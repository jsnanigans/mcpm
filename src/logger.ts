import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_PATH = path.join(__dirname, "../mcpm.log");
let logStream: fs.WriteStream | null = null;

type LogDomain = 'connection' | 'message' | 'tool' | 'error' | 'config';
type LogLevel = 'info' | 'warn' | 'error' | 'debug';
const ENABLED_LEVELS: LogLevel[] = ['info', 'warn', 'error', 'debug'];
const ENABLED_DOMAINS: LogDomain[] = ['connection', 'tool', 'error', 'config'];

function ensureLogStream(): fs.WriteStream {
    if (!logStream) {
        logStream = fs.createWriteStream(LOG_PATH, { flags: "a" });
        logStream.on('error', (err) => {
            console.error('Log stream error:', err);
            logStream = null;
        });
    }
    return logStream;
}

export function log(
    message: string,
    { domain, level = 'info', enabled, agent }: { domain?: LogDomain; level?: LogLevel; enabled?: boolean; agent?: string } = {}
) {
    if (!ENABLED_DOMAINS.includes(domain || 'connection')) return;
    if (!ENABLED_LEVELS.includes(level)) return;
    if (enabled === false) return;
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        level,
        domain: domain || 'connection',
        agent: agent || undefined,
        message: message.trim()
    };
    
    try {
        const stream = ensureLogStream();
        if (stream.writable) {
            stream.write(JSON.stringify(logEntry) + "\n");
        }
    } catch (error) {
        console.error('Failed to write log:', error);
    }
}

export function closeLogStream() {
    if (logStream) {
        logStream.end();
        logStream = null;
    }
}

// Cleanup on process exit
process.on('exit', closeLogStream);
process.on('SIGINT', () => {
    closeLogStream();
    process.exit(0);
});
process.on('SIGTERM', () => {
    closeLogStream();
    process.exit(0);
});