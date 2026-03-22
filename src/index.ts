#!/usr/bin/env node

/**
 * CDLI MCP Server
 * 
 * Exposes the Cuneiform Digital Library Initiative (cdli.earth) corpus
 * as structured tools for AI agents via the Model Context Protocol.
 * 
 * Supports two transport modes:
 *   - stdio: For Claude Desktop integration (default)
 *   - sse:   For web-based MCP clients via HTTP + Server-Sent Events
 * 
 * Usage:
 *   node dist/index.js              # stdio mode (default)
 *   node dist/index.js --sse        # SSE mode on port 3000
 *   node dist/index.js --sse 8080   # SSE mode on custom port
 * 
 * Tools (11):
 *   - search_artifacts     Free-text corpus search
 *   - advanced_search      Structured field-based search
 *   - get_artifact         Single artifact metadata
 *   - list_artifacts       Paginated artifact listing
 *   - get_inscription      ATF transliteration/translation text
 *   - get_authors          Author/scholar listing
 *   - get_publications     Publication listing
 *   - get_periods          Historical periods
 *   - get_proveniences     Archaeological find sites
 *   - cqp_query            CQP-to-RDF linguistic queries
 *   - ping                 Server liveness check
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import { tools } from './tools/index.js';

// ─── CLI Argument Parsing ─────────────────────────────────────────────

const args = process.argv.slice(2);
const useSSE = args.includes('--sse');
const portIndex = args.indexOf('--sse');
const customPort = portIndex !== -1 && args[portIndex + 1] && !args[portIndex + 1].startsWith('--')
  ? parseInt(args[portIndex + 1], 10)
  : undefined;

const SSE_PORT = customPort || parseInt(process.env.MCP_SSE_PORT || '3000', 10);

// ─── Server Factory ───────────────────────────────────────────────────

function createServer(): McpServer {
  const server = new McpServer({
    name: 'cdli-mcp-server',
    version: '1.0.0',
  });

  // Register all tools from the registry
  for (const tool of tools) {
    server.tool(
      tool.name,
      tool.description,
      tool.inputSchema,
      async (args) => {
        try {
          const result = await tool.handler(args);
          return {
            content: [{ type: 'text' as const, text: result }],
          };
        } catch (error) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error in ${tool.name}: ${error instanceof Error ? error.message : String(error)}`,
            }],
            isError: true,
          };
        }
      }
    );
  }

  return server;
}

// ─── stdio Transport ──────────────────────────────────────────────────

async function startStdio() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`CDLI MCP Server v1.0.0 started [stdio] (${tools.length} tools registered)`);
  console.error(`API Base: ${process.env.CDLI_API_BASE_URL || 'https://cdli.earth'}`);
}

// ─── SSE Transport ────────────────────────────────────────────────────

async function startSSE() {
  const app = express();
  app.use(express.json());

  // CORS headers for web-based MCP clients
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Accept');
    next();
  });

  // Store active SSE transports by session ID
  const transports: Record<string, SSEServerTransport> = {};

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      server: 'cdli-mcp-server',
      version: '1.0.0',
      transport: 'sse',
      tools: tools.length,
      apiBase: process.env.CDLI_API_BASE_URL || 'https://cdli.earth',
    });
  });

  // SSE endpoint — client connects here to establish the event stream
  app.get('/sse', async (req, res) => {
    console.log('SSE connection established');

    const transport = new SSEServerTransport('/messages', res);
    transports[transport.sessionId] = transport;

    res.on('close', () => {
      console.log(`SSE session ${transport.sessionId} disconnected`);
      delete transports[transport.sessionId];
    });

    const server = createServer();
    await server.connect(transport);
  });

  // Messages endpoint — client POSTs JSON-RPC messages here
  app.post('/messages', async (req, res) => {
    const sessionId = req.query.sessionId as string;

    if (!sessionId || !transports[sessionId]) {
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided. Connect to /sse first.',
        },
        id: null,
      });
      return;
    }

    const transport = transports[sessionId];
    await transport.handlePostMessage(req, res, req.body);
  });

  // Start listening
  app.listen(SSE_PORT, () => {
    console.log(`CDLI MCP Server v1.0.0 started [SSE] (${tools.length} tools registered)`);
    console.log(`API Base: ${process.env.CDLI_API_BASE_URL || 'https://cdli.earth'}`);
    console.log('');
    console.log('Endpoints:');
    console.log(`  SSE stream:   GET  http://localhost:${SSE_PORT}/sse`);
    console.log(`  Messages:     POST http://localhost:${SSE_PORT}/messages?sessionId=<id>`);
    console.log(`  Health check: GET  http://localhost:${SSE_PORT}/health`);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    for (const sessionId in transports) {
      try {
        await transports[sessionId].close();
        delete transports[sessionId];
      } catch (error) {
        console.error(`Error closing session ${sessionId}:`, error);
      }
    }
    process.exit(0);
  });
}

// ─── Entry Point ──────────────────────────────────────────────────────

if (useSSE) {
  startSSE().catch((error) => {
    console.error('Failed to start CDLI MCP Server [SSE]:', error);
    process.exit(1);
  });
} else {
  startStdio().catch((error) => {
    console.error('Failed to start CDLI MCP Server [stdio]:', error);
    process.exit(1);
  });
}
