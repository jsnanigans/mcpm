import { getArgValue } from "./args.js";
import { loadConfig } from "./config.js";
import { parseJsonRpcMessages, sendJsonRpcMessage } from "./jsonRpcUtils.js";
import { enableLogging, log } from "./logger.js";
import { startMcpServer } from "./serverUtils.js";
import { filterTools } from "./tools.js";


export function init() {
    try {
        const configPath = getArgValue(["--config", "-c"]);
        const config = loadConfig(configPath);
        const mcpKey = getArgValue(["--mcp-server", "-m"], true);
        const mcpConfig = config.mcpmServers[mcpKey];
        if (!mcpConfig) {
            throw new Error(`MCP server '${mcpKey}' not found in config.`);
        }
        // Enable logging if CLI flag or server config enables it
        const enableLoggingFlag = process.argv.includes("--enable-logging");
        if (enableLoggingFlag || mcpConfig.logging) {
            enableLogging();
        }
        const toolsConfig = mcpConfig.tools;

        // Start the MCP server as a child process
        const child = startMcpServer(mcpConfig);

        // Proxy JSON-RPC between client and MCP server, filter tools
        parseJsonRpcMessages(process.stdin, (msg: any, raw: string) => {
            log(`[${mcpKey}] CLIENT->MCP: ${raw}`);
            // Forward all client messages to MCP server
            sendJsonRpcMessage(child.stdin, msg);
        });

        parseJsonRpcMessages(child.stdout, (msg: any, raw: string) => {
            log(`[${mcpKey}] MCP->CLIENT: ${raw}`);
            // Intercept capability discovery (tools list)
            if (msg.result && msg.result.tools && toolsConfig) {
                msg.result.tools = filterTools(msg.result.tools, toolsConfig);
            }
            sendJsonRpcMessage(process.stdout, msg);
        });

        child.stderr.on("data", (chunk: Buffer) => {
            const errMsg = chunk.toString().trim();
            log(`[${mcpKey}] MCP STDERR: ${errMsg}`);
            process.stderr.write(chunk);
        });
        child.on("exit", (code: number | null, signal: NodeJS.Signals | null) => {
            console.error(`MCP server exited with code ${code}, signal ${signal}`);
            process.exit(code || 1);
        });
    } catch (error) {
        console.error("Fatal error in main():", error);
        process.exit(1);
    }
}
