// Diagnostico temporal: entender por que football-data.co.uk esta
// devolviendo 503 en TODAS las peticiones desde hace varios dias.
async function check(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
    const body = await res.text();
    console.log(`\n=== ${url} ===`);
    console.log('status:', res.status, res.statusText);
    console.log('headers:', JSON.stringify([...res.headers.entries()]));
    console.log('body (primeros 500 chars):', body.slice(0, 500));
  } catch (e) {
    console.log(`\n=== ${url} ===`);
    console.log('fetch ERROR:', e.message);
  }
}

async function main() {
  await check('https://www.football-data.co.uk/fixtures.xlsx');
  await check('https://www.football-data.co.uk/englandm.php');
  await check('https://www.football-data.co.uk/mmz4281/2526/E0.csv');
  await check('https://www.football-data.co.uk/');
}
main();
