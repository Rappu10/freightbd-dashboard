const { execFileSync } = require('node:child_process');
const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');

const scriptPath = require('node:path').join(__dirname, '..', 'generate-hash.js');

test('genera un hash bcrypt verificable para una contraseña válida', () => {
  const password = 'PruebaSegura2026!';
  const output = execFileSync(process.execPath, [scriptPath, password], { encoding: 'utf8' });
  const hash = output.match(/APP_PASSWORD_HASH=(\S+)/)?.[1];

  assert.ok(hash, 'La salida debe incluir APP_PASSWORD_HASH');
  assert.equal(bcrypt.compareSync(password, hash), true);
});

test('rechaza contraseñas menores a ocho caracteres', () => {
  assert.throws(
    () => execFileSync(process.execPath, [scriptPath, 'corta'], { encoding: 'utf8', stdio: 'pipe' }),
    (error) => error.status === 1
  );
});