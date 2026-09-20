'use strict';

/* ============================================================
 * FrenkJump — a tiny endless runner starring a pug,
 * with a shiba friend cheering from the menu screen.
 * Pixel sprites are stored as rows of characters; every row
 * MUST be exactly 16 characters wide, '.' = transparent.
 * ========================================================== */

// --- Pug sprite (16 px wide, 12 rows tall) ------------------
const PUG_ROWS = [
  "................",
  "......KKKK......",
  "....KKKKKKKK....",
  "...KKKWWWWKKK...",
  "..KKWKKWWKKWKK..",
  ".KWKKEEKKEEKWKK.",
  ".KWKEEEEEEEKWK..",
  ".KNNKEEEEEEKNNK.",
  ".KNNNNKNNKNNNNK.",
  "..KNNWWWWWNNNK..",
  "...KWWKKKKWWK...",
  "....WW....WW....",
];

// --- Shiba sprite (16 px wide, 12 rows tall) ----------------
const SHIBA_ROWS = [
  "................",
  "........KKKK....",
  "......KKWWKKKK..",
  ".....KWWWWWKKKK.",
  "....KWWWWWWWWKK.",
  "...KWWWWWWWWWWK.",
  "...KWWRWWWWRWWK.",
  "..KWRWWWRRWWWK..",
  "..KWWWWWWWWWWWK.",
  "..KWWWWWWWWWWK..",
  "...KWWWWWWWWK...",
  "....KKKKKKKK....",
];

// Color palettes: K = fur, W = white/cream, E = eye,
// N = nose/dark, R = pink/cheek
const PALETTES = {
  pug: {
    K: "#d9a45b",
    W: "#f5efe2",
    E: "#241f1c",
    N: "#3a2c22",
    R: "#ef9fb0",
  },
  shiba: {
    K: "#d98e3f",
    W: "#f7f2e6",
    E: "#241f1c",
    N: "#3a2c22",
    R: "#f3b98d",
  },
};

// --- Sprite builder -----------------------------------------
function makeSprite(rows, palette, scale) {
  const h = rows.length;
  const w = rows[0].length;
  const s = scale || 2;

  const canvas = document.createElement("canvas");
  canvas.width = w * s;
  canvas.height = h * s;
  const ctx = canvas.getContext("2d");

  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < w; x++) {
      const ch = row[x];
      if (ch === ".") continue;
      const color = palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x * s, y * s, s, s);
    }
  }
  return canvas;
}

// --- Game setup ---------------------------------------------
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;

const pugSprite = makeSprite(PUG_ROWS, PALETTES.pug, 2);   // 32x24
const shibaSprite = makeSprite(SHIBA_ROWS, PALETTES.shiba, 2);

const GROUND_Y = H - 46;
const GRAVITY = 0.55;
const JUMP_VY = -11.5;

const state = {
  mode: "ready", // ready | playing | over
  score: 0,
  high: Number(localStorage.getItem("frenkjump_high")) || 0,
  speed: 4.5,
  frame: 0,
};

const player = { x: 90, y: GROUND_Y - 24, w: 32, h: 24, vy: 0 };
const obstacles = []; // { x, w, h, passed }
const bones = [];     // { x, y, taken }

// --- Helpers -------------------------------------------------
function spawnObstacle() {
  const w = 18 + Math.random() * 14;
  const h = 26 + Math.random() * 22;
  obstacles.push({ x: W + 20, w, h, passed: false });
}

function spawnBone() {
  bones.push({ x: W + 80 + Math.random() * 120, y: 60 + Math.random() * 140, taken: false });
}

function resetRun() {
  player.x = 90;
  player.y = GROUND_Y - 24;
  player.vy = 0;
  obstacles.length = 0;
  bones.length = 0;
  state.score = 0;
  state.speed = 4.5;
  state.frame = 0;
  state.mode = "playing";
}

// --- Input ---------------------------------------------------
function jump() {
  if (state.mode === "ready") {
    resetRun();
    return;
  }
  if (state.mode === "over") {
    resetRun();
    return;
  }
  if (state.mode === "playing" && player.y >= GROUND_Y - 24 - 1) {
    player.vy = JUMP_VY;
  }
}

document.addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyR") {
    e.preventDefault();
    jump();
  }
});
canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  jump();
});

// --- Collision (AABB, slightly forgiving) --------------------
function rectsOverlap(a, b) {
  const pad = 4;
  return (
    a.x + pad < b.x + b.w &&
    a.x + a.w - pad > b.x &&
    a.y + pad < b.y + b.h &&
    a.y + a.h - pad > b.y
  );
}

// --- Update --------------------------------------------------
function update() {
  if (state.mode !== "playing") return;

  state.frame++;
  state.speed = 4.5 + state.score * 0.004;
  state.score += 0.05;

  // Player physics
  player.vy += GRAVITY;
  player.y += player.vy;
  if (player.y > GROUND_Y - player.h) {
    player.y = GROUND_Y - player.h;
    player.vy = 0;
  }

  // Obstacles
  if (state.frame % 72 === 0) spawnObstacle();
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    o.x -= state.speed;
    const playerBox = { x: player.x, y: player.y, w: player.w, h: player.h };
    const obsBox = { x: o.x, y: GROUND_Y - o.h, w: o.w, h: o.h };
    if (rectsOverlap(playerBox, obsBox)) {
      state.mode = "over";
      if (Math.floor(state.score) > state.high) {
        state.high = Math.floor(state.score);
        localStorage.setItem("frenkjump_high", String(state.high));
      }
    }
    if (!o.passed && o.x + o.w < player.x) {
      o.passed = true;
      state.score += 10;
    }
    if (o.x < -o.w) obstacles.splice(i, 1);
  }

  // Bones
  if (state.frame % 220 === 0) spawnBone();
  for (let i = bones.length - 1; i >= 0; i--) {
    const b = bones[i];
    b.x -= state.speed;
    if (Math.abs(b.x - (player.x + player.w / 2)) < 26 && Math.abs(b.y - (player.y + player.h / 2)) < 26) {
      b.taken = true;
      state.score += 5;
    }
    if (b.x < -16 || b.taken) bones.splice(i, 1);
  }
}

// --- Draw ----------------------------------------------------
function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#7ec3ee");
  sky.addColorStop(1, "#c9ecf7");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // sun
  ctx.fillStyle = "#ffe38a";
  ctx.beginPath();
  ctx.arc(W - 70, 60, 26, 0, Math.PI * 2);
  ctx.fill();

  // clouds (parallax-ish)
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  for (let i = 0; i < 3; i++) {
    const cx = ((state.frame * (0.6 + i * 0.3)) % (W + 120)) - 60;
    const cy = 50 + i * 42;
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.arc(cx + 16, cy - 6, 12, 0, Math.PI * 2);
    ctx.arc(cx + 32, cy, 14, 0, Math.PI * 2);
    ctx.fill();
  }

  // ground
  ctx.fillStyle = "#79b45a";
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  ctx.fillStyle = "#a7d379";
  ctx.fillRect(0, GROUND_Y, W, 5);
  ctx.fillStyle = "#5d9445";
  for (let x = (state.frame * 2) % 40; x < W; x += 40) {
    ctx.fillRect(x, GROUND_Y + 14, 22, 4);
  }
}

function drawObstacle(o) {
  ctx.fillStyle = "#7a4f34";
  ctx.fillRect(o.x, GROUND_Y - o.h, o.w, o.h);
  ctx.fillStyle = "#96633f";
  ctx.fillRect(o.x + 2, GROUND_Y - o.h, 4, o.h);
  ctx.fillStyle = "#4f3524";
  ctx.fillRect(o.x + o.w / 2 - 6, GROUND_Y - o.h - 10, 12, 10);
  ctx.fillRect(o.x + o.w / 2 - 2, GROUND_Y - o.h - 20, 5, 10);
}

function drawBone(b) {
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(Math.sin(state.frame * 0.1 + b.x) * 0.3);
  ctx.fillStyle = "#f5efe2";
  ctx.fillRect(-6, -2, 12, 4);
  ctx.fillRect(-9, -6, 4, 12);
  ctx.fillRect(5, -6, 4, 12);
  ctx.restore();
}

function drawPlayer() {
  ctx.drawImage(pugSprite, player.x, player.y);
}

function drawHUD() {
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText("Score: " + Math.floor(state.score), 12, 26);
  ctx.fillText("Best: " + state.high, 12, 48);

  if (state.mode === "ready") {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, H / 2 - 64, W, 128);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 30px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("FRENKJUMP", W / 2, H / 2 - 22);
    ctx.font = "16px sans-serif";
    ctx.fillText("Press Space or tap to jump — dodge the trunks, grab bones!", W / 2, H / 2 + 6);
    ctx.fillText("Be fast. Be pug.", W / 2, H / 2 + 30);
    ctx.textAlign = "left";
  }

  if (state.mode === "over") {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, H / 2 - 58, W, 116);
    ctx.fillStyle = "#ffd27a";
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Oops! Retry?", W / 2, H / 2 - 18);
    ctx.fillStyle = "#ffffff";
    ctx.font = "16px sans-serif";
    ctx.fillText("Score " + Math.floor(state.score) + " · Best " + state.high, W / 2, H / 2 + 12);
    ctx.fillText("Press Space or tap to run again", W / 2, H / 2 + 36);
    ctx.textAlign = "left";
  }
}

function draw() {
  drawBackground();

  // Decorative shiba + pug on the ready screen
  if (state.mode === "ready") {
    const bob = Math.sin(state.frame * 0.1) * 3;
    ctx.drawImage(shibaSprite, W / 2 + 60, GROUND_Y - 24 + bob);
    ctx.drawImage(pugSprite, W / 2 - 90, GROUND_Y - 24 - bob);
  }

  for (const b of bones) drawBone(b);
  for (const o of obstacles) drawObstacle(o);
  drawPlayer();
  drawHUD();
}

// --- Main loop -----------------------------------------------
function loop() {
  state.frame++;
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();