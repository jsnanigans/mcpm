# mcpm (MCP Manager)

A simple CLI tool to manage MCP servers with ease.

## Features

- Start specified MCP server as a child process.
- Proxy JSON-RPC messages between client (stdin/stdout) and MCP server.
- Filter discovered tools based on allow settings in config.
- Log message metadata and errors to `mcpm.log`.

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/jsnanigans/mcpm.git
cd mcpm
npm install
npm run build # Compile TypeScript to JavaScript
npm link
```

Create a config file:

```bash
cp mcpm.config.example.json mcpm.config.json
```

Edit the config file to add your MCP servers.

## Usage

```bash
mcpm --server <serverKey> [--config <configFilePath>] [--agent <agentName>] [--enable-logging]
```

- `<serverKey>`: Key of the MCP server defined in your config.
- `<configFilePath>`: Path to a custom config file (optional).
- `--agent <agentName>`: Identifier for the agent using the MCP server (e.g., `cursor`, `claude-dk`).
- `--enable-logging`: Enable logging of messages and errors to `mcpm.log`.

## CLI Command Reference

```sh
mcpm [options] [command]
```

**Options:**
- `--version`                      Show version
- `-s, --server <serverKey>`       Server key to use
- `-c, --config <configPath>`      Path to config file
- `--agent <agentName>`            Identifier for the agent using the MCP server
- `--enable-logging`               Enable logging
- `-h, --help`                     Display help for command

**Commands:**
- `server list [-c <configPath>]`  List all configured servers
- `edit [server] [-c <configPath>]`  Interactively edit a server configuration (choose server, then section, then allowed tools)
- `config`                         Show the path to the config file
- `log tail [-s <name>]`           Tail the log file, optionally filter by server name

---

### Examples

```sh
# List all servers
mcpm server list

# Edit allowed tools for a server interactively
mcpm edit my-server

# Show config file path
mcpm config

# Tail logs for a specific server
mcpm log tail -s my-server

# Start a server with logging enabled
mcpm --server my-server --agent cursor --enable-logging
```

### Usage with Cursor

You can configure Cursor to use `mcpm` to manage your MCP servers. Add the following to your Cursor `settings.json` file:

```json
{
  "mcpServers": {
    "github": {
      "command": "mcpm",
      "args": [
        "--server=github",
        "--agent=cursor"
      ]
    },
    "atlassian": {
      "command": "mcpm",
      "args": [
        "--server=mcp-atlassian",
        "--agent=cursor"
      ]
    },
    "figma": {
      "command": "mcpm",
      "args": [
        "--server=figma",
        "--agent=cursor"
      ]
    },
    "@21st-dev/magic": {
      "command": "mcpm",
      "args": [
        "--server=@21st-dev/magic",
        "--agent=cursor"
      ]
    },
    "puppeteer": {
      "command": "mcpm",
      "args": [
        "--server=puppeteer",
        "--agent=cursor"
      ]
    }
  }
}
```

Make sure your `mcpm.config.json` file defines the servers referenced here (e.g., `github`, `mcp-atlassian`, `figma`, etc.).

> **Tip:** Use `mcpm edit` to interactively select a server and manage its allowed tools. Future sections for resources and prompts are planned.

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
        "allow": ["tool1", "tool2"]
      }
    }
  }
}
```

- `allow`: Array of tools to include (optional). Accepts an array of strings or a space-separated string.
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


## Other MCP Tools

- [mcptool](https://github.com/f/mcptools)