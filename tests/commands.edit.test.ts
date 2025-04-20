// @ts-ignore: Allow import from bun:test
import { afterEach, beforeEach, describe, expect, it, mock, vi } from 'bun:test';
import { EventEmitter } from 'events';
import * as editModule from '../src/commands/edit.ts';
import * as configModule from '../src/config.ts';
import * as jsonRpcUtilsModule from '../src/jsonRpcUtils.ts';
import * as loggerModule from '../src/logger.ts'; // Import logger module
import * as serverUtilsModule from '../src/serverUtils.ts';

// Remove vi.mock
// const mockLog = vi.fn();
// vi.mock('../src/logger.ts', () => ({ log: mockLog }));

// Manual stubs for @inquirer/prompts
const mockSelect = vi.fn();
const mockCheckbox = vi.fn();

// Use Bun's mock.module to mock @inquirer/prompts
mock.module('@inquirer/prompts', () => ({
    select: mockSelect,
    checkbox: mockCheckbox,
}));

// Remove old logger setup
// let originalLog: any;
// beforeEach(() => { ... });
// afterEach(() => { ... });

describe('fetchAllToolsFromServerConfig', () => {
    let startMcpServerSpy: any;
    let parseJsonRpcMessagesSpy: any;
    let origSetTimeout: any;
    let logSpy: any; // Declare logSpy here

    beforeEach(() => {
        startMcpServerSpy = vi.spyOn(serverUtilsModule, 'startMcpServer');
        parseJsonRpcMessagesSpy = vi.spyOn(jsonRpcUtilsModule, 'parseJsonRpcMessages');
        origSetTimeout = global.setTimeout;
        // Mock logger.log directly before each test in this describe block
        logSpy = vi.spyOn(loggerModule, 'log').mockImplementation(() => {}); 
    });

    afterEach(() => {
        global.setTimeout = origSetTimeout;
        vi.restoreAllMocks(); // This will restore logSpy too
    });

    it('resolves with tool names on success', async () => {
        const fakeChild: any = {
            stdout: new EventEmitter(), // Use EventEmitter for stdout
            stderr: { on: vi.fn() },
            on: vi.fn(),
            kill: vi.fn(),
            stdin: { write: vi.fn() },
        };
        startMcpServerSpy.mockReturnValue(fakeChild);
        parseJsonRpcMessagesSpy.mockImplementation((stream, cb) => {
            // Simulate initialize response first
            cb({ id: 0, result: { capabilities: {} } }, '');
            // Then simulate tools/list response
            cb({ id: 1, result: { tools: [{ name: 'foo' }, { name: 'bar' }] } }, '');
        });
        const result = await editModule.fetchAllToolsFromServerConfig('test-server', { command: 'x', args: [], env: {} } as configModule.McpConfig);
        expect(result).toEqual([{ name: 'foo' }, { name: 'bar' }]);
        // Check that the correct sequence of messages was written to stdin
        expect(fakeChild.stdin.write).toHaveBeenCalledTimes(3);
        expect(fakeChild.stdin.write).toHaveBeenCalledWith(expect.stringContaining('"method":"initialize"'));
        expect(fakeChild.stdin.write).toHaveBeenCalledWith(expect.stringContaining('"method":"notifications/initialized"'));
        expect(fakeChild.stdin.write).toHaveBeenCalledWith(expect.stringContaining('"method":"tools/list"'));
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
        parseJsonRpcMessagesSpy.mockImplementation(() => { });
        await expect(editModule.fetchAllToolsFromServerConfig('test-server', { command: 'x', args: [], env: {} } as configModule.McpConfig)).rejects.toThrow('Timeout');
    });

    it('rejects if process exits before response', async () => {
        let exitCb: (code: number) => void;
        const fakeChild: any = {
            stdout: {},
            stderr: { on: vi.fn() },
            on: (event: string, cb: any) => { if (event === 'exit') exitCb = cb; },
            kill: vi.fn(),
            stdin: { write: vi.fn() },
        };
        startMcpServerSpy.mockReturnValue(fakeChild);
        parseJsonRpcMessagesSpy.mockImplementation(() => { });
        const promise = editModule.fetchAllToolsFromServerConfig('test-server', { command: 'x', args: [], env: {} } as configModule.McpConfig);
        expect(exitCb!).toBeDefined();
        exitCb!(1);
        await expect(promise).rejects.toThrow('MCP server exited before responding');
    });

    it('logs stderr output', async () => {
        const fakeChild: any = {
            stdout: new EventEmitter(),
            stderr: new EventEmitter(), // Use EventEmitter for stderr
            on: vi.fn(),
            kill: vi.fn(),
            stdin: { write: vi.fn() },
        };
        startMcpServerSpy.mockReturnValue(fakeChild);
        parseJsonRpcMessagesSpy.mockImplementation((stream, cb) => {
            // Simulate initialize response first
            cb({ id: 0, result: { capabilities: {} } }, '');
            // Then simulate tools/list response to allow resolution
            cb({ id: 1, result: { tools: [] } }, '');
        });
        
        // logSpy is already set up in beforeEach

        const promise = editModule.fetchAllToolsFromServerConfig('test-server', { command: 'x' } as configModule.McpConfig);

        // Emit stderr data AFTER the function call and event listeners are set up
        fakeChild.stderr.emit('data', Buffer.from('error output'));

        await promise; // Wait for the function to complete

        // Assert against the spy
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('MCP server stderr: error output'), { domain: 'error' });
    });
});

describe('handleEditCommand', () => {
    let loadConfigSpy: any;
    let saveConfigSpy: any;
    let fetchAllToolsSpy: any;
    let logSpy: any; // Declare logSpy for this block too

    beforeEach(() => {
        loadConfigSpy = vi.spyOn(configModule, 'loadConfig').mockReturnValue({
            mcpServers: {
                "foo": {
                    "tools": {
                        "allow": [
                            "a"
                        ]
                    }
                }
            }
        });
        saveConfigSpy = vi.spyOn(configModule, 'saveConfig').mockImplementation(() => { });
        fetchAllToolsSpy = vi.spyOn(editModule, 'fetchAllToolsFromServerConfig');
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.spyOn(console, 'log').mockImplementation(() => { });
        // Mock logger.log specifically for this describe block
        logSpy = vi.spyOn(loggerModule, 'log').mockImplementation(() => {});
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('exits if no servers configured', async () => {
        loadConfigSpy.mockReturnValue({ mcpServers: {} });
        await expect(editModule.handleEditCommand()).rejects.toThrow('No MCP servers configured.');
    });

    it('exits if serverKey not found', async () => {
        loadConfigSpy.mockReturnValue({ mcpServers: { foo: {} } });
        await expect(editModule.handleEditCommand('bar')).rejects.toThrow('Server key \'bar\' not found in config.');
    });

    it('exits if serverConfig is missing', async () => {
        loadConfigSpy.mockReturnValue({ mcpServers: { foo: undefined as any } });
        await expect(editModule.handleEditCommand('foo')).rejects.toThrow('Server config for key \'foo\' is missing or invalid.');
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

    it('runs happy path for tools section when tools object exists but allow is missing', async () => {
        loadConfigSpy.mockReturnValue({ mcpServers: { foo: { tools: { } } } }); // tools exists, but no allow
        mockSelect.mockResolvedValueOnce('foo'); // serverKey
        mockSelect.mockResolvedValueOnce('tools'); // section
        fetchAllToolsSpy.mockResolvedValue([{ name: 'a' }, { name: 'b' }]);
        mockCheckbox.mockResolvedValue(['b']); // Select only 'b'
        await editModule.handleEditCommand();
        expect(saveConfigSpy).toHaveBeenCalledWith(expect.objectContaining({
            mcpServers: {
                foo: {
                    tools: { allow: ['b'] }
                }
            }
        }), undefined);
        expect(console.log).toHaveBeenCalled();
    });

    it('runs happy path for tools section when tools object is missing', async () => {
        loadConfigSpy.mockReturnValue({ mcpServers: { foo: {} } }); // No tools object at all
        mockSelect.mockResolvedValueOnce('foo'); // serverKey
        mockSelect.mockResolvedValueOnce('tools'); // section
        fetchAllToolsSpy.mockResolvedValue([{ name: 'a' }, { name: 'b' }]);
        mockCheckbox.mockResolvedValue(['a']); // Select only 'a'
        await editModule.handleEditCommand();
        expect(saveConfigSpy).toHaveBeenCalledWith(expect.objectContaining({
            mcpServers: {
                foo: {
                    tools: { allow: ['a'] }
                }
            }
        }), undefined);
        expect(console.log).toHaveBeenCalled();
    });
}); 