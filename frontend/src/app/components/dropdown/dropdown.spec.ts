import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Dropdown } from './dropdown';

describe('Dropdown', () => {
  let component: Dropdown;
  let fixture: ComponentFixture<Dropdown>;
  let el: HTMLElement;

  const isOpen = () => el.querySelector('.panel')!.classList.contains('open');
  const trigger = () => el.querySelector<HTMLButtonElement>('.trigger')!;

  function open() {
    trigger().click();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dropdown],
    }).compileComponents();

    fixture = TestBed.createComponent(Dropdown);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.componentRef.setInput('label', 'Country');
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the label on the button', () => {
    expect(el.querySelector('.label')!.textContent).toBe('Country');
  });

  it('opens and closes when the button is clicked', () => {
    expect(isOpen()).toBe(false);
    open();
    expect(isOpen()).toBe(true);
    expect(trigger().getAttribute('aria-expanded')).toBe('true');

    trigger().click();
    fixture.detectChanges();
    expect(isOpen()).toBe(false);
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('closes on close()', () => {
    open();
    component.close();
    fixture.detectChanges();
    expect(isOpen()).toBe(false);
  });

  it('closes on a click outside, but not inside', () => {
    open();
    el.querySelector<HTMLElement>('.panel')!.click();
    fixture.detectChanges();
    expect(isOpen()).toBe(true);

    document.body.click();
    fixture.detectChanges();
    expect(isOpen()).toBe(false);
  });

  it('closes on Escape', () => {
    open();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(isOpen()).toBe(false);
  });

  it('closes one second after the mouse leaves', () => {
    vi.useFakeTimers();
    open();
    el.dispatchEvent(new MouseEvent('mouseleave'));

    vi.advanceTimersByTime(900);
    fixture.detectChanges();
    expect(isOpen()).toBe(true);

    vi.advanceTimersByTime(100);
    fixture.detectChanges();
    expect(isOpen()).toBe(false);
  });

  it('stays open if the mouse comes back in time', () => {
    vi.useFakeTimers();
    open();
    el.dispatchEvent(new MouseEvent('mouseleave'));
    vi.advanceTimersByTime(500);
    el.dispatchEvent(new MouseEvent('mouseenter'));

    vi.advanceTimersByTime(2000);
    fixture.detectChanges();
    expect(isOpen()).toBe(true);
  });
});
