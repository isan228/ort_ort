#!/usr/bin/env node
/**
 * Серверное обновление после git pull:
 *   npm install → db:sync → build frontend → (опционально rsync) → pm2 restart
 *
 *   cd /var/www/ort-2026 && git pull && npm run update
 *
 * Env:
 *   WEB_ROOT=/var/www/ort
 *   SKIP_RSYNC=1
 *   SKIP_DB_SYNC=1
 *   PM2_APP=ort-api
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const isWin = process.platform === 'win32';
const pm2App = process.env.PM2_APP || 'ort-api';
const webRoot = process.env.WEB_ROOT || '/var/www/ort';
const skipRsync = process.env.SKIP_RSYNC === '1' || isWin;
const skipDbSync = process.env.SKIP_DB_SYNC === '1';

function run(command, args) {
  console.log(`\n→ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: isWin,
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function which(cmd) {
  const probe = isWin ? 'where' : 'which';
  const result = spawnSync(probe, [cmd], { encoding: 'utf8', shell: isWin });
  return result.status === 0;
}

console.log('ORT.KG update');
console.log(`root: ${root}`);

run('npm', ['install']);

if (!skipDbSync) {
  run('npm', ['run', 'db:sync', '-w', 'backend']);
} else {
  console.log('\n→ skip db:sync (SKIP_DB_SYNC=1)');
}

run('npm', ['run', 'build', '-w', 'frontend']);

const dist = path.join(root, 'frontend', 'dist');
if (!skipRsync && fs.existsSync(dist) && which('rsync')) {
  if (!fs.existsSync(webRoot)) {
    console.warn(`\n! WEB_ROOT не найден: ${webRoot} — rsync пропущен`);
  } else {
    const from = dist.endsWith(path.sep) ? dist : `${dist}${path.sep}`;
    const to = webRoot.replace(/\/$/, '') + '/';
    const rsyncArgs = ['-a', '--delete', from, to];
    if (which('sudo')) {
      run('sudo', ['rsync', ...rsyncArgs]);
    } else {
      run('rsync', rsyncArgs);
    }
  }
} else if (!skipRsync) {
  console.log('\n→ rsync пропущен (нет rsync или dist)');
} else {
  console.log('\n→ skip rsync');
}

if (which('pm2')) {
  run('pm2', ['restart', pm2App, '--update-env']);
  run('pm2', ['status']);
} else {
  console.warn('\n! pm2 не найден — перезапустите API вручную');
}

console.log('\n✓ update done');
