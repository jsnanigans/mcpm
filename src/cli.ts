import { spawn } from "child_process";
import { Command } from 'commander';
import fs from "fs";
import path from "path";
import { cache } from './cache.js';
import { handleEditCommand } from "./commands/edit.js";
import { CONFIG_PATH_ABS, loadConfig } from "./config.js";
import { parseJsonRpcMessages, sendJsonRpcMessage } from "./jsonRpcUtils.js";
import { enableLogging, log } from "./logger.js";
import { startMcpServer } from "./serverUtils.js";
import { filterTools } from './tools.js';

export async function runCli() {
    const program = new Command();
    program
        .name('mcpm')
        .description('MCP Manager CLI')
        .version('0.0.0', '--version', 'Show version');

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
            if (opts.server) {
                const grep = spawn("grep", [opts.server], { stdio: ["pipe", "inherit", "inherit"] });
                tail.stdout.pipe(grep.stdin);
            } else {
                tail.stdout.pipe(process.stdout);
            }
            tail.on("close", (code) => process.exit(code || 0));
        });

    // Default/main usage: mcpm --server <server-key> [--config <config-file-path>] [--enable-logging]
    program
        .option('-s, --server <serverKey>', 'Server key to use')
        .option('-c, --config <configPath>', 'Path to config file')
        .option('--enable-logging', 'Enable logging')
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
                if (opts.enableLogging || mcpConfig.logging) {
                    enableLogging();
                }
                const toolsConfig = mcpConfig.tools;
                const child = startMcpServer(mcpConfig);
                parseJsonRpcMessages(process.stdin, (msg: any, raw: string) => {
                    log(`[${opts.server}] CLIENT->MCP: ${raw}`);
                    sendJsonRpcMessage(child.stdin!, msg);
                });
                parseJsonRpcMessages(child.stdout, (msg: any, raw: string) => {
                    log(`[${opts.server}] MCP->CLIENT: ${raw}`);
                    if (msg.result && msg.result.tools && toolsConfig) {
                        cache('tools', opts.server, msg.result.tools);
                        msg.result.tools = filterTools(msg.result.tools, toolsConfig);
                    }
                    sendJsonRpcMessage(process.stdout, msg);
                });
                child.stderr.on("data", (chunk: Buffer) => {
                    const errMsg = chunk.toString().trim();
                    log(`[${opts.server}] MCP STDERR: ${errMsg}`);
                    process.stderr.write(chunk);
                });
                child.on("exit", (code: number | null, signal: NodeJS.Signals | null) => {
                    log(`[${opts.server}] MCP server exited with code ${code}, signal ${signal}`);
                    process.exit(code || 1);
                });
            } catch (error) {
                if (error instanceof Error) {
                    console.error(`Fatal error: ${error.message}`);
                    log(`Fatal error: ${error.stack}`);
                } else {
                    console.error("Fatal error:", error);
                    log(`Fatal error: ${JSON.stringify(error)}`);
                }
                process.exit(1);
            }
        });

    await program.parseAsync(process.argv);
} 