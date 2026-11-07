import * as THREE from 'three';
import { mat, box } from './models.js';

const TAU = Math.PI * 2;

function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function makeStoneTexture(size = 1024) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const rand = seeded(9231);
  ctx.fillStyle = '#20202c';
  ctx.fillRect(0, 0, size, size);
  // Large flagstones.
  const rows = 9;
  const rowH = size / rows;
  for (let row = 0; row < rows; row++) {
    let x = -rand() * 90;
    const y = row * rowH;
    while (x < size) {
      const w = 65 + rand() * 120;
      const shade = 24 + Math.floor(rand() * 17);
      ctx.fillStyle = `rgb(${shade},${shade + 2},${shade + 10})`;
      ctx.fillRect(x + 3, y + 3, w - 6, rowH - 6);
      ctx.strokeStyle = 'rgba(100,96,135,.09)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 3, y + 3, w - 6, rowH - 6);
      // Cracks.
      if (rand() > 0.63) {
        ctx.strokeStyle = 'rgba(4,4,10,.45)';
        ctx.beginPath();
        let cx = x + w * 0.3;
        let cy = y + 10;
        ctx.moveTo(cx, cy);
        for (let k = 0; k < 4; k++) {
          cx += (rand() - 0.5) * 24;
          cy += rowH / 5;
          ctx.lineTo(cx, cy);
        }
        ctx.stroke();
      }
      // Violet mineral veins.
      if (rand() > 0.83) {
        ctx.strokeStyle = 'rgba(109,76,195,.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 10, y + rowH * rand());
        ctx.lineTo(x + w - 10, y + rowH * rand());
        ctx.stroke();
      }
      x += w;
    }
  }
  // Grime and tiny stones.
  for (let i = 0; i < 1300; i++) {
    ctx.fillStyle = rand() > 0.5 ? 'rgba(0,0,0,.18)' : 'rgba(160,150,210,.07)';
    const r = rand() * 2.6 + 0.4;
    ctx.beginPath();
    ctx.arc(rand() * size, rand() * size, r, 0, TAU);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeRuneTexture(size = 1024, seed = 3) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const rand = seeded(seed);
  ctx.clearRect(0, 0, size, size);
  ctx.translate(size / 2, size / 2);
  const glow = ctx.createRadialGradient(0, 0, size * 0.15, 0, 0, size * 0.5);
  glow.addColorStop(0, 'rgba(95,55,220,0)');
  glow.addColorStop(0.55, 'rgba(105,63,230,.04)');
  glow.addColorStop(0.8, 'rgba(133,84,255,.12)');
  glow.addColorStop(1, 'rgba(80,38,180,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-size / 2, -size / 2, size, size);
  ctx.shadowColor = '#8a58ff';
  ctx.shadowBlur = 14;
  const drawCircle = (r, width, alpha = 1) => {
    ctx.strokeStyle = `rgba(154,116,255,${alpha})`;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.stroke();
  };
  drawCircle(size * 0.44, 2, 0.75);
  drawCircle(size * 0.43, 1, 0.4);
  drawCircle(size * 0.31, 1.4, 0.45);
  drawCircle(size * 0.19, 1, 0.3);
  // Radial ticks.
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * TAU;
    const len = i % 6 === 0 ? 28 : 10;
    ctx.strokeStyle = `rgba(180,148,255,${i % 6 === 0 ? 0.68 : 0.28})`;
    ctx.lineWidth = i % 6 === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * size * 0.44, Math.sin(a) * size * 0.44);
    ctx.lineTo(Math.cos(a) * (size * 0.44 - len), Math.sin(a) * (size * 0.44 - len));
    ctx.stroke();
  }
  // Sigils between rings.
  ctx.shadowBlur = 8;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    const r = size * 0.375;
    ctx.save();
    ctx.translate(Math.cos(a) * r, Math.sin(a) * r);
    ctx.rotate(a + Math.PI / 2);
    ctx.strokeStyle = 'rgba(194,164,255,.62)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    const s = 9 + rand() * 8;
    for (let k = 0; k < 4; k++) {
      const aa = (k / 4) * TAU + (rand() > 0.5 ? 0.3 : 0);
      ctx.lineTo(Math.cos(aa) * s, Math.sin(aa) * s);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
  // Central seal.
  ctx.shadowBlur = 16;
  ctx.strokeStyle = 'rgba(172,138,255,.7)';
  ctx.lineWidth = 2;
  for (let k = 0; k < 2; k++) {
    ctx.save();
    ctx.rotate(k * Math.PI / 4);
    ctx.strokeRect(-size * 0.115, -size * 0.115, size * 0.23, size * 0.23);
    ctx.restore();
  }
  ctx.strokeStyle = 'rgba(116,231,255,.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    const x = Math.cos(a) * size * 0.13;
    const y = Math.sin(a) * size * 0.13;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.12, 'rgba(220,208,255,.9)');
  g.addColorStop(0.36, 'rgba(151,112,255,.32)');
  g.addColorStop(0.7, 'rgba(90,50,190,.08)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

function makePetalTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(24, 22, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,230,246,1)');
  g.addColorStop(0.5, 'rgba(255,158,211,.92)');
  g.addColorStop(1, 'rgba(186,80,157,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(32, 32, 15, 25, 0.5, 0, TAU);
  ctx.fill();
  return new THREE.CanvasTexture(canvas);
}

function makeMoonTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const rand = seeded(777);
  const g = ctx.createRadialGradient(200, 190, 20, 256, 256, 250);
  g.addColorStop(0, '#f3f0ff');
  g.addColorStop(0.55, '#d8d2f4');
  g.addColorStop(0.86, '#aea6d4');
  g.addColorStop(1, 'rgba(150,140,200,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(256, 256, 245, 0, TAU);
  ctx.fill();
  for (let i = 0; i < 48; i++) {
    const x = 90 + rand() * 330;
    const y = 80 + rand() * 350;
    const r = 4 + rand() * 22;
    ctx.fillStyle = `rgba(110,104,160,${0.04 + rand() * 0.09})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeSky() {
  const uniforms = { uTime: { value: 0 } };
  const material = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: /* glsl */`
      varying vec3 vWorld;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */`
      varying vec3 vWorld;
      uniform float uTime;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
      float noise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p);
        f = f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
      }
      float fbm(vec2 p) {
        float v = 0.0; float a = 0.5;
        for (int i=0;i<5;i++){ v += a*noise(p); p*=2.03; a*=0.5; }
        return v;
      }
      void main() {
        vec3 d = normalize(vWorld);
        float y = clamp(d.y, -0.2, 1.0);
        vec3 zenith = vec3(0.008, 0.010, 0.034);
        vec3 mid = vec3(0.042, 0.026, 0.098);
        vec3 horizon = vec3(0.145, 0.055, 0.165);
        vec3 col = mix(horizon, mid, smoothstep(-0.02, 0.28, y));
        col = mix(col, zenith, smoothstep(0.2, 0.9, y));
        float neb = fbm(d.xz * 2.8 + d.y * 1.2);
        float neb2 = fbm(d.xz * 5.2 - d.y * 0.4);
        col += vec3(0.12, 0.035, 0.18) * smoothstep(0.38, 0.82, neb) * (1.0 - y * 0.5);
        col += vec3(0.02, 0.09, 0.14) * smoothstep(0.5, 0.9, neb2) * (1.0 - y);
        // Stars.
        vec2 sp = floor(d.xz / max(0.002, 0.0035 + abs(d.y) * 0.006));
        float star = step(0.993, hash(sp)) * smoothstep(0.02, 0.35, y);
        float tw = 0.55 + 0.45 * sin(uTime * 1.6 + hash(sp) * 40.0);
        col += vec3(0.72, 0.78, 1.0) * star * tw * 1.7;
        // Thin horizon haze.
        col += vec3(0.28, 0.13, 0.26) * exp(-abs(y) * 18.0) * 0.55;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(280, 48, 32), material);
  sky.frustumCulled = false;
  return { sky, uniforms };
}

function makeAurora(colorA, colorB, seed = 0) {
  const uniforms = { uTime: { value: 0 }, uColorA: { value: new THREE.Color(colorA) }, uColorB: { value: new THREE.Color(colorB) }, uSeed: { value: seed } };
  const material = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, fog: false,
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
    `,
    fragmentShader: /* glsl */`
      varying vec2 vUv;
      uniform float uTime; uniform vec3 uColorA; uniform vec3 uColorB; uniform float uSeed;
      float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
      void main(){
        float wave = sin(vUv.x*7.0 + uTime*0.18 + uSeed)*0.5+0.5;
        float wave2 = sin(vUv.x*13.0 - uTime*0.11 + uSeed*2.0)*0.5+0.5;
        float curtain = smoothstep(0.05,0.55,vUv.y)*(1.0-smoothstep(0.68,1.0,vUv.y));
        float streak = smoothstep(0.35,0.95, noise(vec2(vUv.x*9.0+uTime*0.04, vUv.y*2.5+uSeed)));
        float a = curtain * (0.18 + wave*0.25 + wave2*0.12) * (0.35 + streak*0.85);
        vec3 col = mix(uColorA, uColorB, vUv.y*0.8 + wave*0.15);
        gl_FragColor = vec4(col, a*0.65);
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(170, 42, 32, 8), material);
  return { mesh, uniforms };
}

function makePillar(scene, x, z, angle, flameTexture) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = angle;
  const stone = mat(0x292837, { roughness: 0.9, flatShading: true });
  const trim = mat(0x171523, { roughness: 0.7 });
  g.add(box(2.2, 0.5, 2.2, trim, 0, 0.25, 0));
  g.add(box(1.5, 0.3, 1.5, stone, 0, 0.6, 0));
  g.add(box(0.9, 4.8, 0.9, stone, 0, 3.0, 0));
  g.add(box(1.3, 0.22, 1.3, trim, 0, 5.2, 0));
  g.add(box(1.0, 0.3, 1.0, mat(0x4a3a4d, { roughness: 0.6 }), 0, 5.55, 0));
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.45, 0.5, 8), mat(0x241b26, { roughness: 0.6 }));
  bowl.position.y = 5.9;
  g.add(bowl);
  const flameMat = new THREE.SpriteMaterial({
    map: flameTexture, color: 0xff9b54, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const flame = new THREE.Sprite(flameMat);
  flame.position.y = 6.55;
  flame.scale.set(1.5, 2.2, 1);
  g.add(flame);
  const light = new THREE.PointLight(0xff7a3a, 7, 8, 2);
  light.position.y = 6.1;
  g.add(light);
  const runeBand = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.12, 0.94), new THREE.MeshBasicMaterial({
    color: 0x8a5cff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending,
  }));
  runeBand.position.y = 3.5;
  g.add(runeBand);
  scene.add(g);
  return { group: g, flame, light };
}

function makeTorii(scene, flameTexture) {
  const g = new THREE.Group();
  g.position.set(0, 0, -18);
  const wood = mat(0x27161f, { roughness: 0.78, metalness: 0.12 });
  const red = mat(0x7c1f2e, { roughness: 0.66, emissive: 0x23050b, emissiveIntensity: 0.4 });
  const black = mat(0x120e16, { roughness: 0.8 });
  const gold = mat(0xb98b4d, { roughness: 0.4, metalness: 0.55 });
  for (const side of [-1, 1]) {
    g.add(box(0.75, 9.2, 0.8, wood, side * 4.4, 4.6, 0));
    g.add(box(0.95, 0.3, 1.0, black, side * 4.4, 0.15, 0));
    g.add(box(0.9, 0.4, 0.95, red, side * 4.4, 6.5, 0));
    g.add(box(0.8, 0.25, 0.85, gold, side * 4.4, 7.45, 0));
  }
  g.add(box(12.6, 0.55, 1.05, red, 0, 9.0, 0));
  g.add(box(13.5, 0.28, 1.25, black, 0, 9.45, 0));
  g.add(box(14.2, 0.2, 1.55, black, 0, 9.8, 0));
  g.add(box(10.5, 0.32, 0.9, red, 0, 7.9, 0));
  g.add(box(11.2, 0.2, 1.05, black, 0, 8.2, 0));
  const plaque = box(1.4, 2.0, 0.16, black, 0, 8.5, -0.5);
  g.add(plaque);
  const glyph = box(0.8, 0.08, 0.02, gold, 0, 8.75, -0.6);
  g.add(glyph);
  for (let i = 0; i < 3; i++) {
    const rope = box(10.5, 0.05, 0.05, gold, 0, 7.55 - i * 0.18, -0.5);
    g.add(rope);
  }
  // Lanterns hanging from crossbeam.
  for (const x of [-3.2, 0, 3.2]) {
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.62, 8), new THREE.MeshStandardMaterial({
      color: 0xffa45c, emissive: 0xff6b2a, emissiveIntensity: 1.8, transparent: true, opacity: 0.9,
    }));
    lantern.position.set(x, 7.15, 0.1);
    g.add(lantern);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: flameTexture, color: 0xff7b3a, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    glow.position.set(x, 7.15, 0.12);
    glow.scale.set(2.3, 2.3, 1);
    g.add(glow);
  }
  const light = new THREE.PointLight(0xff7b3a, 22, 24, 2);
  light.position.set(0, 6.5, 1);
  g.add(light);
  scene.add(g);
  return g;
}

function makeTree(scene, x, z, scale, rand) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.scale.setScalar(scale);
  const trunkMat = mat(0x2b1e2b, { roughness: 0.96 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.7, 4.2, 6), trunkMat);
  trunk.position.y = 2.1;
  trunk.rotation.z = (rand() - 0.5) * 0.22;
  trunk.castShadow = true;
  g.add(trunk);
  for (let i = 0; i < 3; i++) {
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.2, 2.2, 5), trunkMat);
    branch.position.set((rand() - 0.5) * 1.7, 3.5 + i * 0.35, (rand() - 0.5) * 1.3);
    branch.rotation.z = (rand() - 0.5) * 1.2;
    branch.rotation.x = (rand() - 0.5) * 1.0;
    g.add(branch);
  }
  const blossomColors = [0xff8fc5, 0xf7a8d0, 0xd76baf, 0xffc1df];
  for (let i = 0; i < 6; i++) {
    const c = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.75 + rand() * 0.65, 0),
      mat(blossomColors[Math.floor(rand() * blossomColors.length)], {
        roughness: 0.86, emissive: 0x5e163f, emissiveIntensity: 0.18, flatShading: true,
      })
    );
    c.position.set((rand() - 0.5) * 3.4, 4.1 + rand() * 1.5, (rand() - 0.5) * 2.8);
    c.scale.set(1.2, 0.7, 1);
    c.castShadow = true;
    g.add(c);
  }
  scene.add(g);
  return g;
}

function makePagoda(scene) {
  const g = new THREE.Group();
  g.position.set(-52, 15, -66);
  const islandMat = mat(0x171525, { roughness: 0.98 });
  const island = new THREE.Mesh(new THREE.DodecahedronGeometry(13, 0), islandMat);
  island.scale.set(1.6, 0.52, 1.2);
  island.rotation.y = 0.3;
  island.castShadow = true;
  g.add(island);
  const bottom = new THREE.Mesh(new THREE.ConeGeometry(11, 22, 7), islandMat);
  bottom.position.y = -10;
  bottom.rotation.y = 0.4;
  g.add(bottom);
  const grass = new THREE.Mesh(new THREE.CylinderGeometry(12.5, 13, 1.2, 12), mat(0x1d2230, { roughness: 0.95 }));
  grass.position.y = 1.1;
  grass.scale.z = 0.72;
  g.add(grass);
  const bodyMat = mat(0x2a1d2b, { roughness: 0.84 });
  const roofMat = mat(0x15121e, { roughness: 0.65, metalness: 0.25, emissive: 0x2a0a17, emissiveIntensity: 0.4 });
  const windowMat = new THREE.MeshBasicMaterial({ color: 0xff9b55, transparent: true, opacity: 0.9 });
  let y = 2.6;
  for (let floor = 0; floor < 4; floor++) {
    const w = 7.2 - floor * 0.95;
    const h = 2.5;
    g.add(box(w, h, w * 0.76, bodyMat, 0, y + h / 2, 0));
    for (const sx of [-1, 1]) {
      for (let k = 0; k < 3; k++) {
        const win = box(0.7, 0.9, 0.1, windowMat, sx * (w * 0.24 + k * 0.85 - 0.85), y + 1.2, -w * 0.38 - 0.02);
        g.add(win);
      }
    }
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.2, w * 1.18, 1.1, 4), roofMat);
    roof.position.y = y + h + 0.35;
    roof.rotation.y = Math.PI / 4;
    g.add(roof);
    y += h + 0.95;
  }
  const spire = new THREE.Mesh(new THREE.ConeGeometry(0.28, 3.2, 4), roofMat);
  spire.position.y = y + 1.1;
  g.add(spire);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture(), color: 0xff7a3a, transparent: true, opacity: 0.24,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  halo.position.y = y;
  halo.scale.set(28, 28, 1);
  g.add(halo);
  scene.add(g);
  return g;
}

function makeFloatingRock(scene, x, y, z, s, rand) {
  const rockMat = mat(0x181624, { roughness: 0.98 });
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const top = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockMat);
  top.scale.set(1.25, 0.55, 0.95);
  top.rotation.set(rand() * 0.5, rand() * TAU, rand() * 0.3);
  top.castShadow = true;
  g.add(top);
  const bottom = new THREE.Mesh(new THREE.ConeGeometry(s * 0.9, s * 2.4, 6), rockMat);
  bottom.position.y = -s * 1.15;
  bottom.rotation.y = rand() * TAU;
  g.add(bottom);
  if (rand() > 0.45) {
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(s * 0.24, 0), new THREE.MeshStandardMaterial({
      color: 0x7a4dff, emissive: 0x6b3cff, emissiveIntensity: 1.4, roughness: 0.3, metalness: 0.4,
      transparent: true, opacity: 0.9,
    }));
    crystal.scale.y = 3.2;
    crystal.position.y = s * 0.6;
    g.add(crystal);
  }
  scene.add(g);
  return g;
}

function makeSwordMonument(scene) {
  const g = new THREE.Group();
  g.position.set(16, 0, -12);
  g.rotation.z = -0.18;
  const bladeMat = mat(0x1a1926, { roughness: 0.38, metalness: 0.72, emissive: 0x24124d, emissiveIntensity: 0.5 });
  const blade = box(1.3, 13, 0.28, bladeMat, 0, 6.0, 0);
  g.add(blade);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 12.4, 0.34), new THREE.MeshBasicMaterial({
    color: 0x8b62ff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending,
  }));
  edge.position.set(-0.7, 6, 0);
  g.add(edge);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.92, 1.8, 4), bladeMat);
  tip.position.y = 13.3;
  g.add(tip);
  const guard = box(4.4, 0.6, 0.8, mat(0x4b3c2d, { roughness: 0.45, metalness: 0.55, emissive: 0x1f140a, emissiveIntensity: 0.2 }), 0, 0.1, 0);
  g.add(guard);
  const grip = box(0.7, 3.0, 0.7, mat(0x241721, { roughness: 0.9 }), 0, -1.5, 0);
  g.add(grip);
  g.rotation.y = -0.35;
  scene.add(g);
  return g;
}

export function createWorld(scene, renderer) {
  scene.fog = new THREE.FogExp2(0x090614, 0.0072);
  scene.background = new THREE.Color(0x05060c);

  const { sky, uniforms: skyUniforms } = makeSky();
  scene.add(sky);

  const aurora1 = makeAurora(0x3d2cff, 0x53e8ff, 0.2);
  aurora1.mesh.position.set(-30, 56, -155);
  aurora1.mesh.rotation.x = -0.12;
  scene.add(aurora1.mesh);
  const aurora2 = makeAurora(0x8b2dff, 0xff4f8d, 4.7);
  aurora2.mesh.position.set(80, 72, -190);
  aurora2.mesh.scale.set(0.7, 0.8, 1);
  aurora2.mesh.rotation.z = -0.1;
  scene.add(aurora2.mesh);

  const moonTex = makeMoonTexture();
  const moon = new THREE.Mesh(new THREE.CircleGeometry(21, 64), new THREE.MeshBasicMaterial({
    map: moonTex, transparent: true, depthWrite: false, fog: false,
  }));
  moon.position.set(52, 30, -150);
  moon.lookAt(0, 5, 0);
  scene.add(moon);
  const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture(), color: 0xa69bff, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }));
  moonGlow.position.copy(moon.position);
  moonGlow.scale.set(110, 110, 1);
  scene.add(moonGlow);
  const moonRing = new THREE.Mesh(new THREE.RingGeometry(21.5, 22.1, 80), new THREE.MeshBasicMaterial({
    color: 0x9c88ff, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
  }));
  moonRing.position.copy(moon.position);
  moonRing.lookAt(0, 5, 0);
  scene.add(moonRing);

  // Lighting.
  const hemi = new THREE.HemisphereLight(0x7e75e8, 0x180c18, 1.02);
  scene.add(hemi);
  const moonLight = new THREE.DirectionalLight(0xb9c2ff, 2.15);
  moonLight.position.set(-24, 38, 20);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.set(1536, 1536);
  moonLight.shadow.camera.left = -34;
  moonLight.shadow.camera.right = 34;
  moonLight.shadow.camera.top = 34;
  moonLight.shadow.camera.bottom = -34;
  moonLight.shadow.camera.near = 1;
  moonLight.shadow.camera.far = 100;
  moonLight.shadow.bias = -0.0008;
  moonLight.shadow.normalBias = 0.03;
  scene.add(moonLight);
  const rim = new THREE.DirectionalLight(0x6f3fff, 1.1);
  rim.position.set(25, 14, -30);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xff7a4a, 0.45);
  fill.position.set(10, 8, 30);
  scene.add(fill);

  // Arena base.
  const stoneTex = makeStoneTexture();
  stoneTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const arenaSideMat = mat(0x171621, { roughness: 0.96 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(29, 30.5, 2.4, 16), arenaSideMat);
  base.position.y = -1.2;
  base.receiveShadow = true;
  base.castShadow = true;
  scene.add(base);
  const lower = new THREE.Mesh(new THREE.CylinderGeometry(28.5, 19, 8, 16), mat(0x0f0d18, { roughness: 1 }));
  lower.position.y = -6.2;
  scene.add(lower);
  const step = new THREE.Mesh(new THREE.CylinderGeometry(31, 31.4, 0.45, 16), mat(0x1f1c2c, { roughness: 0.95 }));
  step.position.y = -0.2;
  step.receiveShadow = true;
  scene.add(step);
  const groundMat = new THREE.MeshStandardMaterial({
    map: stoneTex, roughness: 0.9, metalness: 0.06, color: 0x8e8ba8,
  });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(28.6, 72), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.02;
  ground.receiveShadow = true;
  scene.add(ground);
  // Dark edge ring.
  const edgeRing = new THREE.Mesh(new THREE.RingGeometry(27.6, 28.65, 80), new THREE.MeshStandardMaterial({
    color: 0x1d1929, roughness: 0.75, metalness: 0.3, emissive: 0x1d0c37, emissiveIntensity: 0.4,
  }));
  edgeRing.rotation.x = -Math.PI / 2;
  edgeRing.position.y = 0.035;
  scene.add(edgeRing);

  // Central rune seal.
  const runeTex = makeRuneTexture();
  const runeMat = new THREE.MeshBasicMaterial({
    map: runeTex, transparent: true, opacity: 0.58, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide,
  });
  const rune = new THREE.Mesh(new THREE.CircleGeometry(13, 64), runeMat);
  rune.rotation.x = -Math.PI / 2;
  rune.position.y = 0.045;
  scene.add(rune);
  const rune2 = new THREE.Mesh(new THREE.CircleGeometry(9.4, 64), new THREE.MeshBasicMaterial({
    map: makeRuneTexture(1024, 17), transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide,
  }));
  rune2.rotation.x = -Math.PI / 2;
  rune2.position.y = 0.05;
  scene.add(rune2);
  const runeLight = new THREE.PointLight(0x7548ff, 38, 34, 2);
  runeLight.position.set(0, 2.2, 0);
  scene.add(runeLight);

  const barrierUniforms = { uTime: { value: 0 }, uOpacity: { value: 0.1 } };
  const barrierMat = new THREE.ShaderMaterial({
    uniforms: barrierUniforms,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      varying vec2 vUv; varying vec3 vPos;
      void main(){ vUv=uv; vPos=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
    `,
    fragmentShader: /* glsl */`
      varying vec2 vUv; varying vec3 vPos;
      uniform float uTime; uniform float uOpacity;
      float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      void main(){
        float fade = smoothstep(0.0,0.12,vUv.y) * (1.0-smoothstep(0.55,1.0,vUv.y));
        float scan = smoothstep(0.84,1.0,sin(vUv.y*190.0 - uTime*2.5)*0.5+0.5);
        float grid = step(0.97, max(sin(vUv.x*140.0)*0.5+0.5, sin(vUv.y*80.0)*0.5+0.5));
        float n = hash(vec2(floor(vUv.x*80.0), floor(vUv.y*16.0)+floor(uTime*3.0)));
        vec3 col = mix(vec3(0.32,0.15,0.75), vec3(0.4,0.86,1.0), vUv.y);
        float a = (fade*0.18 + scan*0.35 + grid*0.07 + step(0.992,n)*0.4) * uOpacity;
        gl_FragColor = vec4(col, a);
      }
    `,
  });
  const barrier = new THREE.Mesh(new THREE.CylinderGeometry(28.8, 28.8, 13, 80, 1, true), barrierMat);
  barrier.position.y = 6.5;
  scene.add(barrier);

  const flameTexture = makeGlowTexture();
  const torii = makeTorii(scene, flameTexture);

  // Pillars.
  const pillars = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.2;
    const p = makePillar(scene, Math.cos(a) * 24.8, Math.sin(a) * 24.8, -a, flameTexture);
    pillars.push(p);
  }
  // Torii gets two extra flames.
  const toriiFlames = [];

  const swordMonument = makeSwordMonument(scene);
  const rand = seeded(4421);
  const trees = [];
  const treePositions = [
    [-23.0, 13.0, 0.72], [23.2, 12.0, 0.68], [-17.0, 21.0, 0.72],
    [16.0, 21.0, 0.66], [-23.8, -8.5, 0.82], [24.0, -6.0, 0.78],
  ];
  for (const [x, z, s] of treePositions) trees.push(makeTree(scene, x, z, s, rand));

  // Crystals.
  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0x5330b8, emissive: 0x6438ee, emissiveIntensity: 0.85, roughness: 0.28,
    metalness: 0.35, transparent: true, opacity: 0.88, flatShading: true,
  });
  const crystals = [];
  const crystalSpots = [
    [-19, -8, 0.72], [21, -7, 0.8], [-13, -20, 0.9], [12, -21, 0.76],
    [-25, 3, 0.7], [25, 1, 0.66], [-8, -16, 0.62], [8, -24, 0.75],
    [-17, -14, 0.68], [17, -16, 0.72], [-23, -2, 0.6],
  ];
  for (let i = 0; i < crystalSpots.length; i++) {
    const [cx, cz, cs] = crystalSpots[i];
    const g = new THREE.Group();
    g.position.set(cx, 0, cz);
    g.scale.setScalar(cs);
    const count = 2 + Math.floor(rand() * 3);
    for (let k = 0; k < count; k++) {
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.25 + rand() * 0.42, 0), crystalMat);
      c.scale.y = 2.2 + rand() * 2.2;
      c.position.set((rand() - 0.5) * 0.85, 0.3 + c.scale.y * 0.18, (rand() - 0.5) * 0.85);
      c.rotation.z = (rand() - 0.5) * 0.4;
      c.castShadow = true;
      g.add(c);
    }
    const light = new THREE.PointLight(0x7d4dff, 3, 5.5, 2);
    light.position.y = 0.7;
    g.add(light);
    scene.add(g);
    crystals.push(g);
  }

  const pagoda = makePagoda(scene);
  const floatingRocks = [];
  const rockData = [
    [-70, 34, -88, 5], [56, 27, -82, 4], [78, 44, -130, 6], [-35, 25, -58, 3.2],
    [38, 18, -48, 2.4], [-92, 20, -40, 4.5], [8, 40, -110, 3.5], [96, 33, -70, 5],
  ];
  for (const [x, y, z, s] of rockData) floatingRocks.push(makeFloatingRock(scene, x, y, z, s, rand));

  // Distant mountain silhouettes.
  const mountainMat = new THREE.MeshBasicMaterial({ color: 0x100d1c, fog: true });
  for (let i = 0; i < 11; i++) {
    const a = -0.9 + i * 0.18;
    const r = 150 + rand() * 35;
    const h = 25 + rand() * 30;
    const m = new THREE.Mesh(new THREE.ConeGeometry(18 + rand() * 22, h, 4), mountainMat);
    m.position.set(Math.cos(a) * r, h * 0.5 - 8, Math.sin(a) * r);
    m.rotation.y = rand() * TAU;
    scene.add(m);
  }

  // Ground mist sprites.
  const mistTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(128, 128, 10, 128, 128, 128);
    g.addColorStop(0, 'rgba(118,92,190,.16)');
    g.addColorStop(0.5, 'rgba(80,60,140,.06)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  })();
  const mists = [];
  for (let i = 0; i < 9; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: mistTex, transparent: true, opacity: 0.38, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    const a = rand() * TAU;
    const r = 7 + rand() * 19;
    s.position.set(Math.cos(a) * r, 0.35 + rand() * 0.5, Math.sin(a) * r);
    s.scale.set(12 + rand() * 12, 3 + rand() * 2, 1);
    scene.add(s);
    mists.push({ sprite: s, a, r, speed: 0.02 + rand() * 0.03 });
  }

  // Falling petals.
  const petalTex = makePetalTexture();
  const petalCount = 320;
  const petalGeo = new THREE.BufferGeometry();
  const petalPos = new Float32Array(petalCount * 3);
  const petalData = [];
  for (let i = 0; i < petalCount; i++) {
    const a = rand() * TAU;
    const r = rand() * 34;
    petalPos[i * 3] = Math.cos(a) * r;
    petalPos[i * 3 + 1] = rand() * 18 + 1;
    petalPos[i * 3 + 2] = Math.sin(a) * r;
    petalData.push({ speed: 0.25 + rand() * 0.55, sway: rand() * TAU, swaySpeed: 0.5 + rand() * 1.2, drift: 0.2 + rand() * 0.5 });
  }
  petalGeo.setAttribute('position', new THREE.BufferAttribute(petalPos, 3));
  const petalMat = new THREE.PointsMaterial({
    map: petalTex, color: 0xffb5da, size: 0.34, transparent: true, opacity: 0.85,
    depthWrite: false, alphaTest: 0.05, sizeAttenuation: true,
  });
  const petals = new THREE.Points(petalGeo, petalMat);
  petals.frustumCulled = false;
  scene.add(petals);

  // Embers around arena.
  const emberCount = 160;
  const emberGeo = new THREE.BufferGeometry();
  const emberPos = new Float32Array(emberCount * 3);
  const emberData = [];
  for (let i = 0; i < emberCount; i++) {
    const a = rand() * TAU;
    const r = 14 + rand() * 14;
    emberPos[i * 3] = Math.cos(a) * r;
    emberPos[i * 3 + 1] = rand() * 7;
    emberPos[i * 3 + 2] = Math.sin(a) * r;
    emberData.push({ speed: 0.25 + rand() * 0.6, phase: rand() * TAU, baseX: emberPos[i * 3], baseZ: emberPos[i * 3 + 2] });
  }
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
  const emberMat = new THREE.PointsMaterial({
    map: flameTexture, color: 0xff7c46, size: 0.2, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  });
  const embers = new THREE.Points(emberGeo, emberMat);
  embers.frustumCulled = false;
  scene.add(embers);

  // Dust motes.
  const dustCount = 220;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(dustCount * 3);
  const dustData = [];
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (rand() - 0.5) * 56;
    dustPos[i * 3 + 1] = rand() * 9 + 0.4;
    dustPos[i * 3 + 2] = (rand() - 0.5) * 56;
    dustData.push({ phase: rand() * TAU, speed: 0.05 + rand() * 0.15, y: dustPos[i * 3 + 1] });
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    map: flameTexture, color: 0xb7a8ff, size: 0.07, transparent: true, opacity: 0.45,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  }));
  dust.frustumCulled = false;
  scene.add(dust);

  const bossMood = { active: false, amount: 0 };
  const baseFog = new THREE.Color(0x090614);
  const bossFog = new THREE.Color(0x1b0512);

  let time = 0;
  const update = (dt, playerPos, boundaryDanger = 0) => {
    time += dt;
    skyUniforms.uTime.value = time;
    aurora1.uniforms.uTime.value = time;
    aurora2.uniforms.uTime.value = time;
    rune.rotation.z += dt * 0.035;
    rune2.rotation.z -= dt * 0.055;
    runeMat.opacity = 0.5 + Math.sin(time * 1.4) * 0.1;
    runeLight.intensity = 32 + Math.sin(time * 2.1) * 8;
    barrierUniforms.uTime.value = time;
    barrierUniforms.uOpacity.value += (0.08 + boundaryDanger * 0.9 - barrierUniforms.uOpacity.value) * Math.min(1, dt * 4);
    // Torii lantern flicker.
    torii.children.forEach(c => {
      if (c.isSprite) c.material.opacity = 0.38 + Math.sin(time * 7 + c.position.x) * 0.08;
    });
    pillars.forEach((p, i) => {
      p.flame.scale.y = 2.1 + Math.sin(time * 8 + i * 2.1) * 0.25;
      p.light.intensity = 5.5 + Math.sin(time * 9 + i) * 1.4;
    });
    // Crystals pulse.
    crystals.forEach((g, i) => {
      g.rotation.y += dt * (0.05 + i * 0.004);
      g.children.forEach(c => { if (c.isPointLight) c.intensity = 3 + Math.sin(time * 2 + i) * 1.2; });
    });
    floatingRocks.forEach((g, i) => {
      g.position.y += Math.sin(time * 0.35 + i * 1.7) * dt * 0.16;
      g.rotation.y += dt * 0.006 * (i % 2 ? 1 : -1);
    });
    pagoda.position.y = 15 + Math.sin(time * 0.28) * 0.4;
    // Petals.
    const pp = petalGeo.attributes.position.array;
    for (let i = 0; i < petalCount; i++) {
      const d = petalData[i];
      pp[i * 3 + 1] -= d.speed * dt;
      pp[i * 3] += Math.sin(time * d.swaySpeed + d.sway) * d.drift * dt;
      pp[i * 3 + 2] += Math.cos(time * d.swaySpeed * 0.7 + d.sway) * d.drift * dt * 0.6;
      if (pp[i * 3 + 1] < 0.15) {
        pp[i * 3 + 1] = 15 + Math.random() * 4;
        const a = Math.random() * TAU;
        const r = 3 + Math.random() * 28;
        pp[i * 3] = Math.cos(a) * r;
        pp[i * 3 + 2] = Math.sin(a) * r;
      }
    }
    petalGeo.attributes.position.needsUpdate = true;
    // Embers.
    const ep = emberGeo.attributes.position.array;
    for (let i = 0; i < emberCount; i++) {
      const d = emberData[i];
      ep[i * 3 + 1] += d.speed * dt;
      ep[i * 3] += Math.sin(time * 0.7 + d.phase) * 0.12 * dt;
      if (ep[i * 3 + 1] > 8) {
        ep[i * 3 + 1] = 0.1;
        const a = Math.random() * TAU;
        const r = 12 + Math.random() * 16;
        ep[i * 3] = Math.cos(a) * r;
        ep[i * 3 + 2] = Math.sin(a) * r;
      }
    }
    emberGeo.attributes.position.needsUpdate = true;
    // Dust.
    const dp = dustGeo.attributes.position.array;
    for (let i = 0; i < dustCount; i++) {
      const d = dustData[i];
      dp[i * 3 + 1] = d.y + Math.sin(time * d.speed * 3 + d.phase) * 0.5;
      dp[i * 3] += Math.sin(time * 0.13 + d.phase) * 0.02 * dt;
    }
    dustGeo.attributes.position.needsUpdate = true;
    // Mist drift.
    mists.forEach((m, i) => {
      m.a += dt * m.speed;
      m.sprite.position.x = Math.cos(m.a) * m.r;
      m.sprite.position.z = Math.sin(m.a) * m.r;
      m.sprite.material.opacity = 0.22 + Math.sin(time * 0.5 + i) * 0.08;
    });
    // Boss mood.
    bossMood.amount += ((bossMood.active ? 1 : 0) - bossMood.amount) * Math.min(1, dt * 1.8);
    scene.fog.color.copy(baseFog).lerp(bossFog, bossMood.amount);
    hemi.color.setHex(0x7e75e8).lerp(new THREE.Color(0xc03b5c), bossMood.amount * 0.55);
    rim.color.setHex(0x6f3fff).lerp(new THREE.Color(0xff2747), bossMood.amount);
    rim.intensity = 1.1 + bossMood.amount * 0.9;
    runeLight.color.setHex(0x7548ff).lerp(new THREE.Color(0xff2957), bossMood.amount);
    if (playerPos) {
      // Keep the moon-facing atmosphere anchored; nothing needed yet.
    }
  };

  const setBossMood = (active) => { bossMood.active = active; };

  return {
    update, setBossMood, torii, pillars, rune, rune2, moon, moonGlow,
    get time() { return time; },
  };
}
