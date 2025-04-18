export function filterTools(tools: Record<string, any>[], toolsConfig: any): Record<string, any> {
    if (!toolsConfig) return tools;
    const filtered = [];
    const allow = toolsConfig.allow?.split(/\s+/) || [];
    const deny = toolsConfig.deny?.split(/\s+/) || [];
    for (const tool of tools) {
        if (allow.length > 0 && !allow.includes(tool.name)) {
            continue;
        }
        if (deny.length > 0 && deny.includes(tool.name)) {
            continue;
        }
        filtered.push(tool);
    }
    return filtered;
}