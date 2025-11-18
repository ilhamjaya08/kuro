import { Database } from 'bun:sqlite';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';

const getDataDir = (): string => {
  const platform = process.platform;
  const home = homedir();

  if (platform === 'win32') {
    return join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), 'Kuro');
  } else if (platform === 'darwin') {
    return join(home, 'Library', 'Application Support', 'Kuro');
  } else {
    return join(home, '.kuro');
  }
};

const DATA_DIR = getDataDir();
const DB_PATH = join(DATA_DIR, 'kuro.db');

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

export const db = new Database(DB_PATH, { create: true });
db.run('PRAGMA journal_mode = WAL');
db.run('PRAGMA foreign_keys = ON');

export const initializeDatabase = () => {
  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      cron_expression TEXT NOT NULL,
      http_method TEXT DEFAULT 'GET',
      url TEXT NOT NULL,
      headers TEXT,
      auth_type TEXT,
      auth_value TEXT,
      body TEXT,
      timeout INTEGER DEFAULT 30000,
      retry_count INTEGER DEFAULT 3,
      status TEXT DEFAULT 'stopped',
      next_run INTEGER,
      last_run INTEGER,
      success_count INTEGER DEFAULT 0,
      failure_count INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      response_code INTEGER,
      response_body TEXT,
      error_message TEXT,
      duration_ms INTEGER,
      executed_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_logs_task_id ON logs(task_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_logs_executed_at ON logs(executed_at)');
  db.run('CREATE INDEX IF NOT EXISTS idx_logs_status ON logs(status)');

  db.run(`
    CREATE TABLE IF NOT EXISTS daemon_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      pid INTEGER,
      started_at INTEGER,
      status TEXT DEFAULT 'stopped'
    );
  `);

  db.run(`INSERT OR IGNORE INTO daemon_state (id, status) VALUES (1, 'stopped')`);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('log_retention_days', '30')`);
  db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('max_concurrent_tasks', '10')`);
  db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('default_timeout', '30000')`);
  db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('default_retry_count', '3')`);
};

export const cleanupOldLogs = () => {
  const stmt = db.prepare(`
    SELECT value FROM settings WHERE key = 'log_retention_days'
  `);
  const result = stmt.get() as { value: string } | undefined;
  const retentionDays = result ? parseInt(result.value) : 30;
  const cutoffTimestamp = Math.floor(Date.now() / 1000) - (retentionDays * 24 * 60 * 60);

  const deleteStmt = db.prepare(`
    DELETE FROM logs WHERE executed_at < ?
  `);
  const info = deleteStmt.run(cutoffTimestamp);

  return info.changes;
};

export { DATA_DIR, DB_PATH };
