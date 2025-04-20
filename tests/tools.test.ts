// @ts-ignore: Allow import from bun:test
import { describe, expect, it } from 'bun:test';
import { filterTools } from '../src/tools.ts';

describe('filterTools', () => {
  const tools = [{ name: 'a' }, { name: 'b' }, { name: 'c' }];

  it('returns original array if toolsConfig is undefined', () => {
    expect(filterTools(tools, undefined)).toEqual(tools);
  });

  it('filters by allow list', () => {
    const cfg = { allow: 'a c' };
    expect(filterTools(tools, cfg)).toEqual([{ name: 'a' }, { name: 'c' }]);
  });

  it('empty allow string filters out all', () => {
    const cfg = { allow: '' };
    expect(filterTools(tools, cfg)).toEqual([]);
  });

  // support array of strings for allow
  it('filters by allow array', () => {
    const cfg = { allow: ['a', 'c'] };
    expect(filterTools(tools, cfg)).toEqual([{ name: 'a' }, { name: 'c' }]);
  });
}); 