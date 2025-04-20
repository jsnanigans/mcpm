import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getArgValue, parseArgs } from "./args.js";
import { CONFIG_PATH_ABS, loadConfig } from "./config.js";
import { parseJsonRpcMessages, sendJsonRpcMessage } from "./jsonRpcUtils.js";
import { enableLogging, log } from "./logger.js";
import { startMcpServer } from "./serverUtils.js";
import { filterTools } from "./tools.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function printHelp() {
    console.log(`Usage: mcpm <command> [options]\n\nCommands:\n  server list                List all configured servers\n  config                     Show the path to the config file\n  log tail [--server=NAME]   Tail the log file, optionally filter by server\n  help                       Show this help message\n  --version                  Show version\n\nMain usage:\n  mcpm --server <server-key> [--config <config-file-path>] [--enable-logging]\n`);
}

function printVersion() {
    // Read from package.json
    try {
        const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "../package.json"), "utf-8"));
        console.log(pkg.version);
    } catch {
        console.log("unknown");
    }
}

export function init() {
    const { command, subcommand, flags } = parseArgs();
    // Handle top-level commands
    if (flags["--version"]) {
        printVersion();
        process.exit(0);
    }
    if (command === "help" || flags["--help"]) {
        printHelp();
        process.exit(0);
    }
    if (command === "config") {
        console.log(CONFIG_PATH_ABS);
        process.exit(0);
    }
    if (command === "server" && subcommand === "list") {
        const configPath = flags["--config"] || flags["-c"];
        const config = loadConfig(configPath as string | undefined);
        const servers = Object.keys(config.mcpServers || {});
        if (servers.length === 0) {
            console.log("No servers configured.");
        } else {
            for (const s of servers) {
                console.log(s);
            }
        }
        process.exit(0);
    }
    if (command === "log" && subcommand === "tail") {
        // Optionally filter by server
        const serverName = (flags["--server"] || flags["-s"]) as string | undefined;
        const logPath = path.join(__dirname, "../mcpm.log");
        if (!fs.existsSync(logPath)) {
            console.error("Log file not found: " + logPath);
            process.exit(1);
        }
        // Use spawn for tail -f
        const tailArgs = ["-f", logPath];
        const tail = spawn("tail", tailArgs, { stdio: ["ignore", "pipe", "inherit"] });
        if (serverName) {
            // Filter output by server name
            const grep = spawn("grep", [serverName], { stdio: ["pipe", "inherit", "inherit"] });
            tail.stdout.pipe(grep.stdin);
        } else {
            tail.stdout.pipe(process.stdout);
        }
        // Keep process alive
        tail.on("close", (code) => process.exit(code || 0));
        return;
    }
    // Default: legacy behavior (start server)
    try {
        const configPath = getArgValue(["--config", "-c"]);
        const mcpKey = getArgValue(["--server", "-s"], true);
        const config = loadConfig(configPath);
        const mcpConfig = config.mcpServers[mcpKey];
        if (!mcpConfig) {
            throw new Error(`MCP server '${mcpKey}' not found in config.`);
        }
        // Enable logging if CLI flag or server config enables it
        const enableLoggingFlag = flags["--enable-logging"] === true;
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
