import { spawn } from "child_process";
import { McpConfig } from "./config.js";
import { log } from "./logger.js";

export function startMcpServer(serverKey: string, mcpConfig: McpConfig, agent?: string) {
    const { command, args = [], env = {} } = mcpConfig;
    log(`Starting MCP server: ${serverKey} (Agent: ${agent || "unknown"})`, { domain: 'connection', agent });
    
    try {
        const child = spawn(command, args, {
            stdio: ["pipe", "pipe", "pipe"],
            env: { ...process.env, ...env },
        });
        
        child.on('error', (err) => {
            log(`Failed to start MCP server ${serverKey}: ${err.message}`, { domain: 'error', level: 'error', agent });
            console.error(`Failed to start MCP server '${serverKey}': ${err.message}`);
            console.error(`Command: ${command} ${args.join(' ')}`);
            process.exit(1);
        });
        
        return child;
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        log(`Error spawning MCP server ${serverKey}: ${err.message}`, { domain: 'error', level: 'error', agent });
        throw err;
    }
} 