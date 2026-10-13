/** Thrown when a symbol is valid in form but the data source has nothing for it. */
export class NoDataError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NoDataError';
    this.code = 'NO_DATA';
  }
}
