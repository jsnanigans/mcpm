import fs from "fs";
import os from "os";
import path from "path";

export const CONFIG_DIR = path.join(os.homedir(), ".config", "mcpm");
export const CONFIG_PATH = path.join(CONFIG_DIR, "mcpm.config.json");
export const DEFAULT_CONFIG = {
    mcpmServers: {}
};

export function loadConfig(configPath?: string) {
    const pathToUse = configPath || CONFIG_PATH;
    const dirToUse = configPath ? path.dirname(pathToUse) : CONFIG_DIR;
    if (!fs.existsSync(dirToUse)) {
        fs.mkdirSync(dirToUse, { recursive: true });
    }
    if (!fs.existsSync(pathToUse)) {
        fs.writeFileSync(pathToUse, JSON.stringify(DEFAULT_CONFIG, null, 4), "utf-8");
        console.error(`Created default config at ${pathToUse}`);
    }
    return JSON.parse(fs.readFileSync(pathToUse, "utf-8"));
} 