const demoIdeas = [
  {
    id: 'park-benches', title: 'Скамейки и тень в центральном парке', category: 'Благоустройство',
    description: 'Установить несколько удобных скамеек и посадить деревья в местах отдыха.',
    author_name: 'Айгерим', votes: 76, status: 'На голосовании', visual: 'park', progress: 0, created_at: '2025-10-11',
  },
  {
    id: 'sports-court', title: 'Обновить спортивную площадку', category: 'Спорт',
    description: 'Привести в порядок покрытие и добавить простые уличные тренажёры для подростков.',
    author_name: 'Марат', votes: 58, status: 'В работе', visual: 'sport', progress: 55, created_at: '2025-10-08',
  },
  {
    id: 'youth-evening', title: 'Вечер талантов для молодёжи', category: 'Культура',
    description: 'Провести открытый вечер, где школьники и молодёжь смогут показать свои таланты.',
    author_name: 'Дана', votes: 49, status: 'На голосовании', visual: 'culture', progress: 0, created_at: '2025-10-06',
  },
  {
    id: 'river-cleanup', title: 'Чистый берег — чистое село', category: 'Экология',
    description: 'Организовать общий субботник и установить таблички с напоминанием беречь природу.',
    author_name: 'Ерлан', votes: 42, status: 'Завершено', visual: 'water', progress: 100, created_at: '2025-10-03',
  },
  {
    id: 'village-festival', title: 'Праздник соседей', category: 'Культура',
    description: 'Устроить тёплую встречу для жителей с музыкой, играми и угощениями.',
    author_name: 'Жанар', votes: 34, status: 'На голосовании', visual: 'stage', progress: 0, created_at: '2025-09-28',
  },
  {
    id: 'tree-planting', title: 'Посадить деревья у школы', category: 'Экология',
    description: 'Добавить зелени на школьной улице и вместе ухаживать за молодыми деревьями.',
    author_name: 'Нурбек', votes: 27, status: 'В работе', visual: 'clean', progress: 35, created_at: '2025-09-23',
  },
];

let activeStatus = 'Все инициативы';
let activeCategory = 'Все';
let searchTerm = '';
let sortMode = 'newest';
const grid = document.querySelector('#cards-grid');
const emptyState = document.querySelector('#empty-state');
const toast = document.querySelector('#toast');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('visible'), 3400);
}

function statusClass(status) {
  return status === 'В работе' ? 'status-work' : status === 'Завершено' ? 'status-done' : '';
}

function render() {
  const visible = demoIdeas.filter(idea => {
    const statusMatches = activeStatus === 'Все инициативы' || idea.status === activeStatus;
    const categoryMatches = activeCategory === 'Все' || idea.category === activeCategory;
    const text = `${idea.title} ${idea.description} ${idea.category}`.toLocaleLowerCase('ru');
    return statusMatches && categoryMatches && text.includes(searchTerm.toLocaleLowerCase('ru'));
  }).sort((a, b) => {
    if (sortMode === 'popular') return b.votes - a.votes;
    if (sortMode === 'progress') return b.progress - a.progress || b.votes - a.votes;
    return b.created_at.localeCompare(a.created_at);
  });

  grid.innerHTML = visible.map(idea => {
    const progress = idea.status !== 'На голосовании'
      ? `<div class="card-progress" aria-label="Выполнено ${idea.progress}%"><i style="width:${idea.progress}%"></i></div>` : '';
    return `<article class="idea-card">
      <div class="card-visual visual-${escapeHtml(idea.visual)}">
        <span class="status-pill ${statusClass(idea.status)}">${escapeHtml(idea.status)}</span>
        <span class="visual-word">Талшык<br>вместе</span>
      </div>
      <div class="card-content">
        <div class="card-meta"><span class="card-category">${escapeHtml(idea.category)}</span><span>${escapeHtml(idea.created_at)}</span></div>
        <h3>${escapeHtml(idea.title)}</h3><p>${escapeHtml(idea.description)}</p>${progress}
        <div class="card-footer"><span class="author"><i class="author-avatar">${escapeHtml(idea.author_name.slice(0, 1))}</i>${escapeHtml(idea.author_name)}</span><div class="card-actions"><button class="discussion-button" type="button" data-demo-action="discussion"><span>Обсудить</span><b>0</b></button><button class="vote-button" type="button" data-demo-action="vote">♡ Поддержать · ${idea.votes}</button></div></div>
      </div>
    </article>`;
  }).join('');
  emptyState.hidden = visible.length > 0;
  grid.hidden = visible.length === 0;
  document.querySelector('#stat-ideas').textContent = demoIdeas.length;
  document.querySelector('#stat-votes').textContent = demoIdeas.reduce((sum, idea) => sum + idea.votes, 0);
  document.querySelector('#stat-members').textContent = '—';
  document.querySelector('#stat-pending').textContent = demoIdeas.filter(idea => idea.status === 'На голосовании').length;
  document.querySelector('#stat-active').textContent = demoIdeas.filter(idea => idea.status === 'В работе').length;
  document.querySelector('#stat-complete').textContent = demoIdeas.filter(idea => idea.status === 'Завершено').length;
  document.querySelector('.filter-count').textContent = demoIdeas.length;
}

document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
  activeStatus = button.dataset.filter;
  document.querySelectorAll('.filter').forEach(item => item.classList.toggle('active', item === button));
  render();
}));
document.querySelectorAll('[data-hero-filter]').forEach(link => link.addEventListener('click', () => {
  activeStatus = link.dataset.heroFilter;
  activeCategory = 'Все';
  searchTerm = '';
  document.querySelector('#search').value = '';
  document.querySelectorAll('.filter').forEach(item => item.classList.toggle('active', item.dataset.filter === activeStatus));
  document.querySelectorAll('.category').forEach(item => item.classList.toggle('active', item.dataset.category === 'Все'));
  render();
}));
document.querySelectorAll('.category').forEach(button => button.addEventListener('click', () => {
  activeCategory = button.dataset.category;
  document.querySelectorAll('.category').forEach(item => item.classList.toggle('active', item === button));
  render();
}));
document.querySelector('#search').addEventListener('input', event => { searchTerm = event.target.value.trim(); render(); });
document.querySelector('#idea-sort').addEventListener('change', event => { sortMode = event.target.value; render(); });
document.querySelector('#cards-grid').addEventListener('click', event => {
  if (event.target.closest('[data-demo-action="vote"]')) showToast('Голоса в примерах демонстрационные. Для общего голосования нужен сервер.');
  if (event.target.closest('[data-demo-action="discussion"]')) showToast('Обсуждения появятся после подключения серверной версии.');
});
document.querySelectorAll('[data-backend-required]').forEach(button => button.addEventListener('click', () => {
  showToast('Публикация инициатив доступна в серверной версии сайта.');
}));

const themeSelect = document.querySelector('#theme-select');
const deviceTheme = window.matchMedia('(prefers-color-scheme: dark)');
function setTheme(theme, save = false) {
  const allowed = ['system', 'calm', 'sand', 'night'];
  const selected = allowed.includes(theme) ? theme : 'system';
  const applied = selected === 'system' ? (deviceTheme.matches ? 'night' : 'calm') : selected;
  document.body.dataset.theme = applied;
  document.documentElement.style.colorScheme = applied === 'night' ? 'dark' : 'light';
  themeSelect.value = selected;
  if (save) localStorage.setItem('talshyk-theme', selected);
}
themeSelect.addEventListener('change', () => setTheme(themeSelect.value, true));
deviceTheme.addEventListener('change', () => {
  if (themeSelect.value === 'system') setTheme('system');
});
setTheme(localStorage.getItem('talshyk-theme') || 'system');

document.querySelector('#menu-toggle').addEventListener('click', () => document.querySelector('.top-nav').classList.toggle('open'));
document.querySelectorAll('.top-nav a[href^="#"]').forEach(link => link.addEventListener('click', () => document.querySelector('.top-nav').classList.remove('open')));

const revealSections = [...document.querySelectorAll('main > section')];
revealSections.forEach(section => section.classList.add('section-reveal'));
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
  revealSections.forEach(section => section.classList.add('is-visible'));
} else {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }), { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
  revealSections.forEach(section => observer.observe(section));
}

render();
