# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

mcpm (MCP Manager) is a CLI tool that manages MCP (Model Context Protocol) servers. It acts as a proxy between MCP clients (like Cursor or Claude) and MCP server implementations, providing tool filtering and logging capabilities.

## Key Commands

### Build and Development
- `npm run build` - Compile TypeScript to JavaScript (required before running)
- `npm run dev` - Run with MCP inspector for debugging
- `npm link` - Install globally after building

### Testing
- `bun test` - Run all unit tests
- `bun test --watch` - Run tests in watch mode
- `bun test --coverage` - Run tests with coverage report
- Individual test files can be run with `bun test tests/<filename>.test.ts`

## Architecture

### Core Components
- **Entry Point** (`src/index.ts`): Simple shebang wrapper that calls the CLI
- **CLI Handler** (`src/cli.ts`): Main CLI logic using Commander.js, handles:
  - Server proxy mode (default action)
  - Command routing (`server list`, `edit`, `config`, `log tail`)
  - JSON-RPC message proxying between client and MCP server
- **Config Management** (`src/config.ts`): Handles loading/saving mcpm.config.json
- **Server Utils** (`src/serverUtils.ts`): Spawns MCP server child processes
- **Tool Filtering** (`src/tools.ts`): Filters discovered tools based on allow lists
- **Logging** (`src/logger.ts`): Structured logging to mcpm.log file
- **JSON-RPC Utils** (`src/jsonRpcUtils.ts`): Parses and sends JSON-RPC messages

### Message Flow
1. Client (e.g., Cursor) spawns mcpm with `--server` flag
2. mcpm spawns the configured MCP server as a child process
3. JSON-RPC messages flow: Client ↔ mcpm ↔ MCP Server
4. mcpm intercepts tool discovery responses to filter based on config
5. All messages can be logged to mcpm.log for debugging

### Configuration Structure
The `mcpm.config.json` file defines available MCP servers:
```json
{
  "mcpServers": {
    "<serverKey>": {
      "command": "<executable>",
      "args": ["--flag", "value"],
      "env": { "ENV_VAR": "value" },
      "logging": false,
      "tools": {
        "allow": ["tool1", "tool2"]
      }
    }
  }
}
```

## TypeScript Configuration
- Target: ES2022
- Module: Node16
- Strict mode enabled
- Source in `src/`, builds to `build/`