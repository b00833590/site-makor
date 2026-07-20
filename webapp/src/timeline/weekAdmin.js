import { buildEditableInput } from '../admin/editableInput.js';

export function renderWeekAdmin(container, { activeWeek, isEditing, onLabelEdit, onAddWeek }) {
  container.replaceChildren();
  if (!isEditing) return;

  if (activeWeek) {
    const labelInput = buildEditableInput(activeWeek.label, 'text', 'week-admin-label-input', v => onLabelEdit(activeWeek, { label: v }));
    container.appendChild(labelInput);
  }

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'week-admin-add';
  addBtn.textContent = '+ Nouvelle semaine';
  addBtn.addEventListener('click', () => onAddWeek());
  container.appendChild(addBtn);
}
