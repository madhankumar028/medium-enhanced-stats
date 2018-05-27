const $body = document.querySelector('body');
const $table = document.querySelector('table');
const $year = document.querySelector('.year');
const $version = document.querySelector('.version');
const $welcome = document.querySelector('.welcome');
const $user = document.querySelector('.user');
const $userAvatar = document.querySelector('.user-avatar');
const $userSelector = document.querySelector('.user-selector');
const $confetti = document.querySelector('.confetti');
const $milestoneReached = document.querySelector('.milestone-reached-value');
const $milestoneReachedValue = document.querySelector('.milestone-reached-value .value');
const $milestoneReachedUnit = document.querySelector('.milestone-reached-value .unit');
const $chartProgress = document.querySelector('.chart .progress');
const $chartReach = document.querySelector('.chart .reach');
const $chartMilestone = document.querySelector('.chart .milestone');
const $buttonOpenStats = document.querySelector('.open-stats');
const $buttonRefreshStats = document.querySelector('.refresh-stats');

const AVATAR_URL = 'https://cdn-images-1.medium.com/fit/c/64/64/';
const LEVELS = generateLevels();

let data;

$year.textContent = (new Date()).getFullYear();
$version.textContent = 'v' + chrome.runtime.getManifest().version;
$welcome.addEventListener('click', () => $userSelector.style.display = 'block');
$confetti.addEventListener('click', () => confetti($confetti)); // easter egg
$buttonOpenStats.addEventListener('click', () => openStatsPage());
$buttonRefreshStats.addEventListener('click', () => {
  init();
  setTimeout(() => $buttonRefreshStats.blur(), 1000);
});
init();

function init() {
  $body.classList.add('loading');
  $chartProgress.setAttribute('stroke-dasharray', `0 100`);
  chrome.runtime.sendMessage({ type: 'GET_TOTALS'}, {}, s => {
    data = s;
    updateUserSelector(data);
    updateUI(data.user);
    $body.classList.remove('loading');
  });
}

function updateUI(account) {
  updateStatsTable('articles', account.totals.articles);
  updateStatsTable('responses', account.totals.responses);
  updateChart(account.totals);
  updateUser(account.name, account.avatar);
}

function updateAccount(id) {
  $body.classList.add('loading');
  $chartProgress.setAttribute('stroke-dasharray', `0 100`);
  const account = id === 'user' ? data.user : data.collections[id];
  setTimeout(() => {
    $body.classList.remove('loading');
    $userSelector.style.display = 'none';
    updateUI(account);
  });
}

function updateStatsTable(type, totals) {
  const { items, views, reads, fans, claps, ratio } = totals;
  const $cols = $table.querySelectorAll(`.${type} td`);
  $cols[0].textContent = `${type.slice(0, 1).toUpperCase()}${type.slice(1)}`;
  $cols[1].textContent = formatValue(items);
  $cols[2].textContent = formatValue(views);
  $cols[3].textContent = formatValue(reads);
  $cols[4].textContent = ratio + '%';
  $cols[5].textContent = formatValue(fans);
  $cols[6].textContent = formatValue(claps);
}

function updateChart(totals) {
  const { articles, responses } = totals;
  const reach = articles.views + responses.views;
  const milestone = LEVELS.find(level => level > reach);
  const milestonePrev = LEVELS[LEVELS.indexOf(milestone) - 1];
  const milestoneDiff = milestone - milestonePrev;
  const progress = (((reach - milestonePrev) / milestoneDiff) * 100).toFixed(0);
  $chartProgress.setAttribute('stroke-dasharray', `${progress} 100`);
  $chartReach.textContent = formatValue(reach);
  $chartMilestone.textContent = formatWholeNumber(milestone);

  chrome.storage.sync.get(['milestoneActive'], ({ milestoneActive }) => {
    console.log('active milestone', milestoneActive, milestone);
    if(milestoneActive === undefined) {
      chrome.storage.sync.set({ milestoneActive: milestone });
      return;
    }
    if(milestone !== milestoneActive) {
      showMilestoneReached(milestonePrev, progress);
      chrome.storage.sync.set({ milestoneActive: milestone }, () => {});
    }
  });
}

function showMilestoneReached(milestone, progress) {
  const value = formatValue(milestone);
  $body.classList.add('milestone-reached');
  $chartProgress.setAttribute('stroke-dasharray', `0 100`);
  $milestoneReachedValue.textContent = value.slice(0, value.length - 2);
  $milestoneReachedUnit.textContent = value.slice(-1);
  setTimeout(() => {
    $chartProgress.setAttribute('stroke-dasharray', `100 100`);
    setTimeout(() => {
      $milestoneReached.classList.add('milestone-reached-value-explode');
      setTimeout(() => {
        confetti($confetti);
        $milestoneReached.classList.remove('milestone-reached-value-explode');
        $body.classList.remove('milestone-reached');
        $milestoneReachedValue.textContent = 0;
        $milestoneReachedUnit.textContent = '';
        $chartProgress.setAttribute('stroke-dasharray', `0 100`);
        $chartProgress.style.display = 'none';
        setTimeout(() => {
          $chartProgress.setAttribute('stroke-dasharray', `${progress} 100`);
          $chartProgress.style.display = '';
        }, 100);
      }, 1000);
    }, 2000);
  });
}

function updateUser(name, avatar) {
  $user.textContent = name;
  $userAvatar.src = AVATAR_URL + avatar;
}

function updateUserSelector(data) {
  const { user, collections } = data;
  const options = collections
    .map((c, index)=> ({ id: index, label: c.name, avatar: c.avatar, account: c }));
  options.unshift({ id: 'user', label: user.name, avatar: user.avatar, account: user });

  $userSelector.innerHTML = `
    ${options.map(o => `
        <div class="option" data-id="${o.id}">
            <span class="user">${o.label}</span>
            <img class="user-avatar" src="${AVATAR_URL}${o.avatar}" />
        </div>`
    )}
  `;
  Array.from(document.querySelectorAll('.user-selector div'))
    .forEach(n => n.addEventListener('click', () => updateAccount(n.getAttribute('data-id'))));
}

function formatValue(number) {
  return number >= 1000000000
    ? (number / 1000000000).toFixed(1) + 'B'
    : number >= 1000000
      ? (number / 1000000).toFixed(1) + 'M'
      :  number >= 1000
          ? (number / 1000).toFixed(1) + 'K'
          : number.toFixed(0);
}

function formatWholeNumber(number) {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}


function openStatsPage() {
  chrome.tabs.create({ url: 'https://medium.com/me/stats' });
}

function generateLevels() {
  return [
    0,
    1000,
    5000,
    10000,
    25000,
    50000,
    75000,
    100000,
    250000,
    500000,
    750000,
    1000000,
    2000000,
    4000000,
    6000000,
    8000000,
    10000000,
    20000000,
    30000000,
    40000000,
    50000000,
    60000000,
    70000000,
    80000000,
    90000000,
    100000000,
    200000000,
    300000000,
    400000000,
    500000000,
    600000000,
    700000000,
    800000000,
    900000000,
    1000000000,
    10000000000,
    100000000000,
    1000000000000,
    10000000000000
  ];
}
