import parser from 'cron-parser';

export interface CronPreset {
  label: string;
  expression: string;
  description: string;
}

export const CRON_PRESETS: CronPreset[] = [
  {
    label: 'Every minute',
    expression: '* * * * *',
    description: 'Runs every minute'
  },
  {
    label: 'Every 5 minutes',
    expression: '*/5 * * * *',
    description: 'Runs every 5 minutes'
  },
  {
    label: 'Every 10 minutes',
    expression: '*/10 * * * *',
    description: 'Runs every 10 minutes'
  },
  {
    label: 'Every 15 minutes',
    expression: '*/15 * * * *',
    description: 'Runs every 15 minutes'
  },
  {
    label: 'Every 30 minutes',
    expression: '*/30 * * * *',
    description: 'Runs every 30 minutes'
  },
  {
    label: 'Every hour',
    expression: '0 * * * *',
    description: 'Runs at the start of every hour'
  },
  {
    label: 'Every 6 hours',
    expression: '0 */6 * * *',
    description: 'Runs every 6 hours'
  },
  {
    label: 'Every 12 hours',
    expression: '0 */12 * * *',
    description: 'Runs every 12 hours'
  },
  {
    label: 'Daily at midnight',
    expression: '0 0 * * *',
    description: 'Runs every day at 00:00'
  },
  {
    label: 'Daily at noon',
    expression: '0 12 * * *',
    description: 'Runs every day at 12:00'
  },
  {
    label: 'Weekly (Monday)',
    expression: '0 0 * * 1',
    description: 'Runs every Monday at 00:00'
  },
  {
    label: 'Monthly (1st day)',
    expression: '0 0 1 * *',
    description: 'Runs on the 1st day of every month at 00:00'
  }
];

export const validateCronExpression = (expression: string): { valid: boolean; error?: string; nextRun?: Date } => {
  try {
    const interval = parser.parseExpression(expression);
    const nextRun = interval.next().toDate();

    return {
      valid: true,
      nextRun
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid cron expression'
    };
  }
};

export const getNextRun = (expression: string): Date | null => {
  try {
    const interval = parser.parseExpression(expression);
    return interval.next().toDate();
  } catch {
    return null;
  }
};

export const getNextRuns = (expression: string, count: number = 5): Date[] => {
  try {
    const interval = parser.parseExpression(expression);
    const runs: Date[] = [];

    for (let i = 0; i < count; i++) {
      runs.push(interval.next().toDate());
    }

    return runs;
  } catch {
    return [];
  }
};

export const describeCronExpression = (expression: string): string => {
  const preset = CRON_PRESETS.find(p => p.expression === expression);
  if (preset) {
    return preset.description;
  }

  try {
    const parts = expression.split(' ');
    if (parts.length !== 5) {
      return 'Custom schedule';
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    let description = 'Runs ';

    if (minute === '*') {
      description += 'every minute';
    } else if (minute.startsWith('*/')) {
      description += `every ${minute.substring(2)} minutes`;
    } else {
      description += `at minute ${minute}`;
    }

    if (hour !== '*') {
      if (hour.startsWith('*/')) {
        description += ` of every ${hour.substring(2)} hours`;
      } else {
        description += ` of hour ${hour}`;
      }
    }

    if (dayOfMonth !== '*') {
      description += ` on day ${dayOfMonth}`;
    }

    if (month !== '*') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIndex = parseInt(month) - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        description += ` in ${months[monthIndex]}`;
      }
    }

    if (dayOfWeek !== '*') {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayIndex = parseInt(dayOfWeek);
      if (dayIndex >= 0 && dayIndex < 7) {
        description += ` on ${days[dayIndex]}`;
      }
    }

    return description;
  } catch {
    return 'Custom schedule';
  }
};

export const formatNextRun = (timestamp: number): string => {
  const now = Date.now();
  const diff = timestamp - now;

  if (diff < 0) {
    return 'Overdue';
  }

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `in ${days} day${days > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `in ${hours} hour${hours > 1 ? 's' : ''}`;
  } else if (minutes > 0) {
    return `in ${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else {
    return `in ${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
};
