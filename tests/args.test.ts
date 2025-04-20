// @ts-ignore: Allow import from bun:test
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { getArgValue } from '../src/args.ts';

describe('getArgValue', () => {
  let originalArgv: string[];
  beforeEach(() => {
    originalArgv = process.argv;
  });
  afterEach(() => {
    process.argv = originalArgv;
  });

  it('returns the value when key and value are separate', () => {
    process.argv = ['node', 'script', '--server', 'bar'];
    expect(getArgValue(['--server'])).toBe('bar');
  });

  it('returns the value when key and value are combined', () => {
    process.argv = ['node', 'script', '--server=baz'];
    expect(getArgValue(['--server'])).toBe('baz');
  });

  it('returns undefined when key not present and required is false', () => {
    process.argv = ['node', 'script'];
    expect(getArgValue(['--missing'])).toBeUndefined();
  });

  it('exits with code 1 when required and key not present', () => {
    process.argv = ['node', 'script'];
    let exitCode: number | undefined;
    const originalExit = process.exit;
    // @ts-ignore
    process.exit = (c?: number) => { exitCode = c; throw new Error('exited'); };
    const originalError = console.error;
    let errMsg = '';
    console.error = (msg: string) => { errMsg = msg; };
    try {
      expect(() => getArgValue(['--missing'], true)).toThrow('exited');
      expect(exitCode).toBe(1);
      expect(errMsg).toMatch(/Usage:/);
    } finally {
      process.exit = originalExit;
      console.error = originalError;
    }
  });
});

describe('parseArgs', () => {
  it('parses command, subcommand, and flags', () => {
    const argv = ['server', 'list', '--foo', 'bar', '--baz=qux', '-c', 'file.json'];
    const { command, subcommand, flags, positionals } = require('../src/args.ts').parseArgs(argv);
    expect(command).toBe('server');
    expect(subcommand).toBe('list');
    expect(flags['--foo']).toBe('bar');
    expect(flags['--baz']).toBe('qux');
    expect(flags['-c']).toBe('file.json');
    expect(positionals).toEqual([]);
  });
}); 