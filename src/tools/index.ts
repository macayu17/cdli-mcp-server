/**
 * Tool Registry — Barrel export of all CDLI MCP tools
 * 
 * Each tool exports: name, description, inputSchema, handler
 * This module collects them all for registration with the MCP server.
 */

import * as searchArtifacts from './search-artifacts/index.js';
import * as advancedSearch from './advanced-search/index.js';
import * as getArtifact from './get-artifact/index.js';
import * as listArtifacts from './list-artifacts/index.js';
import * as getInscription from './get-inscription/index.js';
import * as getAuthors from './get-authors/index.js';
import * as getPublications from './get-publications/index.js';
import * as getPeriods from './get-periods/index.js';
import * as getProveniences from './get-proveniences/index.js';
import * as cqpQuery from './cqp-query/index.js';
import * as ping from './ping/index.js';

import { z } from 'zod';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodRawShape;
  handler: (args: any) => Promise<string>;
}

export const tools: ToolDefinition[] = [
  searchArtifacts,
  advancedSearch,
  getArtifact,
  listArtifacts,
  getInscription,
  getAuthors,
  getPublications,
  getPeriods,
  getProveniences,
  cqpQuery,
  ping,
];

