/**
 * Converts between the app's camelCase records and the database's snake_case
 * rows — a single generic, shallow mapper rather than per-table boilerplate,
 * since every table's payload is a flat object (nested content lives in
 * `jsonb` columns and keeps its own camelCase keys untouched, because those
 * are JSON keys, not SQL identifiers).
 *
 * A few keys collide with reserved SQL words (`order`, `start`, `end`,
 * `row`) and are stored under different column names entirely rather than
 * quoted identifiers — `SPECIAL_KEYS` is the single place that mapping lives.
 */
const SPECIAL_KEYS: Record<string, string> = {
  order: 'order_index',
  start: 'start_pos',
  end: 'end_pos',
  row: 'row_index',
};
const SPECIAL_KEYS_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(SPECIAL_KEYS).map(([camel, snake]) => [snake, camel]),
);

function camelToSnake(key: string): string {
  if (SPECIAL_KEYS[key]) return SPECIAL_KEYS[key];
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function snakeToCamel(key: string): string {
  if (SPECIAL_KEYS_REVERSE[key]) return SPECIAL_KEYS_REVERSE[key];
  return key.replace(/_([a-z0-9])/g, (_, letter: string) => letter.toUpperCase());
}

/** App record → database row, ready to hand to `.insert()`/`.upsert()`. */
export function toRow<T extends object>(record: T): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    row[camelToSnake(key)] = value;
  }
  return row;
}

/** Database row → app record, as read back from `.select()`. */
export function fromRow<T>(row: Record<string, unknown>): T {
  const record: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    record[snakeToCamel(key)] = value;
  }
  return record as T;
}

export function fromRows<T>(rows: Record<string, unknown>[]): T[] {
  return rows.map((row) => fromRow<T>(row));
}
