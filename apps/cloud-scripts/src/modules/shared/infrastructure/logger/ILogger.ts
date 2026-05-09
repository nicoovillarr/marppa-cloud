export abstract class ILogger {
  abstract log(message: string, ...args: unknown[]): void;
  abstract info(message: string, ...args: unknown[]): void;
  abstract warn(message: string, ...args: unknown[]): void;
  abstract error(message: string, ...args: unknown[]): void;
}
