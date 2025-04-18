import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";


// Create server instance
const server = new McpServer({
    name: "mcpm",
    version: "0.0.1",
    capabilities: {
        resources: {},
        tools: {},
    },
});

export default server;