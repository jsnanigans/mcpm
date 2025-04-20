import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_PATH = path.join(__dirname, "../mcpm.log");
let logStream: fs.WriteStream | null = null;

export function enableLogging() {
    if (!logStream) {
        logStream = fs.createWriteStream(LOG_PATH, { flags: "a" });
    }
}

export function log(message: string) {
    if (!logStream) return;
    const timestamp = new Date().toISOString();
    logStream.write(`[${timestamp}] ${message}\n`);
}