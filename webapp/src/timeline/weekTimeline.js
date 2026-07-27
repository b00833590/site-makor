export function initWeekTimeline({ container, weeks, activeWeekId, onSelect }) {
  let currentWeeks = weeks;

  function render(currentActiveId) {
    container.replaceChildren();
    for (const week of currentWeeks) {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'week-tab' + (week.id === currentActiveId ? ' active' : '');
      tab.textContent = week.label;
      tab.addEventListener('click', () => {
        onSelect(week.id);
        render(week.id);
      });
      container.appendChild(tab);
    }
    if (currentActiveId) {
      const activeTab = container.querySelector('.week-tab.active');
      if (activeTab && typeof activeTab.scrollIntoView === 'function') {
        activeTab.scrollIntoView({ inline: 'nearest', block: 'nearest' });
      }
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
