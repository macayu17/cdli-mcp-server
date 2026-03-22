/**
 * get_publications — List CDLI publications
 */

import { z } from 'zod';
import { listPublications, CDLIError } from '../../cdli-client.js';

export const name = 'get_publications';

export const description = 
  'List publications (books, journal articles, catalogs) from the CDLI database. ' +
  'Returns title, designation, year, BibTeX key, and authors. ' +
  'Publications are referenced by CDLI artifacts for scholarly attribution.';

export const inputSchema = {
  page: z.number().optional().describe('Page number (default: 1)'),
  per_page: z.number().optional().describe('Results per page (default: 20)'),
};

export async function handler(args: { page?: number; per_page?: number }): Promise<string> {
  try {
    const page = args.page || 1;
    const perPage = args.per_page || 20;
    const data = await listPublications(page, perPage);

    if (!data || (Array.isArray(data) && data.length === 0)) {
      return 'No publications found on this page.';
    }

    const pubs = Array.isArray(data) ? data : [data];
    const lines: string[] = [];
    lines.push(`## CDLI Publications — Page ${page}\n`);

    for (const pub of pubs) {
      const title = pub.title || pub.designation || 'Untitled';
      const year = pub.year || '?';
      const authors = pub.authors?.map((a: any) => a.author?.author || '').filter(Boolean).join(', ') || 'Unknown';
      const bibtex = pub.bibtexkey ? ` [${pub.bibtexkey}]` : '';

      lines.push(`- **${title}** (${year})${bibtex}`);
      lines.push(`  Authors: ${authors}`);
      if (pub.designation && pub.designation !== title) {
        lines.push(`  Designation: ${pub.designation}`);
      }
      lines.push(`  ID: ${pub.id}\n`);
    }

    lines.push(`---\nPage ${page}. Use page=${page + 1} for next page.`);
    return lines.join('\n');
  } catch (error) {
    if (error instanceof CDLIError) return `Failed to list publications: ${error.message}`;
    return `Error: ${String(error)}`;
  }
}
