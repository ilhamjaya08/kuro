import { db } from './index.js';

export interface Task {
  id?: number;
  name: string;
  cron_expression: string;
  http_method: string;
  url: string;
  headers?: string;
  auth_type?: string;
  auth_value?: string;
  body?: string;
  timeout: number;
  retry_count: number;
  status: 'running' | 'stopped';
  next_run?: number;
  last_run?: number;
  success_count: number;
  failure_count: number;
  created_at?: number;
  updated_at?: number;
}

export interface Log {
  id?: number;
  task_id: number;
  status: 'success' | 'error' | 'timeout';
  response_code?: number;
  response_body?: string;
  error_message?: string;
  duration_ms: number;
  executed_at?: number;
}

export interface DaemonState {
  id: 1;
  pid?: number;
  started_at?: number;
  status: 'running' | 'stopped';
}

export class TaskModel {
  static create(task: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Task {
    const stmt = db.prepare(`
      INSERT INTO tasks (
        name, cron_expression, http_method, url, headers,
        auth_type, auth_value, body, timeout, retry_count, status,
        next_run, success_count, failure_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
    `);

    const info = stmt.run(
      task.name,
      task.cron_expression,
      task.http_method,
      task.url,
      task.headers || null,
      task.auth_type || null,
      task.auth_value || null,
      task.body || null,
      task.timeout,
      task.retry_count,
      task.status,
      task.next_run || null
    );

    return this.findById(Number(info.lastInsertRowid))!;
  }

  static findById(id: number): Task | undefined {
    const stmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
    return stmt.get(id) as Task | undefined;
  }

  static findAll(): Task[] {
    const stmt = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC');
    return stmt.all() as Task[];
  }

  static findRunning(): Task[] {
    const stmt = db.prepare('SELECT * FROM tasks WHERE status = ?');
    return stmt.all('running') as Task[];
  }

  static update(id: number, updates: Partial<Task>): boolean {
    const fields = Object.keys(updates)
      .filter(k => k !== 'id' && k !== 'created_at')
      .map(k => `${k} = ?`)
      .join(', ');

    if (!fields) return false;

    const values = Object.entries(updates)
      .filter(([k]) => k !== 'id' && k !== 'created_at')
      .map(([, v]) => v);

    const stmt = db.prepare(`
      UPDATE tasks
      SET ${fields}, updated_at = strftime('%s', 'now')
      WHERE id = ?
    `);

    const info = stmt.run(...values, id);
    return info.changes > 0;
  }

  static delete(id: number): boolean {
    const stmt = db.prepare('DELETE FROM tasks WHERE id = ?');
    const info = stmt.run(id);
    return info.changes > 0;
  }

  static updateStatus(id: number, status: 'running' | 'stopped'): boolean {
    return this.update(id, { status });
  }

  static updateNextRun(id: number, nextRun: number): boolean {
    return this.update(id, { next_run: nextRun });
  }

  static updateLastRun(id: number, lastRun: number): boolean {
    return this.update(id, { last_run: lastRun });
  }

  static incrementSuccess(id: number): boolean {
    const stmt = db.prepare(`
      UPDATE tasks
      SET success_count = success_count + 1
      WHERE id = ?
    `);
    const info = stmt.run(id);
    return info.changes > 0;
  }

  static incrementFailure(id: number): boolean {
    const stmt = db.prepare(`
      UPDATE tasks
      SET failure_count = failure_count + 1
      WHERE id = ?
    `);
    const info = stmt.run(id);
    return info.changes > 0;
  }

  static getStats(id: number): { total: number; success: number; failure: number; successRate: number } | null {
    const task = this.findById(id);
    if (!task) return null;

    const total = task.success_count + task.failure_count;
    const successRate = total > 0 ? (task.success_count / total) * 100 : 0;

    return {
      total,
      success: task.success_count,
      failure: task.failure_count,
      successRate: Math.round(successRate * 10) / 10
    };
  }
}

export class LogModel {
  static create(log: Omit<Log, 'id' | 'executed_at'>): Log {
    const stmt = db.prepare(`
      INSERT INTO logs (
        task_id, status, response_code, response_body,
        error_message, duration_ms
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      log.task_id,
      log.status,
      log.response_code || null,
      log.response_body || null,
      log.error_message || null,
      log.duration_ms
    );

    return this.findById(Number(info.lastInsertRowid))!;
  }

  static findById(id: number): Log | undefined {
    const stmt = db.prepare('SELECT * FROM logs WHERE id = ?');
    return stmt.get(id) as Log | undefined;
  }

  static findByTaskId(taskId: number, limit: number = 50): Log[] {
    const stmt = db.prepare(`
      SELECT * FROM logs
      WHERE task_id = ?
      ORDER BY executed_at DESC
      LIMIT ?
    `);
    return stmt.all(taskId, limit) as Log[];
  }

  static findRecent(limit: number = 50): Log[] {
    const stmt = db.prepare(`
      SELECT l.*, t.name as task_name
      FROM logs l
      JOIN tasks t ON l.task_id = t.id
      ORDER BY l.executed_at DESC
      LIMIT ?
    `);
    return stmt.all(limit) as Log[];
  }

  static findErrors(limit: number = 50): Log[] {
    const stmt = db.prepare(`
      SELECT l.*, t.name as task_name
      FROM logs l
      JOIN tasks t ON l.task_id = t.id
      WHERE l.status IN ('error', 'timeout')
      ORDER BY l.executed_at DESC
      LIMIT ?
    `);
    return stmt.all(limit) as Log[];
  }

  static deleteByTaskId(taskId: number): number {
    const stmt = db.prepare('DELETE FROM logs WHERE task_id = ?');
    const info = stmt.run(taskId);
    return info.changes;
  }

  static count(): number {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM logs');
    const result = stmt.get() as { count: number };
    return result.count;
  }

  static countByStatus(status: string): number {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM logs WHERE status = ?');
    const result = stmt.get(status) as { count: number };
    return result.count;
  }
}

export class DaemonModel {
  static get(): DaemonState {
    const stmt = db.prepare('SELECT * FROM daemon_state WHERE id = 1');
    return stmt.get() as DaemonState;
  }

  static updateStatus(status: 'running' | 'stopped', pid?: number): boolean {
    const stmt = db.prepare(`
      UPDATE daemon_state
      SET status = ?, pid = ?, started_at = ?
      WHERE id = 1
    `);
    const startedAt = status === 'running' ? Math.floor(Date.now() / 1000) : null;
    const info = stmt.run(status, pid || null, startedAt);
    return info.changes > 0;
  }

  static isRunning(): boolean {
    const state = this.get();
    return state.status === 'running';
  }

  static getPid(): number | null {
    const state = this.get();
    return state.pid || null;
  }
}
