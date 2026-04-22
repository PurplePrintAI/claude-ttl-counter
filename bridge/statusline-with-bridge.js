#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');

const BRIDGE_PATH = path.join(os.homedir(), '.claude', 'ttl-counter-rate-limits.json');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  let data;
  try {
    data = JSON.parse(input);
  } catch {
    return;
  }

  const rl = data.rate_limits || {};
  const fiveH = rl.five_hour?.used_percentage;
  const week = rl.seven_day?.used_percentage;

  if (fiveH !== undefined || week !== undefined) {
    const payload = { updated_at: Date.now(), rate_limits: {} };
    if (rl.five_hour) payload.rate_limits.five_hour = rl.five_hour;
    if (rl.seven_day) payload.rate_limits.seven_day = rl.seven_day;

    try {
      const dir = path.dirname(BRIDGE_PATH);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(BRIDGE_PATH, JSON.stringify(payload, null, 2) + '\n');
    } catch {}
  }

  const model = data.model?.display_name || '';
  const ctx = data.context_window?.used_percentage;
  const ctxStr = ctx !== undefined ? `${Math.round(ctx)}%` : '';

  const parts = [model, ctxStr].filter(Boolean);
  if (fiveH !== undefined) parts.push(`5h:${fiveH.toFixed(1)}%`);
  if (week !== undefined) parts.push(`7d:${week.toFixed(1)}%`);

  if (parts.length > 0) {
    process.stdout.write(parts.join(' | '));
  }
});
