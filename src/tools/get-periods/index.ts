/**
 * get_periods — List all CDLI historical periods
 */

import { z } from 'zod';
import { listPeriods, CDLIError } from '../../cdli-client.js';

export const name = 'get_periods';

export const description = 
  'List all historical periods used to classify CDLI artifacts. ' +
  'Returns all 32 periods with their names, sequence order, and approximate date ranges. ' +
  'Useful for understanding the chronological classification system used by CDLI.';

export const inputSchema = {};

export async function handler(_args: Record<string, never>): Promise<string> {
  try {
    const data = await listPeriods();

    if (!data || (Array.isArray(data) && data.length === 0)) {
      return 'No periods found.';
    }

    const periods = Array.isArray(data) ? data : [data];
    const lines: string[] = [];
    lines.push(`## CDLI Historical Periods\n`);
    lines.push(`Total: ${periods.length} periods\n`);

    // Sort by sequence
    const sorted = [...periods].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

    for (const period of sorted) {
      const name = period.period || period.name || 'Unknown';
      const timeRange = period.time_range || '';
      const seq = period.sequence != null ? `#${period.sequence}` : '';
      lines.push(`${seq} **${name}**${timeRange ? ` — ${timeRange}` : ''} [ID: ${period.id}]`);
    }

    return lines.join('\n');
  } catch (error) {
    if (error instanceof CDLIError) return `Failed to list periods: ${error.message}`;
    return `Error: ${String(error)}`;
  }
}
