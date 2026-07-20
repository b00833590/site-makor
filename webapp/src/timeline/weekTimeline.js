export function initWeekTimeline({ container, weeks, activeWeekId, onSelect }) {
  let currentWeeks = weeks;

  function render(currentActiveId) {
    container.replaceChildren();
    for (const week of currentWeeks) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'week-dot' + (week.id === currentActiveId ? ' active' : '');
      dot.setAttribute('aria-label', week.label);
      dot.addEventListener('click', () => {
        onSelect(week.id);
        render(week.id);
      });
      container.appendChild(dot);
    }
  }

  render(activeWeekId);

  return {
    setWeeks(newWeeks, newActiveWeekId) {
      currentWeeks = newWeeks;
      render(newActiveWeekId);
    },
  };
}
