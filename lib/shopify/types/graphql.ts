export interface GraphQLFormattedError {
  extensions?: Record<string, unknown>;
  locations?: Array<{ column: number; line: number }>;
  message: string;
  path?: ReadonlyArray<number | string>;
}
