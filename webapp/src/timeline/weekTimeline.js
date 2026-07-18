export function initWeekTimeline({ container, weeks, activeWeekId, onSelect }) {
  function render(currentActiveId) {
    container.replaceChildren();
    for (const week of weeks) {
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
}
