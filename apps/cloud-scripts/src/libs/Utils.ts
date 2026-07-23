import { Command } from './Command';

export class Utils {
  public static escapeXml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Returns the subset of `binaries` that are NOT present on PATH.
   * Uses `command -v` (POSIX) so it does not depend on `which` being installed.
   */
  public static async missingBinaries(binaries: string[]): Promise<string[]> {
    const missing: string[] = [];
    for (const bin of binaries) {
      try {
        await Command.runCommand('sh', ['-c', `command -v ${bin}`]);
      } catch {
        missing.push(bin);
      }
    }
    return missing;
  }
}