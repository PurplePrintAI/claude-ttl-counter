import * as vscode from 'vscode';
import * as path from 'node:path';

import { hasRateLimitData } from './rate-limit-bridge';
import { getModeLabel } from './settings-manager';
import { TurnUsageSummary, TtlSnapshot } from './ttl-watcher';

export type StatusVisualState = 'countdown' | 'turn_usage' | 'rate_limit' | 'warning' | 'expired' | 'error';

export interface StatusPresentation {
  text: string;
  tooltip: string;
  visualState: StatusVisualState;
  remainingRatio?: number;
}

const locale = vscode.env.language || undefined;
const numberFormatter = new Intl.NumberFormat(locale);
const percentFormatter = new Intl.NumberFormat(locale, {
  style: 'percent',
  maximumFractionDigits: 1,
});
const compactNumberFormatter = new Intl.NumberFormat(locale, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const rateLimitPercentFormatter = new Intl.NumberFormat(locale, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function getRemainingMs(snapshot: TtlSnapshot, now = Date.now()): number | undefined {
  if (!snapshot.lastUserPromptAt) {
    return undefined;
  }

  return snapshot.ttlMs - (now - snapshot.lastUserPromptAt);
}

function formatRemaining(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function projectName(workspacePath?: string): string {
  return workspacePath ? path.basename(workspacePath) : '';
}

function shortSessionId(sessionId?: string): string {
  return sessionId ? sessionId.slice(0, 8) : vscode.l10n.t('none');
}

function formatTokens(value?: number): string {
  if (value === undefined) {
    return '--';
  }

  return numberFormatter.format(value);
}

function formatCompactTokens(value?: number): string {
  if (value === undefined) {
    return '--';
  }

  if (Math.abs(value) < 1000) {
    return numberFormatter.format(Math.round(value));
  }

  const thousands = value / 1000;
  if (Math.abs(thousands) >= 10) {
    return `${numberFormatter.format(Math.round(thousands))}k`;
  }

  return `${compactNumberFormatter.format(thousands)}k`;
}

function formatPercent(value?: number): string {
  if (value === undefined) {
    return '--';
  }

  return percentFormatter.format(value);
}

function formatRateLimitPercent(value?: number): string {
  if (value === undefined) {
    return '--';
  }

  return rateLimitPercentFormatter.format(value);
}

function buildUsageLines(usage?: TurnUsageSummary): string[] {
  if (!usage) {
    return [vscode.l10n.t('Last turn: waiting')];
  }

  return [
    vscode.l10n.t('Last turn: {0} tokens', formatTokens(usage.grossInputTokens)),
    `  ${vscode.l10n.t('Cache hit {0} | Fresh {1}', formatPercent(usage.cacheHitRatio), formatTokens(usage.effectiveInputTokens))}`,
  ];
}

function buildRateLimitTooltipLines(snapshot: TtlSnapshot): string[] {
  if (!hasRateLimitData(snapshot.rateLimits)) {
    return [];
  }

  const lines: string[] = [''];
  if (snapshot.rateLimits?.fiveHourUsedPercentage !== undefined) {
    lines.push(vscode.l10n.t('5h usage: {0}%', formatRateLimitPercent(snapshot.rateLimits.fiveHourUsedPercentage)));
  }

  if (snapshot.rateLimits?.sevenDayUsedPercentage !== undefined) {
    lines.push(vscode.l10n.t('7d usage: {0}%', formatRateLimitPercent(snapshot.rateLimits.sevenDayUsedPercentage)));
  }

  return lines;
}

function buildTurnUsageFlash(usage?: TurnUsageSummary): string | undefined {
  if (!usage) {
    return undefined;
  }

  return vscode.l10n.t(
    '{0} in | hit {1} | {2} out',
    formatCompactTokens(usage.grossInputTokens),
    formatPercent(usage.cacheHitRatio),
    formatCompactTokens(usage.outputTokens),
  );
}

function buildRateLimitFlash(snapshot: TtlSnapshot): string | undefined {
  const fiveHour = snapshot.rateLimits?.fiveHourUsedPercentage;
  const sevenDay = snapshot.rateLimits?.sevenDayUsedPercentage;

  if (fiveHour !== undefined && sevenDay !== undefined) {
    return vscode.l10n.t(
      '5h {0}% | 7d {1}%',
      formatRateLimitPercent(fiveHour),
      formatRateLimitPercent(sevenDay),
    );
  }

  if (fiveHour !== undefined) {
    return vscode.l10n.t('5h {0}%', formatRateLimitPercent(fiveHour));
  }

  if (sevenDay !== undefined) {
    return vscode.l10n.t('7d {0}%', formatRateLimitPercent(sevenDay));
  }

  return undefined;
}

export function hasFrequentResetWarning(snapshot: TtlSnapshot): boolean {
  return !snapshot.sessionGracePending
    && snapshot.logicalTurnsSinceSessionSwitch >= 2
    && snapshot.cacheHealth.recentColdStarts >= 2;
}

export function shouldPrioritizeWarning(snapshot: TtlSnapshot, now = Date.now()): boolean {
  const remainingMs = getRemainingMs(snapshot, now);
  return Boolean(snapshot.error || hasFrequentResetWarning(snapshot) || (remainingMs !== undefined && remainingMs <= 0));
}

export function buildStatusPresentation(snapshot: TtlSnapshot, now = Date.now()): StatusPresentation {
  const project = projectName(snapshot.workspacePath);
  const projectSuffix = project ? ` | ${project}` : '';

  if (snapshot.error) {
    return {
      text: `$(warning) ${vscode.l10n.t('TTL error')}${projectSuffix}`,
      tooltip: `${vscode.l10n.t('Claude TTL Counter')}\n\n${snapshot.error}`,
      visualState: 'error',
    };
  }

  const modeLabel = getModeLabel(snapshot.mode);
  const session = shortSessionId(snapshot.sessionId);
  const tooltipLines = [
    vscode.l10n.t('Claude TTL Counter'),
    '',
    vscode.l10n.t('Mode: {0}', modeLabel),
    vscode.l10n.t('Workspace: {0}', project || vscode.l10n.t('none')),
    vscode.l10n.t('Session: {0}', session),
  ];

  if (!snapshot.lastUserPromptAt) {
    return {
      text: `$(clock) ${vscode.l10n.t('TTL --:--')}${projectSuffix}`,
      tooltip: [
        ...tooltipLines,
        vscode.l10n.t('Status: waiting for an active Claude session'),
      ].join('\n'),
      visualState: 'countdown',
    };
  }

  const remainingMs = getRemainingMs(snapshot, now) ?? 0;
  const expired = remainingMs <= 0;
  const timeText = expired ? vscode.l10n.t('expired') : formatRemaining(remainingMs);
  const remainingRatio = expired ? 0 : remainingMs / snapshot.ttlMs;
  const healthTurns = snapshot.sessionGracePending
    ? snapshot.logicalTurnsSinceSessionSwitch
    : snapshot.cacheHealth.recentTurns;
  const healthColdStarts = snapshot.sessionGracePending
    ? 0
    : snapshot.cacheHealth.recentColdStarts;

  const healthSummary = healthColdStarts > 0
    ? healthColdStarts > 1
      ? vscode.l10n.t('Health: {0} cold starts in last {1} turns', healthColdStarts, healthTurns)
      : vscode.l10n.t('Health: {0} cold start in last {1} turns', healthColdStarts, healthTurns)
    : vscode.l10n.t('Health: stable ({0} turns)', healthTurns);

  const recommendationLine = snapshot.recommendation && snapshot.recommendation.mode !== snapshot.mode
    ? vscode.l10n.t(snapshot.recommendation.reason)
    : undefined;

  const awaitingLine = snapshot.awaitingAssistantTurn
    ? vscode.l10n.t('Generating...')
    : undefined;
  const visualState: StatusVisualState = expired
    ? 'expired'
    : hasFrequentResetWarning(snapshot)
      ? 'warning'
      : snapshot.rollingState === 'turn_usage'
        ? 'turn_usage'
        : snapshot.rollingState === 'rate_limit' && hasRateLimitData(snapshot.rateLimits)
          ? 'rate_limit'
          : 'countdown';
  const turnUsageFlash = buildTurnUsageFlash(snapshot.lastCompletedTurn);
  const rateLimitFlash = buildRateLimitFlash(snapshot);

  const text = visualState === 'turn_usage' && turnUsageFlash
    ? `$(pulse) ${turnUsageFlash}`
    : visualState === 'rate_limit' && rateLimitFlash
      ? `$(dashboard) ${rateLimitFlash}`
      : visualState === 'warning'
        ? `$(warning) ${vscode.l10n.t('TTL {0}', formatRemaining(remainingMs))}${projectSuffix}`
        : expired
          ? `$(warning) ${vscode.l10n.t('TTL expired')}${projectSuffix}`
          : `$(clock) ${vscode.l10n.t('TTL {0}', formatRemaining(remainingMs))}${projectSuffix}`;

  return {
    text,
    tooltip: [
      ...tooltipLines,
      vscode.l10n.t('TTL: {0}', timeText),
      '',
      ...buildUsageLines(snapshot.lastCompletedTurn),
      healthSummary,
      ...buildRateLimitTooltipLines(snapshot),
      ...(awaitingLine ? [awaitingLine] : []),
      ...(recommendationLine ? ['', recommendationLine] : []),
    ].join('\n'),
    visualState,
    remainingRatio,
  };
}
