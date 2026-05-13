import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildAdvancedSearchParams,
  buildSimpleSearchParams,
  extractArtifactIdsFromHtml,
  toPositiveInteger,
} from '../dist/cdli-client.js';

test('extractArtifactIdsFromHtml returns unique artifact ids in page order', () => {
  const html = `
    <a href="/artifacts/100001">P100001</a>
    <a href="/artifacts/100001?foo=bar">duplicate</a>
    <a href='/artifacts/100002#details'>P100002</a>
    <a href="/artifacts/not-an-id">bad</a>
    <a href="/artifacts/100003/">P100003</a>
  `;

  assert.deepEqual(extractArtifactIdsFromHtml(html), [100001, 100002, 100003]);
});

test('buildSimpleSearchParams targets the current CDLI search form fields', () => {
  assert.deepEqual(buildSimpleSearchParams(' barley ', 2), {
    'simple-value[]': 'barley',
    'simple-field[]': 'keyword',
    page: '2',
  });
});

test('buildAdvancedSearchParams maps MCP field names to CDLI search fields', () => {
  assert.deepEqual(
    buildAdvancedSearchParams(
      {
        keyword: 'barley',
        language: 'Sumerian',
        translation_text: 'ration',
        publication: 'NATN',
        material: '  clay  ',
      },
      3,
    ),
    {
      'simple-value[]': 'barley',
      'simple-field[]': 'keyword',
      language: 'Sumerian',
      atf_translation_text: 'ration',
      publication_designation: 'NATN',
      material: 'clay',
      page: '3',
    },
  );
});

test('toPositiveInteger clamps invalid pagination input', () => {
  assert.equal(toPositiveInteger(undefined, 1), 1);
  assert.equal(toPositiveInteger(0, 1), 1);
  assert.equal(toPositiveInteger(-5, 1), 1);
  assert.equal(toPositiveInteger(Number.NaN, 1), 1);
  assert.equal(toPositiveInteger(2.9, 1), 2);
});
