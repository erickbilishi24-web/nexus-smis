export type PeopleImportRow = Record<string, unknown>;

export const PEOPLE_IMPORT_CHUNK_SIZE = 100;

export function splitPeopleImportRows(rows: PeopleImportRow[], chunkSize = PEOPLE_IMPORT_CHUNK_SIZE): PeopleImportRow[][] {
  if (!Number.isInteger(chunkSize) || chunkSize < 1) throw new Error("INVALID_IMPORT_CHUNK_SIZE");
  const chunks: PeopleImportRow[][] = [];
  for (let index = 0; index < rows.length; index += chunkSize) chunks.push(rows.slice(index, index + chunkSize));
  return chunks;
}
