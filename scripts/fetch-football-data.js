// Descarga y consolida las ligas de football-data.co.uk del lado del servidor
// (corre en GitHub Actions, no en el navegador del usuario), para que la app
// nunca tenga que pedirle datos a football-data.co.uk directamente — eso es
// lo que fallaba por CORS/bloqueos de red según la conexión del usuario.
//
// Escribe data/matches.json, que la app lee con un simple fetch a su propio
// dominio de GitHub Pages (que sí manda cabeceras CORS correctas).
//
// Uso: node scripts/fetch-football-data.js

const fs = require('fs');
const path = require('path');

// Mismo mapa que LEAGUE_MAP dentro de FootballStatsPro_v14.html — si cambia
// uno hay que cambiar el otro.
const LEAGUE_MAP = {
  'E0':'Premier League','E1':'Championship','E2':'League One','E3':'League Two',
  'SP1':'La Liga','D1':'Bundesliga','D2':'2. Bundesliga','I1':'Serie A',
  'F1':'Ligue 1','F2':'Ligue 2','N1':'Eredivisie','B1':'Pro League Bélgica',
  'SC0':'Scottish Premiership','P1':'Primeira Liga','T1':'Süper Lig',
  'G1':'Super League Grecia','EC':'National League'
};

const SEASONS = ['2627', '2526'];
const NUM_COLS = ['FTHG','FTAG','HTHG','HTAG','HS','AS','HST','AST','HF','AF','HC','AC','HY','AY','HR','AR'];

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length);
  if (!lines.length) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const cells = line.split(',');
    const obj = {};
    headers.forEach((h, i) => obj[h] = (cells[i] || '').trim());
    return obj;
  });
}

function fmtDate(s) {
  const m = String(s || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return String(s || '');
  let [, d, mo, y] = m;
  if (y.length === 2) y = (parseInt(y, 10) < 50 ? '20' : '19') + y;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

// '2627' -> '2026/27' — se guarda en cada partido para poder filtrar por temporada en la app.
function seasonLabel(code) {
  return `20${code.slice(0, 2)}/${code.slice(2, 4)}`;
}

async function fetchLeagueSeason(code, season) {
  const url = `https://www.football-data.co.uk/mmz4281/${season}/${code}.csv`;
  const res = await fetch(url);
  if (res.status === 404) return { notFound: true };
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  const rows = parseCSV(text);
  const matches = rows
    .filter(r => r.HomeTeam && r.AwayTeam && ['H','D','A'].includes((r.FTR || '').toUpperCase()))
    .map(r => ({
      Date: fmtDate(r.Date),
      Season: seasonLabel(season),
      LeagueName: LEAGUE_MAP[code],
      HomeTeam: r.HomeTeam.trim(),
      AwayTeam: r.AwayTeam.trim(),
      FTR: (r.FTR || '').toUpperCase(),
      HTR: (r.HTR || '').toUpperCase(),
      ...Object.fromEntries(NUM_COLS.map(k => [k, parseInt(r[k], 10) || 0]))
    }));
  return { matches };
}

async function main() {
  const codes = Object.keys(LEAGUE_MAP);
  let allMatches = [];
  const summary = [];

  for (const code of codes) {
    let leagueMatches = [];
    let seasonsFound = 0;
    let error = null;
    for (const season of SEASONS) {
      try {
        const result = await fetchLeagueSeason(code, season);
        if (result.notFound) continue;
        leagueMatches = leagueMatches.concat(result.matches);
        seasonsFound++;
      } catch (e) {
        error = e.message;
      }
    }
    allMatches = allMatches.concat(leagueMatches);
    summary.push({ code, name: LEAGUE_MAP[code], matches: leagueMatches.length, seasonsFound, error: leagueMatches.length ? null : error });
    console.log(`${leagueMatches.length ? '✓' : '✗'} ${LEAGUE_MAP[code]} (${code}): ${leagueMatches.length} partidos${error && !leagueMatches.length ? ' — ' + error : ''}`);
  }

  const outDir = path.resolve(__dirname, '..', 'data');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'matches.json'), JSON.stringify(allMatches));
  fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify({
    generatedAt: new Date().toISOString(),
    seasons: SEASONS,
    totalMatches: allMatches.length,
    leagues: summary
  }, null, 2));

  console.log(`\nTotal: ${allMatches.length} partidos de ${summary.filter(s => s.matches).length}/${codes.length} ligas.`);
  if (!allMatches.length) {
    console.error('No se descargó ningún partido — revisa si football-data.co.uk cambió de formato o está caído.');
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
