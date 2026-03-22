/**
 * search_artifacts — Full-text search across the CDLI artifact catalog
 * 
 * Uses CDLI's search endpoint. Parses HTML results to extract artifact references.
 */

import { z } from 'zod';
import { searchArtifacts, getArtifact, CDLIError } from '../../cdli-client.js';

export const name = 'search_artifacts';

export const description = 
  'Search the CDLI corpus for cuneiform artifacts using free-text queries. ' +
  'Supports keywords like period names, languages, genres, and content terms. ' +
  'Returns a list of matching artifacts with their P-numbers and basic metadata. ' +
  'Example queries: "Ur III administrative tablet", "Sumerian barley", "Old Babylonian literary"';

export const inputSchema = {
  query: z.string().describe('Free-text search query (e.g., "Sumerian administrative tablets about barley")'),
  page: z.number().optional().describe('Page number for pagination (default: 1)'),
};

export async function handler(args: { query: string; page?: number }): Promise<string> {
  try {
    const html = await searchArtifacts(args.query, args.page || 1);
    
    // Extract artifact IDs and names from the HTML response
    const artifactMatches = [...html.matchAll(/\/artifacts\/(\d+)['"]/g)];
    const uniqueIds = [...new Set(artifactMatches.map(m => parseInt(m[1])))].slice(0, 20);

    if (uniqueIds.length === 0) {
      return `No artifacts found for query: "${args.query}"\n\n` +
        'Suggestions:\n' +
        '- Try different keywords (e.g., "barley" instead of "grain")\n' +
        '- Use period names: "Ur III", "Old Babylonian", "Neo-Assyrian"\n' +
        '- Use language names: "Sumerian", "Akkadian"\n' +
        '- Use genre terms: "administrative", "literary", "royal"';
    }

    // Fetch basic metadata for each found artifact
    const results: string[] = [];
    results.push(`## Search Results for: "${args.query}"\n`);
    results.push(`Found ${uniqueIds.length} artifact(s).\n`);

    for (const id of uniqueIds) {
      try {
        const artifact = await getArtifact(id);
        if (artifact) {
          const period = artifact.period?.period || 'Unknown period';
          const langs = artifact.languages?.map((l: any) => l.language?.language).filter(Boolean).join(', ') || 'Unknown';
          const genres = artifact.genres?.map((g: any) => g.genre?.genre).filter(Boolean).join(', ') || 'Unknown';
          
          results.push(`**P${id}** — ${artifact.designation}`);
          results.push(`  Period: ${period} | Language: ${langs} | Genre: ${genres}`);
          results.push(`  URL: https://cdli.earth/artifacts/${id}\n`);
        }
      } catch {
        results.push(`**P${id}** — https://cdli.earth/artifacts/${id}\n`);
      }
    }

    results.push('\n---');
    results.push('Use `get_artifact` with the artifact ID for full metadata.');
    results.push('Use `get_inscription` to retrieve the transliteration text.');

    return results.join('\n');
  } catch (error) {
    if (error instanceof CDLIError) {
      return `Search failed: ${error.message}`;
    }
    return `Search error: ${String(error)}`;
  }
}
