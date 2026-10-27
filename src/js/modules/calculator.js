// Калькулятор стоимости окна. Цены условные, для демо.
const CALC_PRICES = {
  profile: { economy: 6500, standard: 8500, premium: 11500 }, // ₽ за м² окна
  glass: { single: 0, double: 900, energy: 1600 }, // доплата за м² стеклопакета
  openingSash: 2400, // поворотно-откидная фурнитура, за створку
  mountingRate: 0.15, // монтаж: доля от стоимости окна
  net: 1500, // москитная сетка, за открывающуюся створку
  sill: 1100, // подоконник, за метр ширины
  ebb: 700, // отлив, за метр ширины
  slopes: 900, // откосы, за метр периметра без нижней стороны
  debris: 800, // вывоз мусора, за заказ
  installmentMonths: 6,
  bulkDiscount: { minQty: 3, rate: 0.05 },
};

// width и height: [минимум, максимум, значение по умолчанию] в мм
const WINDOW_TYPES = {
  single: { name: 'одностворчатое', sashes: 1, minOpen: 0, defaultOpen: 1, factor: 1, width: [400, 1000, 700], height: [400, 2000, 1300] },
  double: { name: 'двустворчатое', sashes: 2, minOpen: 0, defaultOpen: 1, factor: 1.05, width: [800, 2000, 1300], height: [600, 2000, 1400] },
  triple: { name: 'трёхстворчатое', sashes: 3, minOpen: 0, defaultOpen: 2, factor: 1.1, width: [1400, 3000, 2000], height: [600, 2000, 1400] },
  balcony: { name: 'балконный блок', sashes: 2, minOpen: 1, defaultOpen: 1, factor: 1.15, width: [1400, 2400, 1900], height: [2000, 2400, 2150] },
};

const PROFILE_NAMES = { economy: 'эконом', standard: 'стандарт', premium: 'премиум' };
const GLASS_NAMES = { single: 'однокамерный', double: 'двухкамерный', energy: 'энергосберегающий' };
const QTY_LIMITS = [1, 20];

function formatRub(value) {
  return `${new Intl.NumberFormat('ru-RU').format(Math.round(value / 10) * 10)} ₽`;
}

function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

// Стоимость каждой опции для одного окна: и для расчёта, и для подписей на чипах
function getOptionPrices(p) {
  const w = p.width / 1000;
  const h = p.height / 1000;
  return {
    net: p.openings * CALC_PRICES.net,
    sill: w * CALC_PRICES.sill,
    ebb: w * CALC_PRICES.ebb,
    slopes: (w + 2 * h) * CALC_PRICES.slopes,
    debris: CALC_PRICES.debris,
  };
}

// Чистая функция расчёта: удобно проверять отдельно от DOM
function calculateWindow(p) {
  const type = WINDOW_TYPES[p.type];
  const area = (p.width / 1000) * (p.height / 1000);
  const optionPrices = getOptionPrices(p);

  const windowCost =
    area * (CALC_PRICES.profile[p.profile] + CALC_PRICES.glass[p.glass]) * type.factor +
    p.openings * CALC_PRICES.openingSash;

  const extras = ['net', 'sill', 'ebb', 'slopes'].reduce((sum, key) => sum + (p[key] ? optionPrices[key] : 0), 0);
  const mounting = p.mounting ? windowCost * CALC_PRICES.mountingRate : 0;
  const subtotal = (windowCost + extras + mounting) * p.qty;
  const { minQty, rate } = CALC_PRICES.bulkDiscount;
  const discount = p.qty >= minQty ? subtotal * rate : 0;
  const debris = p.debris ? optionPrices.debris : 0;
  const total = subtotal - discount + debris;

  const size = `${p.width} × ${p.height} мм`;
  const lines = [{ label: p.qty > 1 ? `Окна ${size}, ${p.qty} шт.` : `Окно ${size}`, value: windowCost * p.qty }];
  if (mounting) lines.push({ label: 'Монтаж по ГОСТ', value: mounting * p.qty });
  if (extras) lines.push({ label: 'Комплектация', value: extras * p.qty });
  if (debris) lines.push({ label: 'Вывоз мусора', value: debris });
  if (discount) lines.push({ label: `Скидка ${rate * 100}%`, value: -discount, kind: 'discount' });
  lines.push({ label: 'Замер и доставка', value: 0, kind: 'free' });

  return {
    lines,
    total,
    oldTotal: discount ? total + discount : null,
    monthly: Math.ceil(total / CALC_PRICES.installmentMonths / 100) * 100,
    optionPrices,
  };
}

function initCalculator() {
  const form = document.getElementById('calc-form');
  if (!form) return;

  const el = {
    width: form.elements.width,
    height: form.elements.height,
    openings: form.elements.openings,
    qty: form.elements.qty,
    net: form.elements.net,
    hint: document.getElementById('calc-size-hint'),
    total: document.getElementById('calc-total'),
    old: document.getElementById('calc-old'),
    monthly: document.getElementById('calc-monthly'),
    mountingTag: document.getElementById('calc-mounting-tag'),
    breakdown: document.getElementById('calc-breakdown'),
    bar: document.querySelector('[data-calc-bar]'),
    barTotal: document.querySelector('[data-calc-bar-total]'),
  };
  const ranges = {
    width: form.querySelector('[data-sync="calc-width"]'),
    height: form.querySelector('[data-sync="calc-height"]'),
  };

  const currentType = () => WINDOW_TYPES[form.elements.type.value];

  function updateFill(range) {
    const percent = ((range.value - range.min) / (range.max - range.min)) * 100;
    range.style.setProperty('--fill', `${percent}%`);
  }

  function setLimits(dimension, [min, max]) {
    [el[dimension], ranges[dimension]].forEach((input) => {
      input.min = min;
      input.max = max;
    });
    const limits = ranges[dimension].parentElement.querySelectorAll('[data-limit]');
    limits[0].textContent = min;
    limits[1].textContent = max;
  }

  function setSize(dimension, value) {
    el[dimension].value = value;
    ranges[dimension].value = value;
    updateFill(ranges[dimension]);
  }

  function fillOpenings(type) {
    // При первом заполнении списка прошлого значения нет: берём значение по умолчанию
    const previous = el.openings.options.length ? Number(el.openings.value) : NaN;
    el.openings.innerHTML = '';
    for (let n = type.minOpen; n <= type.sashes; n += 1) {
      const label = n === 0 ? 'Все створки глухие' : `${n} из ${type.sashes}, поворотно-откидная`;
      el.openings.add(new Option(label, String(n)));
    }
    const keep = previous >= type.minOpen && previous <= type.sashes;
    el.openings.value = String(keep ? previous : type.defaultOpen);
  }

  function applyType(isInitial) {
    const type = currentType();
    ['width', 'height'].forEach((dimension) => {
      const [min, max, def] = type[dimension];
      setLimits(dimension, type[dimension]);
      setSize(dimension, isInitial ? def : clamp(Number(el[dimension].value), min, max));
    });
    fillOpenings(type);
    el.hint.textContent = '';
  }

  function readParams() {
    const type = currentType();
    const f = form.elements;
    return {
      type: f.type.value,
      width: clamp(Number(el.width.value), type.width[0], type.width[1]),
      height: clamp(Number(el.height.value), type.height[0], type.height[1]),
      profile: f.profile.value,
      glass: f.glass.value,
      openings: Number(el.openings.value),
      qty: clamp(Number(el.qty.value), ...QTY_LIMITS),
      mounting: f.mounting.checked,
      net: f.net.checked,
      sill: f.sill.checked,
      ebb: f.ebb.checked,
      slopes: f.slopes.checked,
      debris: f.debris.checked,
    };
  }

  function render() {
    // Москитная сетка ставится только на открывающиеся створки
    const noOpenings = Number(el.openings.value) === 0;
    el.net.disabled = noOpenings;
    if (noOpenings) el.net.checked = false;

    const params = readParams();
    const result = calculateWindow(params);

    el.total.textContent = formatRub(result.total).replace(' ₽', '');
    el.monthly.textContent = formatRub(result.monthly);
    el.mountingTag.textContent = params.mounting ? 'с монтажом' : 'без монтажа';
    el.old.hidden = !result.oldTotal;
    el.old.textContent = result.oldTotal ? formatRub(result.oldTotal) : '';
    if (el.barTotal) el.barTotal.textContent = formatRub(result.total);

    form.querySelectorAll('[data-option-price]').forEach((span) => {
      const price = result.optionPrices[span.dataset.optionPrice];
      span.textContent = price ? `+${formatRub(price)}` : '';
    });

    el.breakdown.innerHTML = '';
    result.lines.forEach((line) => {
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = line.label;
      if (line.kind === 'free') dd.textContent = 'бесплатно';
      else if (line.kind === 'discount') dd.textContent = `−${formatRub(-line.value)}`;
      else dd.textContent = formatRub(line.value);
      if (line.kind) dd.classList.add(`is-${line.kind}`);
      el.breakdown.append(dt, dd);
    });

    const type = WINDOW_TYPES[params.type];
    form.dataset.summary =
      `${type.name} ${params.width}×${params.height} мм, профиль ${PROFILE_NAMES[params.profile]}, ` +
      `стеклопакет ${GLASS_NAMES[params.glass]}, ${params.qty} шт., ${formatRub(result.total)}`;
  }

  // Ползунок двигает число, число двигает ползунок
  Object.entries(ranges).forEach(([dimension, range]) => {
    range.addEventListener('input', () => {
      el[dimension].value = range.value;
      updateFill(range);
    });
    el[dimension].addEventListener('input', () => {
      range.value = el[dimension].value;
      updateFill(range);
    });
    el[dimension].addEventListener('change', () => {
      const [min, max] = currentType()[dimension];
      const raw = Number(el[dimension].value);
      const value = clamp(raw, min, max);
      el.hint.textContent = value !== raw ? `Значение приведено к допустимому: ${value} мм (от ${min} до ${max}).` : '';
      setSize(dimension, value);
      render();
    });
  });

  form.querySelectorAll('.stepper__btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      el.qty.value = clamp(Number(el.qty.value) + Number(btn.dataset.step), ...QTY_LIMITS);
      render();
    });
  });

  el.qty.addEventListener('change', () => {
    el.qty.value = clamp(Number(el.qty.value), ...QTY_LIMITS);
    render();
  });

  form.addEventListener('change', (e) => {
    if (e.target.name === 'type') applyType(false);
    render();
  });
  form.addEventListener('input', render);
  form.addEventListener('submit', (e) => e.preventDefault());

  // Плашка видна, пока пользователь в параметрах, а блок с итогом за экраном
  if (el.bar && 'IntersectionObserver' in window) {
    const params = form.querySelector('.calc__params');
    const result = document.getElementById('calc-result');
    const visible = new Map();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => visible.set(entry.target, entry.isIntersecting));
      el.bar.hidden = !(visible.get(params) && !visible.get(result));
    });
    observer.observe(params);
    observer.observe(result);
  }

  applyType(true);
  render();
}
