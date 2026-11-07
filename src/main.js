import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createWorld } from './world.js';
import { createHunter, animateHunter, getSwordPoints, createEnemyModel, animateEnemy, setEnemyFlash, createShadowSoldier, animateShadow } from './models.js';
import { Effects } from './effects.js';
import { UI } from './ui.js';
import { SoundManager } from './audio.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));
const dampAngle = (a, b, lambda, dt) => {
  let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI;
  return a + d * (1 - Math.exp(-lambda * dt));
};
const rand = (a, b) => a + Math.random() * (b - a);

const ENEMY_DATA = {
  imp: { name: '그림자 임프', hp: 54, speed: 3.5, damage: 8, range: 2.15, xp: 24, souls: 4, radius: 0.9 },
  hound: { name: '심연의 사냥개', hp: 86, speed: 5.15, damage: 11, range: 2.3, xp: 34, souls: 6, radius: 1.0 },
  swordsman: { name: '저주받은 검객', hp: 128, speed: 3.8, damage: 15, range: 2.75, xp: 46, souls: 8, radius: 1.0 },
  boss: { name: '혈귀 장군 · 이그리스', hp: 1150, speed: 3.5, damage: 23, range: 4.3, xp: 520, souls: 150, radius: 2.0 },
};

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ui = new UI();
    this.audio = new SoundManager();
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(54, window.innerWidth / window.innerHeight, 0.1, 420);
    this.camera.position.set(8, 6.5, 17);
    this.clock = new THREE.Clock();
    this.elapsed = 0;
    this.mode = 'loading';
    this.endless = false;
    this.hitStop = 0;
    this.shake = 0;
    this.fovKick = 0;
    this.uiTimer = 0;
    this.radarTimer = 0;
    this.counterTimer = 0;
    this.wave = 0;
    this.phase = 'idle';
    this.waveTimer = 0;
    this.spawnTimer = 0;
    this.pendingSpawns = [];
    this.enemies = [];
    this.shadows = [];
    this.enemyId = 1;
    this.shadowId = 1;
    this.cooldowns = { flame: 0, dash: 0, arise: 0, domain: 0, dodge: 0 };
    this.deathTimer = 0;
    this.keys = new Set();
    this.joystick = { x: 0, y: 0, active: false };
    this.cam = { yaw: 0.18, pitch: 0.23, dist: 11.6 };
    this.drag = { active: false, x: 0, y: 0, pointer: null };
    this.touchLook = { id: null, x: 0, y: 0 };
    this.lastCamera = new THREE.Vector3();
    this.cameraTarget = new THREE.Vector3();
    this.menuTarget = new THREE.Vector3();

    this.initRenderer();
    this.initRimLights();
    this.world = createWorld(this.scene, this.renderer);
    this.effects = new Effects(this.scene, this.camera);
    this.initPlayer();
    this.initComposer();
    this.bindEvents();
    this.initLoading();
    this.animate();
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
      stencil: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.07;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x05060c, 1);
  }

  initRimLights() {
    this.cameraFill = new THREE.DirectionalLight(0xa99bff, 0.9);
    this.cameraFill.position.set(0, 8, 14);
    this.scene.add(this.cameraFill);
    this.cameraFillTarget = new THREE.Object3D();
    this.scene.add(this.cameraFillTarget);
    this.cameraFill.target = this.cameraFillTarget;
    this.playerRim = new THREE.PointLight(0x9a82ff, 17, 10, 2);
    this.scene.add(this.playerRim);
  }

  initPlayer() {
    const group = createHunter();
    this.scene.add(group);
    const p = {
      group,
      rig: group.userData.rig,
      position: new THREE.Vector3(3, 0, 6.5),
      facing: -0.12,
      targetFacing: -0.12,
      level: 1,
      xp: 0,
      xpNext: 100,
      hp: 120,
      maxHp: 120,
      mp: 100,
      maxMp: 100,
      mpRegen: 6.5,
      attack: 15,
      speed: 6.4,
      crit: 0.12,
      critMult: 1.8,
      lifesteal: 0,
      flameUnlocked: false,
      ariseUnlocked: false,
      domainUnlocked: false,
      flameMult: 1,
      domainMult: 1,
      dashMult: 1,
      dashCooldown: 5,
      shadowCount: 2,
      ariseCost: 35,
      domainCost: 60,
      rank: 'E급 헌터',
      souls: 0,
      kills: 0,
      combo: 0,
      maxCombo: 0,
      comboTimer: 0,
      comboStep: 0,
      stepTimer: 0,
      attackCooldown: 0,
      attackState: null,
      castState: null,
      dashState: null,
      invuln: 0,
      hurt: 0,
      dead: false,
      deadTime: 0,
      levelFlash: 0,
      speedNow: 0,
      boundaryDanger: 0,
    };
    this.player = p;
    group.position.copy(p.position);
    group.rotation.y = p.facing;
  }

  initComposer() {
    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.52, 0.58, 0.79);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
  }

  initLoading() {
    let p = 0.04;
    this.ui.setLoading(p, '균열 좌표를 계산하는 중...');
    const messages = [
      [0.28, '그림자 제단을 복원하는 중...'],
      [0.52, '혈귀의 흔적을 추적하는 중...'],
      [0.76, '그림자 군단을 소환하는 중...'],
      [0.94, '각성 준비 완료'],
    ];
    let mi = 0;
    this.loadInterval = setInterval(() => {
      p = Math.min(1, p + 0.055 + Math.random() * 0.04);
      while (mi < messages.length && p >= messages[mi][0]) {
        this.ui.setLoading(p, messages[mi][1]);
        mi++;
      }
      this.ui.setLoading(p);
      if (p >= 1) {
        clearInterval(this.loadInterval);
        setTimeout(() => {
          this.mode = 'menu';
          this.ui.finishLoading();
          this.ui.updateStats(this.player);
        }, 380);
      }
    }, 105);
  }

  bindEvents() {
    document.getElementById('start-btn').addEventListener('click', () => this.startGame());
    document.getElementById('how-btn').addEventListener('click', () => { this.audio.play('ui'); this.ui.showHowto(); });
    document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => this.ui.hideHowto()));
    document.getElementById('resume-btn').addEventListener('click', () => this.resume());
    document.getElementById('restart-btn').addEventListener('click', () => this.restart());
    document.getElementById('continue-btn').addEventListener('click', () => this.continueGame());
    document.getElementById('result-restart').addEventListener('click', () => this.restart());
    document.getElementById('mobile-pause').addEventListener('click', () => this.togglePause());
    document.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.mode === 'menu') return;
        const action = btn.dataset.action;
        if (action === 'attack') this.basicAttack();
        else this.useAbility(action);
      });
    });

    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('blur', () => {
      this.keys.clear();
      if (this.mode === 'playing') this.togglePause();
    });
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', (e) => this.onPointerUp(e));
    window.addEventListener('pointercancel', (e) => this.onPointerUp(e));
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement !== this.canvas) this.drag.active = false;
    });

    this.bindJoystick();
    this.canvas.addEventListener('wheel', (e) => {
      if (this.mode !== 'playing') return;
      this.cam.dist = clamp(this.cam.dist + e.deltaY * 0.008, 8.5, 15.5);
    }, { passive: true });

    const touch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
    this.isTouch = touch;
    if (touch || window.innerWidth < 760) this.ui.showMobile();
    this.onResize();
  }

  bindJoystick() {
    const base = document.getElementById('joystick');
    const knob = document.getElementById('stick-knob');
    if (!base || !knob) return;
    let rect = null;
    let pointerId = null;
    const update = (e) => {
      if (!rect) rect = base.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const max = rect.width * 0.34;
      const len = Math.hypot(dx, dy);
      if (len > max) { dx = dx / len * max; dy = dy / len * max; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.joystick.x = dx / max;
      this.joystick.y = dy / max;
      this.joystick.active = true;
    };
    base.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      pointerId = e.pointerId;
      base.setPointerCapture(pointerId);
      rect = base.getBoundingClientRect();
      update(e);
    });
    base.addEventListener('pointermove', (e) => {
      if (pointerId !== e.pointerId) return;
      update(e);
    });
    const end = (e) => {
      if (pointerId !== e.pointerId) return;
      pointerId = null;
      this.joystick.x = 0;
      this.joystick.y = 0;
      this.joystick.active = false;
      knob.style.transform = 'translate(0px, 0px)';
    };
    base.addEventListener('pointerup', end);
    base.addEventListener('pointercancel', end);
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    this.renderer.setSize(w, h);
    this.composer?.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    this.composer?.setSize(w, h);
    if (w < 760 || this.isTouch) this.ui.showMobile();
    else this.ui.hideMobile();
  }

  onKeyDown(e) {
    const code = e.code;
    if (['Tab', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'KeyR', 'KeyF'].includes(code)) e.preventDefault();
    if (code === 'Escape') {
      if (this.mode === 'playing') this.togglePause();
      else if (this.mode === 'paused') this.resume();
      else if (this.ui.el('howto') && !this.ui.el('howto').classList.contains('hidden')) this.ui.hideHowto();
      return;
    }
    if (code === 'Enter') {
      if (this.mode === 'menu') { this.startGame(); return; }
      if (this.mode === 'result') { this.continueGame(); return; }
      if (this.mode === 'paused') { this.resume(); return; }
    }
    if (this.mode !== 'playing') return;
    if (code === 'KeyJ') { this.basicAttack(); return; }
    if (code === 'Space') { this.dodge(); return; }
    if (code === 'KeyQ') { this.useAbility('dash'); return; }
    if (code === 'KeyE') { this.useAbility('arise'); return; }
    if (code === 'KeyR') { this.useAbility('domain'); return; }
    if (code === 'KeyF') { this.useAbility('flame'); return; }
    if (code === 'Tab') {
      if (this.player.level < 2) this.ui.toast('각성은 LV.2에 열립니다.');
      else this.ui.toast(`각성 포인트 ${Math.max(1, Math.floor(this.player.level / 2))} · 레벨업 카드로 성장합니다`, 'gold');
      return;
    }
    this.keys.add(code);
  }

  onPointerDown(e) {
    if (this.mode === 'menu') return;
    if (e.pointerType === 'touch') {
      if (this.mode === 'playing') {
        this.touchLook.id = e.pointerId;
        this.touchLook.x = e.clientX;
        this.touchLook.y = e.clientY;
      }
      return;
    }
    if (this.mode !== 'playing') return;
    if (document.pointerLockElement !== this.canvas) {
      this.drag.active = true;
      this.drag.x = e.clientX;
      this.drag.y = e.clientY;
      try { this.canvas.requestPointerLock?.(); } catch {}
    }
    if (e.button === 0) this.basicAttack();
  }

  onPointerMove(e) {
    if (e.pointerType === 'touch') {
      if (this.touchLook.id === e.pointerId && this.mode === 'playing') {
        const dx = e.clientX - this.touchLook.x;
        const dy = e.clientY - this.touchLook.y;
        this.touchLook.x = e.clientX;
        this.touchLook.y = e.clientY;
        this.cam.yaw -= dx * 0.007;
        this.cam.pitch = clamp(this.cam.pitch + dy * 0.005, 0.06, 0.62);
      }
      return;
    }
    if (document.pointerLockElement === this.canvas) {
      this.cam.yaw -= e.movementX * 0.0027;
      this.cam.pitch = clamp(this.cam.pitch + e.movementY * 0.0019, 0.055, 0.64);
    } else if (this.drag.active && this.mode === 'playing') {
      const dx = e.clientX - this.drag.x;
      const dy = e.clientY - this.drag.y;
      this.drag.x = e.clientX;
      this.drag.y = e.clientY;
      this.cam.yaw -= dx * 0.005;
      this.cam.pitch = clamp(this.cam.pitch + dy * 0.0035, 0.055, 0.64);
    }
  }

  onPointerUp(e) {
    if (e.pointerType === 'touch') {
      if (this.touchLook.id === e.pointerId) this.touchLook.id = null;
      return;
    }
    this.drag.active = false;
  }

  startGame() {
    if (this.mode === 'playing') return;
    this.audio.start();
    this.audio.play('ui');
    this.resetGame();
    this.mode = 'playing';
    this.ui.enterGame();
    this.ui.toast('WASD 이동 · 좌클릭 연격 · SPACE 회피');
    setTimeout(() => {
      if (this.mode === 'playing') this.startWave(1);
    }, 900);
  }

  resetGame() {
    for (const e of this.enemies) this.removeEnemy(e);
    for (const s of this.shadows) this.removeShadow(s);
    this.enemies = [];
    this.shadows = [];
    this.effects?.particles?.particles?.splice(0);
    this.ui.reset();
    this.world.setBossMood(false);
    const p = this.player;
    Object.assign(p, {
      level: 1, xp: 0, xpNext: 100, hp: 120, maxHp: 120, mp: 100, maxMp: 100, mpRegen: 6.5,
      attack: 15, speed: 6.4, crit: 0.12, critMult: 1.8, lifesteal: 0,
      flameUnlocked: false, ariseUnlocked: false, domainUnlocked: false,
      flameMult: 1, domainMult: 1, dashMult: 1, dashCooldown: 5, shadowCount: 2,
      ariseCost: 35, domainCost: 60, rank: 'E급 헌터', souls: 0, kills: 0,
      combo: 0, maxCombo: 0, comboTimer: 0, comboStep: 0, stepTimer: 0,
      attackCooldown: 0, attackState: null, castState: null, dashState: null,
      invuln: 0, hurt: 0, dead: false, deadTime: 0, levelFlash: 0, speedNow: 0, boundaryDanger: 0,
    });
    p.position.set(0, 0, 7);
    p.facing = 0;
    p.targetFacing = 0;
    p.group.visible = true;
    p.group.position.copy(p.position);
    p.group.rotation.y = 0;
    p.rig.body.rotation.set(0, 0, 0);
    p.rig.body.position.set(0, 0, 0);
    this.cooldowns = { flame: 0, dash: 0, arise: 0, domain: 0, dodge: 0 };
    this.wave = 0;
    this.phase = 'idle';
    this.waveTimer = 0;
    this.spawnTimer = 0;
    this.pendingSpawns = [];
    this.endless = false;
    this.hitStop = 0;
    this.shake = 0;
    this.fovKick = 0;
    this.deathTimer = 0;
    this.cam.yaw = 0;
    this.cam.pitch = 0.23;
    this.cam.dist = 11.6;
    this.ui.updateStats(p);
    this.ui.setAbilityState(this.abilityStates());
    this.ui.hideBoss();
  }

  restart() {
    this.ui.hideResult();
    this.ui.hidePause();
    this.mode = 'menu';
    this.resetGame();
    this.mode = 'playing';
    this.ui.enterGame();
    this.ui.toast('새로운 균열이 열렸다');
    setTimeout(() => { if (this.mode === 'playing') this.startWave(1); }, 700);
  }

  continueGame() {
    this.audio.play('ui');
    if (!this.resultVictory) {
      this.restart();
      return;
    }
    this.ui.hideResult();
    if (!this.endless) {
      this.endless = true;
      this.mode = 'playing';
      this.player.hp = this.player.maxHp;
      this.player.mp = this.player.maxMp;
      this.ui.toast('무한 균열 · 난이도가 상승합니다', 'gold');
      this.startWave(6);
    } else {
      this.mode = 'playing';
      this.ui.toast('무한 균열이 계속된다');
      this.startWave(this.wave + 1);
    }
  }

  togglePause() {
    if (this.mode === 'playing') {
      this.mode = 'paused';
      this.keys.clear();
      this.ui.showPause();
      if (document.pointerLockElement) document.exitPointerLock();
    } else if (this.mode === 'paused') {
      this.resume();
    }
  }

  resume() {
    if (this.mode !== 'paused') return;
    this.mode = 'playing';
    this.ui.hidePause();
    this.audio.play('ui');
  }

  startWave(n) {
    this.wave = n;
    this.phase = 'intro';
    this.waveTimer = n === 1 ? 2.4 : 2.0;
    this.spawnTimer = 0;
    this.pendingSpawns = this.buildWave(n);
    const total = this.pendingSpawns.length;
    this.ui.setWave(n, total);
    const titles = ['WAVE 01', 'WAVE 02', 'WAVE 03', 'WAVE 04', 'WAVE 05'];
    const kicker = n % 5 === 0 ? '균열의 지배자' : n === 1 ? '균열 감지' : '적성 반응';
    const sub = n % 5 === 0 ? '혈귀 장군 · 이그리스가 깨어난다' : n === 1 ? '그림자 임프가 깨어났다' : '그림자 무리가 몰려온다';
    this.ui.showBanner(kicker, titles[n - 1] || `WAVE ${String(n).padStart(2, '0')}`, sub, 2300);
    if (n % 5 === 0) {
      this.world.setBossMood(true);
      this.audio.play('boss');
      this.fovKick = 0.35;
    } else {
      this.world.setBossMood(false);
    }
  }

  buildWave(n) {
    const list = [];
    const push = (type, elite = false, delay = 0) => list.push({ type, elite, delay });
    if (n === 1) {
      for (let i = 0; i < 4; i++) push('imp', false, i * 0.34);
    } else if (n === 2) {
      for (let i = 0; i < 4; i++) push('imp', false, i * 0.25);
      for (let i = 0; i < 2; i++) push('hound', false, 1.4 + i * 0.3);
    } else if (n === 3) {
      for (let i = 0; i < 3; i++) push('swordsman', false, i * 0.36);
      for (let i = 0; i < 2; i++) push('hound', false, 1.3 + i * 0.26);
      for (let i = 0; i < 2; i++) push('imp', false, 2.0 + i * 0.25);
    } else if (n === 4) {
      push('swordsman', true, 0);
      for (let i = 0; i < 4; i++) push('swordsman', false, 0.4 + i * 0.27);
      for (let i = 0; i < 2; i++) push('hound', false, 1.9 + i * 0.25);
    } else if (n === 5) {
      push('boss', false, 0.6);
      for (let i = 0; i < 4; i++) push('imp', false, 1.4 + i * 0.28);
    } else {
      const cycle = (n - 6) % 5;
      if (cycle === 4) {
        push('boss', true, 0.4);
        for (let i = 0; i < 4; i++) push('imp', false, 1.2 + i * 0.2);
      }
      const count = 5 + Math.floor(n * 0.65);
      for (let i = 0; i < count; i++) {
        const r = Math.random();
        push(r < 0.4 ? 'imp' : r < 0.72 ? 'hound' : 'swordsman', Math.random() < 0.18, i * 0.2);
      }
    }
    return list;
  }

  spawnEnemy(type, elite = false, position = null, isMinion = false) {
    const base = ENEMY_DATA[type];
    const model = createEnemyModel(type, elite ? 1 : 0);
    const p = position ? position.clone() : this.enemySpawnPoint(type);
    model.position.set(p.x, 0, p.z);
    this.scene.add(model);
    const waveScale = 1 + Math.max(0, this.wave - 1) * (this.endless ? 0.13 : 0.08);
    const hp = base.hp * waveScale * (elite ? 1.65 : 1) * (isMinion ? 0.7 : 1);
    const e = {
      id: this.enemyId++,
      type,
      elite,
      group: model,
      rig: model.userData.rig,
      name: `${elite ? '정예 ' : ''}${base.name}`,
      hp,
      maxHp: hp,
      speed: base.speed * (elite ? 0.92 : 1) * (1 + Math.max(0, this.wave - 1) * 0.015),
      damage: base.damage * (1 + Math.max(0, this.wave - 1) * 0.075) * (elite ? 1.35 : 1),
      range: base.range * (elite ? 1.06 : 1),
      radius: base.radius * (elite ? 1.15 : 1),
      xp: base.xp * (elite ? 1.8 : 1),
      souls: base.souls * (elite ? 2 : 1),
      barHeight: (model.userData.rig.height || 3) + 0.5,
      alive: true,
      spawnTimer: 0.7,
      baseScale: model.userData.rig.scale || 1,
      attackCooldown: rand(0.5, 1.4),
      attackState: null,
      stagger: 0,
      hitFlash: 0,
      knock: new THREE.Vector3(),
      facing: 0,
      burn: 0,
      burnTimer: 0,
      deadTime: 0,
      bossPhase: 1,
      bossSpecialTimer: rand(6, 8),
      lastHit: 0,
      spawnY: -1.8,
      minion: isMinion,
    };
    model.scale.setScalar(0.02);
    this.enemies.push(e);
    this.effects.spawnRing(p, type === 'boss' ? 0xff2949 : 0x8b5cff, {
      endScale: type === 'boss' ? 7 : 2.6, duration: type === 'boss' ? 1.1 : 0.55,
    });
    this.effects.burst(p.clone().setY(0.2), type === 'boss' ? 0xff3355 : 0x7c4dff, type === 'boss' ? 60 : 18, {
      speed: type === 'boss' ? 5 : 2.5, size: 0.22, life: 0.9, gravity: -1.5, up: 0.7,
    });
    if (type === 'boss') {
      this.ui.showBoss(e.name, e.hp, e.maxHp);
      this.world.setBossMood(true);
      this.audio.play('boss');
    }
    return e;
  }

  enemySpawnPoint(type) {
    if (type === 'boss') return new THREE.Vector3(0, 0, -7);
    const forwardAngle = Math.atan2(-Math.cos(this.cam.yaw), -Math.sin(this.cam.yaw));
    let best = null;
    let bestScore = -Infinity;
    for (let i = 0; i < 14; i++) {
      const a = forwardAngle + rand(-1.42, 1.42);
      const r = rand(12, 17.5);
      const p = new THREE.Vector3(
        this.player.position.x + Math.cos(a) * r,
        0,
        this.player.position.z + Math.sin(a) * r
      );
      const edge = Math.hypot(p.x, p.z);
      if (edge > 25.5) {
        p.x = p.x / edge * 25.5;
        p.z = p.z / edge * 25.5;
      }
      const d = p.distanceTo(this.player.position);
      const centerBias = Math.hypot(p.x, p.z) < 4 ? -3 : 0;
      const score = d + centerBias;
      if (score > bestScore) { bestScore = score; best = p; }
    }
    return best;
  }

  removeEnemy(e) {
    if (!e) return;
    this.scene.remove(e.group);
    e.group.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach(m => m.dispose());
        else o.material.dispose();
      }
    });
    const i = this.enemies.indexOf(e);
    if (i >= 0) this.enemies.splice(i, 1);
    if (e.type === 'boss') {
      this.ui.hideBoss();
      this.world.setBossMood(false);
    }
  }

  basicAttack() {
    const p = this.player;
    if (this.mode !== 'playing' || p.dead || p.attackCooldown > 0 || p.dashState) return;
    if (p.castState) return;
    if (p.attackState) return;
    p.stepTimer -= 0;
    if (p.stepTimer <= 0) p.comboStep = 0;
    p.comboStep = (p.comboStep % 3) + 1;
    p.stepTimer = 0.92;
    p.attackCooldown = p.comboStep === 3 ? 0.48 : 0.34;
    const target = this.nearestEnemyFacing(8.5);
    p.targetFacing = target !== null ? target : this.cam.yaw;
    p.attackState = { t: 0, dur: p.comboStep === 3 ? 0.5 : 0.4, combo: p.comboStep, hitAt: p.comboStep === 3 ? 0.2 : 0.14, hitDone: false };
    const color = p.comboStep === 1 ? 0x9d7bff : p.comboStep === 2 ? 0x69dfff : 0xffd080;
    this.effects.startTrail(color);
    this.audio.play(p.comboStep === 3 ? 'swing3' : 'swing');
    if (p.comboStep === 3) this.fovKick = 0.18;
  }

  nearestEnemyFacing(maxDist = 10) {
    let best = null;
    let bestD = maxDist;
    for (const e of this.enemies) {
      if (!e.alive || e.spawnTimer > 0.15) continue;
      const dx = e.group.position.x - this.player.position.x;
      const dz = e.group.position.z - this.player.position.z;
      const d = Math.hypot(dx, dz);
      if (d < bestD) { bestD = d; best = Math.atan2(-dx, -dz); }
    }
    return best;
  }

  hitArc(radius, arc, mult, opts = {}) {
    const p = this.player;
    const facing = p.facing;
    const fx = -Math.sin(facing);
    const fz = -Math.cos(facing);
    let hits = 0;
    for (const e of [...this.enemies]) {
      if (!e.alive || e.spawnTimer > 0.1) continue;
      const dx = e.group.position.x - p.position.x;
      const dz = e.group.position.z - p.position.z;
      const d = Math.hypot(dx, dz);
      if (d > radius + e.radius) continue;
      if (d > 0.01) {
        const dot = (dx * fx + dz * fz) / d;
        if (dot < Math.cos(arc * 0.5)) continue;
      }
      const base = p.attack * mult * rand(0.92, 1.08);
      this.damageEnemy(e, base, {
        crit: Math.random() < p.crit,
        knockback: opts.knockback ?? (1.8 + (opts.heavy ? 3 : 0)),
        heavy: opts.heavy,
        color: opts.color,
        burn: opts.burn,
      });
      hits++;
    }
    if (hits > 0) {
      this.hitStop = Math.max(this.hitStop, opts.heavy ? 0.055 : 0.032);
      this.shake = Math.max(this.shake, opts.heavy ? 0.42 : 0.18);
    }
    return hits;
  }

  hitSegment(start, end, radius, mult, opts = {}) {
    const p = this.player;
    const seg = end.clone().sub(start);
    const len2 = Math.max(0.001, seg.lengthSq());
    let hits = 0;
    for (const e of [...this.enemies]) {
      if (!e.alive) continue;
      const ep = e.group.position;
      const t = clamp(((ep.x - start.x) * seg.x + (ep.z - start.z) * seg.z) / len2, 0, 1);
      const px = start.x + seg.x * t;
      const pz = start.z + seg.z * t;
      const d = Math.hypot(ep.x - px, ep.z - pz);
      if (d > radius + e.radius) continue;
      this.damageEnemy(e, p.attack * mult * rand(0.95, 1.1), {
        crit: Math.random() < p.crit + 0.05,
        knockback: 3.2,
        color: opts.color,
        heavy: true,
      });
      hits++;
    }
    if (hits) {
      this.hitStop = Math.max(this.hitStop, 0.045);
      this.shake = Math.max(this.shake, 0.32);
    }
    return hits;
  }

  damageEnemy(e, raw, opts = {}) {
    if (!e.alive) return;
    const p = this.player;
    const crit = !!opts.crit;
    let dmg = raw * (crit ? p.critMult : 1);
    if (e.type === 'boss') dmg *= 0.9;
    dmg = Math.max(1, Math.round(dmg));
    e.hp -= dmg;
    e.hitFlash = 1;
    e.stagger = Math.max(e.stagger, opts.heavy ? 0.36 : 0.16);
    e.attackState = null;
    if (opts.burn) {
      e.burn = Math.max(e.burn, 4.5);
      e.burnTimer = 0.55;
    }
    if (opts.knockback) {
      const dx = e.group.position.x - p.position.x;
      const dz = e.group.position.z - p.position.z;
      const d = Math.max(0.01, Math.hypot(dx, dz));
      e.knock.set(dx / d * opts.knockback, 0, dz / d * opts.knockback);
    }
    p.combo++;
    p.comboTimer = 3.2;
    p.maxCombo = Math.max(p.maxCombo, p.combo);
    this.ui.setCombo(p.combo, p.comboTimer);
    this.ui.damage(e.group.position.clone().add(new THREE.Vector3(0, e.barHeight * 0.52, 0)), dmg, crit ? 'crit' : '');
    const hitPos = e.group.position.clone().add(new THREE.Vector3(0, Math.min(2.2, e.barHeight * 0.55), 0));
    this.effects.hitSpark(hitPos, opts.color || 0xdcceff);
    this.effects.bloodBurst(hitPos, e.type === 'boss' ? 0xff2949 : 0xff4868);
    if (p.lifesteal > 0) {
      const heal = Math.max(1, Math.round(dmg * p.lifesteal));
      p.hp = Math.min(p.maxHp, p.hp + heal);
    }
    this.audio.play(crit ? 'crit' : 'hit');
    this.fovKick = Math.max(this.fovKick, crit ? 0.25 : 0.08);
    if (e.type === 'boss') {
      this.ui.updateBoss(e.hp, e.maxHp);
      if (e.bossPhase === 1 && e.hp <= e.maxHp * 0.5) this.enterBossPhase2(e);
    }
    if (e.hp <= 0) this.killEnemy(e);
  }

  enterBossPhase2(e) {
    e.bossPhase = 2;
    e.speed *= 1.22;
    e.damage *= 1.18;
    this.ui.toast('혈귀 장군 · 2페이즈 — 피의 왕좌가 열린다', 'gold');
    this.ui.flash('red');
    this.effects.domain(e.group.position);
    this.audio.play('domain');
    this.shake = Math.max(this.shake, 0.7);
    for (let i = 0; i < 2; i++) {
      const pos = e.group.position.clone().add(new THREE.Vector3(i ? 3 : -3, 0, 2));
      this.spawnEnemy('imp', false, pos, true);
    }
  }

  killEnemy(e) {
    if (!e.alive) return;
    e.alive = false;
    e.deadTime = 0;
    this.player.kills++;
    this.player.souls += e.souls;
    this.player.xp += e.xp;
    this.effects.soulBurst(e.group.position.clone().add(new THREE.Vector3(0, 1.2, 0)), e.type === 'boss' ? 0xff4163 : 0x9d7bff, e.type === 'boss' ? 90 : 28);
    this.audio.play('kill');
    this.ui.toast(`+${e.xp} EXP  ·  +${e.souls} 정수`);
    if (e.type === 'boss') {
      this.audio.play('clear');
      this.world.setBossMood(false);
      this.ui.hideBoss();
      this.shake = Math.max(this.shake, 0.8);
      this.hitStop = Math.max(this.hitStop, 0.12);
    }
    this.checkLevelUp();
  }

  checkLevelUp() {
    const p = this.player;
    if (p.xp < p.xpNext || this.mode !== 'playing') return;
    p.xp -= p.xpNext;
    p.level++;
    p.xpNext = Math.round(p.xpNext * 1.32 + 20);
    p.maxHp += 18;
    p.maxMp += 10;
    p.attack += 2.2;
    p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.35);
    p.mp = p.maxMp;
    p.rank = this.rankForLevel(p.level);
    p.levelFlash = 1;
    if (p.level === 2) { p.flameUnlocked = true; this.ui.toast('불꽃 호흡 해금 · F', 'gold'); }
    if (p.level === 3) { p.ariseUnlocked = true; this.ui.toast('아리즈 해금 · E', 'gold'); }
    if (p.level === 4) { p.domainUnlocked = true; this.ui.toast('군주의 영역 해금 · R', 'gold'); }
    this.audio.play('level');
    this.effects.soulBurst(p.position.clone().setY(0.4), 0xc4a8ff, 50);
    this.effects.spawnRing(p.position, 0xc4a8ff, { endScale: 5.5, duration: 0.8 });
    this.shake = Math.max(this.shake, 0.3);
    this.ui.updateStats(p);
    this.openLevelUp();
  }

  rankForLevel(level) {
    if (level >= 20) return '그림자 군주';
    if (level >= 15) return '국가권력급';
    if (level >= 12) return 'S급 헌터';
    if (level >= 9) return 'A급 헌터';
    if (level >= 7) return 'B급 헌터';
    if (level >= 5) return 'C급 헌터';
    if (level >= 3) return 'D급 헌터';
    return 'E급 헌터';
  }

  openLevelUp() {
    const p = this.player;
    this.mode = 'levelup';
    this.keys.clear();
    if (document.pointerLockElement) document.exitPointerLock();
    const cards = this.pickCards();
    this.ui.showLevelUp(p.level, cards, (i) => {
      const card = cards[i];
      card.apply(p);
      this.ui.hideLevelUp();
      this.ui.updateStats(p);
      this.ui.setAbilityState(this.abilityStates());
      this.audio.play('level');
      this.ui.toast(`${card.name} 각성 완료`, 'gold');
      this.mode = 'playing';
      this.effects.spawnRing(p.position, 0x9d7bff, { endScale: 4.2, duration: 0.6 });
      if (p.xp >= p.xpNext) setTimeout(() => this.checkLevelUp(), 450);
    });
  }

  pickCards() {
    const p = this.player;
    const pool = [
      { icon: '⚔', type: 'SHADOW BLADE', name: '그림자 검술', desc: '그림자 칼날이 더 깊게 벤다. 모든 참격의 공격력이 증가한다.', stat: '공격력 <b>+18%</b>', apply: q => { q.attack *= 1.18; } },
      { icon: '♥', type: 'MONARCH HEART', name: '군주의 심장', desc: '그림자를 담는 그릇이 커진다. 최대 생명력과 회복량이 증가한다.', stat: '최대 HP <b>+30</b>', apply: q => { q.maxHp += 30; q.hp = Math.min(q.maxHp, q.hp + 30); } },
      { icon: '»', type: 'SHADOW STEP', name: '질풍의 그림자', desc: '그림자처럼 미끄러진다. 이동 속도가 영구히 증가한다.', stat: '이동 속도 <b>+8%</b>', apply: q => { q.speed *= 1.08; } },
      { icon: '火', type: 'FLAME BREATH', name: '불꽃 호흡 · 심화', desc: '호흡의 화염이 더 오래 타오른다. 불꽃 호흡 피해가 증가한다.', stat: '불꽃 피해 <b>+28%</b>', apply: q => { q.flameUnlocked = true; q.flameMult *= 1.28; } },
      { icon: '影', type: 'SHADOW ARMY', name: '그림자 군단', desc: '아리즈가 부르는 그림자 병사가 한 명 늘어난다.', stat: '그림자 병사 <b>+1</b>', apply: q => { q.shadowCount += 1; } },
      { icon: '◈', type: 'CRITICAL', name: '균열의 눈', desc: '적의 그림자 핵을 꿰뚫는 감각이 날카로워진다.', stat: '치명타율 <b>+8%</b>', apply: q => { q.crit += 0.08; } },
      { icon: '✧', type: 'SPIRIT', name: '무한한 정신력', desc: '마나의 순환을 깨운다. 최대 MP와 재생 속도가 증가한다.', stat: '최대 MP <b>+25</b> · 재생 <b>+2</b>', apply: q => { q.maxMp += 25; q.mpRegen += 2; q.mp = q.maxMp; } },
      { icon: '☄', type: 'MONARCH DOMAIN', name: '군주의 영역', desc: '영역의 검기가 더 넓고 깊게 내리친다.', stat: '영역 피해 <b>+30%</b>', apply: q => { q.domainMult *= 1.3; } },
      { icon: '↯', type: 'SHADOW SLASH', name: '공간 참격', desc: '그림자 참의 궤적이 공간을 더 오래 가른다.', stat: '그림자 참 <b>+35%</b>', apply: q => { q.dashMult *= 1.35; q.dashCooldown = Math.max(3, q.dashCooldown - 1); } },
      { icon: '♰', type: 'BLOOD RITE', name: '피의 계약', desc: '적의 생명을 그림자로 바꾼다. 가한 피해의 일부를 회복한다.', stat: '흡혈 <b>+4%</b>', apply: q => { q.lifesteal += 0.04; } },
    ];
    const selected = [];
    const available = [...pool];
    while (selected.length < 3 && available.length) {
      const i = Math.floor(Math.random() * available.length);
      selected.push(available.splice(i, 1)[0]);
    }
    return selected;
  }

  dodge() {
    const p = this.player;
    if (this.mode !== 'playing' || p.dead || this.cooldowns.dodge > 0 || p.dashState) return;
    const dir = this.inputDirection();
    const f = dir.lengthSq() > 0.01 ? dir : new THREE.Vector3(-Math.sin(p.facing), 0, -Math.cos(p.facing));
    this.cooldowns.dodge = 1.25;
    p.invuln = Math.max(p.invuln, 0.38);
    p.dashState = { t: 0, dur: 0.17, dir: f.clone(), speed: 27, damage: 0, hitDone: true, color: 0x74e7ff, dodge: true };
    p.targetFacing = Math.atan2(-f.x, -f.z);
    this.effects.shadowStep(p.position.clone(), p.position.clone().addScaledVector(f, 4.2), 0x6ddfff);
    this.effects.startTrail(0x74e7ff);
    this.audio.play('dash');
    this.fovKick = 0.28;
  }

  useAbility(name) {
    if (this.mode !== 'playing' || this.player.dead) return;
    const p = this.player;
    if (this.cooldowns[name] > 0) { this.ui.deny(name); this.audio.play('deny'); return; }
    if (name === 'flame') {
      if (!p.flameUnlocked) { this.ui.deny(name); this.ui.toast('불꽃 호흡은 LV.2에 해금됩니다'); this.audio.play('deny'); return; }
      if (p.mp < 20) { this.ui.deny(name); this.ui.toast('MP가 부족합니다'); this.audio.play('deny'); return; }
      p.mp -= 20;
      this.cooldowns.flame = 6;
      const face = this.nearestEnemyFacing(11);
      p.targetFacing = this.cam.yaw;
      p.castState = { t: 0, dur: 0.74, type: 'flame', done: false };
      this.audio.play('flame');
      this.fovKick = 0.35;
      this.effects.startTrail(0xff7a42);
      this.ui.toast('불꽃 호흡 · 제2형 「상승염」');
    } else if (name === 'dash') {
      if (p.mp < 15) { this.ui.deny(name); this.ui.toast('MP가 부족합니다'); this.audio.play('deny'); return; }
      p.mp -= 15;
      this.cooldowns.dash = p.dashCooldown;
      const dir = this.inputDirection();
      const f = dir.lengthSq() > 0.01 ? dir : new THREE.Vector3(-Math.sin(p.facing), 0, -Math.cos(p.facing));
      p.dashState = { t: 0, dur: 0.24, dir: f.clone(), speed: 31, damage: 2.0 * p.dashMult, hitDone: false, color: 0x8b5cff };
      p.targetFacing = Math.atan2(-f.x, -f.z);
      p.invuln = Math.max(p.invuln, 0.34);
      this.effects.shadowStep(p.position.clone(), p.position.clone().addScaledVector(f, 7.4), 0x8b5cff);
      this.effects.startTrail(0xa47bff);
      this.audio.play('dash');
      this.fovKick = 0.4;
    } else if (name === 'arise') {
      if (!p.ariseUnlocked) { this.ui.deny(name); this.ui.toast('아리즈는 LV.3에 해금됩니다'); this.audio.play('deny'); return; }
      if (p.mp < p.ariseCost) { this.ui.deny(name); this.ui.toast('MP가 부족합니다'); this.audio.play('deny'); return; }
      p.mp -= p.ariseCost;
      this.cooldowns.arise = 18;
      p.castState = { t: 0, dur: 0.8, type: 'arise', done: false };
      this.audio.play('arise');
      this.effects.arise(p.position);
      this.shake = Math.max(this.shake, 0.25);
      this.ui.toast('아리즈 — 그림자여, 일어나라', 'gold');
    } else if (name === 'domain') {
      if (!p.domainUnlocked) { this.ui.deny(name); this.ui.toast('군주의 영역은 LV.4에 해금됩니다'); this.audio.play('deny'); return; }
      if (p.mp < p.domainCost) { this.ui.deny(name); this.ui.toast('MP가 부족합니다'); this.audio.play('deny'); return; }
      p.mp -= p.domainCost;
      this.cooldowns.domain = 30;
      p.castState = { t: 0, dur: 1.0, type: 'domain', done: false };
      this.audio.play('domain');
      this.fovKick = 0.8;
      this.shake = Math.max(this.shake, 0.45);
      this.ui.toast('군주의 영역 — 그림자가 세상을 삼킨다', 'gold');
    }
  }

  summonShadows() {
    const p = this.player;
    for (let i = 0; i < p.shadowCount; i++) {
      const a = (i / p.shadowCount) * TAU + Math.PI * 0.25;
      const pos = p.position.clone().add(new THREE.Vector3(Math.cos(a) * 2.2, 0, Math.sin(a) * 2.2));
      const group = createShadowSoldier();
      group.position.copy(pos);
      this.scene.add(group);
      this.shadows.push({
        id: this.shadowId++,
        group,
        rig: group.userData.rig,
        position: pos.clone(),
        life: 24,
        attackCooldown: rand(0.2, 0.7),
        attackState: null,
        facing: 0,
        speedNow: 0,
      });
      this.effects.spawnRing(pos, 0x8b5cff, { endScale: 2.8, duration: 0.55 });
    }
  }

  removeShadow(s) {
    if (!s) return;
    this.scene.remove(s.group);
    s.group.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach(m => m.dispose());
        else o.material.dispose();
      }
    });
    const i = this.shadows.indexOf(s);
    if (i >= 0) this.shadows.splice(i, 1);
  }

  inputDirection() {
    let x = 0;
    let z = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) z += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) z -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.joystick.active) {
      x += this.joystick.x;
      z -= this.joystick.y;
    }
    const yaw = this.cam.yaw;
    const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const dir = new THREE.Vector3().addScaledVector(forward, z).addScaledVector(right, x);
    if (dir.lengthSq() > 1) dir.normalize();
    return dir;
  }

  updatePlayer(dt) {
    const p = this.player;
    p.invuln = Math.max(0, p.invuln - dt);
    p.hurt = Math.max(0, p.hurt - dt * 4);
    p.attackCooldown = Math.max(0, p.attackCooldown - dt);
    p.stepTimer = Math.max(0, p.stepTimer - dt);
    p.comboTimer = Math.max(0, p.comboTimer - dt);
    p.levelFlash = Math.max(0, p.levelFlash - dt * 2);
    if (p.comboTimer <= 0 && p.combo > 0) {
      p.combo = 0;
      p.comboStep = 0;
      this.ui.setCombo(0);
    }
    if (!p.dead) {
      p.mp = Math.min(p.maxMp, p.mp + p.mpRegen * dt);
      p.hp = Math.min(p.maxHp, p.hp + 0.55 * dt);
    }
    if (p.dead) {
      p.deadTime += dt;
      p.speedNow = 0;
      animateHunter(p.rig, dt, { speed: 0, dead: true, deadTime: p.deadTime, hurt: 0 });
      p.group.updateMatrixWorld(true);
      return;
    }

    if (p.dashState) {
      const d = p.dashState;
      d.t += dt;
      const before = p.position.clone();
      p.position.addScaledVector(d.dir, d.speed * dt);
      this.clampToArena(p.position);
      p.group.position.copy(p.position);
      if (!d.hitDone && d.t > 0.055 && d.damage > 0) {
        d.hitDone = true;
        this.hitSegment(before.clone().addScaledVector(d.dir, -1.2), p.position.clone().addScaledVector(d.dir, 1.4), 2.2, d.damage, { color: 0x9b7bff });
        this.effects.spawnSlash(p.position.clone().addScaledVector(d.dir, -2.5), p.facing, 0x9b7bff, { radius: 2.4, arc: 2.4, distance: 2.1, y: 1.9, duration: 0.3 });
      }
      p.speedNow = d.speed;
      if (p.rig.attackState) p.rig.attackState = null;
      animateHunter(p.rig, dt, { speed: d.speed, lean: 0.16, hurt: p.hurt, auraBoost: 0.6 });
      p.group.updateMatrixWorld(true);
      if (d.damage > 0) {
        const pts = getSwordPoints(p.rig);
        this.effects.pushTrail(pts.base, pts.tip);
      }
      if (d.t >= d.dur) {
        p.dashState = null;
        this.effects.endTrail();
      }
      return;
    }

    let dir = this.inputDirection();
    const moving = dir.lengthSq() > 0.01;
    if (moving) p.targetFacing = Math.atan2(-dir.x, -dir.z);
    let speedFactor = 1;
    if (p.attackState) speedFactor = 0.28;
    if (p.castState) speedFactor = 0.15;
    const speed = p.speed * speedFactor;
    if (moving) {
      p.position.addScaledVector(dir, speed * dt);
      this.clampToArena(p.position);
    }
    p.speedNow = moving ? speed : 0;
    p.group.position.copy(p.position);
    p.facing = dampAngle(p.facing, p.targetFacing, p.attackState || p.castState ? 18 : 12, dt);
    p.group.rotation.y = p.facing;

    if (p.attackState) {
      const a = p.attackState;
      a.t += dt;
      if (a.t < 0.14) {
        p.position.addScaledVector(new THREE.Vector3(-Math.sin(p.facing), 0, -Math.cos(p.facing)), 3.4 * dt);
        this.clampToArena(p.position);
        p.group.position.copy(p.position);
      }
      if (!a.hitDone && a.t >= a.hitAt) {
        a.hitDone = true;
        const mult = a.combo === 3 ? 1.75 : a.combo === 2 ? 1.25 : 1;
        const hits = this.hitArc(a.combo === 3 ? 4.6 : 3.7, a.combo === 3 ? 2.7 : 2.2, mult, {
          heavy: a.combo === 3,
          knockback: a.combo === 3 ? 5 : 2.2,
          color: a.combo === 3 ? 0xffd080 : 0xb99cff,
        });
        const color = a.combo === 1 ? 0x9d7bff : a.combo === 2 ? 0x69dfff : 0xffd080;
        this.effects.spawnSlash(p.position.clone(), p.facing, color, {
          radius: a.combo === 3 ? 3.7 : 2.8,
          arc: a.combo === 3 ? 3.0 : 2.35,
          distance: a.combo === 3 ? 2.2 : 2.0,
          tube: a.combo === 3 ? 0.18 : 0.12,
          duration: 0.25,
          spin: a.combo === 2 ? -0.4 : 0.15,
        });
        if (hits === 0) this.effects.burst(p.position.clone().add(new THREE.Vector3(-Math.sin(p.facing) * 2, 1.2, -Math.cos(p.facing) * 2)), color, 5, { speed: 2, size: 0.08, life: 0.25, gravity: 0 });
      }
      if (a.t >= a.dur) {
        p.attackState = null;
        this.effects.endTrail();
      }
    }

    if (p.castState) {
      const c = p.castState;
      c.t += dt;
      if (!c.done && c.t >= (c.type === 'domain' ? 0.38 : c.type === 'arise' ? 0.28 : 0.2)) {
        c.done = true;
        if (c.type === 'flame') {
          const hits = this.hitArc(8.6, 2.45, 2.35 * p.flameMult, { heavy: true, knockback: 3.4, burn: true, color: 0xff8a45 });
          this.effects.flameSlash(p.position.clone(), p.facing, 8.2);
          this.audio.play('flame');
          this.shake = Math.max(this.shake, 0.45);
          this.effects.endTrail();
          if (hits) this.ui.toast(`불꽃 호흡 · ${hits}명 참격`, 'gold');
        } else if (c.type === 'arise') {
          this.summonShadows();
          this.effects.arise(p.position);
        } else if (c.type === 'domain') {
          this.effects.domain(p.position, p.facing);
          let hits = 0;
          for (const e of [...this.enemies]) {
            if (!e.alive) continue;
            const d = Math.hypot(e.group.position.x - p.position.x, e.group.position.z - p.position.z);
            if (d < 12.5 + e.radius) {
              this.damageEnemy(e, p.attack * 5.4 * p.domainMult, { crit: true, knockback: 6, heavy: true, color: 0xb28cff });
              e.stagger = Math.max(e.stagger, 1.1);
              hits++;
            }
          }
          this.shake = Math.max(this.shake, 1.0);
          this.hitStop = Math.max(this.hitStop, 0.08);
          this.ui.flash('violet');
          this.ui.toast(`군주의 영역 · ${hits}명 심판`, 'gold');
        }
      }
      if (c.t >= c.dur) p.castState = null;
    }

    const attackForRig = p.attackState || (p.castState ? { t: p.castState.t, dur: p.castState.dur, combo: 1 } : null);
    animateHunter(p.rig, dt, {
      speed: p.speedNow,
      attack: p.attackState,
      cast: p.castState,
      hurt: p.hurt,
      auraBoost: p.levelFlash,
      dead: false,
    });
    p.group.updateMatrixWorld(true);
    if (p.attackState) {
      const pts = getSwordPoints(p.rig);
      this.effects.pushTrail(pts.base, pts.tip);
    }
  }

  clampToArena(pos) {
    const r = Math.hypot(pos.x, pos.z);
    const max = 27.2;
    if (r > max) {
      pos.x = pos.x / r * max;
      pos.z = pos.z / r * max;
    }
    this.player.boundaryDanger = clamp((r - 24.5) / 3, 0, 1);
  }

  updateEnemies(dt) {
    const p = this.player;
    for (const e of [...this.enemies]) {
      if (!e.alive) {
        e.deadTime += dt;
        e.group.rotation.z = Math.min(1.25, e.deadTime * 2.3);
        e.group.position.y = Math.max(-1.4, -e.deadTime * 0.8);
        setEnemyFlash(e.rig, Math.max(0, 1 - e.deadTime * 3));
        if (e.deadTime > 1.7) this.removeEnemy(e);
        continue;
      }
      if (e.spawnTimer > 0) {
        e.spawnTimer -= dt;
        const t = 1 - Math.max(0, e.spawnTimer) / 0.7;
        const ease = 1 - Math.pow(1 - t, 3);
        e.group.scale.setScalar(e.baseScale * ease);
        e.group.position.y = e.spawnY * (1 - ease);
        if (e.spawnTimer <= 0) e.group.scale.setScalar(e.baseScale);
        continue;
      }
      e.hitFlash = Math.max(0, e.hitFlash - dt * 5);
      setEnemyFlash(e.rig, e.hitFlash);
      e.stagger = Math.max(0, e.stagger - dt);
      e.attackCooldown -= dt;
      if (e.burn > 0) {
        e.burn -= dt;
        e.burnTimer -= dt;
        if (e.burnTimer <= 0) {
          e.burnTimer = 0.55;
          this.damageEnemy(e, p.attack * 0.16, { crit: false, knockback: 0, color: 0xff7a42 });
          if (!e.alive) continue;
        }
      }
      const ep = e.group.position;
      const dx = p.position.x - ep.x;
      const dz = p.position.z - ep.z;
      const dist = Math.hypot(dx, dz);
      const targetFacing = Math.atan2(-dx, -dz);
      e.facing = dampAngle(e.facing, targetFacing, 7, dt);
      e.group.rotation.y = e.facing;
      let moveSpeed = 0;
      if (e.stagger <= 0 && !e.attackState) {
        if (dist > e.range * 0.9) {
          moveSpeed = e.speed;
          const nx = dx / Math.max(0.01, dist);
          const nz = dz / Math.max(0.01, dist);
          ep.x += nx * moveSpeed * dt;
          ep.z += nz * moveSpeed * dt;
        }
        if (dist <= e.range && e.attackCooldown <= 0) {
          const slam = e.type === 'boss' && Math.random() < 0.38;
          e.attackState = {
            t: 0,
            dur: e.type === 'boss' ? (slam ? 1.15 : 0.92) : 0.62,
            hitAt: e.type === 'boss' ? (slam ? 0.72 : 0.54) : 0.34,
            didHit: false,
            slam,
          };
          e.attackCooldown = e.type === 'boss' ? (slam ? 2.3 : 1.55) : rand(1.2, 1.9);
          if (e.type === 'boss' && slam) this.ui.toast('혈귀 장군 · 혈마참', 'gold');
        }
      }
      if (e.attackState) {
        const a = e.attackState;
        a.t += dt;
        if (!a.didHit && a.t >= a.hitAt) {
          a.didHit = true;
          if (a.slam) {
            this.effects.bossSlam(ep.clone().setY(0.1));
            this.shake = Math.max(this.shake, 0.55);
            this.audio.play('domain');
            if (dist < 7.4 && p.invuln <= 0) this.damagePlayer(e.damage * 1.25, ep);
          } else if (dist < e.range + 1.0) {
            this.effects.spawnSlash(ep.clone(), e.facing, e.type === 'boss' ? 0xff2949 : 0xff5b6e, {
              radius: e.type === 'boss' ? 3.8 : 2.1, arc: 2.1, distance: 1.4, tube: 0.12, duration: 0.25, y: 1.7,
            });
            this.damagePlayer(e.damage, ep);
          }
        }
        if (a.t >= a.dur) e.attackState = null;
      }
      // Soft separation.
      for (const other of this.enemies) {
        if (other === e || !other.alive) continue;
        const ox = ep.x - other.group.position.x;
        const oz = ep.z - other.group.position.z;
        const d = Math.hypot(ox, oz);
        const min = e.radius + other.radius + 0.15;
        if (d > 0.01 && d < min) {
          ep.x += ox / d * (min - d) * 0.45;
          ep.z += oz / d * (min - d) * 0.45;
        }
      }
      if (e.knock.lengthSq() > 0.01) {
        ep.x += e.knock.x * dt;
        ep.z += e.knock.z * dt;
        e.knock.multiplyScalar(Math.exp(-9 * dt));
      }
      const er = Math.hypot(ep.x, ep.z);
      if (er > 27) { ep.x = ep.x / er * 27; ep.z = ep.z / er * 27; }
      if (e.type === 'boss') {
        e.bossSpecialTimer -= dt;
        if (e.bossSpecialTimer <= 0 && !e.attackState && e.stagger <= 0) {
          e.bossSpecialTimer = rand(7, 10);
          e.attackState = { t: 0, dur: 1.15, hitAt: 0.72, didHit: false, slam: true };
          e.attackCooldown = 1.4;
          this.ui.toast('혈귀 장군 · 혈마참', 'gold');
        }
      }
      animateEnemy(e.rig, dt, { speed: moveSpeed, attack: e.attackState });
      e.rig.group = e.group;
      e.group.updateMatrixWorld(true);
    }
  }

  damagePlayer(amount, fromPos) {
    const p = this.player;
    if (this.mode !== 'playing' || p.dead || p.invuln > 0) return;
    let dmg = Math.max(1, Math.round(amount * rand(0.9, 1.1)));
    p.hp -= dmg;
    p.invuln = 0.85;
    p.hurt = 1;
    p.attackState = null;
    p.castState = null;
    this.effects.endTrail();
    this.ui.flash('red');
    this.ui.damage(p.position.clone().setY(2.2), dmg, 'player');
    this.audio.play('hurt');
    this.shake = Math.max(this.shake, 0.5);
    this.hitStop = Math.max(this.hitStop, 0.03);
    if (fromPos) {
      const dx = p.position.x - fromPos.x;
      const dz = p.position.z - fromPos.z;
      const d = Math.max(0.01, Math.hypot(dx, dz));
      p.position.x += dx / d * 1.1;
      p.position.z += dz / d * 1.1;
      this.clampToArena(p.position);
      p.group.position.copy(p.position);
    }
    if (p.hp <= 0) this.playerDeath();
  }

  playerDeath() {
    const p = this.player;
    p.hp = 0;
    p.dead = true;
    p.deadTime = 0;
    this.mode = 'dead';
    this.deathTimer = 1.6;
    this.resultVictory = false;
    this.ui.flash('red');
    this.audio.play('death');
    this.shake = Math.max(this.shake, 0.8);
    if (document.pointerLockElement) document.exitPointerLock();
    for (const e of this.enemies) e.attackState = null;
  }

  updateShadows(dt) {
    const p = this.player;
    for (const s of [...this.shadows]) {
      s.life -= dt;
      if (s.life <= 0) {
        this.effects.soulBurst(s.position.clone().setY(0.8), 0x8b5cff, 20);
        this.removeShadow(s);
        continue;
      }
      let target = null;
      let bestD = 24;
      for (const e of this.enemies) {
        if (!e.alive || e.spawnTimer > 0) continue;
        const d = Math.hypot(e.group.position.x - s.position.x, e.group.position.z - s.position.z);
        if (d < bestD) { bestD = d; target = e; }
      }
      let moveSpeed = 0;
      if (target) {
        const dx = target.group.position.x - s.position.x;
        const dz = target.group.position.z - s.position.z;
        const d = Math.hypot(dx, dz);
        s.facing = dampAngle(s.facing, Math.atan2(-dx, -dz), 9, dt);
        if (d > 2.2) {
          moveSpeed = 5.4;
          s.position.x += dx / Math.max(0.01, d) * moveSpeed * dt;
          s.position.z += dz / Math.max(0.01, d) * moveSpeed * dt;
        }
        s.attackCooldown -= dt;
        if (d <= 2.5 && s.attackCooldown <= 0 && !s.attackState) {
          s.attackState = { t: 0, dur: 0.48, hitAt: 0.19, done: false, target };
          s.attackCooldown = 0.8;
        }
        if (s.attackState) {
          const a = s.attackState;
          a.t += dt;
          if (!a.done && a.t >= a.hitAt) {
            a.done = true;
            if (target.alive && Math.hypot(target.group.position.x - s.position.x, target.group.position.z - s.position.z) < 3.4) {
              this.damageEnemy(target, p.attack * 0.52 + 4, { crit: Math.random() < 0.08, knockback: 1.2, color: 0xa47bff });
              this.effects.spawnSlash(s.position.clone(), s.facing, 0x9b7bff, {
                radius: 1.5, arc: 1.9, distance: 1.0, tube: 0.09, duration: 0.22, y: 1.25,
              });
            }
          }
          if (a.t >= a.dur) s.attackState = null;
        }
      } else {
        const dx = p.position.x - s.position.x;
        const dz = p.position.z - s.position.z;
        const d = Math.hypot(dx, dz);
        if (d > 3.2) {
          moveSpeed = 4.6;
          s.facing = dampAngle(s.facing, Math.atan2(-dx, -dz), 8, dt);
          s.position.x += dx / d * moveSpeed * dt;
          s.position.z += dz / d * moveSpeed * dt;
        }
      }
      s.group.position.set(s.position.x, 0, s.position.z);
      s.group.rotation.y = s.facing;
      s.speedNow = moveSpeed;
      if (s.life < 3) s.group.scale.setScalar(clamp(s.life / 3, 0.1, 1));
      animateShadow(s.rig, dt, { speed: moveSpeed, attack: s.attackState });
      s.group.updateMatrixWorld(true);
    }
  }

  updateWaves(dt) {
    if (this.mode !== 'playing') return;
    if (this.phase === 'idle') return;
    if (this.phase === 'intro') {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) {
        this.phase = 'active';
        this.spawnTimer = 0;
      }
      return;
    }
    if (this.phase === 'active') {
      this.spawnTimer -= dt;
      if (this.pendingSpawns.length && this.spawnTimer <= 0) {
        const next = this.pendingSpawns.shift();
        this.spawnTimer = Math.max(0.18, next.delay || 0.24);
        this.spawnEnemy(next.type, next.elite);
      }
      const alive = this.enemies.filter(e => e.alive).length;
      if (!this.pendingSpawns.length && alive === 0) {
        this.phase = 'clear';
        this.waveTimer = 2.8;
        this.onWaveClear();
      }
      return;
    }
    if (this.phase === 'clear') {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) {
        if (this.wave % 5 === 0 && !this.endless) {
          this.mode = 'result';
          this.resultVictory = true;
          this.ui.showResult({
            victory: true, level: this.player.level, kills: this.player.kills,
            combo: this.player.maxCombo, souls: this.player.souls,
          });
          if (document.pointerLockElement) document.exitPointerLock();
          this.ui.hideBanner();
          this.phase = 'idle';
          this.world.setBossMood(false);
        } else {
          this.startWave(this.wave + 1);
        }
      }
    }
  }

  onWaveClear() {
    const p = this.player;
    const bonusXp = 32 + this.wave * 16;
    const bonusSouls = 24 + this.wave * 12;
    p.xp += bonusXp;
    p.souls += bonusSouls;
    p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.22);
    p.mp = p.maxMp;
    this.audio.play('clear');
    this.ui.showBanner('WAVE CLEAR', `WAVE ${String(this.wave).padStart(2, '0')} CLEAR`, `+${bonusXp} EXP · +${bonusSouls} 그림자 정수`, 2200);
    this.ui.toast(`웨이브 클리어 · +${bonusXp} EXP`, 'gold');
    this.checkLevelUp();
    this.world.setBossMood(false);
    this.ui.hideBoss();
  }

  updateCamera(dt) {
    const p = this.player;
    if (this.mode === 'menu' || this.mode === 'loading') {
      const t = this.elapsed;
      const yaw = 0.22 + Math.sin(t * 0.1) * 0.07;
      const target = new THREE.Vector3(0.4, 2.4, 2.0);
      this.menuTarget.lerp(target, 1 - Math.exp(-dt * 2));
      const dist = 16.2;
      const desired = new THREE.Vector3(
        this.menuTarget.x + Math.sin(yaw) * dist,
        6.4 + Math.sin(t * 0.32) * 0.22,
        this.menuTarget.z + Math.cos(yaw) * dist
      );
      this.camera.position.lerp(desired, 1 - Math.exp(-dt * 1.8));
      this.camera.lookAt(0.2, 2.35, 1.4);
      this.camera.fov = damp(this.camera.fov, 49, 2, dt);
      this.camera.updateProjectionMatrix();
      return;
    }
    const target = p.position.clone().add(new THREE.Vector3(0, 2.15, 0));
    if (p.dead) target.y -= Math.min(1.0, p.deadTime * 0.5);
    const dist = this.cam.dist;
    const pitch = this.cam.pitch;
    const desired = new THREE.Vector3(
      target.x + Math.sin(this.cam.yaw) * Math.cos(pitch) * dist,
      target.y + Math.sin(pitch) * dist + 0.5,
      target.z + Math.cos(this.cam.yaw) * Math.cos(pitch) * dist
    );
    desired.y = Math.max(desired.y, 1.4);
    this.camera.position.lerp(desired, 1 - Math.exp(-dt * 7.5));
    this.cameraTarget.lerp(target, 1 - Math.exp(-dt * 9));
    this.camera.lookAt(this.cameraTarget);
    this.cameraFill.position.copy(this.camera.position).add(new THREE.Vector3(0, 5, 0));
    this.cameraFillTarget.position.copy(p.position).add(new THREE.Vector3(0, 1.5, 0));
    this.playerRim.position.copy(this.camera.position).sub(p.position).normalize().multiplyScalar(3.2).add(p.position).add(new THREE.Vector3(0, 3.4, 0));
    const fovTarget = 54 + this.fovKick;
    this.camera.fov = damp(this.camera.fov, fovTarget, 6, dt);
    this.fovKick = Math.max(0, this.fovKick - dt * 2.4);
    this.camera.updateProjectionMatrix();
    if (this.shake > 0.002) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.32;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.24;
      this.camera.position.z += (Math.random() - 0.5) * this.shake * 0.18;
      this.shake *= Math.exp(-dt * 7);
    }
  }

  abilityStates() {
    const p = this.player;
    return {
      flame: { remaining: this.cooldowns.flame, total: 6, locked: !p.flameUnlocked },
      dash: { remaining: this.cooldowns.dash, total: p.dashCooldown, locked: false },
      arise: { remaining: this.cooldowns.arise, total: 18, locked: !p.ariseUnlocked },
      domain: { remaining: this.cooldowns.domain, total: 30, locked: !p.domainUnlocked },
    };
  }

  updateHud(dt) {
    const p = this.player;
    this.uiTimer -= dt;
    this.radarTimer -= dt;
    this.counterTimer -= dt;
    for (const k of Object.keys(this.cooldowns)) {
      this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);
    }
    this.ui.setAbilityState(this.abilityStates());
    if (this.uiTimer <= 0) {
      this.uiTimer = 0.08;
      this.ui.updateStats(p);
    }
    if (this.radarTimer <= 0) {
      this.radarTimer = 0.12;
      this.ui.drawRadar(p, this.enemies, this.shadows, this.cam.yaw);
      this.ui.updateEnemyBars(this.enemies, this.camera);
      this.ui.setBoundary(p.boundaryDanger);
    }
    if (this.counterTimer <= 0) {
      this.counterTimer = 0.2;
      const remaining = this.enemies.filter(e => e.alive).length + this.pendingSpawns.length;
      this.ui.setWave(Math.max(1, this.wave), remaining);
    }
  }

  update(dt, rawDt) {
    this.elapsed += rawDt;
    if (this.mode === 'menu' || this.mode === 'loading') {
      const p = this.player;
      p.position.set(3, 0, 6.5);
      p.group.position.copy(p.position);
      p.group.rotation.y = Math.PI - 0.3;
      p.speedNow = 0;
      animateHunter(p.rig, dt, { speed: 0, auraBoost: 0.15 + Math.sin(this.elapsed * 1.2) * 0.1 });
      p.group.updateMatrixWorld(true);
      this.world.update(dt, p.position, 0);
      this.effects.update(dt);
      this.updateCamera(rawDt);
      return;
    }

    if (this.mode === 'playing' || this.mode === 'dead') {
      const slow = this.hitStop > 0 ? 0.08 : 1;
      const gdt = dt * slow;
      if (this.hitStop > 0) this.hitStop -= rawDt;
      this.updatePlayer(gdt);
      this.updateEnemies(gdt);
      this.updateShadows(gdt);
      this.updateWaves(gdt);
      this.effects.update(gdt);
      this.world.update(gdt, this.player.position, this.player.boundaryDanger);
      this.updateCamera(rawDt);
      this.updateHud(gdt);
      if (this.mode === 'dead') {
        this.deathTimer -= rawDt;
        if (this.deathTimer <= 0) {
          this.mode = 'result';
          this.resultVictory = false;
          this.ui.showResult({
            victory: false, level: this.player.level, kills: this.player.kills,
            combo: this.player.maxCombo, souls: this.player.souls,
          });
        }
      }
    } else if (this.mode === 'paused' || this.mode === 'levelup' || this.mode === 'result') {
      this.effects.update(rawDt * 0.3);
      this.world.update(rawDt * 0.35, this.player.position, this.player.boundaryDanger);
      this.updateCamera(rawDt);
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const rawDt = Math.min(0.05, this.clock.getDelta());
    const dt = this.mode === 'menu' ? rawDt : Math.min(0.05, rawDt);
    this.update(dt, rawDt);
    this.composer.render();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    window.__game = new Game();
  } catch (error) {
    console.error(error);
    const loading = document.getElementById('loading');
    if (loading) {
      loading.innerHTML = `<div style="padding:30px;text-align:center;color:#fff;font:14px sans-serif">
        <b>WebGL을 시작할 수 없습니다.</b><br><span style="color:#9b9ab4">${String(error.message).replace(/</g, '&lt;')}</span>
      </div>`;
    }
  }
});
