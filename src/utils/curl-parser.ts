import * as curlconverter from 'curlconverter';

export interface ParsedHttpRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  auth?: {
    type: 'bearer' | 'basic' | 'api_key' | 'custom';
    value: string;
  };
}

export const parseCurlCommand = (curlCommand: string): ParsedHttpRequest | null => {
  try {
    const jsCode = curlconverter.toJsonString(curlCommand);
    const parsed = JSON.parse(jsCode);

    const result: ParsedHttpRequest = {
      method: (parsed.method || 'GET').toUpperCase(),
      url: parsed.url || parsed.uri || '',
      headers: {},
    };

    if (parsed.headers) {
      if (typeof parsed.headers === 'object') {
        result.headers = parsed.headers;
      }
    }

    if (parsed.body || parsed.data) {
      result.body = parsed.body || parsed.data;

      try {
        const jsonBody = typeof result.body === 'string'
          ? JSON.parse(result.body)
          : result.body;
        result.body = JSON.stringify(jsonBody);
      } catch {
      }
    }

    const authHeader = result.headers['Authorization'] || result.headers['authorization'];

    if (authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        result.auth = {
          type: 'bearer',
          value: authHeader.substring(7)
        };
        delete result.headers['Authorization'];
        delete result.headers['authorization'];
      } else if (authHeader.startsWith('Basic ')) {
        result.auth = {
          type: 'basic',
          value: authHeader.substring(6)
        };
        delete result.headers['Authorization'];
        delete result.headers['authorization'];
      } else {
        result.auth = {
          type: 'custom',
          value: authHeader
        };
        delete result.headers['Authorization'];
        delete result.headers['authorization'];
      }
    }

    const apiKeyHeaders = ['X-API-Key', 'x-api-key', 'Api-Key', 'api-key', 'apikey', 'X-Api-Key'];
    for (const headerName of apiKeyHeaders) {
      if (result.headers[headerName]) {
        result.auth = {
          type: 'api_key',
          value: result.headers[headerName]
        };
        delete result.headers[headerName];
        break;
      }
    }

    return result;
  } catch (error) {
    console.error('Failed to parse curl command:', error);
    return null;
  }
};

export const formatAuthForDisplay = (auth?: { type: string; value: string }): string => {
  if (!auth) return 'None';

  const maskedValue = auth.value.length > 8
    ? auth.value.substring(0, 4) + '****' + auth.value.substring(auth.value.length - 4)
    : '****';

  switch (auth.type) {
    case 'bearer':
      return `Bearer Token (${maskedValue})`;
    case 'basic':
      return `Basic Auth (${maskedValue})`;
    case 'api_key':
      return `API Key (${maskedValue})`;
    case 'custom':
      return `Custom (${maskedValue})`;
    default:
      return 'Unknown';
  }
};

export const validateUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const formatHeadersForDisplay = (headers: Record<string, string>): string => {
  if (Object.keys(headers).length === 0) return 'None';
  return Object.keys(headers).join(', ');
};

export const formatBodyForDisplay = (body?: string, maxLength: number = 100): string => {
  if (!body) return 'None';

  try {
    const parsed = JSON.parse(body);
    const formatted = JSON.stringify(parsed, null, 2);
    if (formatted.length > maxLength) {
      return formatted.substring(0, maxLength) + '...';
    }
    return formatted;
  } catch {
    if (body.length > maxLength) {
      return body.substring(0, maxLength) + '...';
    }
    return body;
  }
};
