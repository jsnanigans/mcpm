import { spawn } from "child_process";
import { McpConfig } from "./config.js";
import { log } from "./logger.js";

export function startMcpServer(serverKey: string, mcpConfig: McpConfig) {
    const { command, args = [], env = {} } = mcpConfig;
    log(`Starting MCP server: ${serverKey}`, { domain: 'connection' });
    const child = spawn(command, args, {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, ...env },
    });
    return child;
} 