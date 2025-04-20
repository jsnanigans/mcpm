import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { log } from "./logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const CONFIG_DIR = path.join(__dirname, '..');
export const CONFIG_PATH = path.join(CONFIG_DIR, "mcpm.config.json");
export const CONFIG_PATH_ABS = path.resolve(CONFIG_PATH);

export const DEFAULT_CONFIG = {
    mcpServers: {}
};

export interface McpConfig {
    command: string;
    args?: string[];
    env?: Record<string, string>;
    tools?: {
        allow?: string[];
    };
    logging?: boolean;
}

export interface Config {
    mcpServers: Record<string, McpConfig>;
}

export function loadConfig(configPath?: string): Config {
    const pathToUse = configPath || CONFIG_PATH_ABS;
    const dirToUse = configPath ? path.dirname(pathToUse) : CONFIG_DIR;
    log(`Loading config from ${pathToUse}`, { domain: 'config' });
    if (!fs.existsSync(dirToUse)) {
        fs.mkdirSync(dirToUse, { recursive: true });
    }
    if (!fs.existsSync(pathToUse)) {
        fs.writeFileSync(pathToUse, JSON.stringify(DEFAULT_CONFIG, null, 4), "utf-8");
        console.error(`Created default config at ${pathToUse}`);
    }
    return JSON.parse(fs.readFileSync(pathToUse, "utf-8"));
}

export function saveConfig(config: Config, configPath?: string) {
    const pathToUse = configPath || CONFIG_PATH_ABS;
    log(`Saving config to ${pathToUse}`, { domain: 'config' });
    fs.writeFileSync(pathToUse, JSON.stringify(config, null, 4), "utf-8");
} 