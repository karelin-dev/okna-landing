// «Остался 1 вопрос», «Осталось 3 вопроса», «Осталось 5 вопросов»
function questionsLeft(n) {
  const forms = ['вопрос', 'вопроса', 'вопросов'];
  const mod10 = n % 10;
  const mod100 = n % 100;
  let form = forms[2];
  if (mod10 === 1 && mod100 !== 11) form = forms[0];
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) form = forms[1];
  return `${n === 1 ? 'Остался' : 'Осталось'} ${n} ${form}`;
}

function initQuiz() {
  const form = document.getElementById('quiz-form');
  if (!form) return;

  const steps = [...form.querySelectorAll('[data-step]')];
  const questionsCount = steps.length - 1; // последний шаг: контакты
  const counter = form.querySelector('[data-quiz-counter]');
  const percentEl = form.querySelector('[data-quiz-percent]');
  const left = form.querySelector('[data-quiz-left]');
  const bar = form.querySelector('[data-quiz-bar]');
  const progress = form.querySelector('[role="progressbar"]');
  const prevBtn = form.querySelector('[data-quiz-prev]');
  const nextBtn = form.querySelector('[data-quiz-next]');
  const submitBtn = form.querySelector('[data-quiz-submit]');
  const error = form.querySelector('[data-quiz-error]');

  let current = 0;
  let isMoving = false;

  function render() {
    const isLast = current === steps.length - 1;
    steps.forEach((step, i) => {
      step.hidden = i !== current;
    });
    const percent = Math.round((current / questionsCount) * 100);
    counter.textContent = isLast ? 'Последний шаг' : `Вопрос ${current + 1} из ${questionsCount}`;
    percentEl.textContent = `${percent}%`;
    bar.style.width = `${percent}%`;
    progress.setAttribute('aria-valuenow', String(percent));
    left.textContent = isLast || current === 0 ? '' : questionsLeft(questionsCount - current);
    prevBtn.hidden = current === 0;
    nextBtn.hidden = isLast;
    submitBtn.hidden = !isLast;
    error.textContent = '';
  }

  function isAnswered(step) {
    const radios = [...step.querySelectorAll('input[type="radio"]')];
    return !radios.length || radios.some((radio) => radio.checked);
  }

  function go(delta) {
    current = Math.min(Math.max(current + delta, 0), steps.length - 1);
    render();
    const target = steps[current].querySelector('input:checked') || steps[current].querySelector('input');
    if (target) target.focus({ preventScroll: true });
  }

  nextBtn.addEventListener('click', () => {
    if (!isAnswered(steps[current])) {
      error.textContent = 'Выберите один из вариантов';
      return;
    }
    go(1);
  });

  prevBtn.addEventListener('click', () => go(-1));

  // Enter на промежуточном шаге не должен отправлять заявку без контактов.
  // Обработчик регистрируется раньше общего из forms.js и останавливает его.
  form.addEventListener('submit', (e) => {
    if (current === steps.length - 1) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    nextBtn.click();
  });

  form.addEventListener('change', (e) => {
    if (e.target.type === 'radio') error.textContent = '';
  });

  // Мышью и пальцем переходим к следующему вопросу сразу после выбора.
  // С клавиатуры стрелки только меняют вариант, дальше по кнопке «Далее».
  form.addEventListener('pointerup', (e) => {
    if (!e.target.closest('.option') || isMoving) return;
    isMoving = true;
    setTimeout(() => {
      isMoving = false;
      if (current < steps.length - 1 && isAnswered(steps[current])) go(1);
    }, 250);
  });

  render();
}
