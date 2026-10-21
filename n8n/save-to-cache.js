// n8n Code node "Save to cache" (after "Code in JavaScript").

// Keep the concerts in the workflow's memory, so the webhook can answer right away.
const cache = $getWorkflowStaticData('global');
cache.concerts = $input.all().map((item) => item.json);
cache.updatedAt = Date.now();

// Called by the page (the cache was old): answer with the requested page.
if ($('Webhook').isExecuted) {
  return [{ json: buildPage(cache.concerts, $('Webhook').first().json.query) }];
}
return $input.all();

// Filters, sorts and cuts out one page of concerts (server-side pagination).
// Query params: offset, limit, q (artist), country, city, until (YYYY-MM-DD), sort (soonest | latest | artist)
function buildPage(all, query = {}) {
  // We hide concerts that already happened (the cache can be up to a day old), and "Premium Packages",
  // which are VIP packages for concerts already in the list. $today is today in the workflow's timezone.
  const today = $today.toISODate();
  const concerts = all
    .filter((c) => c.date >= today && !/premium package/i.test(c.event))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  const q = String(query.q || '').trim().toLowerCase();
  const country = query.country || '';
  const city = query.city || '';
  const until = query.until || '';
  const sort = ['latest', 'artist'].includes(query.sort) ? query.sort : 'soonest';
  const offset = Math.max(0, parseInt(query.offset, 10) || 0);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));

  const filtered = concerts.filter(
    (c) =>
      c.artist.toLowerCase().includes(q) &&
      (!country || c.country === country) &&
      (!city || c.city === city) &&
      (!until || c.date <= until),
  );
  if (sort === 'latest') filtered.reverse();
  // sort is stable, so each artist's concerts stay in date order.
  if (sort === 'artist') filtered.sort((a, b) => a.artist.localeCompare(b.artist, 'en', { sensitivity: 'base' }));

  // How many shows each group has in total (by month, or by artist for A–Z), not just on this page.
  const groupKey = (c) => (sort === 'artist' ? c.artist : c.date.slice(0, 7));
  const groupCounts = {};
  for (const c of filtered) groupCounts[groupKey(c)] = (groupCounts[groupKey(c)] || 0) + 1;

  return {
    items: filtered.slice(offset, offset + limit),
    offset,
    sort,
    total: filtered.length,
    all: concerts.length,
    // For the location menu: every country, each with its cities.
    countries: countBy(concerts, (c) => c.country).map((c) => ({
      ...c,
      cities: countBy(concerts.filter((x) => x.country === c.name), (x) => x.city),
    })),
    groupCounts,
  };
}

// Counts the concerts for each value (e.g. each country) and sorts them alphabetically.
function countBy(concerts, key) {
  const counts = new Map();
  for (const c of concerts) counts.set(key(c), (counts.get(key(c)) || 0) + 1);
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
}
