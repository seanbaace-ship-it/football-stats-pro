// Script temporal de diagnostico: inspecciona downloadm.php / matches.php de
// football-data.co.uk para ver si el archivo de proximos partidos trae cuotas
// reales de casas de apuestas. Se borra despues de usarlo.
const XLSX = require('xlsx');

async function inspect(url, label) {
  console.log(`\n=== ${label}: ${url} ===`);
  try {
    const res = await fetch(url);
    console.log('status:', res.status, 'content-type:', res.headers.get('content-type'), 'content-length:', res.headers.get('content-length'));
    if (!res.ok) return;
    const buf = Buffer.from(await res.arrayBuffer());
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('html') || url.endsWith('.php')) {
      const text = buf.toString('utf8');
      console.log('first 500 chars:', text.slice(0, 500));
      // buscar links a archivos descargables en el html
      const links = [...text.matchAll(/href=["']([^"']+\.(?:csv|xlsx|xls))["']/gi)].map(m => m[1]);
      console.log('links a archivos encontrados:', [...new Set(links)]);
      return;
    }
    try {
      const wb = XLSX.read(buf, { type: 'buffer' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      console.log('filas:', rows.length);
      console.log('columnas:', rows[0] ? Object.keys(rows[0]) : 'sin filas');
      console.log('primera fila:', rows[0]);
    } catch (e) {
      console.log('no es xlsx valido, primeros 300 bytes como texto:', buf.toString('utf8').slice(0, 300));
    }
  } catch (e) {
    console.log('ERROR:', e.message);
  }
}

async function inspectBadges() {
  console.log('\n=== ESCUDOS: probando TheSportsDB y ESPN para varios equipos ===');
  const teams = [
    { name: 'Arsenal', espnSlug: 'eng.1' },
    { name: 'Real Madrid', espnSlug: 'esp.1' },
    { name: 'Sociedad', espnSlug: 'esp.1' },
    { name: 'St Truiden', espnSlug: 'bel.1' }
  ];
  for (const t of teams) {
    console.log(`\n-- ${t.name} --`);
    try {
      const r = await fetch('https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=' + encodeURIComponent(t.name));
      const d = await r.json();
      const found = (d.teams || [])[0];
      console.log('TheSportsDB:', r.status, found ? { name: found.strTeam, badge: found.strTeamBadge } : 'sin resultados');
    } catch (e) { console.log('TheSportsDB ERROR:', e.message); }
    try {
      const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${t.espnSlug}/teams?limit=100`);
      const d = await r.json();
      const all = (d.sports?.[0]?.leagues?.[0]?.teams || []).map(x => x.team);
      const found = all.find(x => x.displayName?.toLowerCase().includes(t.name.toLowerCase().split(' ')[0]));
      console.log('ESPN:', r.status, found ? { name: found.displayName, logo: found.logos?.[0]?.href } : 'sin resultados');
    } catch (e) { console.log('ESPN ERROR:', e.message); }
  }
}

(async () => {
  await inspect('https://www.football-data.co.uk/matches.php', 'matches.php (pagina)');
  await inspect('https://www.football-data.co.uk/downloadm.php', 'downloadm.php (directo)');
  await inspect('https://www.football-data.co.uk/fixtures.xlsx', 'fixtures.xlsx (el que ya uso)');
  await inspectBadges();
})();
