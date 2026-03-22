/**
 * cqp_query — Execute CQP (Corpus Query Processor) linguistic queries
 * 
 * Maps to https://cdli.earth/cqp4rdf/
 * Allows advanced linguistic searches using CQP syntax mapped to RDF graph queries.
 * This enables deep grammatical and lexical exploration of the cuneiform corpus.
 */

import { z } from 'zod';
import { cqpQuery, CDLIError } from '../../cdli-client.js';

export const name = 'cqp_query';

export const description =
  'Execute a Corpus Query Processor (CQP) linguistic query against the CDLI corpus via the CQP4RDF system. ' +
  'CQP syntax allows searching for specific words, lemmas, parts of speech, and grammatical patterns ' +
  'in cuneiform texts. The query is translated to RDF graph queries for execution. ' +
  'Examples:\n' +
  '  - [lemma="lugal"] — Find all occurrences of the lemma "lugal" (king)\n' +
  '  - [lemma="a" & pos="N"] — Find the noun "a" (water)\n' +
  '  - [form="lugal-e"] — Find the specific form "lugal-e"\n' +
  '  - "lugal" "e2" — Find "lugal" followed by "e2"\n' +
  '  - [pos="V"] — Find all verbs';

export const inputSchema = {
  query: z.string().describe(
    'CQP query string. Examples: [lemma="lugal"], [pos="N"], [form="an"] [form="ki"], "lugal" "e2"'
  ),
};

export async function handler(args: { query: string }): Promise<string> {
  try {
    const data = await cqpQuery(args.query);

    const results: string[] = [];
    results.push(`## CQP Query Results\n`);
    results.push(`Query: \`${args.query}\`\n`);

    // Handle different response formats from the CQP4RDF endpoint
    if (!data) {
      return `No results found for CQP query: ${args.query}\n\n` +
        'Tips:\n' +
        '- Use [lemma="word"] for lemma searches\n' +
        '- Use [pos="N"] for part-of-speech searches (N=noun, V=verb)\n' +
        '- Use [form="word"] for exact form matches\n' +
        '- Combine tokens: "word1" "word2" for sequential searches';
    }

    // If the response is an array of results
    if (Array.isArray(data)) {
      results.push(`Found ${data.length} match(es).\n`);

      for (const match of data.slice(0, 30)) {
        // Format depends on the CQP4RDF response structure
        const artifactId = match.artifact_id || match.text_id || match.id || '';
        const line = match.line || match.line_no || match.label || '';
        const form = match.form || match.token || match.word || '';
        const context = match.context || match.text || '';

        if (artifactId) {
          results.push(`**P${artifactId}**${line ? ` (line ${line})` : ''}: ${form || context}`);
          results.push(`  https://cdli.earth/artifacts/${artifactId}\n`);
        } else {
          results.push(`- ${JSON.stringify(match)}`);
        }
      }

      if (data.length > 30) {
        results.push(`\n... and ${data.length - 30} more results.`);
      }
    }
    // If the response is an RDF-style bindings object
    else if (data.results?.bindings) {
      const bindings = data.results.bindings;
      results.push(`Found ${bindings.length} match(es).\n`);

      for (const binding of bindings.slice(0, 30)) {
        const entries = Object.entries(binding)
          .map(([key, val]: [string, any]) => `${key}: ${val.value || val}`)
          .join(' | ');
        results.push(`- ${entries}`);
      }

      if (bindings.length > 30) {
        results.push(`\n... and ${bindings.length - 30} more results.`);
      }
    }
    // Generic fallback for unexpected shapes
    else if (typeof data === 'object') {
      results.push('```json');
      results.push(JSON.stringify(data, null, 2));
      results.push('```');
    } else {
      results.push(String(data));
    }

    results.push('\n---');
    results.push('CQP4RDF endpoint: https://cdli.earth/cqp4rdf/');
    results.push('Use `get_artifact` to fetch full metadata for any matched artifact.');

    return results.join('\n');
  } catch (error) {
    if (error instanceof CDLIError) {
      return `CQP query failed: ${error.message}\n\n` +
        'The CQP4RDF endpoint may be temporarily unavailable. ' +
        'You can try the query directly at: https://cdli.earth/cqp4rdf/\n\n' +
        'Common CQP syntax:\n' +
        '- [lemma="word"] — Search by lemma\n' +
        '- [pos="N"] — Search by part of speech\n' +
        '- [form="word"] — Search by exact form\n' +
        '- "word1" "word2" — Search for word sequences';
    }
    return `CQP query error: ${String(error)}`;
  }
}
