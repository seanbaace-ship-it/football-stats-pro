// Descarga fixtures.xlsx de football-data.co.uk (los proximos partidos de todas
// las ligas, en un solo archivo) y lo deja normalizado en data/fixtures.json,
// con el mismo shape que ya arma normalizeFixture() en el navegador.
//
// Uso: node scripts/fetch-fixtures.js
//
// Importante: se usa la URL real, nunca una version pasada por un traductor
// (esos proxys pueden alterar el contenido del archivo que se descarga).

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const FIXTURES_URL = 'https://www.football-data.co.uk/fixtures.xlsx';

const LEAGUE_MAP = {
  'E0':'Premier League','E1':'Championship','E2':'League One','E3':'League Two',
  'SP1':'La Liga','D1':'Bundesliga','D2':'2. Bundesliga','I1':'Serie A',
  'F1':'Ligue 1','F2':'Ligue 2','N1':'Eredivisie','B1':'Pro League Bélgica',
  'SC0':'Scottish Premiership','P1':'Primeira Liga','T1':'Süper Lig',
  'G1':'Super League Grecia','EC':'National League'
};

function get(row, ...keys) {
  for (const k of keys) {
    const found = Object.keys(row).find(r => r.toLowerCase().replace(/\s/g, '') === k.toLowerCase().replace(/\s/g, ''));
    if (found && row[found] !== undefined && row[found] !== null && row[found] !== '') return String(row[found]).trim();
  }
  return '';
}

// Como en normalizeFixture(), pero sin convertir a String() -- necesitamos el
// Date crudo para distinguir una celda de "hora" (que XLSX con cellDates:true
// entrega como Date anclado al 1899-12-30) de una celda de texto normal.
function getRaw(row, ...keys) {
  for (const k of keys) {
    const found = Object.keys(row).find(r => r.toLowerCase().replace(/\s/g, '') === k.toLowerCase().replace(/\s/g, ''));
    if (found && row[found] !== undefined && row[found] !== null && row[found] !== '') return row[found];
  }
  return null;
}

function normalizeFixture(row) {
  let date = get(row, 'date', 'fecha');
  if (date) {
    const d = new Date(date);
    if (!isNaN(d)) date = d.toISOString().slice(0, 10);
  }
  let league = get(row, 'league', 'liga', 'leaguename', 'div', 'division');
  if (LEAGUE_MAP[league]) league = LEAGUE_MAP[league];
  const home = get(row, 'hometeam', 'home', 'local', 'equipolocal');
  const away = get(row, 'awayteam', 'away', 'visitante', 'equipovisitante');

  const timeRaw = getRaw(row, 'time', 'hora');
  let time = '';
  if (timeRaw instanceof Date) {
    time = `${String(timeRaw.getUTCHours()).padStart(2, '0')}:${String(timeRaw.getUTCMinutes()).padStart(2, '0')}`;
  } else if (timeRaw) {
    time = String(timeRaw).trim();
  }

  if (!home || !away) return null;
  return { date: date || 'Sin fecha', league: league || 'Sin liga', home, away, time };
}

async function main() {
  const res = await fetch(FIXTURES_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status} al descargar fixtures.xlsx`);
  const buf = Buffer.from(await res.arrayBuffer());

  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
  let fixtures = [];
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
    fixtures = fixtures.concat(raw.map(normalizeFixture).filter(Boolean));
  }

  const seen = new Set();
  fixtures = fixtures.filter(f => {
    const key = `${f.date}|${f.home}|${f.away}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (!fixtures.length) {
    console.error('No se encontraron fixtures validos. ¿Cambio el formato del archivo?');
    process.exit(1);
  }

  const outDir = path.resolve(__dirname, '..', 'data');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'fixtures.json'), JSON.stringify(fixtures));
  fs.writeFileSync(path.join(outDir, 'fixtures-meta.json'), JSON.stringify({
    generatedAt: new Date().toISOString(),
    totalFixtures: fixtures.length,
    leagues: [...new Set(fixtures.map(f => f.league))].sort()
  }, null, 2));

  console.log(`✓ ${fixtures.length} próximos partidos de ${new Set(fixtures.map(f => f.league)).size} ligas.`);
}

main().catch(e => { console.error(e); process.exit(1); });
