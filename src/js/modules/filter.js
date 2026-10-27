// Фильтр объектов по типу: прячем карточки, которые не подходят
function initWorksFilter() {
  const filter = document.querySelector('[data-filter]');
  if (!filter) return;

  const buttons = [...filter.querySelectorAll('[data-filter-value]')];
  const works = [...document.querySelectorAll('[data-type]')];

  filter.addEventListener('click', (e) => {
    const button = e.target.closest('[data-filter-value]');
    if (!button) return;
    const value = button.dataset.filterValue;

    buttons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    works.forEach((work) => {
      work.hidden = value !== 'all' && work.dataset.type !== value;
    });
  });
}
