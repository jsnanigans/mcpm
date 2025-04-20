import { checkbox, select } from '@inquirer/prompts';
import { loadConfig, McpConfig, saveConfig } from "../config.js";
import { parseJsonRpcMessages } from "../jsonRpcUtils.js";
import { log } from "../logger.js";
import { startMcpServer } from "../serverUtils.js";

// Fetch all tools from a server config
export async function fetchAllToolsFromServerConfig(serverKey: string, mcpConfig: McpConfig): Promise<{ name: string; description: string }[]> {
    log(`[fetchAllToolsFromServerConfig] Fetching all tools for server "${serverKey}" with cmd: ${mcpConfig.command}`, { domain: 'tool' });
    return new Promise((resolve, reject) => {
        const child = startMcpServer(serverKey, mcpConfig);
        let timeout: NodeJS.Timeout | undefined = setTimeout(() => {
            child.kill();
            reject(new Error("Timeout waiting for tools/list response from MCP server"));
        }, 5000);
        const initRequest = { "jsonrpc": "2.0", "id": 0, "method": "initialize", "params": { "protocolVersion": "2024-11-05", "capabilities": { "sampling": {}, "roots": { "listChanged": true } }, "clientInfo": { "name": "mcp-inspector", "version": "0.10.2" } } }
        const toolListRequest = { "jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": { "_meta": { "progressToken": 1 } } };
        const initializedRequest = { "jsonrpc": "2.0", "method": "notifications/initialized" }

        let resolved = false;

        parseJsonRpcMessages(child.stdout, (msg: any, raw: string) => {
            log(`[fetchAllToolsFromServerConfig] Received message: ${JSON.stringify(msg)}`, { domain: 'message' });
            if (msg.result && msg.result.capabilities) {
                child.stdin.write(JSON.stringify(initializedRequest) + "\n");
                child.stdin.write(JSON.stringify(toolListRequest) + "\n");
            }
            if (msg.result && msg.result.tools) {
                if (timeout) clearTimeout(timeout);
                resolved = true;
                log(`[fetchAllToolsFromServerConfig] Found ${msg.result.tools.length} tools`, { domain: 'tool' });
                resolve(msg.result.tools.map((t: any) => ({ name: t.name })));
                child.kill();
            }
        });

        child.stderr.on("data", (chunk: Buffer) => {
            log(`[fetchAllToolsFromServerConfig] MCP server stderr: ${chunk.toString()}`, { domain: 'error' });
            process.stderr.write(chunk);
        });

        child.on("exit", (code: number | null) => {
            if (!resolved) {
                if (timeout) clearTimeout(timeout);
                reject(new Error(`MCP server exited before responding (code ${code})`));
            }
        });

        child.stdin.write(JSON.stringify(initRequest) + "\n");
    });
}

// Handler for the edit command
export async function handleEditCommand(serverKeyArg?: string, configPath?: string) {
    const config = loadConfig(configPath);
    let serverKey = serverKeyArg;
    const serverKeys = Object.keys(config.mcpServers || {});
    if (serverKeys.length === 0) {
        console.error("No servers configured. Cannot edit.");
        throw new Error("No MCP servers configured.");
    }
    if (!serverKey) {
        serverKey = await select({
            message: 'Select the server configuration to edit:',
            choices: serverKeys.map(key => ({ name: key, value: key }))
        });
    } else if (!(serverKey in config.mcpServers)) {
        console.error(`Error: Server key "${serverKey}" not found in configuration.`);
        throw new Error(`Server key '${serverKey}' not found in config.`);
    }
    const serverConfig = config.mcpServers[serverKey];
    if (!serverConfig) {
        console.error(`Error: Could not load configuration for server "${serverKey}".`);
        throw new Error(`Server config for key '${serverKey}' is missing or invalid.`);
    }
    const section = await select({
        message: `Edit section for server "${serverKey}":`,
        choices: [
            { name: "Tools", value: "tools" },
            // { name: "Resources (coming soon)", value: "resources", disabled: true },
            // { name: "Prompts (coming soon)", value: "prompts", disabled: true }
        ]
    });
    if (section === "tools") {
        const allTools = await fetchAllToolsFromServerConfig(serverKey, serverConfig);
        const allToolChoices = allTools.sort((a, b) => a.name.localeCompare(b.name));
        log(`[handleEditCommand] All tools: ${JSON.stringify(allToolChoices)}`, { domain: 'tool' });
        const currentAllowedTools = new Set(serverConfig.tools?.allow || []);
        const selectedTools = await checkbox({
            message: 'Select allowed tools (space to toggle, enter to confirm):',
            choices: allToolChoices.map(toolName => ({
                name: toolName.name,
                description: toolName.description,
                value: toolName.name,
                checked: currentAllowedTools.has(toolName.name)
            })),
            pageSize: 15,
        });
        if (!config.mcpServers[serverKey].tools) {
            config.mcpServers[serverKey].tools = {};
        }
        config.mcpServers[serverKey].tools!.allow = selectedTools.sort();
        saveConfig(config, configPath);
        console.log(`✅ Configuration updated for server "${serverKey}". Allowed tools set to:`);
        console.log(selectedTools.join('\n'));
    } else {
        console.log("Selected section is not implemented yet.");
    }
} 