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
    try {
        const content = fs.readFileSync(pathToUse, "utf-8");
        return JSON.parse(content);
    } catch (error) {
        if (error instanceof SyntaxError) {
            console.error(`Invalid JSON in config file ${pathToUse}: ${error.message}`);
            log(`Invalid JSON in config file: ${error.message}`, { domain: 'error', level: 'error' });
        } else {
            console.error(`Error reading config file ${pathToUse}: ${error}`);
            log(`Error reading config file: ${error}`, { domain: 'error', level: 'error' });
        }
        throw error;
    }
}

export function saveConfig(config: Config, configPath?: string) {
    const pathToUse = configPath || CONFIG_PATH_ABS;
    log(`Saving config to ${pathToUse}`, { domain: 'config' });
    try {
        fs.writeFileSync(pathToUse, JSON.stringify(config, null, 4), "utf-8");
    } catch (error) {
        console.error(`Error writing config file ${pathToUse}: ${error}`);
        log(`Error writing config file: ${error}`, { domain: 'error', level: 'error' });
        throw error;
    }
} 