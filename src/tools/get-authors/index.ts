/**
 * get_authors — List CDLI authors/scholars
 */

import { z } from 'zod';
import { listAuthors, CDLIError } from '../../cdli-client.js';

export const name = 'get_authors';

export const description = 
  'List authors and scholars registered in the CDLI database. ' +
  'Returns names, institutions, and email addresses (where available). ' +
  'The CDLI database contains 2,700+ authors who have contributed to the catalog.';

export const inputSchema = {
  page: z.number().optional().describe('Page number (default: 1)'),
  per_page: z.number().optional().describe('Results per page (default: 20)'),
};

export async function handler(args: { page?: number; per_page?: number }): Promise<string> {
  try {
    const page = args.page || 1;
    const perPage = args.per_page || 20;
    const data = await listAuthors(page, perPage);

    if (!data || (Array.isArray(data) && data.length === 0)) {
      return 'No authors found on this page.';
    }

    const authors = Array.isArray(data) ? data : [data];
    const lines: string[] = [];
    lines.push(`## CDLI Authors — Page ${page}\n`);

    for (const author of authors) {
      const name = author.author || `${author.first || ''} ${author.last || ''}`.trim();
      const institution = author.institution ? ` — ${author.institution}` : '';
      const email = author.email ? ` (${author.email})` : '';
      lines.push(`- **${name}**${institution}${email} [ID: ${author.id}]`);
    }

    lines.push(`\n---\nPage ${page}. Use page=${page + 1} for next page.`);
    return lines.join('\n');
  } catch (error) {
    if (error instanceof CDLIError) return `Failed to list authors: ${error.message}`;
    return `Error: ${String(error)}`;
  }
}
