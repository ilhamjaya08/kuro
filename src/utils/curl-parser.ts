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

/**
 * Manual curl command parser - compatible with bun compile
 * Supports common curl patterns without external dependencies
 */
export const parseCurlCommand = (curlCommand: string): ParsedHttpRequest | null => {
  try {
    // Remove leading/trailing whitespace and normalize
    let cmd = curlCommand.trim();

    // Remove 'curl' prefix if present
    if (cmd.startsWith('curl ')) {
      cmd = cmd.substring(5);
    }

    const result: ParsedHttpRequest = {
      method: 'GET',
      url: '',
      headers: {},
    };

    // Parse method (-X or --request)
    const methodMatch = cmd.match(/(?:-X|--request)\s+([A-Z]+)/);
    if (methodMatch) {
      result.method = methodMatch[1].toUpperCase();
      cmd = cmd.replace(methodMatch[0], '');
    }

    // Parse headers (-H or --header)
    const headerRegex = /(?:-H|--header)\s+(['"])(.*?)\1/g;
    let headerMatch;
    while ((headerMatch = headerRegex.exec(cmd)) !== null) {
      const headerStr = headerMatch[2];
      const colonIndex = headerStr.indexOf(':');
      if (colonIndex !== -1) {
        const key = headerStr.substring(0, colonIndex).trim();
        const value = headerStr.substring(colonIndex + 1).trim();
        result.headers[key] = value;
      }
      cmd = cmd.replace(headerMatch[0], '');
    }

    // Parse body data (-d, --data, --data-raw, --data-binary)
    const dataRegex = /(?:-d|--data|--data-raw|--data-binary)\s+(['"])(.*?)\1/;
    const dataMatch = cmd.match(dataRegex);
    if (dataMatch) {
      result.body = dataMatch[2];
      cmd = cmd.replace(dataMatch[0], '');

      // If body exists and no method specified, default to POST
      if (result.method === 'GET') {
        result.method = 'POST';
      }

      // Try to parse and format JSON body
      try {
        const jsonBody = JSON.parse(result.body);
        result.body = JSON.stringify(jsonBody);
      } catch {
        // Not JSON, keep as is
      }
    }

    // Parse URL (usually the last unquoted argument or quoted string)
    // Remove all flags and their values first
    let urlCandidate = cmd
      .replace(/(?:-[A-Za-z]|--[a-z-]+)\s+(['"].*?['"]|\S+)/g, '')
      .trim();

    // Try to extract URL from quotes first
    const quotedUrlMatch = urlCandidate.match(/(['"])(https?:\/\/[^'"]+)\1/);
    if (quotedUrlMatch) {
      result.url = quotedUrlMatch[2];
    } else {
      // Find any http(s) URL
      const urlMatch = urlCandidate.match(/(https?:\/\/\S+)/);
      if (urlMatch) {
        result.url = urlMatch[1].replace(/['"]$/, ''); // Remove trailing quote if any
      }
    }

    // Extract auth from headers
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

    // Check for API key headers
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

    // Validate that we at least got a URL
    if (!result.url) {
      console.error('Failed to extract URL from curl command');
      return null;
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
