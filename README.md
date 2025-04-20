# mcpm (MCP Manager)

A simple CLI tool to manage MCP servers with ease.

## Features

- Load configuration from JSON file (`~/.config/mcpm/mcpm.config.json` by default, or a custom path via `--config`).
- Start specified MCP server as a child process.
- Proxy JSON-RPC messages between client (stdin/stdout) and MCP server.
- Filter discovered tools based on allow/deny settings in config.
- Log message metadata and errors to `mcpm.log`.

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/<username>/mcpm.git
cd mcpm
npm install
npm link
```

## Usage

```bash
mcpm --mcp-server <serverKey> [--config <configFilePath>]
```

- `<serverKey>`: Key of the MCP server defined in your config.
- `<configFilePath>`: Path to a custom config file (optional).

## Configuration

Configuration file (`mcpm.config.json`) structure:

```json
{
  "mcpmServers": {
    "<serverKey>": {
      "command": "<path/to/mcp-server-binary>",
      "args": ["--flag", "value"],
      "env": {
        "ENV_VAR": "value"
      },
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

## Logging

Logs are written to `mcpm.log` in the project root directory.

## Development

Run the proxy locally:

```bash
npm start -- --mcp-server <serverKey>
```

Replace `<serverKey>` with a valid key.
