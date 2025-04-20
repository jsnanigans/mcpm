import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_PATH = path.join(__dirname, "../mcpm.log");
let logStream = fs.createWriteStream(LOG_PATH, { flags: "a" });

type LogDomain = 'connection' | 'message' | 'tool' | 'error' | 'config';
const ENABLED_DOMAINS: LogDomain[] = ['connection', 'tool', 'error', 'config'];

export function log(message: string, { domain, enabled }: { domain?: LogDomain, enabled?: boolean } = {}) {
    if (!ENABLED_DOMAINS.includes(domain || 'connection')) return;
    if (enabled === false) return;
    const timestamp = new Date().toISOString();
    logStream.write(`[${timestamp}] ${domain ? `[${domain}]` : ''}: ${message.trim()}\n`);
}