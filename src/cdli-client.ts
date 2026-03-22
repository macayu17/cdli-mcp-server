/**
 * CDLI API Client
 * HTTP wrapper for interacting with the CDLI REST API at cdli.earth
 * 
 * Endpoints used:
 *   - /artifacts/{id}/json — Single artifact metadata
 *   - /artifacts/{id}/inscription/atf — ATF transliteration text
 *   - /search/search_results — ElasticSearch full-text search
 *   - /authors.json — Author listing
 *   - /publications.json — Publication listing
 *   - /periods.json — Historical periods
 *   - /proveniences.json — Archaeological sites
 */

const BASE_URL = process.env.CDLI_API_BASE_URL || 'https://cdli.earth';
const TIMEOUT = parseInt(process.env.CDLI_API_TIMEOUT || '30000', 10);

// ─── Custom Errors ────────────────────────────────────────────────────

export class CDLIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CDLIError';
  }
}

export class CDLIHTTPError extends CDLIError {
  constructor(public status: number, public statusText: string, url: string) {
    super(`HTTP ${status} (${statusText}) fetching ${url}`);
    this.name = 'CDLIHTTPError';
  }
}

export class CDLITimeoutError extends CDLIError {
  constructor(url: string) {
    super(`Request timed out fetching ${url}`);
    this.name = 'CDLITimeoutError';
  }
}

export class CDLIConnectionError extends CDLIError {
  constructor(url: string, cause: string) {
    super(`Connection error fetching ${url}: ${cause}`);
    this.name = 'CDLIConnectionError';
  }
}

// ─── HTTP Helpers ─────────────────────────────────────────────────────

async function fetchJSON<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(path, BASE_URL);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) url.searchParams.set(key, value);
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CDLI-MCP-Server/1.0.0',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new CDLIHTTPError(response.status, response.statusText, url.toString());
    }

    return await response.json() as T;
  } catch (error) {
    if (error instanceof CDLIHTTPError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new CDLITimeoutError(url.toString());
    }
    throw new CDLIConnectionError(url.toString(), String(error));
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(path: string): Promise<string> {
  const url = new URL(path, BASE_URL);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const response = await fetch(url.toString(), {
      headers: { 'User-Agent': 'CDLI-MCP-Server/1.0.0' },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new CDLIHTTPError(response.status, response.statusText, url.toString());
    }

    return await response.text();
  } catch (error) {
    if (error instanceof CDLIHTTPError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new CDLITimeoutError(url.toString());
    }
    throw new CDLIConnectionError(url.toString(), String(error));
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchHTML(path: string, params?: Record<string, string>): Promise<string> {
  const url = new URL(path, BASE_URL);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) url.searchParams.set(key, value);
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'text/html',
        'User-Agent': 'CDLI-MCP-Server/1.0.0',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new CDLIHTTPError(response.status, response.statusText, url.toString());
    }

    return await response.text();
  } catch (error) {
    if (error instanceof CDLIHTTPError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new CDLITimeoutError(url.toString());
    }
    throw new CDLIConnectionError(url.toString(), String(error));
  } finally {
    clearTimeout(timeout);
  }
}

// ─── API Methods ──────────────────────────────────────────────────────

/**
 * Get a single artifact by its numeric ID (P-number without the P)
 */
export async function getArtifact(id: number): Promise<any> {
  const data = await fetchJSON<any[]>(`/artifacts/${id}/json`);
  return data[0] || null;
}

/**
 * List artifacts with pagination
 */
export async function listArtifacts(page: number = 1, perPage: number = 20): Promise<any> {
  return await fetchJSON<any>(`/artifacts.json`, {
    page: String(page),
    per_page: String(perPage),
  });
}

/**
 * Search artifacts via the CDLI search endpoint
 */
export async function searchArtifacts(query: string, page: number = 1): Promise<string> {
  // The search endpoint returns HTML; we parse it for artifact links
  const html = await fetchHTML('/search/search_results', {
    'SearchSettings[query]': query,
    page: String(page),
  });
  return html;
}

/**
 * Get ATF inscription text for an artifact
 */
export async function getInscription(id: number): Promise<string> {
  return await fetchText(`/artifacts/${id}/inscription/atf`);
}

/**
 * List authors
 */
export async function listAuthors(page: number = 1, perPage: number = 20): Promise<any> {
  return await fetchJSON<any>(`/authors.json`, {
    page: String(page),
    per_page: String(perPage),
  });
}

/**
 * List publications
 */
export async function listPublications(page: number = 1, perPage: number = 20): Promise<any> {
  return await fetchJSON<any>(`/publications.json`, {
    page: String(page),
    per_page: String(perPage),
  });
}

/**
 * List all historical periods
 */
export async function listPeriods(): Promise<any> {
  return await fetchJSON<any>(`/periods.json`);
}

/**
 * List proveniences (archaeological sites)
 */
export async function listProveniences(page: number = 1, perPage: number = 50): Promise<any> {
  return await fetchJSON<any>(`/proveniences.json`, {
    page: String(page),
    per_page: String(perPage),
  });
}

/**
 * Advanced search with structured field parameters
 * Maps to https://cdli.earth/search/advanced
 */
export async function advancedSearch(params: Record<string, string>, page: number = 1): Promise<string> {
  const searchParams: Record<string, string> = { page: String(page) };

  // Map structured fields to CDLI SearchSettings format
  for (const [key, value] of Object.entries(params)) {
    if (value && value.trim()) {
      searchParams[`SearchSettings[${key}]`] = value.trim();
    }
  }

  return await fetchHTML('/search/search_results', searchParams);
}

/**
 * Execute a CQP (Corpus Query Processor) query via the cqp4rdf endpoint
 * Maps to https://cdli.earth/cqp4rdf/
 */
export async function cqpQuery(query: string): Promise<any> {
  // Use the internal JSON API endpoint that powers the CQP4RDF frontend
  return await fetchJSON<any>('/cqp4rdf/api/query', {
    cqp: query,
    page: '1',
    corpus: 'cdli'
  });
}
