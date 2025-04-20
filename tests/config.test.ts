// @ts-ignore: Allow import from bun:test
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import fs from 'fs';
import os from 'os';
import path from 'path';

let loadConfig: typeof import('../src/config.ts').loadConfig;
let DEFAULT_CONFIG: typeof import('../src/config.ts').DEFAULT_CONFIG;
let CONFIG_PATH: string;

describe('loadConfig (explicit path)', () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcpm-test-'));
    configPath = path.join(tempDir, 'config.json');
    ({ loadConfig, DEFAULT_CONFIG } = require('../src/config.ts'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates default config when file does not exist', () => {
    const cfg = loadConfig(configPath);
    expect(cfg).toEqual(DEFAULT_CONFIG);
    expect(fs.existsSync(configPath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(content).toEqual(DEFAULT_CONFIG);
  });

  it('creates default config when directory does not exist', () => {
    fs.rmSync(tempDir, { recursive: true, force: true }); // Remove the initially created dir
    expect(fs.existsSync(tempDir)).toBe(false);
    const cfg = loadConfig(configPath);
    expect(cfg).toEqual(DEFAULT_CONFIG);
    expect(fs.existsSync(configPath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(content).toEqual(DEFAULT_CONFIG);
  });

  it('reads existing config file', () => {
    const custom = { mcpServers: { foo: { command: 'echo', args: [] } } };
    fs.writeFileSync(configPath, JSON.stringify(custom), 'utf-8');
    const cfg = loadConfig(configPath);
    expect(cfg).toEqual(custom);
  });
});

describe('loadConfig (default path)', () => {
  let tempHome: string;
  let originalHomedir: () => string;

  beforeEach(() => {
    originalHomedir = os.homedir;
    tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'mcpm-home-'));
    // @ts-ignore
    os.homedir = () => tempHome;
    // Now import config module so it uses patched homedir
    ({ loadConfig, DEFAULT_CONFIG, CONFIG_PATH } = require('../src/config.ts'));
    const defaultDir = path.join(tempHome, '.config', 'mcpm');
    if (fs.existsSync(defaultDir)) fs.rmSync(defaultDir, { recursive: true, force: true });
  });

  afterEach(() => {
    // @ts-ignore
    os.homedir = originalHomedir;
    if (fs.existsSync(tempHome)) fs.rmSync(tempHome, { recursive: true, force: true });
  });

  it('creates default config when no path provided', () => {
    const cfg = loadConfig();
    const defaultPath = CONFIG_PATH;
    expect(fs.existsSync(defaultPath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(defaultPath, 'utf-8'));
    expect(cfg).toEqual(content);
  });
});

describe('saveConfig', () => {
  let tempDir: string;
  let configPath: string;
  let saveConfig: typeof import('../src/config.ts').saveConfig;
  let loadConfig: typeof import('../src/config.ts').loadConfig;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcpm-test-save-'));
    configPath = path.join(tempDir, 'config.json');
    ({ saveConfig, loadConfig } = require('../src/config.ts'));
    // Ensure dir exists for loading
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    // Create a dummy initial config to load/compare against if needed
    fs.writeFileSync(configPath, JSON.stringify({ mcpServers: {} }), 'utf-8');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('saves the config to the specified path', () => {
    const newConfig = { mcpServers: { testServer: { command: 'test-cmd' } } };
    saveConfig(newConfig, configPath);
    const savedContent = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(savedContent).toEqual(newConfig);
  });
}); 