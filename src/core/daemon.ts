import { spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { DATA_DIR } from '../db/index.js';
import { DaemonModel } from '../db/models.js';

const PID_FILE = join(DATA_DIR, 'kuro.pid');
const LOG_FILE = join(DATA_DIR, 'daemon.log');

export class DaemonManager {
  static start(): boolean {
    if (this.isRunning()) {
      console.log('Daemon is already running');
      return false;
    }

    try {
      const execPath = process.execPath;
      const args = ['--daemon'];

      const daemon = spawn(execPath, args, {
        detached: true,
        stdio: 'ignore',
        cwd: process.cwd()
      });

      daemon.unref();
      writeFileSync(PID_FILE, daemon.pid!.toString());
      DaemonModel.updateStatus('running', daemon.pid!);

      console.log(`Daemon started with PID ${daemon.pid}`);
      return true;
    } catch (error) {
      console.error('Failed to start daemon:', error);
      return false;
    }
  }

  static stop(): boolean {
    const pid = this.getPid();
    if (!pid) {
      console.log('Daemon is not running');
      return false;
    }

    try {
      process.kill(pid, 'SIGTERM');

      setTimeout(() => {
        try {
          process.kill(pid, 0);
          process.kill(pid, 'SIGKILL');
        } catch {
        }
      }, 2000);

      if (existsSync(PID_FILE)) {
        unlinkSync(PID_FILE);
      }

      DaemonModel.updateStatus('stopped');

      console.log('Daemon stopped');
      return true;
    } catch (error) {
      if (existsSync(PID_FILE)) {
        unlinkSync(PID_FILE);
      }
      DaemonModel.updateStatus('stopped');
      console.log('Daemon process not found (cleaned up stale state)');
      return true;
    }
  }

  static restart(): boolean {
    this.stop();
    setTimeout(() => {
      this.start();
    }, 1000);
    return true;
  }

  static isRunning(): boolean {
    const pid = this.getPid();
    if (!pid) return false;

    try {
      process.kill(pid, 0);
      return true;
    } catch {
      if (existsSync(PID_FILE)) {
        unlinkSync(PID_FILE);
      }
      DaemonModel.updateStatus('stopped');
      return false;
    }
  }

  static getPid(): number | null {
    if (!existsSync(PID_FILE)) {
      return null;
    }

    try {
      const pidStr = readFileSync(PID_FILE, 'utf-8').trim();
      return parseInt(pidStr);
    } catch {
      return null;
    }
  }

  static getStatus(): { running: boolean; pid?: number; uptime?: number } {
    const state = DaemonModel.get();
    const running = this.isRunning();

    let uptime: number | undefined;
    if (running && state.started_at) {
      const now = Math.floor(Date.now() / 1000);
      uptime = now - state.started_at;
    }

    return {
      running,
      pid: running ? this.getPid() || undefined : undefined,
      uptime
    };
  }

  static getLogs(lines: number = 50): string[] {
    if (!existsSync(LOG_FILE)) {
      return [];
    }

    try {
      const content = readFileSync(LOG_FILE, 'utf-8');
      const allLines = content.split('\n').filter(line => line.trim());
      return allLines.slice(-lines);
    } catch {
      return [];
    }
  }
}

export const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
};
