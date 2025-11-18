import * as p from '@clack/prompts';
import pc from 'picocolors';
import { TaskModel, Task } from '../db/models.js';
import { parseCurlCommand, formatAuthForDisplay, formatHeadersForDisplay, formatBodyForDisplay, validateUrl } from '../utils/curl-parser.js';
import { CRON_PRESETS, validateCronExpression, describeCronExpression, getNextRuns } from '../utils/cron-validator.js';
import { HttpExecutor } from '../core/executor.js';
import { getNextRun } from '../utils/cron-validator.js';

export const promptCreateTask = async (): Promise<Task | null> => {
  p.intro(pc.bgCyan(pc.black(' Create New Task ')));

  const name = await p.text({
    message: 'Task name?',
    placeholder: 'e.g., Daily API Health Check',
    validate: (value) => {
      if (!value) return 'Task name is required';
      if (value.length < 3) return 'Task name must be at least 3 characters';
    }
  });

  if (p.isCancel(name)) {
    p.cancel('Operation cancelled');
    return null;
  }

  const scheduleType = await p.select({
    message: 'Cron schedule?',
    options: [
      { value: 'preset', label: 'Choose from presets' },
      { value: 'custom', label: 'Enter custom cron expression' }
    ]
  });

  if (p.isCancel(scheduleType)) {
    p.cancel('Operation cancelled');
    return null;
  }

  let cronExpression: string;

  if (scheduleType === 'preset') {
    const preset = await p.select({
      message: 'Select schedule preset:',
      options: CRON_PRESETS.map(preset => ({
        value: preset.expression,
        label: preset.label,
        hint: preset.description
      }))
    });

    if (p.isCancel(preset)) {
      p.cancel('Operation cancelled');
      return null;
    }

    cronExpression = preset as string;
  } else {
    const customCron = await p.text({
      message: 'Enter cron expression (5 fields: min hour day month weekday):',
      placeholder: 'Example: */10 * * * *',
      validate: (value) => {
        if (!value || typeof value !== 'string') return 'Cron expression is required';
        const trimmed = value.trim();
        const validation = validateCronExpression(trimmed);
        if (!validation.valid) {
          return validation.error || 'Invalid cron expression. Format: */10 * * * * (5 fields)';
        }
      }
    });

    if (p.isCancel(customCron)) {
      p.cancel('Operation cancelled');
      return null;
    }

    cronExpression = (customCron as string).trim();
  }

  const finalValidation = validateCronExpression(cronExpression);
  if (!finalValidation.valid) {
    p.cancel(`Invalid cron expression: ${finalValidation.error}`);
    return null;
  }

  const description = describeCronExpression(cronExpression);
  const nextRuns = getNextRuns(cronExpression, 3);

  p.note(
    `${description}\n\nNext 3 runs:\n${nextRuns.map(d => `  • ${d.toLocaleString()}`).join('\n')}`,
    'Schedule Preview'
  );

  const configMethod = await p.select({
    message: 'How do you want to configure the HTTP request?',
    options: [
      { value: 'curl', label: 'Paste curl command', hint: 'Easiest - just paste your curl' },
      { value: 'manual', label: 'Manual configuration', hint: 'Configure step by step' }
    ]
  });

  if (p.isCancel(configMethod)) {
    p.cancel('Operation cancelled');
    return null;
  }

  let httpMethod = 'GET';
  let url = '';
  let headers: Record<string, string> = {};
  let authType: string | undefined;
  let authValue: string | undefined;
  let body: string | undefined;

  if (configMethod === 'curl') {
    const curlCommand = await p.text({
      message: 'Paste your curl command:',
      placeholder: 'curl -X POST https://api.example.com ...',
      validate: (value) => {
        if (!value) return 'Curl command is required';
        if (!value.trim().startsWith('curl')) return 'Must start with "curl"';
      }
    });

    if (p.isCancel(curlCommand)) {
      p.cancel('Operation cancelled');
      return null;
    }

    const parsed = parseCurlCommand(curlCommand as string);

    if (!parsed) {
      p.cancel('Failed to parse curl command. Please try manual configuration.');
      return null;
    }

    httpMethod = parsed.method;
    url = parsed.url;
    headers = parsed.headers;
    authType = parsed.auth?.type;
    authValue = parsed.auth?.value;
    body = parsed.body;

    p.note(
      `Method: ${pc.cyan(httpMethod)}\n` +
      `URL: ${pc.cyan(url)}\n` +
      `Headers: ${pc.dim(formatHeadersForDisplay(headers))}\n` +
      `Auth: ${pc.dim(formatAuthForDisplay(parsed.auth))}\n` +
      `Body: ${pc.dim(formatBodyForDisplay(body, 50))}`,
      'Parsed Request'
    );
  } else {
    const method = await p.select({
      message: 'HTTP method?',
      options: [
        { value: 'GET', label: 'GET' },
        { value: 'POST', label: 'POST' },
        { value: 'PUT', label: 'PUT' },
        { value: 'PATCH', label: 'PATCH' },
        { value: 'DELETE', label: 'DELETE' }
      ]
    });

    if (p.isCancel(method)) {
      p.cancel('Operation cancelled');
      return null;
    }

    httpMethod = method as string;

    const urlInput = await p.text({
      message: 'URL?',
      placeholder: 'https://api.example.com/endpoint',
      validate: (value) => {
        if (!value) return 'URL is required';
        if (!validateUrl(value)) return 'Must be a valid HTTP/HTTPS URL';
      }
    });

    if (p.isCancel(urlInput)) {
      p.cancel('Operation cancelled');
      return null;
    }

    url = urlInput as string;

    const needsAuth = await p.confirm({
      message: 'Add authentication?',
      initialValue: false
    });

    if (p.isCancel(needsAuth)) {
      p.cancel('Operation cancelled');
      return null;
    }

    if (needsAuth) {
      const authTypeInput = await p.select({
        message: 'Authentication type?',
        options: [
          { value: 'bearer', label: 'Bearer Token' },
          { value: 'api_key', label: 'API Key' },
          { value: 'basic', label: 'Basic Auth (base64)' },
          { value: 'custom', label: 'Custom Header' }
        ]
      });

      if (p.isCancel(authTypeInput)) {
        p.cancel('Operation cancelled');
        return null;
      }

      authType = authTypeInput as string;

      const authValueInput = await p.text({
        message: `${authType === 'bearer' ? 'Bearer token' : authType === 'basic' ? 'Base64 credentials' : authType === 'api_key' ? 'API key' : 'Auth value'}?`,
        placeholder: authType === 'bearer' ? 'your-token-here' : 'your-value-here'
      });

      if (p.isCancel(authValueInput)) {
        p.cancel('Operation cancelled');
        return null;
      }

      authValue = authValueInput as string;
    }

    const needsHeaders = await p.confirm({
      message: 'Add custom headers?',
      initialValue: false
    });

    if (p.isCancel(needsHeaders)) {
      p.cancel('Operation cancelled');
      return null;
    }

    if (needsHeaders) {
      const headersInput = await p.text({
        message: 'Headers (JSON format)?',
        placeholder: '{"Content-Type": "application/json"}',
        validate: (value) => {
          if (!value) return;
          try {
            JSON.parse(value);
          } catch {
            return 'Must be valid JSON';
          }
        }
      });

      if (p.isCancel(headersInput)) {
        p.cancel('Operation cancelled');
        return null;
      }

      if (headersInput) {
        headers = JSON.parse(headersInput as string);
      }
    }

    if (['POST', 'PUT', 'PATCH'].includes(httpMethod)) {
      const needsBody = await p.confirm({
        message: 'Add request body?',
        initialValue: false
      });

      if (p.isCancel(needsBody)) {
        p.cancel('Operation cancelled');
        return null;
      }

      if (needsBody) {
        const bodyInput = await p.text({
          message: 'Request body (JSON)?',
          placeholder: '{"key": "value"}',
          validate: (value) => {
            if (!value) return;
            try {
              JSON.parse(value);
            } catch {
              return 'Must be valid JSON';
            }
          }
        });

        if (p.isCancel(bodyInput)) {
          p.cancel('Operation cancelled');
          return null;
        }

        if (bodyInput) {
          body = bodyInput as string;
        }
      }
    }
  }

  const timeout = await p.text({
    message: 'Request timeout (ms)?',
    placeholder: '30000',
    initialValue: '30000',
    validate: (value) => {
      const num = parseInt(value);
      if (isNaN(num) || num < 1000) return 'Must be at least 1000ms';
    }
  });

  if (p.isCancel(timeout)) {
    p.cancel('Operation cancelled');
    return null;
  }

  const retryCount = await p.text({
    message: 'Retry attempts on failure?',
    placeholder: '3',
    initialValue: '3',
    validate: (value) => {
      const num = parseInt(value);
      if (isNaN(num) || num < 0 || num > 10) return 'Must be between 0 and 10';
    }
  });

  if (p.isCancel(retryCount)) {
    p.cancel('Operation cancelled');
    return null;
  }

  const confirm = await p.confirm({
    message: 'Create and start this task?',
    initialValue: true
  });

  if (p.isCancel(confirm) || !confirm) {
    p.cancel('Operation cancelled');
    return null;
  }

  if (!name || !cronExpression || !url) {
    p.cancel('Missing required fields');
    return null;
  }

  const task: Omit<Task, 'id' | 'created_at' | 'updated_at'> = {
    name: name as string,
    cron_expression: cronExpression,
    http_method: httpMethod,
    url,
    headers: Object.keys(headers).length > 0 ? JSON.stringify(headers) : undefined,
    auth_type: authType,
    auth_value: authValue,
    body,
    timeout: parseInt(timeout as string),
    retry_count: parseInt(retryCount as string),
    status: 'running',
    next_run: Math.floor((getNextRun(cronExpression)?.getTime() || Date.now()) / 1000),
    success_count: 0,
    failure_count: 0
  };

  const created = TaskModel.create(task);

  p.outro(pc.green(`✔ Task "${created.name}" created successfully! (ID: ${created.id})`));

  return created;
};

export const promptTaskAction = async (task: Task): Promise<string | null> => {
  const stats = TaskModel.getStats(task.id!);

  const action = await p.select({
    message: `Task: ${task.name}`,
    options: [
      { value: 'edit', label: 'Edit task' },
      { value: 'run', label: 'Run now (manual trigger)' },
      { value: task.status === 'running' ? 'stop' : 'start', label: task.status === 'running' ? 'Stop task' : 'Start task' },
      { value: 'logs', label: 'View task logs' },
      { value: 'delete', label: 'Delete task', hint: 'Cannot be undone' },
      { value: 'back', label: 'Back to task list' }
    ]
  });

  if (p.isCancel(action)) {
    return null;
  }

  return action as string;
};
