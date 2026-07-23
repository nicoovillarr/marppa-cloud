export class PortConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PortConflictError';
  }
}