import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Concert } from '../../models/concert';
import { ConcertCard } from './concert-card';

const METALLICA: Concert = {
  artist: 'Metallica',
  event: 'Metallica: Life Burns Faster',
  date: '2026-10-22',
  time: '20:30:00',
  venue: 'Sphere',
  city: 'Las Vegas',
  country: 'United States Of America',
  url: 'https://www.ticketmaster.com/',
  image: 'https://example.com/metallica.jpg',
};

describe('ConcertCard', () => {
  let fixture: ComponentFixture<ConcertCard>;
  let el: HTMLElement;

  // concert is a required input, so the test has to give it a value.
  async function render(changes: Partial<Concert> = {}) {
    fixture.componentRef.setInput('concert', { ...METALLICA, ...changes });
    await fixture.whenStable();
  }

  const text = (selector: string) => el.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
  const place = () => el.querySelectorAll('.meta')[1].textContent!.replace(/\s+/g, ' ').trim(); // the 2nd line: venue, city, country

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConcertCard],
    }).compileComponents();

    fixture = TestBed.createComponent(ConcertCard);
    el = fixture.nativeElement;
  });

  it('shows the artist, the image and the date', async () => {
    await render();
    expect(text('.artist')).toBe('Metallica');
    expect(el.querySelector('img')!.getAttribute('src')).toBe(METALLICA.image);
    expect(el.querySelector('img')!.getAttribute('alt')).toBe('Metallica');
    expect(text('.date-badge .day')).toBe('22');
    expect(text('.date-badge .month')).toBe('Oct');
    expect(text('.meta')).toBe('Thursday, October 22 · 20:30');
  });

  it('shows the event name only when it differs from the artist', async () => {
    await render();
    expect(text('.event')).toBe('Metallica: Life Burns Faster');

    await render({ event: 'Metallica' });
    expect(el.querySelector('.event')).toBeNull();
  });

  it('shows the venue, city and country', async () => {
    await render();
    expect(place()).toBe('Sphere, Las Vegas, United States Of America');
  });

  it('leaves out the venue when it is empty', async () => {
    await render({ venue: '' });
    expect(place()).toBe('Las Vegas, United States Of America');
  });

  it('links to the tickets in a new tab', async () => {
    await render();
    const link = el.querySelector<HTMLAnchorElement>('a.tickets')!;
    expect(link.getAttribute('href')).toBe(METALLICA.url);
    expect(link.target).toBe('_blank');
    expect(link.rel).toContain('noopener');
  });
});
