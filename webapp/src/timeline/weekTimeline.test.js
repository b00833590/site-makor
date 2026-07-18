// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { initWeekTimeline } from './weekTimeline.js';

const WEEKS = [
  { id: 'w1', label: 'Semaine 1', order: 0 },
  { id: 'w2', label: 'Semaine 2', order: 1 },
];

describe('initWeekTimeline', () => {
  it('renders one dot per week', () => {
    const container = document.createElement('div');
    initWeekTimeline({ container, weeks: WEEKS, activeWeekId: 'w1', onSelect: () => {} });
    expect(container.querySelectorAll('.week-dot').length).toBe(2);
  });

  it('marks the active week dot and no other', () => {
    const container = document.createElement('div');
    initWeekTimeline({ container, weeks: WEEKS, activeWeekId: 'w2', onSelect: () => {} });
    const dots = container.querySelectorAll('.week-dot');
    expect(dots[0].classList.contains('active')).toBe(false);
    expect(dots[1].classList.contains('active')).toBe(true);
  });

  it('uses the week label as the accessible name', () => {
    const container = document.createElement('div');
    initWeekTimeline({ container, weeks: WEEKS, activeWeekId: 'w1', onSelect: () => {} });
    expect(container.querySelectorAll('.week-dot')[0].getAttribute('aria-label')).toBe('Semaine 1');
  });

  it('calls onSelect with the clicked week id', () => {
    const container = document.createElement('div');
    const onSelect = vi.fn();
    initWeekTimeline({ container, weeks: WEEKS, activeWeekId: 'w1', onSelect });
    container.querySelectorAll('.week-dot')[1].click();
    expect(onSelect).toHaveBeenCalledWith('w2');
  });

  it('moves the active class to the newly clicked week after a click', () => {
    const container = document.createElement('div');
    initWeekTimeline({ container, weeks: WEEKS, activeWeekId: 'w1', onSelect: () => {} });
    container.querySelectorAll('.week-dot')[1].click();
    const dots = container.querySelectorAll('.week-dot');
    expect(dots[0].classList.contains('active')).toBe(false);
    expect(dots[1].classList.contains('active')).toBe(true);
  });
});
