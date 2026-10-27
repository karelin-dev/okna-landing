// Заявки. В демо LEAD_ENDPOINT = null: заявка не уходит, в консоль пишется то,
// что ушло бы на сервер. Для боевого режима укажите адрес API или вебхука CRM.
const LEAD_ENDPOINT = null;

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

function getUtm() {
  const params = new URLSearchParams(window.location.search);
  return UTM_KEYS.reduce((acc, key) => {
    if (params.has(key)) acc[key] = params.get(key);
    return acc;
  }, {});
}

function phoneDigits(value) {
  return value.replace(/\D/g, '');
}

function formatPhone(value) {
  let digits = phoneDigits(value);
  if (digits.startsWith('8')) digits = `7${digits.slice(1)}`;
  if (!digits.startsWith('7')) digits = `7${digits}`;
  const d = digits.slice(1, 11);

  let result = '+7';
  if (d.length > 0) result += ` (${d.slice(0, 3)}`;
  if (d.length >= 3) result += ')';
  if (d.length > 3) result += ` ${d.slice(3, 6)}`;
  if (d.length > 6) result += `-${d.slice(6, 8)}`;
  if (d.length > 8) result += `-${d.slice(8, 10)}`;
  return result;
}

function initPhoneMask(input) {
  input.addEventListener('focus', () => {
    if (!input.value) input.value = '+7 (';
  });
  input.addEventListener('input', (e) => {
    const isDelete = e.inputType && e.inputType.startsWith('delete');
    if (phoneDigits(input.value).length <= 1 && isDelete) {
      input.value = '';
      return;
    }
    input.value = formatPhone(input.value);
  });
  input.addEventListener('blur', () => {
    if (phoneDigits(input.value).length <= 1) input.value = '';
  });
}

function getFieldError(input) {
  if (input.type === 'checkbox') {
    return input.required && !input.checked ? 'Нужно согласие на обработку данных' : '';
  }
  const value = input.value.trim();
  if (input.hasAttribute('data-phone')) {
    const length = phoneDigits(value).length;
    if (length <= 1) return 'Укажите телефон';
    return length === 11 ? '' : 'Номер указан не полностью';
  }
  if (input.required && !value) return input.name === 'name' ? 'Укажите имя' : 'Заполните поле';
  if (input.minLength > 0 && value.length < input.minLength) return 'Слишком коротко';
  return '';
}

function setFieldError(input, message) {
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
  if (input.type === 'checkbox') {
    input.closest('.checkbox').classList.toggle('is-invalid', Boolean(message));
    return;
  }
  input.classList.toggle('is-invalid', Boolean(message));
  const error = input.closest('.field')?.querySelector('.field__error');
  if (error) error.textContent = message;
}

function validateForm(form) {
  const inputs = [...form.querySelectorAll('[required]')].filter((input) => !input.closest('[hidden]'));
  let firstInvalid = null;
  inputs.forEach((input) => {
    const message = getFieldError(input);
    setFieldError(input, message);
    if (message && !firstInvalid) firstInvalid = input;
  });
  if (firstInvalid) firstInvalid.focus();
  return !firstInvalid;
}

function collectLead(form) {
  const data = Object.fromEntries(new FormData(form));
  delete data.consent;
  Object.keys(data).forEach((key) => {
    if (data[key] === '') delete data[key];
  });
  if (data.phone) data.phone = `+${phoneDigits(data.phone)}`;
  return {
    ...data,
    form: form.dataset.leadForm,
    page: window.location.href,
    utm: getUtm(),
    createdAt: new Date().toISOString(),
  };
}

async function sendLead(lead) {
  if (!LEAD_ENDPOINT) {
    console.info('[демо] Заявка не отправлена, LEAD_ENDPOINT не задан:', lead);
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { ok: true, demo: true };
  }
  const response = await fetch(LEAD_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lead),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function showSuccess(form) {
  const success = form.querySelector('[data-form-success]');
  [...form.children].forEach((child) => {
    if (child !== success) child.dataset.hiddenBySuccess = String(!child.hidden);
    if (child !== success) child.hidden = true;
  });
  success.hidden = false;
  success.setAttribute('tabindex', '-1');
  success.focus();
}

function resetLeadForm(form) {
  const success = form.querySelector('[data-form-success]');
  if (!success || success.hidden) return;
  [...form.children].forEach((child) => {
    if (child === success) return;
    if (child.dataset.hiddenBySuccess === 'true') child.hidden = false;
    delete child.dataset.hiddenBySuccess;
  });
  success.hidden = true;
  form.reset();
  form.querySelectorAll('[aria-invalid="true"]').forEach((input) => setFieldError(input, ''));
}

function initLeadForms() {
  document.querySelectorAll('[data-phone]').forEach(initPhoneMask);

  document.querySelectorAll('[data-lead-form]').forEach((form) => {
    // Ошибка поля пропадает, как только его поправили
    form.addEventListener('input', (e) => {
      if (e.target.getAttribute('aria-invalid') === 'true') {
        setFieldError(e.target, getFieldError(e.target));
      }
    });
    form.addEventListener('change', (e) => {
      if (e.target.type === 'checkbox' && e.target.required) {
        setFieldError(e.target, getFieldError(e.target));
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!validateForm(form)) return;

      const button = form.querySelector('[type="submit"]');
      const label = button.innerHTML;
      button.disabled = true;
      button.textContent = 'Отправляем…';

      try {
        await sendLead(collectLead(form));
        showSuccess(form);
        form.dispatchEvent(new CustomEvent('lead:sent'));
      } catch (error) {
        console.error(error);
        alert('Не удалось отправить заявку. Позвоните нам: 8 800 000-00-00');
      } finally {
        button.disabled = false;
        button.innerHTML = label;
      }
    });
  });
}
