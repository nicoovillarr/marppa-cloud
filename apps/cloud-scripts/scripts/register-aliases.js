/**
 * Runtime resolver for the `@/...` path aliases.
 *
 * `tsc` type-checks the aliases from tsconfig but emits them verbatim, so the
 * compiled `dist/index.js` cannot be run by node on its own. This hook maps the
 * same prefixes onto `dist/`, mirroring the `paths` block in tsconfig.json —
 * keep both in sync when a module is added.
 *
 * Used by `npm start`: node -r ./scripts/register-aliases.js dist/index.js
 */
const path = require('path');
const Module = require('module');

const DIST = path.resolve(__dirname, '..', 'dist');

const ALIASES = {
  '@/app/': 'app/',
  '@/decorators/': 'decorators/',
  '@/interfaces/': 'interfaces/',
  '@/libs/': 'libs/',
  '@/event/': 'modules/event/',
  '@/mesh/': 'modules/mesh/',
  '@/nucleus/': 'modules/nucleus/',
  '@/orbit/': 'modules/orbit/',
  '@/shared/': 'modules/shared/',
  '@/system/': 'modules/system/',
  '@/worker/': 'modules/worker/',
};

const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function (request, ...rest) {
  if (typeof request === 'string' && request.startsWith('@/')) {
    for (const [prefix, target] of Object.entries(ALIASES)) {
      if (request.startsWith(prefix)) {
        request = path.join(DIST, target, request.slice(prefix.length));
        break;
      }
    }
  }

  return originalResolveFilename.call(this, request, ...rest);
};
