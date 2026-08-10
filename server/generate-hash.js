// Genera el hash bcrypt de tu contraseña de acceso al dashboard.
// Uso:  node generate-hash.js "tu-contraseña-aquí"
// Copia el resultado y pégalo como APP_PASSWORD_HASH en las variables de
// entorno de Render (o en tu .env local). Nunca guardes la contraseña en
// texto plano en ningún archivo ni variable de entorno.

const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.error('Uso: node generate-hash.js "tu-contraseña"');
  process.exit(1);
}

if (password.length < 8) {
  console.error('Usa una contraseña de al menos 8 caracteres.');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);
console.log('\nAPP_PASSWORD_HASH=' + hash + '\n');
