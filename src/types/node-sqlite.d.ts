// Ambient types for node:sqlite.
//
// The runtime is Node 22, where node:sqlite ships built in, but the
// project pins @types/node 20 which predates it. Declaring the surface we
// actually use is contained; bumping @types/node would touch every file
// in the project for one module's sake.
//
// Remove this file when @types/node is upgraded to ^22.

declare module "node:sqlite" {
  type SQLValue = string | number | bigint | null | Uint8Array;

  interface StatementSync {
    all(...params: SQLValue[]): unknown[];
    get(...params: SQLValue[]): unknown;
    run(...params: SQLValue[]): { changes: number; lastInsertRowid: number | bigint };
  }

  export class DatabaseSync {
    constructor(path: string, options?: { open?: boolean; readOnly?: boolean });
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
