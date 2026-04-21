import * as vscode from 'vscode';

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

export type TtlMode = '1h' | '5m';

interface ClaudeSettings {
  env?: Record<string, string>;
  [key: string]: unknown;
}

const ENABLE_PROMPT_CACHING_1H = 'ENABLE_PROMPT_CACHING_1H';
const FORCE_PROMPT_CACHING_5M = 'FORCE_PROMPT_CACHING_5M';
const RATE_LIMIT_BRIDGE_PATH = 'CLAUDE_TTL_COUNTER_RATE_LIMITS_PATH';
const DEFAULT_RATE_LIMIT_BRIDGE_FILENAME = 'ttl-counter-rate-limits.json';

export function getTtlDurationMs(mode: TtlMode): number {
  return mode === '1h' ? 60 * 60 * 1000 : 5 * 60 * 1000;
}

export function getDefaultRateLimitBridgePath(homeDir = os.homedir()): string {
  return path.join(homeDir, '.claude', DEFAULT_RATE_LIMIT_BRIDGE_FILENAME);
}

export function getModeLabel(mode: TtlMode): string {
  return mode === '1h'
    ? vscode.l10n.t('1h mode')
    : vscode.l10n.t('5m mode');
}

export class SettingsManager {
  private readonly settingsPath: string;

  constructor(settingsPath?: string) {
    this.settingsPath = settingsPath ?? path.join(os.homedir(), '.claude', 'settings.json');
  }

  getSettingsPath(): string {
    return this.settingsPath;
  }

  async readSettings(): Promise<ClaudeSettings> {
    try {
      const raw = await fs.readFile(this.settingsPath, 'utf8');
      const parsed = JSON.parse(raw) as ClaudeSettings;
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === 'ENOENT') {
        return {};
      }

      throw error;
    }
  }

  async getMode(): Promise<TtlMode> {
    const settings = await this.readSettings();
    const env = settings.env ?? {};

    if (env[FORCE_PROMPT_CACHING_5M]) {
      return '5m';
    }

    if (env[ENABLE_PROMPT_CACHING_1H]) {
      return '1h';
    }

    return '5m';
  }

  async getRateLimitBridgePath(): Promise<string> {
    const settings = await this.readSettings();
    const env = settings.env ?? {};
    const configuredPath = env[RATE_LIMIT_BRIDGE_PATH];

    if (typeof configuredPath === 'string' && configuredPath.trim()) {
      return path.isAbsolute(configuredPath)
        ? configuredPath
        : path.resolve(os.homedir(), configuredPath);
    }

    return getDefaultRateLimitBridgePath();
  }

  async setMode(mode: TtlMode): Promise<void> {
    const settings = await this.readSettings();
    const env = { ...(settings.env ?? {}) };

    if (mode === '1h') {
      env[ENABLE_PROMPT_CACHING_1H] = '1';
      delete env[FORCE_PROMPT_CACHING_5M];
    } else {
      env[FORCE_PROMPT_CACHING_5M] = '1';
      delete env[ENABLE_PROMPT_CACHING_1H];
    }

    settings.env = env;
    await this.writeSettingsAtomic(settings);
  }

  private async writeSettingsAtomic(settings: ClaudeSettings): Promise<void> {
    const dir = path.dirname(this.settingsPath);
    await fs.mkdir(dir, { recursive: true });

    const tempPath = path.join(dir, `settings.${process.pid}.${Date.now()}.tmp`);
    const content = `${JSON.stringify(settings, null, 2)}\n`;

    await fs.writeFile(tempPath, content, 'utf8');

    try {
      await fs.rename(tempPath, this.settingsPath);
    } catch {
      // Windows can reject rename-overwrite, so fall back to a direct write.
      await fs.writeFile(this.settingsPath, content, 'utf8');
      await fs.rm(tempPath, { force: true });
    }
  }
}
