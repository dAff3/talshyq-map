const seedIdeas = [
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

const ACCOUNTS_KEY = 'talshyk-pages-accounts-v1';
const SESSION_KEY = 'talshyk-pages-session-v1';
const VOTES_KEY = 'talshyk-pages-local-votes-v1';
const IDEAS_KEY = 'talshyk-pages-local-ideas-v1';
const LOGS_KEY = 'talshyk-pages-local-admin-logs-v1';
const ANNOUNCEMENTS_KEY = 'talshyk-pages-announcements-v1';
const OCCUPATIONS = {
  teacher: 'Учитель', lecturer: 'Преподаватель', vice_principal: 'Завуч', principal: 'Директор',
  educator: 'Воспитатель', psychologist: 'Педагог-психолог', methodologist: 'Методист',
  social_teacher: 'Социальный педагог', librarian: 'Библиотекарь', school_staff: 'Другой сотрудник школы',
  parent: 'Родитель', student: 'Ученик', resident: 'Житель',
};
const STAFF_OCCUPATIONS = new Set(['teacher', 'lecturer', 'vice_principal', 'principal', 'educator', 'psychologist', 'methodologist', 'social_teacher', 'librarian', 'school_staff']);
let ideas = readLocalList(IDEAS_KEY);
if (localStorage.getItem(IDEAS_KEY) === null) ideas = seedIdeas.map(idea => ({ ...idea, author_username: '' }));
let announcements = readLocalList(ANNOUNCEMENTS_KEY);
let activeStatus = 'Все инициативы';
let activeCategory = 'Все';
let searchTerm = '';
let sortMode = 'newest';
let currentUser = null;
let registering = false;
let announcementScope = 'public';
let activeAnnouncementTab = 'public';
const grid = document.querySelector('#cards-grid');
const emptyState = document.querySelector('#empty-state');
const toast = document.querySelector('#toast');
const authDialog = document.querySelector('#auth-dialog');
const accountDialog = document.querySelector('#account-dialog');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('visible'), 3400);
}

function readLocalList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function readLocalVotes() {
  try {
    const value = JSON.parse(localStorage.getItem(VOTES_KEY) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function saveIdeas() {
  localStorage.setItem(IDEAS_KEY, JSON.stringify(ideas));
}

function saveAnnouncements() {
  localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(announcements));
}

function hasStaffAccess(user = currentUser) {
  return Boolean(user && (user.role === 'admin' || STAFF_OCCUPATIONS.has(user.occupation)));
}

function canPublishAnnouncements(user = currentUser) {
  return hasStaffAccess(user);
}

function addLocalLog(action, details = '') {
  const logs = readLocalList(LOGS_KEY);
  logs.unshift({
    actor: currentUser?.displayName || 'Система', action, details,
    created_at: new Date().toLocaleString('ru-RU'),
  });
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs.slice(0, 100)));
}

function ensureLocalAdmin() {
  const accounts = readLocalList(ACCOUNTS_KEY);
  let changed = false;
  accounts.forEach(account => {
    if (!OCCUPATIONS[account.occupation]) {
      account.occupation = 'resident';
      changed = true;
    }
  });
  if (accounts.length && !accounts.some(account => account.role === 'admin')) {
    accounts.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    accounts[0].role = 'admin';
    changed = true;
  }
  if (changed) localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  return accounts;
}

function updateAccountUI() {
  document.querySelector('#auth-trigger').hidden = Boolean(currentUser);
  const userButton = document.querySelector('#current-user');
  userButton.hidden = !currentUser;
  userButton.textContent = currentUser ? `${currentUser.displayName}${currentUser.role === 'admin' ? ' · админ' : ''}` : '';
  userButton.title = currentUser ? `Профиль ${currentUser.displayName}` : '';
  document.querySelector('#admin-nav-link').hidden = currentUser?.role !== 'admin';
  document.querySelector('#admin-section').hidden = currentUser?.role !== 'admin';
  renderAdmin();
  renderAnnouncements();
}

function openAuth(register = false) {
  if (currentUser) return accountDialog.showModal();
  setAuthMode(register);
  authDialog.showModal();
}

function setAuthMode(register) {
  registering = register;
  document.querySelector('#auth-title').textContent = register ? 'Создать аккаунт' : 'Войти';
  document.querySelector('#auth-copy').textContent = register
    ? 'Укажите свою роль, чтобы видеть объявления для вашей группы.'
    : 'Войдите, чтобы участвовать в жизни Талшыка.';
  document.querySelector('#name-field').hidden = !register;
  document.querySelector('#name-field input').required = register;
  document.querySelector('#profession-field').hidden = !register;
  document.querySelector('#profession-field select').required = register;
  if (!register) document.querySelector('#profession-field select').value = '';
  document.querySelector('#workplace-field').hidden = !register;
  if (!register) document.querySelector('#workplace-field input').value = '';
  document.querySelector('#auth-submit').textContent = register ? 'Зарегистрироваться' : 'Войти';
  document.querySelector('#auth-switch').innerHTML = register
    ? 'Уже есть аккаунт? <button type="button" id="switch-auth">Войти</button>'
    : 'Нет аккаунта? <button type="button" id="switch-auth">Зарегистрироваться</button>';
}

function randomHex(bytes = 16) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), value => value.toString(16).padStart(2, '0')).join('');
}

async function passwordHash(password, saltHex) {
  if (!crypto.subtle) throw new Error('Для регистрации открой сайт через HTTPS в современном браузере.');
  const salt = new Uint8Array(saltHex.match(/.{2}/g).map(value => Number.parseInt(value, 16)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 210000, hash: 'SHA-256' }, key, 256);
  return Array.from(new Uint8Array(bits), value => value.toString(16).padStart(2, '0')).join('');
}

function hashesMatch(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string' || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

function openAccount() {
  if (!currentUser) return openAuth(false);
  const votes = readLocalVotes()[currentUser.username] || [];
  document.querySelector('#account-avatar').textContent = currentUser.displayName.slice(0, 1).toUpperCase();
  document.querySelector('#account-name').textContent = currentUser.displayName;
  document.querySelector('#account-handle').textContent = `@${currentUser.username}`;
  document.querySelector('#account-profession').textContent = OCCUPATIONS[currentUser.occupation] || OCCUPATIONS.resident;
  const workplace = document.querySelector('#account-workplace');
  workplace.textContent = currentUser.workplace || '';
  workplace.hidden = !currentUser.workplace;
  document.querySelector('#account-created').textContent = `Аккаунт создан ${new Date(currentUser.createdAt).toLocaleDateString('ru-RU')}`;
  document.querySelector('#account-votes').textContent = votes.length;
  document.querySelector('#account-ideas').textContent = ideas.filter(idea => idea.author_username === currentUser.username).length;
  document.querySelector('#account-role').textContent = currentUser.role === 'admin' ? 'Администратор' : 'Участник';
  accountDialog.showModal();
}

function statusClass(status) {
  return status === 'В работе' ? 'status-work' : status === 'Завершено' ? 'status-done' : '';
}

function render() {
  const visible = ideas.filter(idea => {
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
    const localVotes = readLocalVotes();
    const voted = Boolean(currentUser && (localVotes[currentUser.username] || []).includes(idea.id));
    const localVoteCount = Object.values(localVotes).reduce((sum, userVotes) => sum + (Array.isArray(userVotes) && userVotes.includes(idea.id) ? 1 : 0), 0);
    const voteCount = idea.votes + localVoteCount;
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
        <div class="card-footer"><span class="author"><i class="author-avatar">${escapeHtml(idea.author_name.slice(0, 1))}</i>${escapeHtml(idea.author_name)}</span><div class="card-actions"><button class="discussion-button" type="button" data-demo-action="discussion"><span>Обсудить</span><b>0</b></button><button class="vote-button ${voted ? 'voted' : ''}" type="button" data-demo-action="vote" data-idea-id="${escapeHtml(idea.id)}">${voted ? '✓ Поддержано' : '♡ Поддержать'} · ${voteCount}</button></div></div>
      </div>
    </article>`;
  }).join('');
  emptyState.hidden = visible.length > 0;
  grid.hidden = visible.length === 0;
  document.querySelector('#stat-ideas').textContent = ideas.length;
  const localVotes = readLocalVotes();
  const personalVotes = Object.values(localVotes).reduce((sum, userVotes) => sum + (Array.isArray(userVotes) ? userVotes.length : 0), 0);
  document.querySelector('#stat-votes').textContent = ideas.reduce((sum, idea) => sum + idea.votes, 0) + personalVotes;
  document.querySelector('#stat-members').textContent = '—';
  document.querySelector('#stat-pending').textContent = ideas.filter(idea => idea.status === 'На голосовании').length;
  document.querySelector('#stat-active').textContent = ideas.filter(idea => idea.status === 'В работе').length;
  document.querySelector('#stat-complete').textContent = ideas.filter(idea => idea.status === 'Завершено').length;
  document.querySelector('.filter-count').textContent = ideas.length;
  renderAdmin();
}

function renderAdmin() {
  const section = document.querySelector('#admin-section');
  if (!section || currentUser?.role !== 'admin') return;
  const votes = readLocalVotes();
  const voteCount = ideaId => ideas.reduce((sum, idea) => sum + (idea.id === ideaId ? idea.votes : 0), 0) +
    Object.values(votes).reduce((sum, userVotes) => sum + (Array.isArray(userVotes) && userVotes.includes(ideaId) ? 1 : 0), 0);
  document.querySelector('#admin-total').textContent = ideas.length;
  document.querySelector('#admin-pending').textContent = ideas.filter(idea => idea.status === 'На голосовании').length;
  document.querySelector('#admin-active').textContent = ideas.filter(idea => idea.status === 'В работе').length;
  document.querySelector('#admin-complete').textContent = ideas.filter(idea => idea.status === 'Завершено').length;
  document.querySelector('#admin-idea-count').textContent = ideas.length;
  document.querySelector('#admin-ideas').innerHTML = ideas.map(idea => `<div class="admin-idea-row">
    <div class="admin-idea-title"><strong>${escapeHtml(idea.title)}</strong><small>${escapeHtml(idea.category)} · ${escapeHtml(idea.author_name)}</small><div class="admin-row-actions"><button type="button" data-admin-delete="${escapeHtml(idea.id)}">Удалить</button></div></div>
    <span class="admin-votes">${voteCount(idea.id)} <small>голосов</small></span>
    <select data-admin-status="${escapeHtml(idea.id)}" aria-label="Статус инициативы"><option ${idea.status === 'На голосовании' ? 'selected' : ''}>На голосовании</option><option ${idea.status === 'В работе' ? 'selected' : ''}>В работе</option><option ${idea.status === 'Завершено' ? 'selected' : ''}>Завершено</option></select>
  </div>`).join('');
  const logs = readLocalList(LOGS_KEY).slice(0, 20);
  document.querySelector('#audit-logs').innerHTML = logs.length ? logs.map(log => `<div class="log-row"><span class="log-dot"></span><div class="log-main"><div><b>${escapeHtml(log.action)}</b><time>${escapeHtml(log.created_at)}</time></div><p>${escapeHtml(log.details || '')}</p><small>${escapeHtml(log.actor)}</small></div></div>`).join('') : '<p class="log-empty">Пока действий нет.</p>';
}

function announcementCard(item, staffOnly = false) {
  const parsedDate = item.created_at ? new Date(item.created_at) : null;
  const date = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toLocaleDateString('ru-RU') : '';
  const audience = staffOnly ? `<span class="announcement-audience">${item.target === 'all_staff' ? 'Все сотрудники' : escapeHtml(OCCUPATIONS[item.target] || 'Сотрудники')}</span>` : '';
  const canDelete = currentUser && (currentUser.role === 'admin' || currentUser.username === item.author_username);
  const author = escapeHtml(item.author_name || 'Редакция');
  const workplace = item.author_workplace ? `<small>${escapeHtml(item.author_workplace)}</small>` : '';
  return `<article class="announcement-card ${staffOnly ? 'announcement-card-staff' : ''}">
    <div class="announcement-card-meta"><span>${escapeHtml(item.category)}</span>${audience}<time>${escapeHtml(date)}</time></div>
    <h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.body).replace(/\n/g, '<br>')}</p>
    <div class="announcement-card-footer"><span class="announcement-author"><b>${author}</b>${workplace}</span>${canDelete ? `<button type="button" data-delete-announcement="${escapeHtml(item.id)}">Удалить</button>` : ''}</div>
  </article>`;
}

function setAnnouncementTab(tab) {
  if (tab === 'staff' && !hasStaffAccess()) tab = 'public';
  activeAnnouncementTab = tab;
  document.querySelectorAll('.announcement-tab').forEach(button => {
    const selected = button.dataset.announcementTab === tab;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-selected', String(selected));
  });
  document.querySelector('#public-announcement-panel').hidden = tab !== 'public';
  document.querySelector('#staff-announcement-panel').hidden = tab !== 'staff';
}

function renderAnnouncements() {
  const staffAllowed = hasStaffAccess();
  document.querySelector('#staff-announcement-tab').hidden = !staffAllowed;
  document.querySelector('#add-public-announcement').hidden = !canPublishAnnouncements();
  document.querySelector('#add-staff-announcement').hidden = !staffAllowed;
  if (!staffAllowed && activeAnnouncementTab === 'staff') activeAnnouncementTab = 'public';
  setAnnouncementTab(activeAnnouncementTab);

  const publicItems = announcements.filter(item => item.scope === 'public').sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  const staffItems = announcements.filter(item => item.scope === 'staff' && staffAllowed &&
    (currentUser.role === 'admin' || item.target === 'all_staff' || item.target === currentUser.occupation))
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  document.querySelector('#public-announcement-list').innerHTML = publicItems.map(item => announcementCard(item)).join('');
  document.querySelector('#staff-announcement-list').innerHTML = staffItems.map(item => announcementCard(item, true)).join('');
  document.querySelector('#public-announcement-empty').hidden = publicItems.length > 0;
  document.querySelector('#staff-announcement-empty').hidden = staffItems.length > 0;
}

function openAnnouncementComposer(scope) {
  if (!canPublishAnnouncements()) {
    showToast('Публиковать объявления могут сотрудники образования.');
    return;
  }
  announcementScope = scope === 'staff' ? 'staff' : 'public';
  const form = document.querySelector('#announcement-form');
  form.reset();
  const isStaff = announcementScope === 'staff';
  document.querySelector('#announcement-dialog-eyebrow').textContent = isStaff ? 'ДЛЯ СОТРУДНИКОВ ОБРАЗОВАНИЯ' : 'ПУБЛИЧНОЕ ОБЪЯВЛЕНИЕ';
  document.querySelector('#announcement-dialog-title').textContent = isStaff ? 'Сообщение для коллектива' : 'Новое объявление';
  document.querySelector('#announcement-target-field').hidden = !isStaff;
  document.querySelector('#announcement-target-field select').disabled = !isStaff;
  document.querySelector('#announcement-dialog').showModal();
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
  const voteButton = event.target.closest('[data-demo-action="vote"]');
  if (voteButton) {
    if (!currentUser) return openAuth(false);
    const votes = readLocalVotes();
    const userVotes = votes[currentUser.username] || [];
    const isRemovingVote = userVotes.includes(voteButton.dataset.ideaId);
    votes[currentUser.username] = isRemovingVote
      ? userVotes.filter(id => id !== voteButton.dataset.ideaId)
      : [...userVotes, voteButton.dataset.ideaId];
    localStorage.setItem(VOTES_KEY, JSON.stringify(votes));
    const votedIdea = ideas.find(idea => idea.id === voteButton.dataset.ideaId);
    addLocalLog(isRemovingVote ? 'Отменена поддержка' : 'Поддержана инициатива', votedIdea?.title || '');
    render();
    showToast('Спасибо за поддержку!');
    return;
  }
  if (event.target.closest('[data-demo-action="discussion"]')) showToast('Обсуждение скоро появится.');
});
function openIdeaForm() {
  if (!currentUser) return openAuth(false);
  document.querySelector('#idea-form').reset();
  document.querySelector('#idea-dialog').showModal();
}
['#open-form-list', '#open-form-bottom'].forEach(selector => document.querySelector(selector)?.addEventListener('click', openIdeaForm));
document.querySelector('#close-idea').addEventListener('click', () => document.querySelector('#idea-dialog').close());
document.querySelector('#idea-dialog').addEventListener('click', event => { if (event.target.id === 'idea-dialog') event.currentTarget.close(); });
document.querySelector('#idea-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!currentUser) return openAuth(false);
  const values = Object.fromEntries(new FormData(event.currentTarget).entries());
  const visualByCategory = { 'Благоустройство': 'park', 'Спорт': 'sport', 'Культура': 'culture', 'Экология': 'clean', 'Другое': 'stage' };
  const idea = {
    id: randomHex(8), title: String(values.title).trim(), category: String(values.category),
    description: String(values.description).trim(), author_name: currentUser.displayName,
    author_username: currentUser.username, votes: 0, status: 'На голосовании',
    visual: visualByCategory[values.category] || 'park', progress: 0, created_at: new Date().toISOString().slice(0, 10),
  };
  ideas.unshift(idea);
  saveIdeas();
  addLocalLog('Добавлена инициатива', idea.title);
  event.currentTarget.reset();
  document.querySelector('#idea-dialog').close();
  activeStatus = 'Все инициативы';
  activeCategory = 'Все';
  searchTerm = '';
  document.querySelector('#search').value = '';
  document.querySelectorAll('.filter').forEach(item => item.classList.toggle('active', item.dataset.filter === 'Все инициативы'));
  document.querySelectorAll('.category').forEach(item => item.classList.toggle('active', item.dataset.category === 'Все'));
  render();
  showToast('Инициатива добавлена.');
});

document.querySelectorAll('[data-announcement-tab]').forEach(button => button.addEventListener('click', () => {
  setAnnouncementTab(button.dataset.announcementTab);
}));
document.querySelector('#add-public-announcement').addEventListener('click', () => openAnnouncementComposer('public'));
document.querySelector('#add-staff-announcement').addEventListener('click', () => openAnnouncementComposer('staff'));
document.querySelector('#close-announcement').addEventListener('click', () => document.querySelector('#announcement-dialog').close());
document.querySelector('#announcement-dialog').addEventListener('click', event => {
  if (event.target.id === 'announcement-dialog') event.currentTarget.close();
});
document.querySelector('#announcement-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!canPublishAnnouncements()) return showToast('Публиковать объявления могут сотрудники образования.');
  const values = Object.fromEntries(new FormData(event.currentTarget).entries());
  const title = String(values.title || '').trim();
  const body = String(values.body || '').trim();
  if (title.length < 3 || body.length < 5) return showToast('Добавьте заголовок и текст объявления.');
  const item = {
    id: randomHex(8), scope: announcementScope, title,
    category: String(values.category || 'Объявление'), body,
    target: announcementScope === 'staff' ? String(values.target || 'all_staff') : '',
    author_username: currentUser.username, author_name: currentUser.displayName,
    author_workplace: currentUser.workplace || '', created_at: new Date().toISOString(),
  };
  announcements.unshift(item);
  saveAnnouncements();
  addLocalLog(announcementScope === 'staff' ? 'Опубликовано сообщение для сотрудников' : 'Опубликовано публичное объявление', title);
  event.currentTarget.reset();
  document.querySelector('#announcement-dialog').close();
  renderAnnouncements();
  showToast('Объявление опубликовано.');
});
['#public-announcement-list', '#staff-announcement-list'].forEach(selector => {
  document.querySelector(selector).addEventListener('click', event => {
    const button = event.target.closest('[data-delete-announcement]');
    if (!button) return;
    const item = announcements.find(announcement => announcement.id === button.dataset.deleteAnnouncement);
    if (!item || (currentUser?.role !== 'admin' && currentUser?.username !== item.author_username)) return;
    announcements = announcements.filter(announcement => announcement.id !== item.id);
    saveAnnouncements();
    addLocalLog('Удалено объявление', item.title);
    renderAnnouncements();
    showToast('Объявление удалено.');
  });
});

document.querySelector('#auth-trigger').addEventListener('click', () => openAuth(false));
document.querySelector('#current-user').addEventListener('click', openAccount);
document.querySelector('#close-auth').addEventListener('click', () => authDialog.close());
authDialog.addEventListener('click', event => { if (event.target === authDialog) authDialog.close(); });
document.querySelector('#auth-switch').addEventListener('click', event => {
  if (event.target.closest('#switch-auth')) setAuthMode(!registering);
});
document.querySelector('#auth-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form).entries());
  const username = String(values.username || '').trim().toLowerCase();
  const password = String(values.password || '');
  try {
    const accounts = readLocalList(ACCOUNTS_KEY);
    if (registering) {
      const displayName = String(values.name || '').trim();
      const occupation = String(values.profession || '');
      const workplace = String(values.workplace || '').trim().slice(0, 70);
      if (!/^[a-z0-9._-]{3,24}$/.test(username)) throw new Error('Логин: 3–24 латинских символа, цифры, точка, _ или -.');
      if (displayName.length < 2 || displayName.length > 40) throw new Error('Имя должно содержать от 2 до 40 символов.');
      if (!OCCUPATIONS[occupation]) throw new Error('Выберите свою роль или должность.');
      if (password.length < 10) throw new Error('Пароль должен быть не короче 10 символов.');
      if (accounts.some(account => account.username === username)) throw new Error('Этот логин уже занят.');
      const salt = randomHex();
      const account = {
        id: randomHex(12), username, displayName, occupation, workplace, salt,
        passwordHash: await passwordHash(password, salt),
        createdAt: new Date().toISOString(),
        role: accounts.length ? 'resident' : 'admin',
      };
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...accounts, account]));
      currentUser = account;
      addLocalLog(account.role === 'admin' ? 'Создан администратор' : 'Создан аккаунт', username);
    } else {
      const account = accounts.find(item => item.username === username);
      if (!account || !hashesMatch(await passwordHash(password, account.salt), account.passwordHash)) {
        throw new Error('Неверный логин или пароль.');
      }
      currentUser = account;
      addLocalLog('Вход', username);
    }
    localStorage.setItem(SESSION_KEY, currentUser.username);
    form.reset();
    setAuthMode(false);
    authDialog.close();
    updateAccountUI();
    render();
    showToast(currentUser.role === 'admin' ? `Здравствуйте, ${currentUser.displayName}! Вы администратор.` : `Здравствуйте, ${currentUser.displayName}!`);
  } catch (error) {
    showToast(error.message || 'Не удалось сохранить аккаунт.');
  }
});
document.querySelector('#close-account').addEventListener('click', () => accountDialog.close());
accountDialog.addEventListener('click', event => { if (event.target === accountDialog) accountDialog.close(); });
document.querySelector('#logout-button').addEventListener('click', () => {
  addLocalLog('Выход', currentUser.username);
  localStorage.removeItem(SESSION_KEY);
  currentUser = null;
  accountDialog.close();
  updateAccountUI();
  render();
  showToast('Вы вышли из аккаунта.');
});
document.querySelector('#delete-account').addEventListener('click', () => {
  if (!currentUser || !confirm('Удалить аккаунт и его голоса? Это действие нельзя отменить.')) return;
  addLocalLog('Удалён аккаунт', currentUser.username);
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(readLocalList(ACCOUNTS_KEY).filter(account => account.username !== currentUser.username)));
  const votes = readLocalVotes();
  delete votes[currentUser.username];
  localStorage.setItem(VOTES_KEY, JSON.stringify(votes));
  ensureLocalAdmin();
  localStorage.removeItem(SESSION_KEY);
  currentUser = null;
  accountDialog.close();
  updateAccountUI();
  render();
  showToast('Аккаунт удалён.');
});

document.querySelector('#admin-ideas').addEventListener('change', event => {
  const select = event.target.closest('[data-admin-status]');
  if (!select || currentUser?.role !== 'admin') return;
  const idea = ideas.find(item => item.id === select.dataset.adminStatus);
  if (!idea) return;
  idea.status = select.value;
  idea.progress = idea.status === 'Завершено' ? 100 : idea.status === 'На голосовании' ? 0 : Math.max(35, idea.progress || 0);
  saveIdeas();
  addLocalLog('Изменён статус инициативы', `${idea.title} · ${idea.status}`);
  render();
  showToast('Статус обновлён.');
});
document.querySelector('#admin-ideas').addEventListener('click', event => {
  const button = event.target.closest('[data-admin-delete]');
  if (!button || currentUser?.role !== 'admin' || !confirm('Удалить эту инициативу?')) return;
  const idea = ideas.find(item => item.id === button.dataset.adminDelete);
  ideas = ideas.filter(item => item.id !== button.dataset.adminDelete);
  const votes = readLocalVotes();
  Object.keys(votes).forEach(username => { votes[username] = (votes[username] || []).filter(id => id !== button.dataset.adminDelete); });
  localStorage.setItem(VOTES_KEY, JSON.stringify(votes));
  saveIdeas();
  addLocalLog('Удалена инициатива', idea?.title || '');
  render();
  showToast('Инициатива удалена.');
});

const savedUsername = localStorage.getItem(SESSION_KEY);
const storedAccounts = ensureLocalAdmin();
currentUser = storedAccounts.find(account => account.username === savedUsername) || null;
updateAccountUI();

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

const menuToggle = document.querySelector('#menu-toggle');
const mainNavigation = document.querySelector('#main-navigation');
function setMenuOpen(open) {
  mainNavigation.classList.toggle('open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  menuToggle.textContent = open ? '×' : '☰';
}
menuToggle.addEventListener('click', () => setMenuOpen(!mainNavigation.classList.contains('open')));
mainNavigation.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', () => setMenuOpen(false)));

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
