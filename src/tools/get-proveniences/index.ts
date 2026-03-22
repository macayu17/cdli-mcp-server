/**
 * get_proveniences — List CDLI proveniences (archaeological find sites)
 */

import { z } from 'zod';
import { listProveniences, CDLIError } from '../../cdli-client.js';

export const name = 'get_proveniences';

export const description = 
  'List proveniences (archaeological find sites) registered in the CDLI database. ' +
  'Returns site names, modern names, and geographic information. ' +
  'Examples: Ur (mod. Tell Muqayyar), Nippur (mod. Nuffar), Girsu (mod. Tello)';

export const inputSchema = {
  page: z.number().optional().describe('Page number (default: 1)'),
  per_page: z.number().optional().describe('Results per page (default: 50)'),
};

export async function handler(args: { page?: number; per_page?: number }): Promise<string> {
  try {
    const page = args.page || 1;
    const perPage = args.per_page || 50;
    const data = await listProveniences(page, perPage);

    if (!data || (Array.isArray(data) && data.length === 0)) {
      return 'No proveniences found on this page.';
    }

    const provs = Array.isArray(data) ? data : [data];
    const lines: string[] = [];
    lines.push(`## CDLI Proveniences — Page ${page}\n`);

    for (const prov of provs) {
      const name = prov.provenience || prov.name || 'Unknown';
      lines.push(`- **${name}** [ID: ${prov.id}]`);
    }

    lines.push(`\n---\nPage ${page} (${perPage} per page). Use page=${page + 1} for next page.`);
    return lines.join('\n');
  } catch (error) {
    if (error instanceof CDLIError) return `Failed to list proveniences: ${error.message}`;
    return `Error: ${String(error)}`;
  }
}
