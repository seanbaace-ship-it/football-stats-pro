const XLSX = require('xlsx');

async function main() {
  const res = await fetch('https://www.football-data.co.uk/fixtures.xlsx');
  console.log('HTTP status:', res.status);
  console.log('Last-Modified:', res.headers.get('last-modified'));
  console.log('Content-Length:', res.headers.get('content-length'));
  console.log('Date header:', res.headers.get('date'));
  const buf = Buffer.from(await res.arrayBuffer());
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
  console.log('Sheets:', wb.SheetNames);
  for (const sn of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { defval: '' });
    console.log('--- sheet', sn, 'rows:', rows.length);
    if (rows.length) {
      console.log('columns:', Object.keys(rows[0]));
      const leagues = [...new Set(rows.map(r => r.Div || r.League || ''))];
      console.log('leagues/div codes:', leagues);
      const dates = rows.map(r => {
        const d = r.Date;
        if (d instanceof Date) return d.toISOString().slice(0,10);
        return String(d);
      }).filter(Boolean);
      console.log('date range:', dates[0], '...', dates[dates.length-1]);
      console.log('unique dates:', [...new Set(dates)].sort().join(', '));
    }
  }
}
main().catch(e => { console.error('ERROR', e); process.exit(1); });
