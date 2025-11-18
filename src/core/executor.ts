import { Task, LogModel, TaskModel } from '../db/models.js';

export interface ExecutionResult {
  success: boolean;
  status: 'success' | 'error' | 'timeout';
  response_code?: number;
  response_body?: string;
  error_message?: string;
  duration_ms: number;
}

export class HttpExecutor {
  private async executeWithRetry(task: Task, attempt: number = 0): Promise<ExecutionResult> {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), task.timeout);

    try {
      const headers: Record<string, string> = {};

      if (task.headers) {
        try {
          const customHeaders = JSON.parse(task.headers);
          Object.assign(headers, customHeaders);
        } catch (error) {
          console.error('Failed to parse headers:', error);
        }
      }

      if (task.auth_type && task.auth_value) {
        switch (task.auth_type) {
          case 'bearer':
            headers['Authorization'] = `Bearer ${task.auth_value}`;
            break;
          case 'basic':
            headers['Authorization'] = `Basic ${task.auth_value}`;
            break;
          case 'api_key':
            headers['X-API-Key'] = task.auth_value;
            break;
          case 'custom':
            headers['Authorization'] = task.auth_value;
            break;
        }
      }

      let body: string | undefined;
      if (task.body && ['POST', 'PUT', 'PATCH'].includes(task.http_method)) {
        body = task.body;

        if (!headers['Content-Type'] && !headers['content-type']) {
          try {
            JSON.parse(body);
            headers['Content-Type'] = 'application/json';
          } catch {
            headers['Content-Type'] = 'text/plain';
          }
        }
      }

      const response = await fetch(task.url, {
        method: task.http_method,
        headers,
        body,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;

      let responseBody: string;
      const contentType = response.headers.get('content-type') || '';

      try {
        if (contentType.includes('application/json')) {
          const json = await response.json();
          responseBody = JSON.stringify(json, null, 2);
        } else {
          responseBody = await response.text();
        }

        if (responseBody.length > 10000) {
          responseBody = responseBody.substring(0, 10000) + '\n... (truncated)';
        }
      } catch {
        responseBody = '(Failed to read response body)';
      }

      const result: ExecutionResult = {
        success: response.ok,
        status: response.ok ? 'success' : 'error',
        response_code: response.status,
        response_body: responseBody,
        duration_ms: duration
      };

      if (!response.ok) {
        result.error_message = `HTTP ${response.status} ${response.statusText}`;
      }

      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      if (error instanceof Error && error.name === 'AbortError') {
        if (attempt < task.retry_count) {
          console.log(`Task ${task.id} timed out, retrying (${attempt + 1}/${task.retry_count})...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          return this.executeWithRetry(task, attempt + 1);
        }

        return {
          success: false,
          status: 'timeout',
          error_message: `Request timed out after ${task.timeout}ms (${task.retry_count} retries failed)`,
          duration_ms: duration
        };
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (attempt < task.retry_count) {
        console.log(`Task ${task.id} failed, retrying (${attempt + 1}/${task.retry_count})...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        return this.executeWithRetry(task, attempt + 1);
      }

      return {
        success: false,
        status: 'error',
        error_message: `${errorMessage} (${task.retry_count} retries failed)`,
        duration_ms: duration
      };
    }
  }

  async execute(task: Task): Promise<ExecutionResult> {
    console.log(`Executing task: ${task.name} (${task.http_method} ${task.url})`);

    const result = await this.executeWithRetry(task, 0);

    LogModel.create({
      task_id: task.id!,
      status: result.status,
      response_code: result.response_code,
      response_body: result.response_body,
      error_message: result.error_message,
      duration_ms: result.duration_ms
    });

    if (result.success) {
      TaskModel.incrementSuccess(task.id!);
    } else {
      TaskModel.incrementFailure(task.id!);
    }

    TaskModel.updateLastRun(task.id!, Math.floor(Date.now() / 1000));

    return result;
  }

  async executeById(taskId: number): Promise<ExecutionResult | null> {
    const task = TaskModel.findById(taskId);
    if (!task) {
      console.error(`Task ${taskId} not found`);
      return null;
    }

    return this.execute(task);
  }
}
