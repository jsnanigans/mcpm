import { spawn } from "child_process";
import { log } from "./logger.js";

export function startMcpServer(mcpConfig: any) {
    const { command, args = [], env = {} } = mcpConfig;
    log(`Starting MCP server: ${command} ${args.join(" ")}`);
    const child = spawn(command, args, {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, ...env },
    });
    return child;
} 