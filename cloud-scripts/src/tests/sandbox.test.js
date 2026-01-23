const { validateUserScript, runUserScript } = require('../services/transponder.service'); // tu archivo
const fetch = require('node-fetch');

jest.setTimeout(10000); // por si hay fetch o loops largos

describe('Sandbox Scripts', () => {
  const secrets = { API_KEY: '123456' };

  test('Script válido pasa validación', () => {
    const code = `for (let i=0; i<3; i++) console.log(i);`;
    const result = validateUserScript(code);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(result.safeCode).toBeDefined();
  });

  test('Script con identificador prohibido falla', () => {
    const code = `console.log(process.env);`;
    const result = validateUserScript(code);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Forbidden identifier'))).toBe(
      true,
    );
  });

  test('Script con loop demasiado grande lanza error', async () => {
    const code = `for(let i=0;i<1e6;i++) {}`; // excede MAX_ITERATIONS (5 en ejemplo)
    await expect(runUserScript(code, secrets)).rejects.toThrow(/Loop too big/);
  });

  test('Script puede usar fetch HTTPS seguro', async () => {
    const code = `
      fetch("https://jsonplaceholder.typicode.com/todos/1")
        .then(r => r)
    `;
    const result = await runUserScript(code, secrets);
    expect(typeof result).toBe('string');
    expect(result).toMatch(/userId/); // json contiene userId
  });

  test('Secrets se inyectan correctamente', async () => {
    const code = `
      console.log(secret.API_KEY);
      secret.API_KEY;
    `;
    const result = await runUserScript(code, secrets);
    expect(result).toBe('123456');
  });

  test('Script con intento de SSRF es bloqueado', async () => {
    const code = `
      fetch("https://10.0.0.1")
    `;
    await expect(runUserScript(code, secrets)).rejects.toThrow(
      /Private IPs not allowed/,
    );
  });
});
