export function filterTools(tools: Record<string, any>[], toolsConfig: any): Record<string, any> {
    if (!toolsConfig) return tools;
    const filtered = [];
    // support array or space-separated string configuration for allow 
    const allowRaw = toolsConfig.allow;
    const allow = Array.isArray(allowRaw)
        ? allowRaw
        : typeof allowRaw === 'string'
            ? allowRaw.split(/\s+/)
            : [];
    for (const tool of tools) {
        if (allow.length > 0 && !allow.includes(tool.name)) {
            continue;
        }
        filtered.push(tool);
    }
    return filtered;
}