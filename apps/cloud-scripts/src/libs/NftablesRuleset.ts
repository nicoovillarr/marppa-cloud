export class NftablesRuleset {
  public static readonly OWNED_TABLES: ReadonlyArray<[string, string]> = [
    ['inet', 'filter'],
    ['ip', 'nat'],
  ];

  public static ownedTables(): string[] {
    return NftablesRuleset.OWNED_TABLES.map(
      ([family, name]) => `${family} ${name}`,
    );
  }

  public static declaredTables(rulesetText: string): string[] {
    return [...rulesetText.matchAll(/^table\s+(\S+)\s+(\S+)\s*\{/gm)].map(
      ([, family, name]) => `${family} ${name}`,
    );
  }

  public static foreignTables(rulesetText: string): string[] {
    const owned = NftablesRuleset.ownedTables();
    return NftablesRuleset.declaredTables(rulesetText).filter(
      (table) => !owned.includes(table),
    );
  }

  public static missingTables(rulesetText: string): string[] {
    const declared = NftablesRuleset.declaredTables(rulesetText);
    return NftablesRuleset.ownedTables().filter(
      (table) => !declared.includes(table),
    );
  }

  public static stripFlushRuleset(rulesetText: string): string {
    return rulesetText.replace(/^[ \t]*flush[ \t]+ruleset[ \t]*$/gm, '');
  }

  public static hasDefaultDenyOutputPolicy(rulesetText: string): boolean {
    return /chain\s+output\s*\{[\s\S]*?policy\s+drop\s*;/.test(rulesetText);
  }
}
