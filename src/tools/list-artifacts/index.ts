/**
 * list_artifacts — Paginated browsing of the CDLI artifact catalog
 */

import { z } from 'zod';
import { listArtifacts, CDLIError } from '../../cdli-client.js';

export const name = 'list_artifacts';

export const description = 
  'Browse the CDLI artifact catalog with pagination. ' +
  'Returns a list of artifacts with their P-numbers, designations, and basic metadata. ' +
  'Use this for general browsing; use search_artifacts for targeted queries.';

export const inputSchema = {
  page: z.number().optional().describe('Page number (default: 1)'),
  per_page: z.number().optional().describe('Results per page (default: 20, max: 50)'),
};

export async function handler(args: { page?: number; per_page?: number }): Promise<string> {
  try {
    const page = args.page || 1;
    const perPage = Math.min(args.per_page || 20, 50);
    const data = await listArtifacts(page, perPage);

    if (!data || (Array.isArray(data) && data.length === 0)) {
      return 'No artifacts found on this page.';
    }

    const artifacts = Array.isArray(data) ? data : [data];
    const lines: string[] = [];
    lines.push(`## CDLI Artifacts — Page ${page}\n`);

    for (const a of artifacts) {
      const id = a.id || a.artifact_id;
      const designation = a.designation || a.title || `Artifact ${id}`;
      const period = a.period?.period || '';
      lines.push(`**P${id}** — ${designation}${period ? ` | ${period}` : ''}`);
      lines.push(`  https://cdli.earth/artifacts/${id}`);
    }

    lines.push(`\n---\nShowing page ${page} (${perPage} per page). Use page=${page + 1} for next page.`);
    return lines.join('\n');
  } catch (error) {
    if (error instanceof CDLIError) return `Failed to list artifacts: ${error.message}`;
    return `Error: ${String(error)}`;
  }
}
