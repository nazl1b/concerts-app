import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Concert, ConcertPage, Sort } from '../../models/concert';
import { CONCERTS_URL } from '../../services/concerts';
import { ConcertList } from './concert-list';

const COUNTRIES: ConcertPage['countries'] = [
  { name: 'Greece', count: 30, cities: [{ name: 'Athens', count: 20 }, { name: 'Thessaloniki', count: 10 }] },
  { name: 'Spain', count: 15, cities: [{ name: 'Madrid', count: 15 }] },
];

// A fake page of up to 20 concerts starting at offset, out of total.
function fakePage({ offset = 0, total = 45, sort = 'soonest' as Sort } = {}): ConcertPage {
  const items: Concert[] = Array.from({ length: Math.max(0, Math.min(20, total - offset)) }, (_, i) => ({
    artist: `Artist ${offset + i}`,
    event: `Event ${offset + i}`,
    date: '2026-11-01',
    time: '20:00:00',
    venue: '',
    city: 'Athens',
    country: 'Greece',
    url: `https://example.com/${offset + i}`,
    image: '',
  }));
  return {
    items,
    offset,
    sort,
    total,
    all: 45,
    countries: COUNTRIES,
    groupCounts:
      sort === 'artist'
        ? Object.fromEntries(items.map((c) => [c.artist, 1]))
        : { '2026-11': total },
  };
}

function isoDateIn(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

describe('ConcertList', () => {
  let fixture: ComponentFixture<ConcertList>;
  let http: HttpTestingController;
  let el: HTMLElement;

  // The request the page just sent. TestBed.tick() runs change detection, which sends it.
  // (whenStable would wait for its answer forever, so we only use it after flush.)
  function request(): TestRequest {
    TestBed.tick();
    return http.expectOne((req) => req.url === CONCERTS_URL);
  }

  async function respond(req: TestRequest, page: ConcertPage) {
    req.flush(page);
    await fixture.whenStable();
  }

  const param = (req: TestRequest, name: string) => req.request.params.get(name);
  const cards = () => el.querySelectorAll('app-concert-card').length;
  const text = (selector: string) => el.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
  const loadMoreButton = () => el.querySelector<HTMLButtonElement>('.load-more .btn');

  // A button in one of the dropdown menus (or anywhere), by its visible text.
  function button(label: string) {
    const found = [...el.querySelectorAll<HTMLButtonElement>('button')].find(
      (b) => (b.querySelector('span')?.textContent ?? b.textContent)!.trim() === label,
    );
    if (!found) throw new Error(`No button "${label}"`);
    return found;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConcertList],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ConcertList);
    http = TestBed.inject(HttpTestingController);
    el = fixture.nativeElement;
  });

  afterEach(() => {
    http.verify(); // no request was left without an answer
    vi.useRealTimers();
  });

  it('shows a spinner until the first page arrives', async () => {
    const req = request();
    expect(text('.state')).toContain('Loading concerts...');
    expect(el.querySelector('.toolbar')).toBeNull();

    await respond(req, fakePage());
    expect(el.querySelector('.spinner')).toBeNull();
    expect(el.querySelector('.toolbar')).not.toBeNull();
  });

  it('asks n8n for the first 20 concerts with no filters', async () => {
    const req = request();
    expect(param(req, 'offset')).toBe('0');
    expect(param(req, 'limit')).toBe('20');
    expect(param(req, 'q')).toBe('');
    expect(param(req, 'country')).toBe('');
    expect(param(req, 'city')).toBe('');
    expect(param(req, 'until')).toBe('');
    expect(param(req, 'sort')).toBe('soonest');
    await respond(req, fakePage());
  });

  it('loads 20 concerts at a time with "Load more"', async () => {
    await respond(request(), fakePage({ total: 45 }));
    expect(cards()).toBe(20);
    expect(text('.load-more p')).toBe('Showing 20 of 45');

    loadMoreButton()!.click();
    const second = request();
    expect(param(second, 'offset')).toBe('20');
    await respond(second, fakePage({ offset: 20, total: 45 }));
    expect(cards()).toBe(40);

    loadMoreButton()!.click();
    const third = request();
    expect(param(third, 'offset')).toBe('40');
    await respond(third, fakePage({ offset: 40, total: 45 }));
    expect(cards()).toBe(45);
    expect(loadMoreButton()).toBeNull(); // everything is loaded
  });

  it('disables "Load more" while the next page loads', async () => {
    await respond(request(), fakePage());
    loadMoreButton()!.click();
    const req = request();
    expect(loadMoreButton()!.disabled).toBe(true);
    expect(loadMoreButton()!.textContent!.trim()).toBe('Loading...');
    await respond(req, fakePage({ offset: 20 }));
    expect(loadMoreButton()!.disabled).toBe(false);
  });

  it('shows the totals from n8n, not just the loaded concerts', async () => {
    await respond(request(), fakePage({ total: 45 }));
    expect(text('.count')).toBe('45 of 45 shows');
    expect(text('.group-count')).toBe('45 shows'); // the whole month, although only 20 are loaded
  });

  it('starts over from the first page when a filter changes', async () => {
    await respond(request(), fakePage());
    loadMoreButton()!.click();
    await respond(request(), fakePage({ offset: 20 }));
    expect(cards()).toBe(40);

    button('Latest first').click();
    const req = request();
    expect(param(req, 'offset')).toBe('0');
    expect(param(req, 'sort')).toBe('latest');
    await respond(req, fakePage({ sort: 'latest' }));
    expect(cards()).toBe(20); // replaced, not added
  });

  it('filters by country and city', async () => {
    await respond(request(), fakePage());

    button('Greece').click();
    let req = request();
    expect(param(req, 'country')).toBe('Greece');
    expect(param(req, 'city')).toBe('');
    await respond(req, fakePage({ total: 30 }));

    // Greece has two cities, so they appear under it.
    button('Thessaloniki').click();
    req = request();
    expect(param(req, 'country')).toBe('Greece');
    expect(param(req, 'city')).toBe('Thessaloniki');
    await respond(req, fakePage({ total: 10 }));
    expect(el.querySelector('app-dropdown .label')!.textContent).toBe('Thessaloniki, Greece');
  });

  it('does not show cities for a country with only one', async () => {
    await respond(request(), fakePage());
    button('Spain').click();
    await respond(request(), fakePage({ total: 15 }));
    expect(() => button('Madrid')).toThrow();
  });

  it('filters by period', async () => {
    await respond(request(), fakePage());
    button('Next 30 days').click();
    const req = request();
    expect(param(req, 'until')).toBe(isoDateIn(30));
    await respond(req, fakePage());
  });

  it('groups by artist when sorted A–Z', async () => {
    await respond(request(), fakePage());
    button('Artist A–Z').click();
    const req = request();
    expect(param(req, 'sort')).toBe('artist');
    await respond(req, fakePage({ sort: 'artist' }));
    const titles = [...el.querySelectorAll('.group-title > span:first-child')].map((t) => t.textContent!.trim());
    expect(titles.slice(0, 2)).toEqual(['Artist 0', 'Artist 1']);
  });

  it('searches only after you stop typing', async () => {
    await respond(request(), fakePage());
    vi.useFakeTimers();

    const input = el.querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = 'Metal';
    input.dispatchEvent(new Event('input'));
    TestBed.tick();
    http.expectNone((req) => req.url === CONCERTS_URL); // not yet

    vi.advanceTimersByTime(300);
    const req = request();
    expect(param(req, 'q')).toBe('Metal');
    expect(param(req, 'offset')).toBe('0');
    req.flush(fakePage({ total: 3 }));
  });

  it('clears all filters with "Clear"', async () => {
    await respond(request(), fakePage());
    expect(el.querySelector('.toolbar .btn-secondary')).toBeNull(); // no filters, no "Clear"

    button('Greece').click();
    await respond(request(), fakePage({ total: 30 }));
    el.querySelector<HTMLButtonElement>('.toolbar .btn-secondary')!.click();
    const req = request();
    expect(param(req, 'country')).toBe('');
    await respond(req, fakePage());
    expect(el.querySelector('.toolbar .btn-secondary')).toBeNull();
  });

  it('says so when no concerts match the filters', async () => {
    await respond(request(), fakePage({ total: 0 }));
    expect(cards()).toBe(0);
    expect(text('.results .state p')).toBe('No concerts match your filters.');
    expect(loadMoreButton()).toBeNull();
  });

  it('shows an error with "Try again" when n8n is not running', async () => {
    const req = request();
    req.flush('down', { status: 0, statusText: 'Unknown Error' });
    await fixture.whenStable();
    expect(text('.state p')).toBe("Couldn't load concerts. Is n8n running?");

    button('Try again').click();
    await respond(request(), fakePage());
    expect(cards()).toBe(20);
  });

  it('keeps the loaded concerts when "Load more" fails', async () => {
    await respond(request(), fakePage());
    loadMoreButton()!.click();
    request().flush('down', { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();

    expect(cards()).toBe(20);
    expect(text('.state p')).toBe("Couldn't load concerts. Is n8n running?");
    button('Try again').click();
    const retry = request();
    expect(param(retry, 'offset')).toBe('20');
    await respond(retry, fakePage({ offset: 20 }));
    expect(cards()).toBe(40);
  });
});
