import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  it('falls back to defaults', () => {
    const config = loadConfig({});

    expect(config.port).toBe(3000);
    expect(config.dataFile).toBe(path.resolve('data/todos.json'));
    expect(config.clientDir).toMatch(/client[/\\]dist$/);
  });

  it('reads every setting from the environment', () => {
    const config = loadConfig({
      PORT: '8080',
      DATA_FILE: '/var/lib/todos/todos.json',
      CLIENT_DIR: '/srv/client',
    });

    expect(config).toEqual({
      port: 8080,
      dataFile: '/var/lib/todos/todos.json',
      clientDir: '/srv/client',
    });
  });

  it.each(['abc', '-1', '70000', '80.5'])('rejects the invalid port "%s"', (port) => {
    expect(() => loadConfig({ PORT: port })).toThrow(/PORT must be an integer/);
  });
});
