export {};

declare global {
  interface String {
    sanitize(): string;
    capitalize(): string;
  }
}

String.prototype.sanitize = function (): string {
  return this.trim().replace(/\s{2,}/g, ' ');
};

String.prototype.capitalize = function (): string {
  if (this.length === 0) return this;
  return this.charAt(0).toUpperCase() + this.slice(1);
};
