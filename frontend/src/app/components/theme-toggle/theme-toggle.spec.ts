import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Theme } from '../../services/theme';
import { ThemeToggle } from './theme-toggle';

describe('ThemeToggle', () => {
  let fixture: ComponentFixture<ThemeToggle>;
  let el: HTMLElement;

  const buttons = () => el.querySelectorAll<HTMLButtonElement>('button');
  const [dark, light] = [() => buttons()[0], () => buttons()[1]];

  beforeEach(async () => {
    localStorage.clear();
    delete document.documentElement.dataset['theme'];
    await TestBed.configureTestingModule({
      imports: [ThemeToggle],
    }).compileComponents();

    fixture = TestBed.createComponent(ThemeToggle);
    el = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset['theme'];
  });

  it('shows Dark as active by default', () => {
    expect(dark().classList).toContain('active');
    expect(dark().getAttribute('aria-pressed')).toBe('true');
    expect(light().getAttribute('aria-pressed')).toBe('false');
  });

  it('switches the theme when a button is clicked', async () => {
    light().click();
    await fixture.whenStable();
    expect(TestBed.inject(Theme).scheme()).toBe('light');
    expect(light().classList).toContain('active');
    expect(light().getAttribute('aria-pressed')).toBe('true');
    expect(dark().getAttribute('aria-pressed')).toBe('false');

    dark().click();
    await fixture.whenStable();
    expect(TestBed.inject(Theme).scheme()).toBe('dark');
  });
});
