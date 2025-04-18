// @ts-ignore: Allow import from bun:test
import { describe, expect, it } from 'bun:test';
import { startMcpServer } from '../src/serverUtils.ts';

describe('startMcpServer', () => {
  it('spawns a process and captures stdout and exit code', async () => {
    const child = startMcpServer({ command: 'echo', args: ['hello world'], env: {} });
    let output = '';
    child.stdout.on('data', (chunk: Buffer) => { output += chunk.toString(); });
    const code = await new Promise<number>((resolve) => child.on('exit', resolve));
    expect(output.trim()).toBe('hello world');
    expect(code).toBe(0);
  });
}); 