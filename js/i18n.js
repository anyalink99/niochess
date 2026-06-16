const RULES_EN =
  '<b>How to move.</b> No turns. Click a piece → a square: it flies for ~10 seconds. In flight it is invulnerable and does not capture; the capture happens on arrival.<br>' +
  '<b>Flight.</b> The time is fixed and does not depend on distance. While travelling a piece is invulnerable and occupies no square.<br>' +
  '<b>Flight limit.</b> “Max pieces in flight” caps how many of your own pieces each side may have flying at once.<br>' +
  '<b>Arrival.</b> Lands on an enemy → capture. Two enemies on one square → both die. Running into your own occupied square → the arriving piece is lost. A pawn reaching the far rank → queen.<br>' +
  '<b>Goal.</b> No check or mate — whoever captures the king wins.';

const RULES_RU =
  '<b>Как ходить.</b> Очередности нет. Кликни фигуру → клетку: она «летит» ~10 секунд. В полёте неуязвима и не бьёт; взятие происходит на финише.<br>' +
  '<b>Полёт.</b> Время фиксированное, не зависит от дистанции. В пути фигура неуязвима и не занимает клетку.<br>' +
  '<b>Лимит полёта.</b> «Максимум фигур в полёте» ограничивает, сколько своих фигур у каждой стороны может лететь одновременно.<br>' +
  '<b>Финиш.</b> Доехала на врага → взятие. Две вражеские на одну клетку → обе гибнут. Набег на свою занятую клетку → пришедший пропадает. Пешка на край → ферзь.<br>' +
  '<b>Цель.</b> Шахов и мата нет — побеждает тот, кто съел короля.';

const DICT = {
  en: {
    newGame: 'New game',
    surrender: 'Surrender',
    settings: 'Settings',
    optBar: 'Piece progress bar',
    optHints: 'Move highlights',
    moveMethod: 'Move method',
    moveTap: 'Tap',
    moveDrag: 'Drag',
    moveBoth: 'Both',
    nick: 'Nickname',
    save: 'Save',
    leaderboard: 'Leaderboard',
    lbEmpty: 'No games yet.',
    rateSending: 'Reporting result…',
    ratePending: 'Waiting for opponent to confirm…',
    rateRated: r => 'Rated ✓' + (r != null ? ' — your rating: ' + r : ''),
    rateRejected: 'Result not confirmed (mismatch).',
    rateNoNick: 'Set a nickname (⚙) to get rated.',
    rateSameNick: 'You and your opponent have the same nick — not rated. Each player needs a different nick (a separate browser profile).',
    rateError: 'Rating server unavailable.',
    tabNet: 'Network',
    tabLocal: 'Single',
    statWhite: 'White',
    statBlack: 'Black',
    statFlight: 'In flight',
    travel: 'Flight time',
    flight: 'Max pieces in flight',
    aiOn: 'AI plays Black',
    aiHead: 'AI settings',
    aiAggr: 'Aggression (captures)',
    aiSnipe: 'Sniping (intercept)',
    aiReact: 'King reaction',
    aiTempo: 'Move tempo',
    roomCode: 'Room code',
    roomShared: 'shared with a friend',
    connect: 'Connect',
    codePlaceholder: 'e.g. tower',
    rulesTitle: 'Rules',
    rulesHtml: RULES_EN,
    sec: 's',
    netHint: 'Agree on one code and both press “Connect”.',
    netNoCode: 'Enter a room code.',
    netLoading: 'Loading P2P module…',
    netLoadFail: 'Could not load P2P. Open the page via a local server.',
    netWaiting: code => 'Waiting for opponent… code: ' + code,
    netError: msg => 'Error: ' + msg,
    netConnected: 'Connected.',
    netConnectedWhite: 'Connected. You play White.',
    netConnectedBlack: 'Connected. You play Black.',
    netLeft: 'Opponent left.',
    resWin: 'You win',
    resLose: 'You lose',
    resDraw: 'Draw',
    resWhite: 'White wins',
    resBlack: 'Black wins',
    subKing: 'King captured.',
    subSurr: 'Game given up.',
    subSurrSelf: 'You surrendered.',
    subSurrOpp: 'Opponent surrendered.',
    banner: {
      start: ['niochess', 'Press “New game” to start.'],
      left: ['Opponent left', 'Connection lost.'],
    },
  },
  ru: {
    newGame: 'Новая партия',
    surrender: 'Сдаться',
    settings: 'Настройки',
    optBar: 'Полоска прогресса фигур',
    optHints: 'Подсветка ходов',
    moveMethod: 'Способ хода',
    moveTap: 'Клик',
    moveDrag: 'Перетаскивание',
    moveBoth: 'Оба',
    nick: 'Ник',
    save: 'Сохранить',
    leaderboard: 'Таблица лидеров',
    lbEmpty: 'Пока нет игр.',
    rateSending: 'Отправляю результат…',
    ratePending: 'Ждём подтверждения соперника…',
    rateRated: r => 'Засчитано ✓' + (r != null ? ' — твой рейтинг: ' + r : ''),
    rateRejected: 'Результат не подтверждён (расхождение).',
    rateNoNick: 'Сохрани ник (⚙), чтобы получить рейтинг.',
    rateSameNick: 'У тебя и соперника одинаковый ник — не засчитано. У каждого должен быть свой ник (отдельный профиль браузера).',
    rateError: 'Сервер рейтинга недоступен.',
    tabNet: 'Сетевая',
    tabLocal: 'Одиночная',
    statWhite: 'Белые',
    statBlack: 'Чёрные',
    statFlight: 'В полёте',
    travel: 'Время полёта',
    flight: 'Максимум фигур в полёте',
    aiOn: 'ИИ играет за чёрных',
    aiHead: 'Настройки ИИ',
    aiAggr: 'Агрессия (взятия)',
    aiSnipe: 'Снайпинг (перехват)',
    aiReact: 'Реакция короля',
    aiTempo: 'Темп ходов',
    roomCode: 'Код комнаты',
    roomShared: 'общий с другом',
    connect: 'Подключиться',
    codePlaceholder: 'например: tower',
    rulesTitle: 'Правила',
    rulesHtml: RULES_RU,
    sec: 'c',
    netHint: 'Договоритесь об одном коде и нажмите «Подключиться» оба.',
    netNoCode: 'Введите код комнаты.',
    netLoading: 'Загрузка P2P-модуля…',
    netLoadFail: 'Не удалось загрузить P2P. Открой страницу через локальный сервер.',
    netWaiting: code => 'Ожидание соперника… код: ' + code,
    netError: msg => 'Ошибка: ' + msg,
    netConnected: 'Соединено.',
    netConnectedWhite: 'Соединено. Ты играешь белыми.',
    netConnectedBlack: 'Соединено. Ты играешь чёрными.',
    netLeft: 'Соперник отключился.',
    resWin: 'Ты победил',
    resLose: 'Ты проиграл',
    resDraw: 'Ничья',
    resWhite: 'Белые победили',
    resBlack: 'Чёрные победили',
    subKing: 'Король съеден.',
    subSurr: 'Партия сдана.',
    subSurrSelf: 'Ты сдался.',
    subSurrOpp: 'Соперник сдался.',
    banner: {
      start: ['niochess', 'Нажми «Новая партия», чтобы начать.'],
      left: ['Соперник вышел', 'Соединение разорвано.'],
    },
  },
};

const sysLang = typeof navigator !== 'undefined' ? (navigator.language || '') : '';
export const lang = sysLang.toLowerCase().startsWith('ru') ? 'ru' : 'en';
export const T = DICT[lang];

export function applyI18n() {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = T[el.dataset.i18n];
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.placeholder = T[el.dataset.i18nPh];
  });
  const rules = document.getElementById('rulesText');
  if (rules) rules.innerHTML = T.rulesHtml;
  const status = document.getElementById('netStatus');
  if (status) status.textContent = T.netHint;
}
