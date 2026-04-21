import * as vscode from 'vscode';

import { SettingsManager, TtlMode, getModeLabel } from './settings-manager';
import { buildStatusPresentation, hasFrequentResetWarning, shouldPrioritizeWarning } from './status-model';
import { StatusBarController } from './status-bar';
import { TtlSnapshot, TtlWatcher } from './ttl-watcher';

const TOGGLE_MODE_COMMAND = 'claudeTtl.toggleMode';
const ROLLING_STEP_MS = 3000;

function getPrimaryWorkspacePath(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

function getRemainingMs(snapshot: TtlSnapshot, now = Date.now()): number | undefined {
  if (!snapshot.lastUserPromptAt) {
    return undefined;
  }

  return snapshot.ttlMs - (now - snapshot.lastUserPromptAt);
}

function formatRemainingText(remainingMs?: number): string {
  if (remainingMs === undefined) {
    return '--:--';
  }

  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function buildModeOptionLabel(mode: TtlMode, selected: boolean): string {
  return vscode.l10n.t('{0} {1}', selected ? '$(check)' : '$(circle-outline)', getModeLabel(mode));
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const settingsManager = new SettingsManager();
  const watcher = new TtlWatcher({
    settingsManager,
    workspacePath: getPrimaryWorkspacePath(),
  });
  const statusBar = new StatusBarController(TOGGLE_MODE_COMMAND);

  let soonNotifiedKey: string | undefined;
  let expiredNotifiedKey: string | undefined;
  let cacheWarningKey: string | undefined;
  let lastRolledTurnKey: string | undefined;
  let rollingTimer: NodeJS.Timeout | undefined;

  const clearRollingTimer = (): void => {
    if (!rollingTimer) {
      return;
    }

    clearTimeout(rollingTimer);
    rollingTimer = undefined;
  };

  const clearRollingState = (): void => {
    clearRollingTimer();
    watcher.setRollingState('countdown');
  };

  const buildCompletedTurnKey = (snapshot: TtlSnapshot): string | undefined => {
    const turnTimestamp = snapshot.lastCompletedTurn?.timestamp;
    if (!snapshot.sessionId || !turnTimestamp) {
      return undefined;
    }

    return `${snapshot.sessionId}:${turnTimestamp}`;
  };

  const hasRateLimitData = (snapshot: TtlSnapshot): boolean =>
    snapshot.rateLimits?.fiveHourUsedPercentage !== undefined
    || snapshot.rateLimits?.sevenDayUsedPercentage !== undefined;

  const shouldSkipRolling = (snapshot: TtlSnapshot): boolean =>
    !snapshot.sessionId
    || !snapshot.lastUserPromptAt
    || shouldPrioritizeWarning(snapshot);

  const restoreCountdownAfterDelay = (): void => {
    clearRollingTimer();
    rollingTimer = setTimeout(() => {
      watcher.setRollingState('countdown');
      render();
    }, ROLLING_STEP_MS);
  };

  const scheduleRollingSequence = (): void => {
    clearRollingTimer();
    rollingTimer = setTimeout(() => {
      void watcher.refresh().then((snapshot) => {
        if (shouldSkipRolling(snapshot)) {
          clearRollingState();
          render();
          return;
        }

        if (hasRateLimitData(snapshot)) {
          watcher.setRollingState('rate_limit');
          render();
          restoreCountdownAfterDelay();
          return;
        }

        watcher.setRollingState('countdown');
        render();
      });
    }, ROLLING_STEP_MS);
  };

  const maybeStartRolling = (snapshot: TtlSnapshot): void => {
    const completedTurnKey = buildCompletedTurnKey(snapshot);
    if (!completedTurnKey) {
      return;
    }

    if (completedTurnKey === lastRolledTurnKey) {
      return;
    }

    lastRolledTurnKey = completedTurnKey;

    if (shouldSkipRolling(snapshot)) {
      clearRollingState();
      return;
    }

    watcher.setRollingState('turn_usage');
    scheduleRollingSequence();
  };

  const maybeNotify = (snapshot: TtlSnapshot): void => {
    const remainingMs = getRemainingMs(snapshot);
    if (remainingMs === undefined || !snapshot.sessionId || !snapshot.lastUserPromptAt) {
      soonNotifiedKey = undefined;
      expiredNotifiedKey = undefined;
      cacheWarningKey = undefined;
      return;
    }

    const notificationKey = `${snapshot.sessionId}:${snapshot.lastUserPromptAt}:${snapshot.mode}`;

    if (remainingMs <= 0) {
      if (expiredNotifiedKey !== notificationKey) {
        expiredNotifiedKey = notificationKey;
        void vscode.window.showWarningMessage(
          vscode.l10n.t('Prompt cache TTL expired. The next prompt will likely rebuild cache from scratch.'),
        );
      }
      return;
    }

    if (remainingMs <= 5 * 60 * 1000 && soonNotifiedKey !== notificationKey) {
      soonNotifiedKey = notificationKey;
      void vscode.window.showInformationMessage(
        vscode.l10n.t('Prompt cache TTL is under five minutes. If you expect a long pause, 1h mode may be safer.'),
      );
    }

    const lastUsage = snapshot.lastCompletedTurn;
    if (!lastUsage?.timestamp) {
      return;
    }

    const frequentResetKey = `${snapshot.sessionId}:${lastUsage.timestamp}:${snapshot.cacheHealth.recentColdStarts}`;
    if (hasFrequentResetWarning(snapshot) && cacheWarningKey !== frequentResetKey) {
      cacheWarningKey = frequentResetKey;

      void vscode.window.showWarningMessage(
        vscode.l10n.t('Recent prompt cache resets look frequent. This can waste tokens by rebuilding fresh input.'),
      );
    }
  };

  const render = (): void => {
    const snapshot = watcher.getSnapshot();

    if (shouldSkipRolling(snapshot) && snapshot.rollingState !== 'countdown') {
      clearRollingState();
    }

    maybeStartRolling(watcher.getSnapshot());

    const currentSnapshot = watcher.getSnapshot();
    statusBar.render(buildStatusPresentation(currentSnapshot));
    maybeNotify(currentSnapshot);
  };

  await watcher.start();
  lastRolledTurnKey = buildCompletedTurnKey(watcher.getSnapshot());
  render();

  const renderInterval = setInterval(render, 1000);

  const toggleModeDisposable = vscode.commands.registerCommand(TOGGLE_MODE_COMMAND, async () => {
    const currentMode = await settingsManager.getMode();
    const snapshot = watcher.getSnapshot();
    const remainingText = formatRemainingText(getRemainingMs(snapshot));

    const options: Array<vscode.QuickPickItem & { mode?: TtlMode }> = [
      {
        label: buildModeOptionLabel('1h', currentMode === '1h'),
        description: currentMode === '1h'
          ? vscode.l10n.t('Current | {0}', remainingText)
          : vscode.l10n.t('Switch'),
        mode: '1h',
      },
      {
        label: buildModeOptionLabel('5m', currentMode === '5m'),
        description: currentMode === '5m'
          ? vscode.l10n.t('Current | {0}', remainingText)
          : vscode.l10n.t('Switch'),
        mode: '5m',
      },
    ];

    const selected = await vscode.window.showQuickPick(options, {
      placeHolder: vscode.l10n.t('Claude TTL | {0} | {1}', getModeLabel(currentMode), remainingText),
    });

    if (!selected?.mode || selected.mode === currentMode) {
      return;
    }

    await settingsManager.setMode(selected.mode);
    await watcher.refresh();
    render();

    void vscode.window.showInformationMessage(
      vscode.l10n.t('TTL mode switched to {0}. Applies from your next prompt. If the previous cache already expired, the first turn may still trigger a rebuild.', getModeLabel(selected.mode)),
    );
  });

  const workspaceDisposable = vscode.workspace.onDidChangeWorkspaceFolders(() => {
    watcher.setWorkspacePath(getPrimaryWorkspacePath());
    void watcher.refresh().then((snapshot) => {
      lastRolledTurnKey = buildCompletedTurnKey(snapshot);
      clearRollingState();
      render();
    });
  });

  context.subscriptions.push(
    toggleModeDisposable,
    workspaceDisposable,
    {
      dispose: () => clearInterval(renderInterval),
    },
    {
      dispose: () => clearRollingTimer(),
    },
    {
      dispose: () => watcher.dispose(),
    },
    {
      dispose: () => statusBar.dispose(),
    },
  );
}

export function deactivate(): void {
  // VS Code lifecycle hook. Disposables are registered via context.subscriptions.
}
