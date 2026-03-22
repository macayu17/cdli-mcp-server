/**
 * get_artifact — Retrieve full metadata for a single CDLI artifact
 * 
 * Fetches the complete JSON record for an artifact by its P-number.
 * Includes publications, materials, period, provenience, collections,
 * and the full ATF inscription text (in the inscription.atf field).
 */

import { z } from 'zod';
import { getArtifact as fetchArtifact, CDLIError } from '../../cdli-client.js';

export const name = 'get_artifact';

export const description = 
  'Retrieve the full metadata record for a specific CDLI artifact by its P-number (numeric ID). ' +
  'The response includes: designation, period, provenience, language(s), genre(s), ' +
  'publications, collections, materials, measurements, and the full ATF inscription/transliteration text. ' +
  'Example: get_artifact with id 254876 fetches P254876.';

export const inputSchema = {
  id: z.number().describe('The numeric artifact ID (P-number without the P prefix). Example: 254876 for P254876'),
};

export async function handler(args: { id: number }): Promise<string> {
  try {
    const artifact = await fetchArtifact(args.id);

    if (!artifact) {
      return `Artifact P${args.id} not found.\n\nPlease verify the artifact ID. ` +
        'You can search for artifacts using the `search_artifacts` tool.';
    }

    return formatArtifact(artifact);
  } catch (error) {
    if (error instanceof CDLIError) {
      return `Failed to fetch artifact P${args.id}: ${error.message}`;
    }
    return `Error fetching artifact: ${String(error)}`;
  }
}

function formatArtifact(a: any): string {
  const lines: string[] = [];

  lines.push(`# P${a.id} — ${a.designation}`);
  lines.push(`URL: https://cdli.earth/artifacts/${a.id}\n`);

  // Core metadata
  if (a.period) lines.push(`**Period:** ${a.period.period}`);
  if (a.provenience) lines.push(`**Provenience:** ${a.provenience.provenience}`);
  if (a.artifact_type) lines.push(`**Artifact Type:** ${a.artifact_type.artifact_type}`);
  if (a.museum_no) lines.push(`**Museum Number:** ${a.museum_no}`);
  if (a.excavation_no) lines.push(`**Excavation Number:** ${a.excavation_no}`);

  if (a.languages?.length) {
    lines.push(`**Language(s):** ${a.languages.map((l: any) => l.language?.language).filter(Boolean).join(', ')}`);
  }
  if (a.genres?.length) {
    const genres = a.genres.map((g: any) => {
      const name = g.genre?.genre || 'Unknown';
      return g.comments ? `${name} (${g.comments})` : name;
    });
    lines.push(`**Genre(s):** ${genres.join(', ')}`);
  }
  if (a.materials?.length) {
    lines.push(`**Material(s):** ${a.materials.map((m: any) => m.material?.material).filter(Boolean).join(', ')}`);
  }
  if (a.collections?.length) {
    lines.push(`**Collection(s):** ${a.collections.map((c: any) => c.collection?.collection).filter(Boolean).join(', ')}`);
  }

  // Publications
  if (a.publications?.length) {
    lines.push('\n## Publications');
    for (const pub of a.publications) {
      const p = pub.publication;
      if (!p) continue;
      const authors = p.authors?.map((a: any) => a.author?.author).filter(Boolean).join(', ') || 'Unknown';
      lines.push(`- ${authors} (${p.year || '?'}): *${p.title || p.designation}*${pub.exact_reference ? ` [${pub.exact_reference}]` : ''}`);
    }
  }

  // External resources
  if (a.external_resources?.length) {
    lines.push('\n## External Resources');
    for (const er of a.external_resources) {
      const r = er.external_resource;
      if (!r) continue;
      lines.push(`- ${r.external_resource}: ${r.base_url}${er.external_resource_key}`);
    }
  }

  // Inscription (ATF)
  if (a.inscription?.atf) {
    lines.push('\n## Inscription (ATF)');
    lines.push('```');
    lines.push(a.inscription.atf);
    lines.push('```');

    // Extract translations
    const translations = a.inscription.atf
      .split('\n')
      .filter((l: string) => l.trim().startsWith('#tr.en:'))
      .map((l: string) => l.replace('#tr.en:', '').trim());

    if (translations.length > 0) {
      lines.push('\n## English Translation');
      translations.forEach((t: string) => lines.push(`- ${t}`));
    }
  }

  lines.push('\n---');
  lines.push(`Citation: P${a.id} — ${a.designation}`);
  lines.push(`https://cdli.earth/artifacts/${a.id}`);

  return lines.join('\n');
}
