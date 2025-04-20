// @ts-ignore: Allow import from bun:test
import { afterEach, beforeEach, describe, expect, it, mock, vi } from 'bun:test';
import * as editModule from '../src/commands/edit.ts';
import * as configModule from '../src/config.ts';
import * as jsonRpcUtilsModule from '../src/jsonRpcUtils.ts';
import * as serverUtilsModule from '../src/serverUtils.ts';

// Manual stubs for @inquirer/prompts
const mockSelect = vi.fn();
const mockCheckbox = vi.fn();

// Use Bun's mock.module to mock @inquirer/prompts
mock.module('@inquirer/prompts', () => ({
  select: mockSelect,
  checkbox: mockCheckbox,
}));

// Manual stub for logger
let originalLog: any;
beforeEach(() => {
  try {
    const logger = require('../src/logger.ts');
    originalLog = logger.log;
    logger.log = vi.fn();
  } catch {}
});
afterEach(() => {
  try {
    const logger = require('../src/logger.ts');
    logger.log = originalLog;
  } catch {}
});

describe('fetchAllToolsFromServerConfig', () => {
  let startMcpServerSpy: any;
  let parseJsonRpcMessagesSpy: any;
  let origSetTimeout: any;
  beforeEach(() => {
    startMcpServerSpy = vi.spyOn(serverUtilsModule, 'startMcpServer');
    parseJsonRpcMessagesSpy = vi.spyOn(jsonRpcUtilsModule, 'parseJsonRpcMessages');
    origSetTimeout = global.setTimeout;
  });
  afterEach(() => {
    global.setTimeout = origSetTimeout;
    vi.restoreAllMocks();
  });

  it('resolves with tool names on success', async () => {
    const fakeChild: any = {
      stdout: {},
      stderr: { on: vi.fn() },
      on: vi.fn(),
      kill: vi.fn(),
      stdin: { write: vi.fn() },
    };
    startMcpServerSpy.mockReturnValue(fakeChild);
    parseJsonRpcMessagesSpy.mockImplementation((stream, cb) => {
      cb({ result: { tools: [{ name: 'foo' }, { name: 'bar' }] } }, '');
    });
    const result = await editModule.fetchAllToolsFromServerConfig({ cmd: 'x', args: [], env: {} });
    expect(result).toEqual([{ name: 'foo' }, { name: 'bar' }]);
  });

  it('rejects on timeout', async () => {
    // Patch setTimeout to call the callback immediately, preserving __promisify__
    const fakeSetTimeout = (cb: any, _ms: any) => { cb(); return 1 as any; };
    (fakeSetTimeout as any).__promisify__ = (global.setTimeout as any).__promisify__;
    global.setTimeout = fakeSetTimeout as any;
    const fakeChild: any = {
      stdout: {},
      stderr: { on: vi.fn() },
      on: vi.fn(),
      kill: vi.fn(),
      stdin: { write: vi.fn() },
    };
    startMcpServerSpy.mockReturnValue(fakeChild);
    parseJsonRpcMessagesSpy.mockImplementation(() => {});
    await expect(editModule.fetchAllToolsFromServerConfig({ cmd: 'x', args: [], env: {} })).rejects.toThrow('Timeout');
  });

  it('rejects if process exits before response', async () => {
    let exitCb: any;
    const fakeChild: any = {
      stdout: {},
      stderr: { on: vi.fn() },
      on: (event, cb) => { if (event === 'exit') exitCb = cb; },
      kill: vi.fn(),
      stdin: { write: vi.fn() },
    };
    startMcpServerSpy.mockReturnValue(fakeChild);
    parseJsonRpcMessagesSpy.mockImplementation(() => {});
    const promise = editModule.fetchAllToolsFromServerConfig({ cmd: 'x', args: [], env: {} });
    exitCb(1);
    await expect(promise).rejects.toThrow('MCP server exited before responding');
  });
});

describe('handleEditCommand', () => {
  let loadConfigSpy: any;
  let saveConfigSpy: any;
  let fetchAllToolsSpy: any;
  beforeEach(() => {
    loadConfigSpy = vi.spyOn(configModule, 'loadConfig');
    saveConfigSpy = vi.spyOn(configModule, 'saveConfig');
    fetchAllToolsSpy = vi.spyOn(editModule, 'fetchAllToolsFromServerConfig');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exits if no servers configured', async () => {
    loadConfigSpy.mockReturnValue({ mcpServers: {} });
    await expect(editModule.handleEditCommand()).rejects.toThrow('exit');
  });

  it('exits if serverKey not found', async () => {
    loadConfigSpy.mockReturnValue({ mcpServers: { foo: {} } });
    await expect(editModule.handleEditCommand('bar')).rejects.toThrow('exit');
  });

  it('exits if serverConfig is missing', async () => {
    loadConfigSpy.mockReturnValue({ mcpServers: { foo: undefined } });
    await expect(editModule.handleEditCommand('foo')).rejects.toThrow('exit');
  });

  it('runs happy path for tools section', async () => {
    loadConfigSpy.mockReturnValue({ mcpServers: { foo: { tools: { allow: ['a'] } } } });
    mockSelect.mockResolvedValueOnce('foo'); // serverKey
    mockSelect.mockResolvedValueOnce('tools'); // section
    fetchAllToolsSpy.mockResolvedValue([{ name: 'a' }, { name: 'b' }]);
    mockCheckbox.mockResolvedValue(['a', 'b']);
    await editModule.handleEditCommand();
    expect(saveConfigSpy).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalled();
  });

  it('handles non-tools section', async () => {
    loadConfigSpy.mockReturnValue({ mcpServers: { foo: { tools: { allow: ['a'] } } } });
    mockSelect.mockResolvedValueOnce('foo'); // serverKey
    mockSelect.mockResolvedValueOnce('resources'); // section
    // Ensure mockCheckbox is not called
    await editModule.handleEditCommand();
    expect(console.log).toHaveBeenCalledWith('Selected section is not implemented yet.');
  });
}); 