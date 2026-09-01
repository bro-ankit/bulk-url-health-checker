export class ListBatchesQuery {
  constructor(
    public readonly cursor: string | undefined,
    public readonly limit: number,
  ) {}
}
