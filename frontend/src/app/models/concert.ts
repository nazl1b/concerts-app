// The "shape" of a concert, as returned by the n8n webhook.
export interface Concert {
  artist: string;
  event: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  venue: string; // may be empty ("")
  city: string;
  country: string;
  url: string; // ticket link
  image: string;
}

export type Sort = 'soonest' | 'latest' | 'artist';

// What we ask n8n for. The filtering, sorting and paging all happen there (server-side).
export type ConcertQuery = {
  q: string; // artist search
  country: string; // '' = anywhere
  city: string; // '' = all cities in the country
  until: string; // last date (YYYY-MM-DD), '' = any time
  sort: Sort;
  offset: number; // how many concerts to skip (0, 20, 40, ...)
};

export interface Count {
  name: string;
  count: number;
}

// One page of concerts, as returned by the n8n webhook.
export interface ConcertPage {
  items: Concert[]; // the concerts of this page (up to 20)
  offset: number; // where this page starts
  sort: Sort; // how the items are sorted
  total: number; // concerts that match the filters, on all pages
  all: number; // all concerts, without filters
  countries: (Count & { cities: Count[] })[]; // for the location menu
  groupCounts: Record<string, number>; // shows per month (or per artist for A–Z), on all pages
}
