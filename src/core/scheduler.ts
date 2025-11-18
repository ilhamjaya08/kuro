import parser from 'cron-parser';
import { TaskModel } from '../db/models.js';
import { HttpExecutor } from './executor.js';

export class Scheduler {
  private intervals: Map<number, NodeJS.Timeout> = new Map();
  private executor: HttpExecutor;
  private isRunning: boolean = false;

  constructor() {
    this.executor = new HttpExecutor();
  }

  start() {
    if (this.isRunning) {
      console.log('Scheduler is already running');
      return;
    }

    console.log('Starting scheduler...');
    this.isRunning = true;

    const runningTasks = TaskModel.findRunning();
    console.log(`Found ${runningTasks.length} running tasks`);

    for (const task of runningTasks) {
      this.scheduleTask(task.id!);
    }

    this.startMainLoop();
  }

  stop() {
    if (!this.isRunning) {
      console.log('Scheduler is not running');
      return;
    }

    console.log('Stopping scheduler...');
    this.isRunning = false;

    for (const [taskId, interval] of this.intervals.entries()) {
      clearInterval(interval);
      console.log(`Stopped task ${taskId}`);
    }

    this.intervals.clear();
  }

  private startMainLoop() {
    setInterval(() => {
      if (!this.isRunning) return;

      const runningTasks = TaskModel.findRunning();
      const currentTaskIds = new Set(this.intervals.keys());
      const activeTaskIds = new Set(runningTasks.map(t => t.id!));

      for (const taskId of currentTaskIds) {
        if (!activeTaskIds.has(taskId)) {
          this.unscheduleTask(taskId);
        }
      }

      for (const taskId of activeTaskIds) {
        if (!currentTaskIds.has(taskId)) {
          this.scheduleTask(taskId);
        }
      }
    }, 10000);
  }

  scheduleTask(taskId: number) {
    if (this.intervals.has(taskId)) {
      this.unscheduleTask(taskId);
    }

    const task = TaskModel.findById(taskId);
    if (!task) {
      console.error(`Task ${taskId} not found`);
      return;
    }

    if (task.status !== 'running') {
      console.log(`Task ${taskId} is not in running state`);
      return;
    }

    try {
      const interval = parser.parseExpression(task.cron_expression);
      const nextRun = interval.next().toDate();
      const nextRunTimestamp = Math.floor(nextRun.getTime() / 1000);

      TaskModel.updateNextRun(taskId, nextRunTimestamp);

      console.log(`Scheduled task ${taskId} (${task.name}) - Next run: ${nextRun.toISOString()}`);

      const now = Date.now();
      const timeUntilRun = nextRun.getTime() - now;

      const executeTask = () => {
        console.log(`Running task ${taskId} (${task.name})`);

        this.executor.executeById(taskId).then((result) => {
          if (result) {
            console.log(
              `Task ${taskId} completed: ${result.status} (${result.duration_ms}ms)`
            );
          }
        });

        try {
          const nextInterval = parser.parseExpression(task.cron_expression);
          const nextExecution = nextInterval.next().toDate();
          const nextTimestamp = Math.floor(nextExecution.getTime() / 1000);

          TaskModel.updateNextRun(taskId, nextTimestamp);

          const timeUntilNext = nextExecution.getTime() - Date.now();

          if (this.intervals.has(taskId)) {
            clearTimeout(this.intervals.get(taskId)!);
          }

          const timeoutId = setTimeout(executeTask, Math.max(0, timeUntilNext));
          this.intervals.set(taskId, timeoutId);

          console.log(`Next run for task ${taskId}: ${nextExecution.toISOString()}`);
        } catch (error) {
          console.error(`Failed to schedule next run for task ${taskId}:`, error);
        }
      };

      const timeoutId = setTimeout(executeTask, Math.max(0, timeUntilRun));
      this.intervals.set(taskId, timeoutId);
    } catch (error) {
      console.error(`Failed to schedule task ${taskId}:`, error);
    }
  }

  unscheduleTask(taskId: number) {
    const interval = this.intervals.get(taskId);
    if (interval) {
      clearTimeout(interval);
      this.intervals.delete(taskId);
      console.log(`Unscheduled task ${taskId}`);
    }
  }

  rescheduleTask(taskId: number) {
    this.unscheduleTask(taskId);
    this.scheduleTask(taskId);
  }

  getScheduledTasks(): number[] {
    return Array.from(this.intervals.keys());
  }

  isTaskScheduled(taskId: number): boolean {
    return this.intervals.has(taskId);
  }
}
