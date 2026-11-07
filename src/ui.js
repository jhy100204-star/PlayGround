import * as THREE from 'three';

const $ = (id) => document.getElementById(id);

const WAVE_NAMES = [
  '첫 번째 균열 · 그림자 임프 소탕',
  '붉은 달 · 심연의 사냥개',
  '검의 무덤 · 저주받은 검객',
  '균열 심부 · 정예 그림자',
  '왕좌 · 혈귀 장군',
];

const WAVE_SUBS = [
  '그림자 임프가 깨어났다',
  '사냥개가 피 냄새를 맡았다',
  '검객들이 그림자 속에서 일어선다',
  '정예 그림자가 균열을 지킨다',
  '혈귀 장군이 왕좌에서 내려온다',
];

export class UI {
  constructor() {
    this.cache = {};
    this.enemyLayer = document.createElement('div');
    this.enemyLayer.className = 'enemy-layer';
    $('hud').appendChild(this.enemyLayer);
    this.damageLayer = $('damage-layer');
    this.bars = new Map();
    this.lastCooldowns = {};
    this.lastCombo = 0;
    this.comboTimer = 0;
    this.toastTimer = null;
    this.bannerTimer = null;
    this.flashEl = document.createElement('div');
    this.flashEl.className = 'damage-flash';
    document.getElementById('app').appendChild(this.flashEl);
    this.projected = new THREE.Vector3();
  }

  el(id) {
    if (!this.cache[id]) this.cache[id] = $(id);
    return this.cache[id];
  }

  setLoading(p, copy) {
    const fill = this.el('load-fill');
    if (fill) fill.style.width = `${Math.round(p * 100)}%`;
    if (copy) this.el('load-copy').textContent = copy;
  }

  finishLoading() {
    this.el('loading').classList.add('out');
    setTimeout(() => this.el('loading').classList.add('hidden'), 800);
    this.el('start-screen').classList.remove('hidden');
  }

  showStart() {
    this.el('start-screen').classList.remove('hidden');
    this.el('hud').classList.add('hidden');
    this.el('mobile-pause').classList.add('hidden');
  }

  enterGame() {
    this.el('start-screen').classList.add('hidden');
    this.el('hud').classList.remove('hidden');
    this.el('mobile-pause').classList.remove('hidden');
    document.body.classList.add('cinematic');
    setTimeout(() => document.body.classList.remove('cinematic'), 2200);
  }

  updateStats(p) {
    this.el('level-num').textContent = String(p.level).padStart(2, '0');
    this.el('hp-fill').style.width = `${Math.max(0, p.hp / p.maxHp) * 100}%`;
    this.el('hp-text').textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
    this.el('mp-fill').style.width = `${Math.max(0, p.mp / p.maxMp) * 100}%`;
    this.el('mp-text').textContent = `${Math.floor(p.mp)} / ${p.maxMp}`;
    this.el('xp-fill').style.width = `${Math.min(100, p.xp / p.xpNext * 100)}%`;
    this.el('xp-text').textContent = `${Math.floor(p.xp)} / ${p.xpNext}`;
    this.el('rank-label').textContent = p.rank;
    this.el('soul-count').textContent = p.souls;
    this.el('flame-cost').textContent = p.flameUnlocked ? '20 MP' : 'LV.2 해금';
    this.el('dash-cost').textContent = '15 MP';
    this.el('arise-cost').textContent = p.ariseUnlocked ? `${p.ariseCost} MP` : 'LV.3 해금';
    this.el('domain-cost').textContent = p.level >= 4 ? `${p.domainCost} MP` : 'LV.4 해금';
  }

  setWave(wave, remaining, total) {
    this.el('wave-label').textContent = `WAVE ${String(wave).padStart(2, '0')}`;
    this.el('quest-name').textContent = WAVE_NAMES[Math.min(wave - 1, WAVE_NAMES.length - 1)] || `무한 균열 · WAVE ${wave}`;
    this.el('enemy-count').textContent = remaining;
    this.el('wave-progress').style.width = `${Math.min(100, (wave - 1) / 5 * 100)}%`;
    const goal = this.el('quest-sub').lastElementChild;
    if (goal) goal.textContent = wave >= 5 ? '무한 균열' : '5 웨이브';
  }

  showBanner(kicker, title, sub, duration = 2100) {
    this.el('banner-kicker').textContent = kicker;
    this.el('banner-title').textContent = title;
    this.el('banner-sub').textContent = sub;
    const b = this.el('wave-banner');
    b.classList.remove('show');
    void b.offsetWidth;
    b.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => b.classList.remove('show'), duration);
  }

  hideBanner() {
    this.el('wave-banner').classList.remove('show');
  }

  showBoss(name, hp, max) {
    this.el('boss-wrap').classList.remove('hidden');
    this.el('boss-name').textContent = name;
    this.el('boss-fill').style.width = `${hp / max * 100}%`;
    this.el('boss-phase').textContent = 'PHASE I';
  }

  updateBoss(hp, max) {
    this.el('boss-fill').style.width = `${Math.max(0, hp / max) * 100}%`;
    this.el('boss-phase').textContent = hp / max < 0.45 ? 'PHASE II' : 'PHASE I';
  }

  hideBoss() {
    this.el('boss-wrap').classList.add('hidden');
  }

  setCombo(n, timer = 0) {
    this.comboTimer = timer;
    if (n > 0) {
      this.el('combo-wrap').classList.add('show');
      this.el('combo-num').textContent = n;
      const grade = n >= 30 ? 'MONARCH' : n >= 20 ? 'SOVEREIGN' : n >= 12 ? 'SLAYER' : n >= 6 ? 'HUNTER' : '';
      this.el('combo-grade').textContent = grade;
      if (n > this.lastCombo) {
        this.el('combo-num').animate(
          [{ transform: 'scale(1.25)' }, { transform: 'scale(1)' }],
          { duration: 130, easing: 'ease-out' }
        );
      }
    } else {
      this.el('combo-wrap').classList.remove('show');
    }
    this.lastCombo = n;
  }

  toast(text, type = '') {
    const t = this.el('toast');
    t.textContent = text;
    t.className = `toast show ${type}`;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  damage(worldPos, amount, type = '') {
    if (!worldPos) return;
    const v = worldPos.clone();
    v.y += 0.6;
    v.project(this.camera);
    if (v.z > 1) return;
    const x = (v.x * 0.5 + 0.5) * window.innerWidth + (Math.random() - 0.5) * 24;
    const y = (-v.y * 0.5 + 0.5) * window.innerHeight + (Math.random() - 0.5) * 12;
    const d = document.createElement('div');
    d.className = `dmg ${type}`;
    d.textContent = type === 'heal' ? `+${amount}` : amount;
    d.style.left = `${x}px`;
    d.style.top = `${y}px`;
    this.damageLayer.appendChild(d);
    setTimeout(() => d.remove(), 780);
  }

  flash(color = 'red') {
    this.flashEl.className = `damage-flash ${color} on`;
    clearTimeout(this.flashTimer);
    this.flashTimer = setTimeout(() => this.flashEl.classList.remove('on'), 130);
  }

  setAbilityState(states) {
    for (const [name, s] of Object.entries(states)) {
      const cd = this.el(`cd-${name}`);
      if (!cd) continue;
      const prev = this.lastCooldowns[name] || 0;
      if (s.remaining > 0.02) {
        cd.classList.add('on');
        cd.style.setProperty('--cd', `${(1 - s.remaining / s.total) * 100}%`);
        cd.dataset.left = s.remaining >= 1 ? Math.ceil(s.remaining) : s.remaining.toFixed(1);
      } else {
        cd.classList.remove('on');
        if (prev > 0.02) {
          const btn = cd.parentElement;
          btn.classList.remove('ready-flash');
          void btn.offsetWidth;
          btn.classList.add('ready-flash');
        }
      }
      if (s.locked !== undefined) {
        cd.parentElement.classList.toggle('locked', s.locked);
        const tag = cd.parentElement.querySelector('.lock-tag');
        if (tag) tag.style.display = s.locked ? 'block' : 'none';
      }
      this.lastCooldowns[name] = s.remaining;
    }
  }

  deny(name) {
    const btn = document.querySelector(`.ability[data-action="${name}"]`);
    if (!btn) return;
    btn.classList.remove('denied');
    void btn.offsetWidth;
    btn.classList.add('denied');
  }

  setBoundary(danger) {
    const el = this.el('objective-text');
    if (danger > 0.1) el.textContent = '균열 경계가 무너지고 있다 — 안쪽으로 이동';
    else el.textContent = '균열의 제단을 지켜라';
  }

  updateEnemyBars(enemies, camera) {
    this.camera = camera;
    const alive = new Set();
    for (const e of enemies) {
      if (!e.alive) continue;
      alive.add(e.id);
      let bar = this.bars.get(e.id);
      if (!bar) {
        bar = document.createElement('div');
        bar.className = 'enemy-bar';
        bar.innerHTML = `<div class="enemy-name">${e.name}</div><div class="enemy-track"><i></i></div><div class="enemy-tier"></div>`;
        this.enemyLayer.appendChild(bar);
        this.bars.set(e.id, bar);
      }
      const v = e.group.position.clone();
      v.y += e.barHeight || 3.2;
      v.project(camera);
      if (v.z > 1 || v.z < -1) {
        bar.style.display = 'none';
        continue;
      }
      const x = (v.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-v.y * 0.5 + 0.5) * window.innerHeight;
      if (x < -100 || x > window.innerWidth + 100 || y < -100 || y > window.innerHeight + 100) {
        bar.style.display = 'none';
        continue;
      }
      bar.style.display = '';
      bar.style.left = `${x}px`;
      bar.style.top = `${y}px`;
      bar.querySelector('i').style.width = `${Math.max(0, e.hp / e.maxHp) * 100}%`;
      bar.classList.toggle('elite', !!e.elite);
      bar.classList.toggle('boss', e.type === 'boss');
      bar.querySelector('.enemy-tier').textContent = e.elite ? 'ELITE' : '';
    }
    for (const [id, bar] of this.bars) {
      if (!alive.has(id)) {
        bar.remove();
        this.bars.delete(id);
      }
    }
  }

  drawRadar(player, enemies, shadows, yaw) {
    const canvas = this.el('radar');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(cx, cy);
    // Grid.
    ctx.strokeStyle = 'rgba(116,231,255,.1)';
    ctx.lineWidth = 1;
    for (let r = 28; r <= 92; r += 32) {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-96, 0); ctx.lineTo(96, 0);
    ctx.moveTo(0, -96); ctx.lineTo(0, 96);
    ctx.strokeStyle = 'rgba(116,231,255,.06)';
    ctx.stroke();
    const scale = 92 / 32;
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);
    const drawDot = (wx, wz, color, size, ring = false) => {
      const dx = wx - player.position.x;
      const dz = wz - player.position.z;
      const right = cos * dx - sin * dz;
      const forward = -sin * dx - cos * dz;
      const px = right * scale;
      const py = -forward * scale;
      if (Math.hypot(px, py) > 96) return;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      if (ring) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(px, py, size + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    };
    for (const s of shadows) if (s.alive) drawDot(s.position.x, s.position.z, 'rgba(180,145,255,.75)', 2.2);
    for (const e of enemies) {
      if (!e.alive) continue;
      if (e.type === 'boss') drawDot(e.group.position.x, e.group.position.z, '#ff3f63', 5.5, true);
      else drawDot(e.group.position.x, e.group.position.z, e.elite ? '#ff9a5c' : '#ff627d', e.elite ? 3.5 : 2.4);
    }
    // Player.
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#74e7ff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4.5, 5);
    ctx.lineTo(0, 2.5);
    ctx.lineTo(-4.5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    const nearest = enemies.filter(e => e.alive).reduce((m, e) => {
      const d = Math.hypot(e.group.position.x - player.position.x, e.group.position.z - player.position.z);
      return Math.min(m, d);
    }, 999);
    this.el('radar-dist').textContent = nearest < 999 ? `${nearest.toFixed(0)}m` : 'CLEAR';
  }

  showLevelUp(level, cards, cb) {
    this.el('levelup').classList.remove('hidden');
    this.el('new-level').textContent = String(level).padStart(2, '0');
    const row = this.el('card-row');
    row.innerHTML = '';
    cards.forEach((card, i) => {
      const b = document.createElement('button');
      b.className = 'awaken-card';
      b.innerHTML = `
        <span class="card-index">0${i + 1}</span>
        <div class="card-glyph">${card.icon}</div>
        <h3>${card.name}</h3>
        <span class="card-type">${card.type}</span>
        <p>${card.desc}</p>
        <div class="card-stat">${card.stat}</div>`;
      b.addEventListener('click', () => cb(i));
      row.appendChild(b);
    });
    this.el('sp-left').textContent = '1 POINT';
  }

  hideLevelUp() {
    this.el('levelup').classList.add('hidden');
  }

  showPause() { this.el('pause').classList.remove('hidden'); }
  hidePause() { this.el('pause').classList.add('hidden'); }
  showHowto() { this.el('howto').classList.remove('hidden'); }
  hideHowto() { this.el('howto').classList.add('hidden'); }

  showResult({ victory, level, kills, combo, souls }) {
    this.el('result').classList.remove('hidden');
    this.el('result-kicker').textContent = victory ? 'RIFT CLEARED' : 'HUNTER DOWN';
    this.el('result-title').textContent = victory ? '균열을 닫았다' : '그림자가 삼켜졌다';
    this.el('result-desc').textContent = victory
      ? '그림자 군주가 세상에 그 이름을 새겼다. 무한 균열이 열려 있다.'
      : '하지만 그림자는 죽지 않는다. 다시 일어나 균열에 도전하라.';
    this.el('res-level').textContent = level;
    this.el('res-kills').textContent = kills;
    this.el('res-combo').textContent = combo;
    this.el('res-souls').textContent = souls;
    this.el('continue-btn').querySelector('span').textContent = victory ? '무한 균열 계속' : '다시 도전';
  }

  hideResult() { this.el('result').classList.add('hidden'); }

  setZone(text) { this.el('zone-label').textContent = text; }

  showMobile() {
    document.body.classList.add('is-mobile');
    this.el('mobile-controls').classList.remove('hidden');
  }

  hideMobile() {
    document.body.classList.remove('is-mobile');
    this.el('mobile-controls').classList.add('hidden');
  }

  reset() {
    this.bars.forEach(b => b.remove());
    this.bars.clear();
    this.enemyLayer.innerHTML = '';
    this.damageLayer.innerHTML = '';
    this.el('combo-wrap').classList.remove('show');
    this.hideBoss();
    this.hideLevelUp();
    this.hidePause();
    this.hideResult();
    this.el('boss-wrap').classList.add('hidden');
    this.setCombo(0, 0);
  }
}
