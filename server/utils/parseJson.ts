/**
 * Safely parse a JSON text column from the database.
 *
 * Many columns (skills, photos, image_urls, data, specs, etc.) are stored
 * as JSON-encoded text in SQLite/PostgreSQL.  This helper eliminates the
 * identical try/catch + fallback pattern duplicated across routes and services.
 *
 * @param value   The raw column value (string, already-parsed object, null, undefined)
 * @param fallback The value to return when parsing fails or the input is empty
 * @returns The parsed value, or the fallback on any error
 *
 * @example
 *   const skills: string[] = parseJsonColumn<string[]>(worker.skills, []);
 *   const photos: string[] = parseJsonColumn<string[]>(review.photos, []);
 */
export function parseJsonColumn<T>(value: string | T | null | undefined, fallback: T): T {
    if (value === null || value === undefined) return fallback;

    // Already the target type (e.g. if the ORM already parsed it)
    if (typeof value !== 'string') return value;

    // Empty string → fallback
    if (value.trim() === '') return fallback;

    try {
        return JSON.parse(value) as T;
    } catch {
        return fallback;
    }
}
