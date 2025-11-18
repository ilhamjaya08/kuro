import * as p from '@clack/prompts';
import pc from 'picocolors';
import { showLogo, showSuccess, showError, showWarning, showInfo } from './ascii.js';
import { promptCreateTask, promptTaskAction } from './prompts.js';
import { TaskModel, LogModel, Task, DaemonModel } from '../db/models.js';
import { HttpExecutor } from '../core/executor.js';
import { formatNextRun } from '../utils/cron-validator.js';
import { parseCurlCommand, formatAuthForDisplay } from '../utils/curl-parser.js';
import { Scheduler } from '../core/scheduler.js';

export class Menu {
  private executor: HttpExecutor;
  private scheduler: Scheduler | null = null;

  constructor() {
    this.executor = new HttpExecutor();
  }

  async show() {
    while (true) {
      showLogo();

      const isSchedulerRunning = this.scheduler !== null;
      if (isSchedulerRunning) {
        const scheduledCount = this.scheduler!.getScheduledTasks().length;
        console.log(
          pc.green(`  ● Scheduler running`) +
          pc.dim(` (${scheduledCount} tasks scheduled)`)
        );
      } else {
        console.log(pc.red(`  ○ Scheduler stopped`) + pc.dim(' (tasks will not execute)'));
      }

      const allTasks = TaskModel.findAll();
      const runningTasks = allTasks.filter(t => t.status === 'running').length;
      const stoppedTasks = allTasks.filter(t => t.status === 'stopped').length;

      console.log(
        pc.dim(`  Tasks: `) +
        pc.cyan(`${runningTasks} running`) +
        pc.dim(', ') +
        pc.yellow(`${stoppedTasks} stopped`)
      );

      console.log('');

      const action = await p.select({
        message: 'What would you like to do?',
        options: [
          { value: 'create', label: 'Create new task', hint: 'Add a new scheduled HTTP request' },
          {
            value: 'manage',
            label: `Manage tasks`,
            hint: `${allTasks.length} total`
          },
          { value: 'logs', label: 'View logs', hint: 'See execution history' },
          {
            value: 'scheduler',
            label: 'Scheduler control',
            hint: isSchedulerRunning ? 'Running' : 'Stopped'
          },
          { value: 'credits', label: 'Credits' },
          { value: 'exit', label: 'Exit' }
        ]
      });

      if (p.isCancel(action) || action === 'exit') {
        p.outro(pc.cyan('Goodbye! 👋'));
        process.exit(0);
      }

      switch (action) {
        case 'create':
          await this.createTask();
          break;
        case 'manage':
          await this.manageTasks();
          break;
        case 'logs':
          await this.viewLogs();
          break;
        case 'scheduler':
          await this.schedulerControl();
          break;
        case 'credits':
          await this.showCredits();
          break;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  private async createTask() {
    const task = await promptCreateTask();

    if (task) {
      if (!this.scheduler) {
        showWarning('Scheduler is not running. Task created but will not execute until scheduler starts.');

        const startScheduler = await p.confirm({
          message: 'Start scheduler now?',
          initialValue: true
        });

        if (startScheduler && !p.isCancel(startScheduler)) {
          this.startScheduler();
          showSuccess('Scheduler started');
        }
      } else {
        this.scheduler.scheduleTask(task.id!);
        showSuccess('Task scheduled for execution');
      }
    }
  }

  private startScheduler() {
    if (this.scheduler) {
      showInfo('Scheduler is already running');
      return;
    }

    this.scheduler = new Scheduler();
    this.scheduler.start();
    DaemonModel.updateStatus('running', process.pid);
  }

  private stopScheduler() {
    if (!this.scheduler) {
      showInfo('Scheduler is not running');
      return;
    }

    this.scheduler.stop();
    this.scheduler = null;
    DaemonModel.updateStatus('stopped');
  }

  private async manageTasks() {
    while (true) {
      const tasks = TaskModel.findAll();

      if (tasks.length === 0) {
        showInfo('No tasks found. Create one first!');
        await new Promise(resolve => setTimeout(resolve, 2000));
        return;
      }

      const taskOptions = tasks.map(task => {
        const stats = TaskModel.getStats(task.id!);
        const nextRun = task.next_run ? formatNextRun(task.next_run * 1000) : 'Not scheduled';
        const statusIcon = task.status === 'running' ? pc.green('●') : pc.yellow('○');
        const successRate = stats ? `${stats.successRate}%` : 'N/A';

        return {
          value: task.id!,
          label: `${statusIcon} ${task.name}`,
          hint: `${task.cron_expression} | ${task.status === 'running' ? nextRun : 'Stopped'} | Success: ${successRate}`
        };
      });

      taskOptions.push({ value: -1, label: 'Back to main menu', hint: '' });

      const selected = await p.select({
        message: 'Select task to manage:',
        options: taskOptions
      });

      if (p.isCancel(selected) || selected === -1) {
        return;
      }

      const task = TaskModel.findById(selected as number);
      if (!task) {
        showError('Task not found');
        continue;
      }

      await this.manageTask(task);
    }
  }

  private async manageTask(task: Task) {
    while (true) {
      showLogo();

      const stats = TaskModel.getStats(task.id!);
      const nextRun = task.next_run ? new Date(task.next_run * 1000).toLocaleString() : 'Not scheduled';
      const lastRun = task.last_run ? new Date(task.last_run * 1000).toLocaleString() : 'Never';

      console.log(pc.bold(pc.cyan(`Task: ${task.name}`)));
      console.log(pc.dim(`ID: ${task.id}`));
      console.log('');
      console.log(pc.bold('Schedule:'));
      console.log(`  Expression: ${task.cron_expression}`);
      console.log(`  Status: ${task.status === 'running' ? pc.green('Running') : pc.yellow('Stopped')}`);
      console.log(`  Next run: ${nextRun}`);
      console.log(`  Last run: ${lastRun}`);
      console.log('');
      console.log(pc.bold('HTTP Request:'));
      console.log(`  Method: ${task.http_method}`);
      console.log(`  URL: ${task.url}`);
      if (task.auth_type) {
        console.log(`  Auth: ${formatAuthForDisplay({ type: task.auth_type, value: task.auth_value || '' })}`);
      }
      console.log('');
      console.log(pc.bold('Statistics:'));
      if (stats) {
        console.log(`  Total runs: ${stats.total}`);
        console.log(`  Success: ${pc.green(stats.success.toString())} (${stats.successRate}%)`);
        console.log(`  Failed: ${pc.red(stats.failure.toString())}`);
      } else {
        console.log('  No runs yet');
      }
      console.log('');

      const action = await promptTaskAction(task);

      if (!action || action === 'back') {
        return;
      }

      switch (action) {
        case 'edit':
          await this.editTask(task);
          break;
        case 'run':
          await this.runTaskNow(task);
          break;
        case 'start':
          TaskModel.updateStatus(task.id!, 'running');
          if (this.scheduler) {
            this.scheduler.scheduleTask(task.id!);
          }
          showSuccess('Task started' + (this.scheduler ? ' and scheduled' : ' (scheduler not running)'));
          task.status = 'running';
          break;
        case 'stop':
          TaskModel.updateStatus(task.id!, 'stopped');
          if (this.scheduler) {
            this.scheduler.unscheduleTask(task.id!);
          }
          showSuccess('Task stopped');
          task.status = 'stopped';
          break;
        case 'logs':
          await this.viewTaskLogs(task.id!);
          break;
        case 'delete':
          const confirm = await p.confirm({
            message: `Delete task "${task.name}"? This cannot be undone.`,
            initialValue: false
          });

          if (confirm && !p.isCancel(confirm)) {
            TaskModel.delete(task.id!);
            showSuccess('Task deleted');
            return;
          }
          break;
      }

      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  private async editTask(task: Task) {
    p.intro(pc.bgCyan(pc.black(' Edit Task ')));

    const editMethod = await p.select({
      message: 'How do you want to update the request?',
      options: [
        { value: 'keep', label: 'Keep current configuration' },
        { value: 'curl', label: 'Paste new curl command' },
        { value: 'url', label: 'Update URL only' }
      ]
    });

    if (p.isCancel(editMethod)) {
      return;
    }

    if (editMethod === 'curl') {
      const curlCommand = await p.text({
        message: 'Paste your curl command:',
        validate: (value) => {
          if (!value) return 'Curl command is required';
          if (!value.trim().startsWith('curl')) return 'Must start with "curl"';
        }
      });

      if (p.isCancel(curlCommand)) {
        return;
      }

      const parsed = parseCurlCommand(curlCommand as string);
      if (!parsed) {
        showError('Failed to parse curl command');
        return;
      }

      TaskModel.update(task.id!, {
        http_method: parsed.method,
        url: parsed.url,
        headers: Object.keys(parsed.headers).length > 0 ? JSON.stringify(parsed.headers) : undefined,
        auth_type: parsed.auth?.type,
        auth_value: parsed.auth?.value,
        body: parsed.body
      });

      showSuccess('Task updated');
    } else if (editMethod === 'url') {
      const newUrl = await p.text({
        message: 'New URL?',
        initialValue: task.url
      });

      if (p.isCancel(newUrl)) {
        return;
      }

      TaskModel.update(task.id!, { url: newUrl as string });
      showSuccess('URL updated');
    }
  }

  private async runTaskNow(task: Task) {
    const s = p.spinner();
    s.start('Running task...');

    const result = await this.executor.execute(task);

    s.stop();

    if (result.success) {
      showSuccess(`Task completed in ${result.duration_ms}ms (${result.response_code})`);
    } else {
      showError(`Task failed: ${result.error_message} (${result.duration_ms}ms)`);
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  private async viewTaskLogs(taskId: number) {
    const logs = LogModel.findByTaskId(taskId, 20);

    if (logs.length === 0) {
      showInfo('No logs found for this task');
      await new Promise(resolve => setTimeout(resolve, 2000));
      return;
    }

    console.clear();
    console.log(pc.bold(pc.cyan('\nTask Logs (Last 20)')));
    console.log('');

    for (const log of logs) {
      const timestamp = new Date((log.executed_at || 0) * 1000).toLocaleString();
      const statusIcon = log.status === 'success' ? pc.green('✔') : pc.red('✖');
      const statusText = log.status === 'success'
        ? pc.green(`${log.response_code} OK`)
        : pc.red(log.error_message || 'Error');

      console.log(`${statusIcon} ${pc.dim(timestamp)} | ${statusText} ${pc.dim(`(${log.duration_ms}ms)`)}`);

      if (log.status !== 'success' && log.error_message) {
        console.log(pc.dim(`   └─ ${log.error_message}`));
      }
    }

    console.log('');
    await p.text({
      message: 'Press Enter to continue...',
      placeholder: ''
    });
  }

  private async viewLogs() {
    const filterType = await p.select({
      message: 'Filter logs:',
      options: [
        { value: 'all', label: 'All logs' },
        { value: 'errors', label: 'Errors only' },
        { value: 'task', label: 'By task' }
      ]
    });

    if (p.isCancel(filterType)) {
      return;
    }

    let logs: any[] = [];

    if (filterType === 'errors') {
      logs = LogModel.findErrors(50);
    } else if (filterType === 'task') {
      const tasks = TaskModel.findAll();
      const taskOptions = tasks.map(t => ({ value: t.id!, label: t.name }));

      const taskId = await p.select({
        message: 'Select task:',
        options: taskOptions
      });

      if (p.isCancel(taskId)) {
        return;
      }

      logs = LogModel.findByTaskId(taskId as number, 50);
    } else {
      logs = LogModel.findRecent(50);
    }

    if (logs.length === 0) {
      showInfo('No logs found');
      await new Promise(resolve => setTimeout(resolve, 2000));
      return;
    }

    console.clear();
    console.log(pc.bold(pc.cyan(`\nLogs (Last ${logs.length})`)));
    console.log('');

    for (const log of logs) {
      const timestamp = new Date((log.executed_at || 0) * 1000).toLocaleString();
      const statusIcon = log.status === 'success' ? pc.green('✔') : pc.red('✖');
      const taskName = log.task_name || `Task #${log.task_id}`;
      const statusText = log.status === 'success'
        ? pc.green(`${log.response_code} OK`)
        : pc.red(log.error_message || 'Error');

      console.log(
        `${statusIcon} ${pc.dim(timestamp)} | ${pc.cyan(taskName)} | ${statusText} ${pc.dim(`(${log.duration_ms}ms)`)}`
      );
    }

    console.log('');
    await p.text({
      message: 'Press Enter to continue...',
      placeholder: ''
    });
  }

  private async schedulerControl() {
    const isRunning = this.scheduler !== null;

    const action = await p.select({
      message: 'Scheduler control:',
      options: [
        { value: 'status', label: 'Show status' },
        { value: isRunning ? 'stop' : 'start', label: isRunning ? 'Stop scheduler' : 'Start scheduler' },
        { value: 'restart', label: 'Restart scheduler', hint: 'Stop and start' },
        { value: 'back', label: 'Back' }
      ]
    });

    if (p.isCancel(action) || action === 'back') {
      return;
    }

    switch (action) {
      case 'status':
        console.log('');
        console.log(pc.bold('Scheduler Status:'));
        console.log(`  Running: ${isRunning ? pc.green('Yes') : pc.red('No')}`);
        if (isRunning) {
          const scheduledTasks = this.scheduler!.getScheduledTasks();
          console.log(`  Scheduled tasks: ${scheduledTasks.length}`);
          console.log(`  PID: ${process.pid}`);
        }
        console.log('');
        await p.text({
          message: 'Press Enter to continue...',
          placeholder: ''
        });
        break;

      case 'start':
        this.startScheduler();
        showSuccess('Scheduler started');
        await new Promise(resolve => setTimeout(resolve, 1500));
        break;

      case 'stop':
        this.stopScheduler();
        showSuccess('Scheduler stopped');
        await new Promise(resolve => setTimeout(resolve, 1500));
        break;

      case 'restart':
        this.stopScheduler();
        await new Promise(resolve => setTimeout(resolve, 500));
        this.startScheduler();
        showSuccess('Scheduler restarted');
        await new Promise(resolve => setTimeout(resolve, 1500));
        break;
    }
  }

  private async showCredits() {
    console.clear();
    console.log('\n' + pc.bold(pc.cyan('Credits')) + '\n');
    console.log(pc.dim('Created with ❤️ by the Kuro contributors.'));
    console.log('');
    console.log(pc.bold('Built with:'));
    console.log('  • Bun - Fast JavaScript runtime');
    console.log('  • better-sqlite3 - Fast SQLite library');
    console.log('  • @clack/prompts - Beautiful CLI prompts');
    console.log('  • cron-parser - Cron expression parser');
    console.log('  • curlconverter - Curl command parser');
    console.log('');
    console.log(pc.dim('License: MIT'));
    console.log(pc.dim('GitHub: github.com/ilhamjaya08/kuro'));
    console.log('');

    await p.text({
      message: 'Press Enter to continue...',
      placeholder: ''
    });
  }
}
