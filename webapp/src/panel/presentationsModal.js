export function initPresentationsModal({ modalEl, closeBtn, triggerBtn }) {
  function open() {
    modalEl.classList.add('open');
  }

  function close() {
    modalEl.classList.remove('open');
  }

  triggerBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);

  return { open, close };
}
