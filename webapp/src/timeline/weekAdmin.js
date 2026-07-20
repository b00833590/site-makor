import { buildEditableInput } from '../admin/editableInput.js';

export function renderWeekAdmin(container, { activeWeek, isEditing, onLabelEdit, onAddWeek, onDeleteWeek }) {
  container.replaceChildren();
  if (!isEditing) return;

  if (activeWeek) {
    const labelInput = buildEditableInput(activeWeek.label, 'text', 'week-admin-label-input', v => onLabelEdit(activeWeek, { label: v }));
    container.appendChild(labelInput);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'week-admin-delete';
    deleteBtn.textContent = '✕ Supprimer cette semaine';
    deleteBtn.addEventListener('click', () => onDeleteWeek(activeWeek));
    container.appendChild(deleteBtn);
  }

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'week-admin-add';
  addBtn.textContent = '+ Nouvelle semaine';
  addBtn.addEventListener('click', () => onAddWeek());
  container.appendChild(addBtn);
}
