/**
 * get_inscription — Retrieve ATF transliteration and translation for an artifact
 */

import { z } from 'zod';
import { getInscription, CDLIError } from '../../cdli-client.js';

export const name = 'get_inscription';

export const description = 
  'Retrieve the ATF (ASCII Transliteration Format) text for a CDLI artifact. ' +
  'Returns the full transliteration, including line numbers, surface markers, ' +
  'and English translations (lines starting with #tr.en:). ' +
  'The ATF format is the standard for encoding cuneiform texts digitally.';

export const inputSchema = {
  id: z.number().describe('Artifact ID (P-number without the P prefix)'),
};

export async function handler(args: { id: number }): Promise<string> {
  try {
    const atf = await getInscription(args.id);

    if (!atf || atf.trim().length === 0) {
      return `No inscription text available for artifact P${args.id}.\n` +
        'This artifact may not have been transliterated yet.';
    }

    // Parse ATF for structured output
    const lines = atf.split('\n');
    const transliteration: string[] = [];
    const translations: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#tr.en:')) {
        translations.push(trimmed.replace('#tr.en:', '').trim());
      } else if (/^\d+[\.\)]/.test(trimmed)) {
        transliteration.push(trimmed);
      }
    }

    const result: string[] = [];
    result.push(`## Inscription for P${args.id}`);
    result.push(`URL: https://cdli.earth/artifacts/${args.id}\n`);

    if (transliteration.length > 0) {
      result.push('### Transliteration');
      transliteration.forEach(l => result.push(l));
      result.push('');
    }

    if (translations.length > 0) {
      result.push('### English Translation');
      translations.forEach(t => result.push(`- ${t}`));
      result.push('');
    }

    result.push('### Raw ATF');
    result.push('```');
    result.push(atf);
    result.push('```');

    result.push('\n---');
    result.push(`Citation: P${args.id} — https://cdli.earth/artifacts/${args.id}`);

    return result.join('\n');
  } catch (error) {
    if (error instanceof CDLIError) return `Failed to fetch inscription for P${args.id}: ${error.message}`;
    return `Error: ${String(error)}`;
  }
}
