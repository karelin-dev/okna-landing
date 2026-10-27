const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])';

function trapFocus(e, container) {
  const focusable = [...container.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

// Что показать над формой: расчёт из калькулятора или выбранный товар
function getModalSummary(source) {
  if (source === 'calc') {
    const calcForm = document.getElementById('calc-form');
    const calculation = calcForm ? calcForm.dataset.summary : '';
    return calculation ? { text: `Ваш расчёт: ${calculation}`, calculation } : null;
  }
  // header и menu: общие кнопки звонка, товар не выбран
  if (source && !['header', 'menu'].includes(source)) return { text: `Интересует: ${source}`, calculation: '' };
  return null;
}

function initModals() {
  let activeModal = null;
  let lastFocused = null;

  function open(name, trigger) {
    const modal = document.querySelector(`[data-modal="${name}"]`);
    if (!modal) return;
    lastFocused = trigger || document.activeElement;

    const form = modal.querySelector('form');
    if (form) {
      resetLeadForm(form);
      const source = trigger ? trigger.dataset.source || '' : '';
      const summary = getModalSummary(source);
      const summaryEl = modal.querySelector('[data-modal-summary]');
      form.elements.source.value = source;
      form.elements.calculation.value = summary ? summary.calculation : '';
      summaryEl.hidden = !summary;
      summaryEl.textContent = summary ? summary.text : '';
    }

    modal.hidden = false;
    document.body.classList.add('is-locked');
    activeModal = modal;
    const firstInput = modal.querySelector('input:not([type="hidden"])');
    if (firstInput) firstInput.focus();
  }

  function close() {
    if (!activeModal) return;
    activeModal.hidden = true;
    document.body.classList.remove('is-locked');
    activeModal = null;
    if (lastFocused) lastFocused.focus();
  }

  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-modal-open]');
    if (opener) {
      e.preventDefault();
      open(opener.dataset.modalOpen, opener);
      return;
    }
    if (e.target.closest('[data-modal-close]')) close();
  });

  document.addEventListener('keydown', (e) => {
    if (!activeModal) return;
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') trapFocus(e, activeModal);
  });
}
