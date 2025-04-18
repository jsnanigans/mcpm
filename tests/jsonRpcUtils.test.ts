// @ts-ignore: Allow import from bun:test
import { describe, expect, it } from 'bun:test';
import { PassThrough } from 'stream';
import { parseJsonRpcMessages, sendJsonRpcMessage } from '../src/jsonRpcUtils.ts';

describe('parseJsonRpcMessages', () => {
  it('parses complete JSON lines and ignores non-JSON', () => {
    const pt = new PassThrough();
    const messages: any[] = [];
    parseJsonRpcMessages(pt, (msg) => messages.push(msg));
    pt.write(JSON.stringify({ x: 1 }) + '\n');
    pt.write('not json\n');
    pt.write(JSON.stringify({ y: 2 }) + '\n');
    expect(messages).toEqual([{ x: 1 }, { y: 2 }]);
  });

  it('handles split messages across chunks', () => {
    const pt = new PassThrough();
    const messages: any[] = [];
    parseJsonRpcMessages(pt, (msg) => messages.push(msg));
    const obj = { split: true };
    const json = JSON.stringify(obj) + '\n';
    // write in two parts
    pt.write(json.slice(0, 5));
    expect(messages).toEqual([]);
    pt.write(json.slice(5));
    expect(messages).toEqual([obj]);
  });
});

describe('sendJsonRpcMessage', () => {
  it('writes a JSON line with newline', () => {
    const pt = new PassThrough();
    let data = '';
    pt.on('data', (chunk) => { data += chunk.toString(); });
    sendJsonRpcMessage(pt, { test: true });
    expect(data).toBe(JSON.stringify({ test: true }) + '\n');
  });
}); 