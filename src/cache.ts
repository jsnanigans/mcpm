import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cacheDir = path.join(__dirname, "..");
const cacheFile = path.join(cacheDir, `cache.json`);

if (!fs.existsSync(cacheFile)) {
    fs.writeFileSync(cacheFile, JSON.stringify({}, null, 2));
}

export function loadFullCache() {
    try {
        return JSON.parse(fs.readFileSync(cacheFile, "utf8"));
    } catch (e) {
        console.error(`Error loading cache: ${e}`);
        return {};
    }
}

export function cache(scope: string, mcpKey: string, value: any) {
    try {
        const fullKey = `${mcpKey}-${scope}`;
        const fullCache = loadFullCache() || {};
        fullCache[fullKey] = value;
        fs.writeFileSync(cacheFile, JSON.stringify(fullCache, null, 2));
    } catch (e) {
        console.error(`Error caching ${scope} ${mcpKey}: ${e}`);
    }
}

export function getCache(scope: string, mcpKey: string) {
    try {
        const fullKey = `${mcpKey}-${scope}`;
        const fullCache = loadFullCache() || {};
        return fullCache[fullKey];
    } catch (e) {
        console.error(`Error getting cache ${scope} ${mcpKey}: ${e}`);
        return null;
    }
}
