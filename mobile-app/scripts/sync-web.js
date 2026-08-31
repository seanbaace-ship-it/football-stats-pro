// Copia el HTML de la raíz del proyecto (FootballStatsPro_v14.html) hacia
// mobile-app/www/index.html, que es lo que Capacitor empaqueta dentro del
// proyecto Android. Correr tras editar el HTML raíz y antes de `npx cap sync android`.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const www = path.resolve(__dirname, '..', 'www');

fs.copyFileSync(
  path.join(root, 'FootballStatsPro_v14.html'),
  path.join(www, 'index.html')
);

console.log('www/index.html actualizado desde el HTML raíz.');
