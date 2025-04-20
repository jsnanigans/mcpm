// @ts-ignore: Allow import from bun:test
import { describe, expect, it } from 'bun:test';
import { filterTools } from '../src/tools.ts';

describe('filterTools', () => {
  const tools = [{ name: 'a' }, { name: 'b' }, { name: 'c' }];

  it('returns original array if toolsConfig is undefined', () => {
    expect(filterTools(tools, undefined)).toEqual(tools);
  });

  it('returns original when both allow and deny empty', () => {
    expect(filterTools(tools, {})).toEqual(tools);
  });

  it('filters by allow list', () => {
    const cfg = { allow: 'a c' };
    expect(filterTools(tools, cfg)).toEqual([{ name: 'a' }, { name: 'c' }]);
  });

  it('empty allow string filters out all', () => {
    const cfg = { allow: '' };
    expect(filterTools(tools, cfg)).toEqual([]);
  });

  it('filters by deny list', () => {
    const cfg = { deny: 'b' };
    expect(filterTools(tools, cfg)).toEqual([{ name: 'a' }, { name: 'c' }]);
  });

  it('empty deny string keeps all', () => {
    const cfg = { deny: '' };
    expect(filterTools(tools, cfg)).toEqual(tools);
  });

  it('applies allow then deny', () => {
    const cfg = { allow: 'a b c', deny: 'b' };
    expect(filterTools(tools, cfg)).toEqual([{ name: 'a' }, { name: 'c' }]);
  });

  // support array of strings for allow and deny
  it('filters by allow array', () => {
    const cfg = { allow: ['a', 'c'] };
    expect(filterTools(tools, cfg)).toEqual([{ name: 'a' }, { name: 'c' }]);
  });

  it('filters by deny array', () => {
    const cfg = { deny: ['b'] };
    expect(filterTools(tools, cfg)).toEqual([{ name: 'a' }, { name: 'c' }]);
  });

  it('applies allow then deny array', () => {
    const cfg = { allow: ['a', 'b', 'c'], deny: ['b'] };
    expect(filterTools(tools, cfg)).toEqual([{ name: 'a' }, { name: 'c' }]);
  });
}); 