import { spawn, ChildProcess } from "child_process";
import { Command } from 'commander';
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { handleEditCommand } from "./commands/edit.js";
import { CONFIG_PATH_ABS, loadConfig } from "./config.js";
import { parseJsonRpcMessages, sendJsonRpcMessage } from "./jsonRpcUtils.js";
import { log } from "./logger.js";
import { startMcpServer } from "./serverUtils.js";
import { filterTools } from './tools.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const env = process.env;

const enable_logging = env.MCPM_ENABLE_LOGGING === 'true' || env.MCPM_ENABLE_LOGGING === '1';

export async function runCli() {
    const program = new Command();
    program
        .name('mcpm')
        .description('MCP Manager CLI')
        .version(getVersion(), '--version', 'Show version');

    program
        .command('server list')
        .description('List all configured servers')
        .option('-c, --config <configPath>', 'Path to config file')
        .action((opts) => {
            const config = loadConfig(opts.config);
            const servers = Object.keys(config.mcpServers || {});
            if (servers.length === 0) {
                console.log("No servers configured.");
            } else {
                for (const s of servers) {
                    console.log(s);
                }
            }
        });

    program
        .command('edit [server]')
        .description('Edit server configuration interactively')
        .option('-c, --config <configPath>', 'Path to config file')
        .action(async (server, opts) => {
            await handleEditCommand(server, opts.config);
        });

    program
        .command('config')
        .description('Show the path to the config file')
        .action(() => {
            console.log(CONFIG_PATH_ABS);
        });

    program
        .command('log tail')
        .description('Tail the log file, optionally filter by server')
        .option('-s, --server <name>', 'Filter by server name')
        .action((opts) => {
            const logPath = path.join(path.dirname(CONFIG_PATH_ABS), "mcpm.log");
            if (!fs.existsSync(logPath)) {
                console.error("Log file not found: " + logPath);
                process.exit(1);
            }
            const tailArgs = ["-f", logPath];
            const tail = spawn("tail", tailArgs, { stdio: ["ignore", "pipe", "inherit"] });
            let grep: ChildProcess | null = null;
            
            const cleanup = () => {
                if (grep && !grep.killed) grep.kill();
                if (!tail.killed) tail.kill();
            };
            
            process.on('SIGINT', cleanup);
            process.on('SIGTERM', cleanup);
            
            tail.on('error', (err) => {
                console.error('Error running tail:', err.message);
                cleanup();
                process.exit(1);
            });
            
            if (opts.server) {
                grep = spawn("grep", [opts.server], { stdio: ["pipe", "inherit", "inherit"] });
                grep.on('error', (err) => {
                    console.error('Error running grep:', err.message);
                    cleanup();
                    process.exit(1);
                });
                tail.stdout!.pipe(grep.stdin!);
            } else {
                tail.stdout!.pipe(process.stdout);
            }
            tail.on("close", (code) => {
                cleanup();
                process.exit(code || 0);
            });
        });

    // Default/main usage: mcpm --server <server-key> [--config <config-file-path>] [--enable-logging]
    program
        .option('-s, --server <serverKey>', 'Server key to use')
        .option('-c, --config <configPath>', 'Path to config file')
        .option('--agent <agentName>', 'Agent identifier (e.g., cursor, claude-dk)')
        .option('--enable-logging', 'Enable logging for this session', enable_logging)
        .action(async (opts) => {
            if (!opts.server) {
                program.help({ error: true });
            }
            try {
                const config = loadConfig(opts.config);
                const mcpConfig = config.mcpServers[opts.server];
                if (!mcpConfig) {
                    throw new Error(`MCP server '${opts.server}' not found in config.`);
                }
                const loggingEnabled = opts.enableLogging || mcpConfig.logging;
                const toolsConfig = mcpConfig.tools;
                const child = startMcpServer(opts.server, mcpConfig, opts.agent);
                if (!child.stdin) {
                    throw new Error('Failed to get stdin handle for MCP server');
                }
                if (!child.stdout) {
                    throw new Error('Failed to get stdout handle for MCP server');
                }
                
                parseJsonRpcMessages(process.stdin, (msg: any, raw: string) => {
                    log(`[${opts.server}] CLIENT->MCP: ${raw}`, { enabled: loggingEnabled, domain: 'message', agent: opts.agent });
                    try {
                        sendJsonRpcMessage(child.stdin!, msg);
                    } catch (error) {
                        log(`[${opts.server}] Error sending to MCP: ${error}`, { domain: 'error', agent: opts.agent });
                    }
                });
                parseJsonRpcMessages(child.stdout, (msg: any, raw: string) => {
                    log(`[${opts.server}] MCP->CLIENT: ${raw}`, { enabled: loggingEnabled, domain: 'message', agent: opts.agent });
                    if (msg.result && msg.result.tools && toolsConfig) {
                        msg.result.tools = filterTools(msg.result.tools, toolsConfig);
                    }
                    try {
                        sendJsonRpcMessage(process.stdout, msg);
                    } catch (error) {
                        log(`[${opts.server}] Error sending to client: ${error}`, { domain: 'error', agent: opts.agent });
                    }
                });
                child.stderr.on("data", (chunk: Buffer) => {
                    const errMsg = chunk.toString().trim();
                    log(`[${opts.server}] MCP STDERR: ${errMsg}`, { domain: 'error', agent: opts.agent });
                    process.stderr.write(chunk);
                });
                child.on("exit", (code: number | null, signal: NodeJS.Signals | null) => {
                    log(`[${opts.server}] MCP server exited with code ${code}, signal ${signal}`, { domain: 'connection', agent: opts.agent });
                    process.exit(code || 1);
                });
            } catch (error) {
                if (error instanceof Error) {
                    console.error(`Fatal error: ${error.message}`);
                    log(`Fatal error: ${error.stack}`, { domain: 'error' });
                } else {
                    console.error("Fatal error:", error);
                    log(`Fatal error: ${JSON.stringify(error)}`, { domain: 'error' });
                }
                process.exit(1);
            }
        });

    try {
        await program.parseAsync(process.argv);
    } catch (error) {
        console.error('Command failed:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

function getVersion(): string {
    try {
        const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "../../package.json"), "utf-8"));
        return pkg.version || "0.0.0";
    } catch {
        return "0.0.0";
    }
}
