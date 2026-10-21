// n8n Code node "Code in JavaScript" (after "HTTP Request").
// Turns the Ticketmaster responses (one per followed artist) into a flat, sorted list of concerts.

const artists = $('Get your followed artists').all();
const out = [];
const seen = new Set();

$input.all().forEach((item, i) => {
  const artist = artists[i]?.json.name || '';
  const events = item.json._embedded?.events || [];

  for (const e of events) {
    const names = (e._embedded?.attractions || []).map(a => a.name.toLowerCase());
    if (!names.includes(artist.toLowerCase())) continue;

    const v = e._embedded?.venues?.[0] || {};
    const date = e.dates?.start?.localDate || '';
    const city = v.city?.name || cityFromTimezone(v.timezone);

    const key = (artist + '|' + date + '|' + city).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      json: {
        artist,
        event: e.name,
        date,
        time: e.dates?.start?.localTime || '',
        venue: v.name || '',
        city,
        country: v.country?.name || countryName(v.country?.countryCode),
        url: e.url,
        image: pickImage(e.images)
      }
    });
  }
});

out.sort((a, b) => (a.json.date + a.json.time).localeCompare(b.json.date + b.json.time));

return out;

// Ticketmaster gives each picture in many sizes. The card shows it 16:9 and about 400px wide, so we take
// the smallest 16:9 one that is at least 640px (sharp, also on retina screens). If there is none, the widest one.
function pickImage(images = []) {
  const wide = images.filter((img) => img.ratio === '16_9' && img.width >= 640).sort((a, b) => a.width - b.width);
  return (wide[0] || [...images].sort((a, b) => b.width - a.width)[0])?.url || '';
}

// Some events (e.g. from ticketmaster.pe or .cl) have no city or country name, only a country code
// ("PE") and a timezone ("America/Lima"). Then we use those instead.
function countryName(code) {
  try {
    return code ? new Intl.DisplayNames(['en'], { type: 'region' }).of(code) : '';
  } catch {
    return '';
  }
}

function cityFromTimezone(timezone = '') {
  return timezone.includes('/') ? timezone.split('/').pop().replace(/_/g, ' ') : '';
}
