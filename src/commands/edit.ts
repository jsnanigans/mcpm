import { checkbox, select } from '@inquirer/prompts';
import { loadConfig, McpConfig, saveConfig } from "../config.js";
import { parseJsonRpcMessages } from "../jsonRpcUtils.js";
import { log } from "../logger.js";
import { startMcpServer } from "../serverUtils.js";

// Fetch all tools from a server config
export async function fetchAllToolsFromServerConfig(mcpConfig: McpConfig): Promise<{ name: string }[]> {
    log(`[fetchAllToolsFromServerConfig] Fetching all tools for cmd: ${mcpConfig.cmd}`);
    return new Promise((resolve, reject) => {
        const child = startMcpServer(mcpConfig);
        let timeout: NodeJS.Timeout | undefined = setTimeout(() => {
            child.kill();
            reject(new Error("Timeout waiting for tools/list response from MCP server"));
        }, 2000);
        const request = {
            jsonrpc: "2.0",
            id: 1,
            method: "tools/list",
            params: { _meta: { progressToken: 1 } }
        };
        let resolved = false;
        parseJsonRpcMessages(child.stdout, (msg: any, raw: string) => {
            if (msg.result && msg.result.tools) {
                if (timeout) clearTimeout(timeout);
                resolved = true;
                child.kill();
                resolve(msg.result.tools.map((t: any) => ({ name: t.name })));
            }
        });
        child.stderr.on("data", (chunk: Buffer) => {
            process.stderr.write(chunk);
        });
        child.on("exit", (code: number | null) => {
            if (!resolved) {
                if (timeout) clearTimeout(timeout);
                reject(new Error(`MCP server exited before responding (code ${code})`));
            }
        });
        child.stdin.write(JSON.stringify(request) + "\n");
    });
}

// Handler for the edit command
export async function handleEditCommand(serverKeyArg?: string, configPath?: string) {
    const config = loadConfig(configPath);
    let serverKey = serverKeyArg;
    const serverKeys = Object.keys(config.mcpServers || {});
    if (serverKeys.length === 0) {
        console.error("No servers configured. Cannot edit.");
        process.exit(1);
    }
    if (!serverKey) {
        serverKey = await select({
            message: 'Select the server configuration to edit:',
            choices: serverKeys.map(key => ({ name: key, value: key }))
        });
    } else if (!config.mcpServers[serverKey]) {
        console.error(`Error: Server key "${serverKey}" not found in configuration.`);
        process.exit(1);
    }
    const serverConfig = config.mcpServers[serverKey];
    if (!serverConfig) {
        console.error(`Error: Could not load configuration for server "${serverKey}".`);
        process.exit(1);
    }
    const section = await select({
        message: `Edit section for server "${serverKey}":`,
        choices: [
            { name: "Tools", value: "tools" },
            { name: "Resources (coming soon)", value: "resources", disabled: true },
            { name: "Prompts (coming soon)", value: "prompts", disabled: true }
        ]
    });
    if (section === "tools") {
        const allTools = await fetchAllToolsFromServerConfig(serverConfig);
        const allToolNames = allTools.map(t => t.name).sort();
        const currentAllowedTools = new Set(serverConfig.tools?.allow || []);
        const selectedTools = await checkbox({
            message: 'Select allowed tools (space to toggle, enter to confirm):',
            choices: allToolNames.map(toolName => ({
                name: toolName,
                value: toolName,
                checked: currentAllowedTools.has(toolName)
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