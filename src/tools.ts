interface Tool {
    name: string;
    [key: string]: any;
}

interface ToolsConfig {
    allow?: string[] | string;
}

export function filterTools(tools: Tool[], toolsConfig: ToolsConfig | undefined): Tool[] {
    if (!toolsConfig) return tools;
    const filtered: Tool[] = [];
    // support array or space-separated string configuration for allow 
    const allowRaw = toolsConfig.allow;
    const allow = Array.isArray(allowRaw)
        ? allowRaw
        : typeof allowRaw === 'string'
            ? allowRaw.split(/\s+/)
            : [];
    for (const tool of tools) {
        if (allow.length > 0 && tool.name && !allow.includes(tool.name)) {
            continue;
        }
        filtered.push(tool);
    }
    return filtered;
}