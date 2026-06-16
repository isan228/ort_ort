const { execSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');

function run(command, options = {}) {
  return execSync(command, {
    cwd: root,
    stdio: options.silent ? 'pipe' : 'inherit',
    encoding: 'utf8',
  });
}

function hasChanges() {
  const status = run('git status --porcelain', { silent: true }).trim();
  return status.length > 0;
}

function defaultMessage() {
  const now = new Date();
  const stamp = now.toISOString().replace('T', ' ').slice(0, 16);
  return `chore: sync ${stamp}`;
}

const message = process.argv.slice(2).join(' ').trim() || defaultMessage();

try {
  run('git rev-parse --git-dir', { silent: true });
} catch {
  console.error('Ошибка: это не git-репозиторий. Сначала выполните git init.');
  process.exit(1);
}

if (hasChanges()) {
  console.log('\n→ git add -A');
  run('git add -A');

  console.log(`→ git commit -m "${message}"`);
  run(`git commit -m ${JSON.stringify(message)}`);
} else {
  console.log('Нет локальных изменений — пропускаем commit.');
}

console.log('\n→ git push');
run('git push');

console.log('\nГотово.');
