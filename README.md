# CDLI MCP Server

This project is a Model Context Protocol server for the Cuneiform Digital Library Initiative (CDLI). It lets MCP clients such as Claude Desktop query the public CDLI catalog through a small set of tools for search, artifact metadata, inscriptions, publications, periods, proveniences, and basic server health checks.

The server is intentionally simple. It does not store CDLI data locally. Each tool makes a request to `https://cdli.earth`, normalizes the response, and returns text that is easier for an MCP client to use in a conversation.

## What It Provides

- `stdio` transport for local desktop MCP clients.
- SSE transport for HTTP-based MCP clients and simple health checks.
- Eleven registered MCP tools.
- Typed TypeScript source with a small Node test suite.
- Bounded output for list tools so the client does not receive unexpectedly large responses.
- CDLI artifact links and citation-friendly P-numbers in tool output.

## Project Layout

```text
cdli-mcp-server/
  src/
    index.ts                       Server entry point and transport setup
    cdli-client.ts                 HTTP client and CDLI URL helpers
    tools/
      index.ts                     Tool registry
      search-artifacts/index.ts    Free-text catalog search
      advanced-search/index.ts     Structured catalog search
      get-artifact/index.ts        Full artifact metadata
      list-artifacts/index.ts      Browse artifact result pages
      get-inscription/index.ts     ATF transliteration and translations
      get-authors/index.ts         CDLI author list
      get-publications/index.ts    Publication list
      get-periods/index.ts         Historical periods
      get-proveniences/index.ts    Provenience list
      cqp-query/index.ts           CQP4RDF query wrapper
      ping/index.ts                Health check tool
  test/
    cdli-client.test.mjs           Search URL and parsing tests
  assets/
    sse_architecture.png
  package.json
  tsconfig.json
  README.md
```

## Requirements

- Node.js 18 or newer
- npm 9 or newer
- An MCP client if you want to use the server from a desktop app

## Setup

```bash
git clone https://github.com/macayu17/cdli-mcp-server.git
cd cdli-mcp-server
npm install
npm run build
```

Run the automated checks:

```bash
npm test
```

Check production dependency advisories:

```bash
npm audit --omit=dev
```

## Running The Server

For a local MCP client such as Claude Desktop:

```bash
npm start
```

For HTTP/SSE clients:

```bash
npm run start:sse
```

The SSE server uses port `3000` by default. To use a different port:

```bash
node dist/index.js --sse 8080
```

SSE endpoints:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/sse` | Opens the SSE event stream and creates a session |
| `POST` | `/messages?sessionId=<id>` | Sends JSON-RPC messages for the active session |
| `GET` | `/health` | Returns server status, version, and tool count |

Health check example:

```bash
curl http://localhost:3000/health
```

## Claude Desktop Configuration

Build the server first:

```bash
npm install
npm run build
```

Then add this server to the Claude Desktop config file.

Common config locations:

| OS | Path |
| --- | --- |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |

Example config:

```json
{
  "mcpServers": {
    "cdli": {
      "command": "node",
      "args": ["/absolute/path/to/cdli-mcp-server/dist/index.js"]
    }
  }
}
```

On Windows, use escaped backslashes:

```json
{
  "mcpServers": {
    "cdli": {
      "command": "node",
      "args": ["C:\\Users\\name\\cdli-mcp-server\\dist\\index.js"]
    }
  }
}
```

After changing the config, fully quit and reopen Claude Desktop. The CDLI tools should appear in the tool list.

## Tools

| Tool | What it does |
| --- | --- |
| `search_artifacts` | Searches the CDLI catalog with a free-text query. |
| `advanced_search` | Searches with structured fields such as period, language, genre, material, provenience, and translation text. |
| `get_artifact` | Fetches full metadata for one artifact by numeric P-number. |
| `list_artifacts` | Browses artifact result pages and returns a bounded list. |
| `get_inscription` | Fetches ATF transliteration and English translation lines where available. |
| `get_authors` | Lists CDLI authors and scholars. |
| `get_publications` | Lists publications referenced by CDLI records. |
| `get_periods` | Lists historical periods used by CDLI. |
| `get_proveniences` | Lists archaeological proveniences. |
| `cqp_query` | Sends a CQP query to the CDLI CQP4RDF endpoint. |
| `ping` | Confirms the MCP server is running. |

## How Requests Flow

1. The MCP client receives a user request.
2. The client chooses one of the registered CDLI tools.
3. `src/index.ts` receives the MCP tool call through stdio or SSE.
4. The tool handler validates the input with a Zod schema.
5. The handler calls `src/cdli-client.ts`.
6. The client builds the correct CDLI URL and sends the HTTP request.
7. The response is parsed and formatted as plain text.
8. The MCP client receives that text and can use it in its answer.

For example, a request for Sumerian Ur III administrative tablets can map to `advanced_search` with fields such as `language`, `period`, and `genre`.

## CDLI Search Notes

CDLI search currently works through the public `/search` route. This project maps tool inputs to the same field names used by the live CDLI search forms:

- Free-text search uses `simple-value[]` and `simple-field[]=keyword`.
- Translation text uses `atf_translation_text`.
- Publication search maps to `publication_designation`.
- Metadata filters such as `period`, `language`, `genre`, `material`, and `provenience` are passed through as named search fields.

The code keeps the URL-building helpers in `src/cdli-client.ts` and covers them with tests in `test/cdli-client.test.mjs`.

## Known Upstream Dependency

The `cqp_query` tool depends on CDLI's public CQP4RDF backend. If that backend returns an error, the tool reports the failure instead of crashing the MCP server. This is an upstream availability issue, not a local server failure.

## Configuration

Optional environment variables:

```env
CDLI_API_BASE_URL=https://cdli.earth
CDLI_API_TIMEOUT=30000
MCP_SSE_PORT=3000
```

## Development

Build:

```bash
npm run build
```

Test:

```bash
npm test
```

Run with MCP Inspector:

```bash
npm run inspect
```

Add a new tool by creating `src/tools/<tool-name>/index.ts`, exporting `name`, `description`, `inputSchema`, and `handler`, then registering it in `src/tools/index.ts`.

Minimal tool shape:

```ts
import { z } from 'zod';

export const name = 'my_tool';
export const description = 'Short description of the tool.';
export const inputSchema = {
  value: z.string().describe('Input value'),
};

export async function handler(args: { value: string }): Promise<string> {
  return args.value;
}
```

## References

- CDLI: https://cdli.earth
- CDLI search guide: https://cdli.earth/docs/search
- CDLI REST API guide: https://cdli.earth/docs/api
- CDLI CQP4RDF: https://cdli.earth/cqp4rdf/
- Model Context Protocol: https://modelcontextprotocol.io/
- MCP TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk

## License

MIT
