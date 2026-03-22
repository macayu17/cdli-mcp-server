/**
 * ping — Server liveness check
 */

import { z } from 'zod';

export const name = 'ping';

export const description = 
  'Simple liveness check to verify the CDLI MCP server is running and reachable. ' +
  'Returns server status and version information.';

export const inputSchema = {};

export async function handler(_args: Record<string, never>): Promise<string> {
  return JSON.stringify({
    status: 'ok',
    server: 'cdli-mcp-server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    api_base: process.env.CDLI_API_BASE_URL || 'https://cdli.earth',
  }, null, 2);
}
