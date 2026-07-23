function closeTooltip() {
  document.getElementById('active-week-tooltip')?.remove();
}

function showTooltip(dot, label) {
  closeTooltip();
  const rect = dot.getBoundingClientRect();
  const tooltip = document.createElement('div');
  tooltip.id = 'active-week-tooltip';
  tooltip.className = 'week-tooltip';
  tooltip.textContent = label;
  tooltip.style.top = `${rect.top + rect.height / 2}px`;
  tooltip.style.left = `${rect.right + 10}px`;
  document.body.appendChild(tooltip);
}

export function initWeekTimeline({ container, weeks, activeWeekId, onSelect }) {
  let currentWeeks = weeks;

  function render(currentActiveId) {
    container.replaceChildren();
    for (const week of currentWeeks) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'week-dot' + (week.id === currentActiveId ? ' active' : '');
      dot.setAttribute('aria-label', week.label);
      dot.addEventListener('mouseenter', () => showTooltip(dot, week.label));
      dot.addEventListener('mouseleave', closeTooltip);
      dot.addEventListener('click', () => {
        closeTooltip();
        onSelect(week.id);
        render(week.id);
      });
      container.appendChild(dot);
    }
  }

  render(activeWeekId);

  return {
    setWeeks(newWeeks, newActiveWeekId) {
      closeTooltip();
      currentWeeks = newWeeks;
      render(newActiveWeekId);
    },
  };
}
