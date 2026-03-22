/**
 * advanced_search — Structured field-based search across the CDLI corpus
 * 
 * Maps to https://cdli.earth/search/advanced
 * Unlike search_artifacts (free-text), this tool lets Claude specify
 * exact filters for language, genre, period, provenience, material, etc.
 */

import { z } from 'zod';
import { advancedSearch, getArtifact, CDLIError } from '../../cdli-client.js';

export const name = 'advanced_search';

export const description =
  'Perform a structured search across the CDLI corpus using specific metadata fields. ' +
  'Unlike search_artifacts (free-text), this tool allows precise filtering by language, genre, period, ' +
  'provenience, material, collection, and translation content. ' +
  'Maps directly to CDLI Advanced Search (https://cdli.earth/search/advanced). ' +
  'Example: { language: "Sumerian", genre: "Administrative", period: "Ur III", translation_text: "barley" }';

export const inputSchema = {
  keyword: z.string().optional().describe('General keyword to search for'),
  language: z.string().optional().describe('Language filter (e.g., "Sumerian", "Akkadian", "Hittite")'),
  genre: z.string().optional().describe('Genre filter (e.g., "Administrative", "Literary", "Royal/Monumental", "Letter")'),
  period: z.string().optional().describe('Historical period (e.g., "Ur III", "Old Babylonian", "Neo-Assyrian", "Achaemenid")'),
  provenience: z.string().optional().describe('Archaeological site or findspot (e.g., "Nippur", "Ur", "Girsu", "Babylon")'),
  material: z.string().optional().describe('Material of the artifact (e.g., "clay", "stone", "metal")'),
  collection: z.string().optional().describe('Museum or collection name (e.g., "British Museum", "University of Pennsylvania")'),
  artifact_type: z.string().optional().describe('Type of artifact (e.g., "tablet", "envelope", "bulla", "cone")'),
  translation_text: z.string().optional().describe('Text to search within translations (e.g., "barley", "rain", "king")'),
  publication: z.string().optional().describe('Publication reference to search by'),
  page: z.number().optional().describe('Page number for pagination (default: 1)'),
};

export async function handler(args: {
  keyword?: string;
  language?: string;
  genre?: string;
  period?: string;
  provenience?: string;
  material?: string;
  collection?: string;
  artifact_type?: string;
  translation_text?: string;
  publication?: string;
  page?: number;
}): Promise<string> {
  try {
    // Build the search parameters from provided fields
    const searchParams: Record<string, string> = {};

    if (args.keyword) searchParams['query'] = args.keyword;
    if (args.language) searchParams['language'] = args.language;
    if (args.genre) searchParams['genre'] = args.genre;
    if (args.period) searchParams['period'] = args.period;
    if (args.provenience) searchParams['provenience'] = args.provenience;
    if (args.material) searchParams['material'] = args.material;
    if (args.collection) searchParams['collection'] = args.collection;
    if (args.artifact_type) searchParams['artifact_type'] = args.artifact_type;
    if (args.translation_text) searchParams['translation'] = args.translation_text;
    if (args.publication) searchParams['publication'] = args.publication;

    // Check that at least one field is provided
    if (Object.keys(searchParams).length === 0) {
      return 'Error: Please provide at least one search parameter.\n\n' +
        'Available fields: keyword, language, genre, period, provenience, material, ' +
        'collection, artifact_type, translation_text, publication';
    }

    const html = await advancedSearch(searchParams, args.page || 1);

    // Extract artifact IDs from the HTML response
    const artifactMatches = [...html.matchAll(/\/artifacts\/(\d+)['"]/g)];
    const uniqueIds = [...new Set(artifactMatches.map(m => parseInt(m[1])))].slice(0, 20);

    if (uniqueIds.length === 0) {
      // Build a summary of the search filters used
      const filtersUsed = Object.entries(searchParams)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');

      return `No artifacts found matching: ${filtersUsed}\n\n` +
        'Suggestions:\n' +
        '- Check spelling of period names (e.g., "Ur III" not "UrIII")\n' +
        '- Use broader terms (e.g., just "Sumerian" without genre)\n' +
        '- Try the search_artifacts tool for free-text search instead';
    }

    // Fetch metadata for each result
    const results: string[] = [];
    const filtersUsed = Object.entries(searchParams)
      .map(([k, v]) => `**${k}**: ${v}`)
      .join(' | ');
    results.push(`## Advanced Search Results\n`);
    results.push(`Filters: ${filtersUsed}\n`);
    results.push(`Found ${uniqueIds.length} artifact(s).\n`);

    for (const id of uniqueIds) {
      try {
        const artifact = await getArtifact(id);
        if (artifact) {
          const period = artifact.period?.period || 'Unknown period';
          const langs = artifact.languages?.map((l: any) => l.language?.language).filter(Boolean).join(', ') || 'Unknown';
          const genres = artifact.genres?.map((g: any) => g.genre?.genre).filter(Boolean).join(', ') || 'Unknown';
          const prov = artifact.provenience?.provenience || '';

          results.push(`**P${id}** — ${artifact.designation}`);
          results.push(`  Period: ${period} | Language: ${langs} | Genre: ${genres}${prov ? ` | Provenience: ${prov}` : ''}`);
          results.push(`  URL: https://cdli.earth/artifacts/${id}\n`);
        }
      } catch {
        results.push(`**P${id}** — https://cdli.earth/artifacts/${id}\n`);
      }
    }

    results.push('\n---');
    results.push('Use `get_artifact` with an artifact ID for full metadata.');
    results.push('Use `get_inscription` to retrieve the transliteration text.');

    return results.join('\n');
  } catch (error) {
    if (error instanceof CDLIError) {
      return `Advanced search failed: ${error.message}`;
    }
    return `Search error: ${String(error)}`;
  }
}
