import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, linkedSignal, signal } from '@angular/core';
import { Concert, ConcertPage, Sort } from '../../models/concert';
import { Concerts } from '../../services/concerts';
import { ConcertCard } from '../concert-card/concert-card';
import { Dropdown } from '../dropdown/dropdown';
import { ThemeToggle } from '../theme-toggle/theme-toggle';

interface Group {
  key: string; // "2026-10" (by month) or the artist name (for A–Z)
  total: number; // shows in this group on all pages, not just the loaded ones
  concerts: Concert[];
}

interface Option<T> {
  value: T;
  label: string;
}

// How long to wait after the last key press before searching.
const SEARCH_DELAY_MS = 300;

type Period = 'any' | 'month' | '30d' | '3m' | '6m';
const PERIODS: Option<Period>[] = [
  { value: 'any', label: 'Any time' },
  { value: 'month', label: 'This month' },
  { value: '30d', label: 'Next 30 days' },
  { value: '3m', label: 'Next 3 months' },
  { value: '6m', label: 'Next 6 months' },
];

const SORTS: Option<Sort>[] = [
  { value: 'soonest', label: 'Soonest first' },
  { value: 'latest', label: 'Latest first' },
  { value: 'artist', label: 'Artist A–Z' },
];

@Component({
  imports: [ConcertCard, DatePipe, Dropdown, ThemeToggle],
  selector: 'app-concert-list',
  styleUrl: './concert-list.css',
  templateUrl: './concert-list.html',
})
export class ConcertList {
  protected readonly periods = PERIODS;
  protected readonly sorts = SORTS;

  // Filter values. Each signal() holds a value the user changes.
  protected readonly search = signal('');
  protected readonly country = signal(''); // '' = anywhere
  protected readonly city = signal(''); // '' = all cities in the country
  protected readonly period = signal<Period>('any');
  protected readonly sort = signal<Sort>('soonest');

  // The search we send to n8n. It follows search() once you stop typing, so we don't send a request per letter.
  private readonly searchQuery = signal('');

  // computed() values recalculate on their own when a signal they read changes.
  private readonly filters = computed(() => ({
    q: this.searchQuery().trim(),
    country: this.country(),
    city: this.city(),
    until: periodEnd(this.period()) ?? '',
    sort: this.sort(),
  }));

  // Where the next page starts. linkedSignal() can be set like a signal, but goes back to 0 when the filters change.
  protected readonly offset = linkedSignal({ source: this.filters, computation: () => 0 });

  // inject() = "give me the service". We ask it for the page that matches the filters and the offset.
  protected readonly page = inject(Concerts).page(() => ({ ...this.filters(), offset: this.offset() }));

  // The page that arrived last. We keep it while the next one loads, so the toolbar doesn't disappear.
  protected readonly latest = linkedSignal<ConcertPage | undefined, ConcertPage | undefined>({
    source: () => (this.page.hasValue() ? this.page.value() : undefined),
    computation: (page, previous) => page ?? previous?.value,
  });

  // All the concerts loaded so far: new filters start over (offset 0), "Load more" adds to the end.
  protected readonly loaded = linkedSignal<ConcertPage | undefined, Concert[]>({
    source: () => (this.page.hasValue() ? this.page.value() : undefined),
    computation: (page, previous) => {
      const loaded = previous?.value ?? [];
      if (!page) return loaded;
      if (page.offset === 0) return page.items;
      // Only add a page that continues where we stopped, never the same page twice.
      return page.offset === loaded.length ? [...loaded, ...page.items] : loaded;
    },
  });

  protected readonly hasMore = computed(() => this.loaded().length < (this.latest()?.total ?? 0));

  // The text shown on the dropdown buttons.
  protected readonly locationLabel = computed(() =>
    this.city() ? `${this.city()}, ${this.country()}` : this.country() || 'Anywhere',
  );
  protected readonly periodLabel = computed(() => PERIODS.find((p) => p.value === this.period())!.label);
  protected readonly sortLabel = computed(() => SORTS.find((s) => s.value === this.sort())!.label);

  // The page is already sorted by n8n. Here we only group it: by month for dates, by artist for A–Z.
  protected readonly byArtist = computed(() => this.latest()?.sort === 'artist');
  protected readonly groups = computed(() => {
    const groupCounts = this.latest()?.groupCounts ?? {};
    const groups: Group[] = [];
    for (const concert of this.loaded()) {
      const key = this.byArtist() ? concert.artist : concert.date.slice(0, 7);
      const last = groups.at(-1);
      if (last?.key === key) {
        last.concerts.push(concert);
      } else {
        groups.push({ key, total: groupCounts[key] ?? 0, concerts: [concert] });
      }
    }
    return groups;
  });

  // true when any filter is active -> shows "Clear".
  protected readonly hasActiveFilters = computed(
    () => this.search().trim() !== '' || this.country() !== '' || this.period() !== 'any',
  );

  constructor() {
    // effect() = code that re-runs automatically whenever a signal it reads changes.
    // Every key press restarts the timer, so searchQuery only changes after a short pause.
    effect((onCleanup) => {
      const search = this.search();
      const timer = setTimeout(() => this.searchQuery.set(search), SEARCH_DELAY_MS);
      onCleanup(() => clearTimeout(timer));
    });
  }

  protected loadMore() {
    this.offset.set(this.loaded().length);
  }

  protected selectCountry(country: string, cityCount: number, dropdown: Dropdown) {
    const alreadySelected = country === this.country() && !this.city();

    this.country.set(country);
    this.city.set('');

    // Stays open only if the country has several cities, so you can also pick a city.
    if (!country || cityCount <= 1 || alreadySelected) {
      dropdown.close();
    }
  }

  protected selectCity(city: string, dropdown: Dropdown) {
    this.city.set(city);
    dropdown.close();
  }

  protected selectPeriod(period: Period, dropdown: Dropdown) {
    this.period.set(period);
    dropdown.close();
  }

  protected selectSort(sort: Sort, dropdown: Dropdown) {
    this.sort.set(sort);
    dropdown.close();
  }

  protected clearFilters() {
    this.search.set('');
    this.country.set('');
    this.city.set('');
    this.period.set('any');
  }
}

// The last date ("YYYY-MM-DD") covered by the period, or null for "Any time".
function periodEnd(period: Period): string | null {
  const d = new Date();
  switch (period) {
    case 'any':
      return null;
    case 'month':
      return toIsoDate(new Date(d.getFullYear(), d.getMonth() + 1, 0)); // last day of the month
    case '30d':
      d.setDate(d.getDate() + 30);
      return toIsoDate(d);
    case '3m':
      d.setMonth(d.getMonth() + 3);
      return toIsoDate(d);
    case '6m':
      d.setMonth(d.getMonth() + 6);
      return toIsoDate(d);
  }
}

function toIsoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
