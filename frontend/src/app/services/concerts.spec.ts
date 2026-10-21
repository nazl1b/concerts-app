import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ConcertPage, ConcertQuery } from '../models/concert';
import { CONCERTS_URL, Concerts, PAGE_SIZE } from './concerts';

describe('Concerts', () => {
  let service: Concerts;
  let http: HttpTestingController;

  const query = signal<ConcertQuery>({ q: '', country: '', city: '', until: '', sort: 'soonest', offset: 0 });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(Concerts);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('asks n8n for one page with the query', async () => {
    query.set({ q: 'Metal', country: 'Greece', city: 'Athens', until: '2026-12-31', sort: 'artist', offset: 40 });
    const page = TestBed.runInInjectionContext(() => service.page(query));
    TestBed.tick();

    const req = http.expectOne((r) => r.url === CONCERTS_URL);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('q')).toBe('Metal');
    expect(req.request.params.get('country')).toBe('Greece');
    expect(req.request.params.get('city')).toBe('Athens');
    expect(req.request.params.get('until')).toBe('2026-12-31');
    expect(req.request.params.get('sort')).toBe('artist');
    expect(req.request.params.get('offset')).toBe('40');
    expect(req.request.params.get('limit')).toBe(String(PAGE_SIZE));

    const body = { items: [], offset: 40, total: 0 } as unknown as ConcertPage;
    req.flush(body);
    await TestBed.inject(ApplicationRef).whenStable(); // the answer is handled asynchronously
    expect(page.value()).toEqual(body);
  });

  it('asks again when the query changes', () => {
    query.set({ q: '', country: '', city: '', until: '', sort: 'soonest', offset: 0 });
    TestBed.runInInjectionContext(() => service.page(query));
    TestBed.tick();
    http.expectOne((r) => r.params.get('offset') === '0').flush({});

    query.update((q) => ({ ...q, offset: 20 }));
    TestBed.tick();
    http.expectOne((r) => r.params.get('offset') === '20').flush({});
  });
});
