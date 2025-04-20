# mcpm (MCP Manager)

A simple CLI tool to manage MCP servers with ease.

## Features

- Start specified MCP server as a child process.
- Proxy JSON-RPC messages between client (stdin/stdout) and MCP server.
- Filter discovered tools based on allow/deny settings in config.
- Log message metadata and errors to `mcpm.log`.

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/jsnanigans/mcpm.git
cd mcpm
npm install
npm link
```

Create a config file:

```bash
cp mcpm.config.example.json mcpm.config.json
```

Edit the config file to add your MCP servers.

## Usage

```bash
mcpm --mcp-server <serverKey> [--config <configFilePath>] [--enable-logging]
```

- `<serverKey>`: Key of the MCP server defined in your config.
- `<configFilePath>`: Path to a custom config file (optional).
- `--enable-logging`: Enable logging of messages and errors to `mcpm.log`.

## Configuration

Configuration file (`mcpm.config.json`) structure:

```json
{
  "mcpServers": {
    "<serverKey>": {
      "command": "<path/to/mcp-server-binary>",
      "args": ["--flag", "value"],
      "env": {
        "ENV_VAR": "value"
      },
      "logging": false,
      "tools": {
        "allow": "tool1 tool2",
        "deny": "tool3"
      }
    }
  }
}
```

- `allow`: Space-separated list of tools to include (optional).
- `deny`: Space-separated list of tools to exclude (optional).
- `logging` (optional): Boolean. If `true`, enables logging to file for this server.

## Logging

Logging is disabled by default. To enable file logging, pass the `--enable-logging` flag or set `"logging": true` in your server config.
Logs are written to `mcpm.log` in the project root directory.

## Development

Run the proxy locally:

```bash
npm start -- --mcp-server <serverKey>
```

Replace `<serverKey>` with a valid key.
