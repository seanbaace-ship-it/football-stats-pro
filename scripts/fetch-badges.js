// Descarga los escudos de los equipos de las 17 ligas configuradas, del lado
// del servidor (ESPN no manda cabeceras CORS, por eso fallaba en el navegador
// -- ahi si se puede llamar directo, sin restriccion). Guarda un solo mapa
// nombre -> URL del escudo en data/badges.json, para que la app haga un unico
// fetch en vez de una llamada en vivo por cada equipo que se muestra.

const fs = require('fs');
const path = require('path');

// Mismos slugs que ESPN_LEAGUE_SLUG en FootballStatsPro_v14.html -- si se
// agrega una liga alla, agregarla tambien aqui.
const ESPN_LEAGUE_SLUG = {
  'Premier League':'eng.1','Championship':'eng.2','League One':'eng.3','League Two':'eng.4',
  'La Liga':'esp.1','Bundesliga':'ger.1','2. Bundesliga':'ger.2','Serie A':'ita.1',
  'Ligue 1':'fra.1','Ligue 2':'fra.2','Eredivisie':'ned.1','Pro League Bélgica':'bel.1',
  'Scottish Premiership':'sco.1','Primeira Liga':'por.1','Süper Lig':'tur.1',
  'Super League Grecia':'gre.1','National League':'eng.6'
};

function normTeamName(name) {
  return (name || '').trim().replace(/\bFC\b|\bAFC\b|\bCF\b|\bSC\b|\bAC\b|\bAS\b/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

async function main() {
  const badges = {}; // clave normalizada -> url del logo
  let totalTeams = 0;

  for (const [league, slug] of Object.entries(ESPN_LEAGUE_SLUG)) {
    try {
      const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/teams?limit=100`);
      if (!res.ok) { console.log(`✗ ${league}: HTTP ${res.status}`); continue; }
      const data = await res.json();
      const teams = (data.sports?.[0]?.leagues?.[0]?.teams || []).map(x => x.team);
      for (const t of teams) {
        const logo = t.logos?.[0]?.href;
        if (!logo) continue;
        // varias llaves por equipo para maximizar coincidencias con los
        // nombres que trae football-data.co.uk (que no siempre son iguales)
        for (const nameVariant of [t.displayName, t.shortDisplayName, t.name, t.nickname]) {
          if (!nameVariant) continue;
          const key = normTeamName(nameVariant);
          if (key && !badges[key]) badges[key] = logo;
        }
        totalTeams++;
      }
      console.log(`✓ ${league}: ${teams.length} equipos`);
    } catch (e) {
      console.log(`✗ ${league}: ${e.message}`);
    }
  }

  const outDir = path.resolve(__dirname, '..', 'data');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'badges.json'), JSON.stringify(badges));
  console.log(`\nTotal: ${Object.keys(badges).length} llaves de nombre para ${totalTeams} equipos.`);
}

main().catch(e => { console.error(e); process.exit(1); });
