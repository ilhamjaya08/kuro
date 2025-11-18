#!/usr/bin/env bun

import { initializeDatabase, cleanupOldLogs } from './db/index.js';
import { Menu } from './cli/menu.js';
import { Scheduler } from './core/scheduler.js';
import { DaemonModel } from './db/models.js';

const isDaemon = process.argv.includes('--daemon');

initializeDatabase();

cleanupOldLogs();

if (isDaemon) {
  console.log('Starting Kuro daemon...');

  const scheduler = new Scheduler();
  scheduler.start();

  DaemonModel.updateStatus('running', process.pid);

  setInterval(() => {
    const deleted = cleanupOldLogs();
    if (deleted > 0) {
      console.log(`Cleaned up ${deleted} old log entries`);
    }
  }, 24 * 60 * 60 * 1000); 

  const shutdown = () => {
    console.log('Shutting down daemon...');
    scheduler.stop();
    DaemonModel.updateStatus('stopped');
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  console.log('Daemon started successfully');
} else {
  const menu = new Menu();
  menu.show().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
