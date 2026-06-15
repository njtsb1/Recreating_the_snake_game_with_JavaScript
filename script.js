const canvas = document.getElementById('snake');
const ctx = canvas.getContext('2d');

const box = 32; // grid size
const gridSize = 16; // 16x16 grid
let gameInterval = null;
let speed = 120; // ms per tick (lower = faster)
let direction = 'right';
let snake = [];
let food = {};
let currentScore = 0;
let isRunning = false;
let isPaused = false;

// Stats persisted
const STATS_KEY = 'snake_stats_v1';
let stats = {
  totalGames: 0,
  gamesWon: 0,
  gamesLost: 0,
  highScore: 0,
  lastScores: [] // keep last 5
};

// Translations
const translations = {
  "en-US": {
    title: "SNAKE GAME",
    start: "Start",
    pause: "Pause",
    resetStats: "Reset Stats",
    stats: "Stats",
    total: "Total games",
    won: "Games won",
    lost: "Games lost",
    high: "High score",
    last: "Last scores",
    current: "Current score",
    legend: "Use arrow keys or swipe to play.",
    footer: "Built with HTML5, CSS3 and JavaScript — educational project."
  },
  "pt-BR": {
    title: "JOGO DA COBRINHA",
    start: "Iniciar",
    pause: "Pausar",
    resetStats: "Redefinir Estatísticas",
    stats: "Estatísticas",
    total: "Total de partidas",
    won: "Partidas ganhas",
    lost: "Partidas perdidas",
    high: "Recorde",
    last: "Últimos pontos",
    current: "Pontuação atual",
    legend: "Use as setas ou deslize para jogar.",
    footer: "Feito com HTML5, CSS3 e JavaScript — projeto educativo."
  },
  "es-ES": {
    title: "JUEGO DE LA SERPIENTE",
    start: "Iniciar",
    pause: "Pausa",
    resetStats: "Restablecer estadísticas",
    stats: "Estadísticas",
    total: "Partidas totales",
    won: "Partidas ganadas",
    lost: "Partidas perdidas",
    high: "Récord",
    last: "Últimos puntos",
    current: "Puntuación actual",
    legend: "Usa las flechas o desliza para jugar.",
    footer: "Creado con HTML5, CSS3 y JavaScript — proyecto educativo."
  }
};

// Elements
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetStatsBtn = document.getElementById('resetStatsBtn');
const langSelect = document.getElementById('langSelect');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');

const totalGamesEl = document.getElementById('totalGames');
const gamesWonEl = document.getElementById('gamesWon');
const gamesLostEl = document.getElementById('gamesLost');
const highScoreEl = document.getElementById('highScore');
const lastScoresEl = document.getElementById('lastScores');
const currentScoreEl = document.getElementById('currentScore');

const titleEl = document.getElementById('title');
const statsTitleEl = document.getElementById('statsTitle');
const legendTextEl = document.getElementById('legendText');
const footerTextEl = document.getElementById('footerText');

const mobileDirs = document.querySelectorAll('.mobile-controls .dir');

// Accessibility: set initial theme from localStorage or prefers-color-scheme
function loadTheme(){
  const saved = localStorage.getItem('snake_theme');
  if(saved){
    document.documentElement.setAttribute('data-theme', saved);
    themeIcon.textContent = saved === 'light' ? '☀️' : '🌙';
    themeToggle.setAttribute('aria-pressed', saved === 'light');
  } else {
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    const theme = prefersLight ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    themeIcon.textContent = theme === 'light' ? '☀️' : '🌙';
  }
}
loadTheme();

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('snake_theme', next);
  themeIcon.textContent = next === 'light' ? '☀️' : '🌙';
  themeToggle.setAttribute('aria-pressed', next === 'light');
});

// Load stats
function loadStats(){
  const raw = localStorage.getItem(STATS_KEY);
  if(raw){
    try{
      stats = JSON.parse(raw);
    }catch(e){
      stats = {...stats};
    }
  }
  renderStats();
}
function saveStats(){
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}
function renderStats(){
  totalGamesEl.textContent = stats.totalGames;
  gamesWonEl.textContent = stats.gamesWon;
  gamesLostEl.textContent = stats.gamesLost;
  highScoreEl.textContent = stats.highScore;
  lastScoresEl.textContent = stats.lastScores.length ? stats.lastScores.join(', ') : '—';
  currentScoreEl.textContent = currentScore;
}
loadStats();

// Multilingual UI
function applyLanguage(lang){
  const t = translations[lang] || translations['en-US'];
  titleEl.textContent = t.title;
  startBtn.textContent = t.start;
  pauseBtn.textContent = t.pause;
  resetStatsBtn.textContent = t.resetStats;
  statsTitleEl.textContent = t.stats;
  document.getElementById('lblTotal').textContent = t.total;
  document.getElementById('lblWon').textContent = t.won;
  document.getElementById('lblLost').textContent = t.lost;
  document.getElementById('lblHigh').textContent = t.high;
  document.getElementById('lblLast').textContent = t.last;
  document.getElementById('lblCurrent').textContent = t.current;
  legendTextEl.textContent = t.legend;
  footerTextEl.textContent = t.footer;
}
applyLanguage(navigator.language || 'en-US');
langSelect.value = navigator.language || 'en-US';
langSelect.addEventListener('change', (e) => {
  applyLanguage(e.target.value);
});

// Game helpers
function randPos(){
  return {
    x: Math.floor(Math.random() * gridSize) * box,
    y: Math.floor(Math.random() * gridSize) * box
  };
}

function resetGameState(){
  snake = [];
  snake[0] = { x: 8 * box, y: 8 * box };
  direction = 'right';
  currentScore = 0;
  food = randPos();
  isRunning = false;
  isPaused = false;
  renderStats();
  drawAll();
}

// Draw background, snake and food
function createBG(){
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#000';
  ctx.fillRect(0,0,canvas.width,canvas.height);
}

function drawGrid(){
  // optional subtle grid
  ctx.strokeStyle = 'rgba(255,255,255,0.02)';
  for(let i=0;i<=gridSize;i++){
    ctx.beginPath();
    ctx.moveTo(i*box,0);
    ctx.lineTo(i*box,gridSize*box);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0,i*box);
    ctx.lineTo(gridSize*box,i*box);
    ctx.stroke();
  }
}

function drawSnake(){
  for(let i=0;i<snake.length;i++){
    ctx.fillStyle = i===0 ? '#ffd54f' : '#7ef57e';
    ctx.fillRect(snake[i].x, snake[i].y, box, box);
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.strokeRect(snake[i].x, snake[i].y, box, box);
  }
}

function drawFood(){
  ctx.fillStyle = '#ff6b6b';
  ctx.fillRect(food.x, food.y, box, box);
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.strokeRect(food.x, food.y, box, box);
}

function drawAll(){
  createBG();
  // drawGrid(); // uncomment for grid lines
  drawSnake();
  drawFood();
}

// Movement and collisions
function tick(){
  if(!isRunning || isPaused) return;

  // wrap-around
  let headX = snake[0].x;
  let headY = snake[0].y;

  if(direction === 'right') headX += box;
  if(direction === 'left') headX -= box;
  if(direction === 'up') headY -= box;
  if(direction === 'down') headY += box;

  if(headX >= gridSize*box) headX = 0;
  if(headX < 0) headX = (gridSize-1)*box;
  if(headY >= gridSize*box) headY = 0;
  if(headY < 0) headY = (gridSize-1)*box;

  // check self collision
  for(let i=1;i<snake.length;i++){
    if(snake[i].x === headX && snake[i].y === headY){
      endGame(false);
      return;
    }
  }

  // eat food?
  const ate = (headX === food.x && headY === food.y);
  if(!ate){
    snake.pop();
  } else {
    currentScore += 10;
    // respawn food in a free cell
    let tries = 0;
    do {
      food = randPos();
      tries++;
      if(tries > 100) break;
    } while(snake.some(s => s.x === food.x && s.y === food.y));
    // optional: speed up slightly
    if(speed > 50) {
      speed = Math.max(50, speed - 2);
      restartInterval();
    }
  }

  const newHead = { x: headX, y: headY };
  snake.unshift(newHead);

  // win condition (fill board)
  if(snake.length >= gridSize * gridSize){
    endGame(true);
    return;
  }

  drawAll();
  currentScoreEl.textContent = currentScore;
}

// Start / Pause / End
function startGame(){
  if(isRunning) return;
  isRunning = true;
  isPaused = false;
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  stats.totalGames += 1;
  saveStats();
  restartInterval();
}

function restartInterval(){
  if(gameInterval) clearInterval(gameInterval);
  gameInterval = setInterval(tick, speed);
}

function pauseGame(){
  isPaused = !isPaused;
  pauseBtn.textContent = isPaused ? translations[langSelect.value].start : translations[langSelect.value].pause;
  pauseBtn.setAttribute('aria-pressed', isPaused);
}

function endGame(won){
  isRunning = false;
  if(gameInterval) clearInterval(gameInterval);
  if(won){
    stats.gamesWon += 1;
  } else {
    stats.gamesLost += 1;
  }
  // update high score
  if(currentScore > stats.highScore) stats.highScore = currentScore;
  // push last score
  stats.lastScores.unshift(currentScore);
  if(stats.lastScores.length > 5) stats.lastScores.length = 5;
  saveStats();
  renderStats();
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  // show accessible alert
  setTimeout(()=> {
    alert(won ? (translations[langSelect.value].title + ' — You win!') : (translations[langSelect.value].title + ' — Game Over'));
  }, 50);
}

// Reset stats
resetStatsBtn.addEventListener('click', () => {
  if(confirm('Reset all saved statistics?')) {
    stats = { totalGames:0, gamesWon:0, gamesLost:0, highScore:0, lastScores:[] };
    saveStats();
    renderStats();
  }
});

// Controls
document.addEventListener('keydown', (e) => {
  if(e.key === 'ArrowLeft' && direction !== 'right') direction = 'left';
  if(e.key === 'ArrowUp' && direction !== 'down') direction = 'up';
  if(e.key === 'ArrowRight' && direction !== 'left') direction = 'right';
  if(e.key === 'ArrowDown' && direction !== 'up') direction = 'down';
  if(e.key === ' '){ // space to pause
    e.preventDefault();
    pauseGame();
  }
});

mobileDirs.forEach(btn => {
  btn.addEventListener('click', () => {
    const d = btn.dataset.dir;
    if(d === 'left' && direction !== 'right') direction = 'left';
    if(d === 'right' && direction !== 'left') direction = 'right';
    if(d === 'up' && direction !== 'down') direction = 'up';
    if(d === 'down' && direction !== 'up') direction = 'down';
  });
});

// Touch swipe support
let touchStartX = 0, touchStartY = 0;
canvas.addEventListener('touchstart', (e) => {
  const t = e.changedTouches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
}, {passive:true});

canvas.addEventListener('touchend', (e) => {
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;
  if(Math.abs(dx) > Math.abs(dy)){
    if(dx > 20 && direction !== 'left') direction = 'right';
    if(dx < -20 && direction !== 'right') direction = 'left';
  } else {
    if(dy > 20 && direction !== 'up') direction = 'down';
    if(dy < -20 && direction !== 'down') direction = 'up';
  }
}, {passive:true});

// Buttons
startBtn.addEventListener('click', () => {
  if(!isRunning){
    startGame();
  }
});
pauseBtn.addEventListener('click', () => {
  pauseGame();
});

// Resize canvas to keep square and crisp
function resizeCanvas(){
  // keep internal resolution fixed to gridSize*box for consistent gameplay
  canvas.width = gridSize * box;
  canvas.height = gridSize * box;
  // CSS will scale canvas responsively
  drawAll();
}
window.addEventListener('resize', resizeCanvas);

// Initialize
resetGameState();
resizeCanvas();

// Expose a small API for debugging (optional)
window.SnakeGame = {
  reset: resetGameState,
  start: startGame,
  pause: pauseGame,
  getStats: () => stats
};
