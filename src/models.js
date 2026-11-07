import * as THREE from 'three';

const TAU = Math.PI * 2;

export function mat(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.7,
    metalness: options.metalness ?? 0.08,
    flatShading: options.flatShading ?? true,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    side: options.side ?? THREE.FrontSide,
    depthWrite: options.depthWrite ?? true,
    map: options.map ?? null,
    alphaTest: options.alphaTest ?? 0,
  });
}

export function box(w, h, d, material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function cylinder(rt, rb, h, seg, material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function cone(r, h, seg, material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeFaceTexture(mode = 'hunter') {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = mode === 'hunter' ? '#d7b09a' : '#9d8072';
  ctx.fillRect(0, 0, 128, 128);
  // Hair shadow at top.
  ctx.fillStyle = '#161421';
  ctx.fillRect(0, 0, 128, 23);
  ctx.beginPath();
  ctx.moveTo(0, 23); ctx.lineTo(26, 35); ctx.lineTo(43, 16); ctx.lineTo(67, 37);
  ctx.lineTo(92, 17); ctx.lineTo(108, 34); ctx.lineTo(128, 22); ctx.lineTo(128, 0); ctx.lineTo(0, 0);
  ctx.fill();
  // Eyes.
  ctx.shadowColor = mode === 'hunter' ? '#8be8ff' : '#ff3f5f';
  ctx.shadowBlur = 12;
  ctx.fillStyle = mode === 'hunter' ? '#8be8ff' : '#ff3f5f';
  ctx.fillRect(29, 57, 20, 7);
  ctx.fillRect(79, 57, 20, 7);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#1b1722';
  ctx.fillRect(35, 59, 8, 3);
  ctx.fillRect(85, 59, 8, 3);
  // Lower mask / mouth.
  if (mode === 'hunter') {
    ctx.fillStyle = '#232132';
    ctx.beginPath();
    ctx.moveTo(24, 82); ctx.quadraticCurveTo(64, 96, 104, 82); ctx.lineTo(105, 128);
    ctx.lineTo(23, 128); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#655c86'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(39, 88); ctx.lineTo(89, 88); ctx.stroke();
    ctx.fillStyle = '#9b7bff'; ctx.fillRect(59, 91, 10, 2);
  } else {
    ctx.fillStyle = '#301a20';
    ctx.fillRect(47, 88, 34, 5);
    ctx.fillStyle = '#f0d4c2';
    ctx.fillRect(54, 88, 4, 5);
    ctx.fillRect(70, 88, 4, 5);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function glowMaterial(color, opacity = 0.8) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function makeSword({ color = 0x9d7bff, length = 2.8, width = 0.12, guardColor = 0xc7a96b } = {}) {
  const group = new THREE.Group();
  const bladeMat = mat(0x12121e, { metalness: 0.75, roughness: 0.24, emissive: color, emissiveIntensity: 0.55 });
  const edgeMat = glowMaterial(color, 0.95);
  const blade = box(width, length, 0.055, bladeMat, 0, -length * 0.48, 0);
  group.add(blade);
  const edge = box(width * 1.5, length * 0.98, 0.025, edgeMat, 0, -length * 0.48, 0.04);
  group.add(edge);
  const edge2 = edge.clone();
  edge2.position.z = -0.04;
  group.add(edge2);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(width * 0.72, 0.32, 4), bladeMat);
  tip.position.set(0, -length * 0.98, 0);
  tip.rotation.z = Math.PI;
  group.add(tip);
  const guard = box(width * 4.2, 0.075, 0.2, mat(guardColor, { metalness: 0.75, roughness: 0.28, emissive: color, emissiveIntensity: 0.25 }), 0, -0.02, 0);
  group.add(guard);
  const grip = box(0.14, 0.55, 0.15, mat(0x191521, { roughness: 0.9 }), 0, 0.3, 0);
  group.add(grip);
  const pommel = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), glowMaterial(color, 0.9));
  pommel.position.y = 0.6;
  group.add(pommel);
  const baseMarker = new THREE.Object3D();
  baseMarker.position.y = -0.2;
  group.add(baseMarker);
  const tipMarker = new THREE.Object3D();
  tipMarker.position.y = -length;
  group.add(tipMarker);
  group.userData = { baseMarker, tipMarker, blade, edgeMat, bladeMat };
  return group;
}

function makeCape(color = 0x1a142d, glow = 0x5a3c9e) {
  const geo = new THREE.PlaneGeometry(1.5, 1.9, 7, 10);
  const material = mat(color, {
    roughness: 0.92,
    side: THREE.DoubleSide,
    emissive: glow,
    emissiveIntensity: 0.08,
  });
  material.transparent = true;
  material.opacity = 0.94;
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(0, 2.02, 0.47);
  mesh.rotation.x = 0.08;
  mesh.castShadow = true;
  mesh.userData.base = geo.attributes.position.array.slice();
  return mesh;
}

function animateCape(cape, time, speed, attackLean = 0) {
  if (!cape) return;
  const pos = cape.geometry.attributes.position;
  const base = cape.userData.base;
  for (let i = 0; i < pos.count; i++) {
    const bx = base[i * 3];
    const by = base[i * 3 + 1];
    const fall = Math.max(0, (0.95 - by) * 0.7);
    const sway = Math.sin(time * 2.7 + by * 3.4 + bx * 2.2) * (0.035 + speed * 0.028) * fall;
    const lift = Math.sin(time * 2.1 + bx * 4) * 0.02 * fall + speed * 0.07 * fall;
    pos.setX(i, bx + sway);
    pos.setZ(i, base[i * 3 + 2] + lift + attackLean * fall);
  }
  pos.needsUpdate = true;
}

function addGlowEyes(group, y, z, spread, color = 0x9fe8ff, scale = 1) {
  const eyeMat = glowMaterial(color, 1);
  const eyeGeo = new THREE.BoxGeometry(0.14 * scale, 0.05 * scale, 0.025);
  const left = new THREE.Mesh(eyeGeo, eyeMat);
  left.position.set(-spread, y, z);
  const right = left.clone();
  right.position.x = spread;
  group.add(left, right);
  const haloMat = glowMaterial(color, 0.28);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(0.8 * scale, 0.35 * scale), haloMat);
  halo.position.set(0, y, z - 0.01);
  group.add(halo);
  return { left, right, halo };
}

export function createHunter() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const cloth = mat(0x202440, { roughness: 0.78, emissive: 0x090a1a, emissiveIntensity: 0.35 });
  const clothLight = mat(0x31375f, { roughness: 0.72, emissive: 0x0d0a22, emissiveIntensity: 0.4 });
  const leather = mat(0x3b2a45, { roughness: 0.88 });
  const metal = mat(0x4a5070, { roughness: 0.34, metalness: 0.62, emissive: 0x1d1642, emissiveIntensity: 0.5 });
  const accent = mat(0x7d5cff, { roughness: 0.4, metalness: 0.3, emissive: 0x6d42ff, emissiveIntensity: 0.6 });
  const gold = mat(0xb38a49, { roughness: 0.4, metalness: 0.55, emissive: 0x2a1906, emissiveIntensity: 0.2 });

  const torso = box(1.5, 1.55, 0.82, cloth, 0, 2.325, 0);
  body.add(torso);
  const chest = box(1.18, 0.82, 0.12, clothLight, 0, 2.48, -0.47);
  body.add(chest);
  const chestPlate = box(1.25, 0.18, 0.1, metal, 0, 2.77, -0.48);
  body.add(chestPlate);
  const belt = box(1.56, 0.16, 0.9, leather, 0, 1.63, 0);
  body.add(belt);
  const buckle = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), accent);
  buckle.position.set(0, 1.63, -0.48);
  body.add(buckle);
  // Monarch sigil and coat seams visible from behind.
  const backStripe = box(0.065, 1.22, 0.035, accent, 0, 2.35, 0.445);
  body.add(backStripe);
  const sigil = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), accent);
  sigil.position.set(0, 2.52, 0.48);
  sigil.scale.y = 1.65;
  body.add(sigil);
  const seamL = box(0.045, 0.82, 0.035, metal, -0.53, 2.12, 0.43);
  seamL.rotation.z = 0.18;
  const seamR = seamL.clone();
  seamR.position.x = 0.53;
  seamR.rotation.z = -0.18;
  body.add(seamL, seamR);
  const coatTailL = box(0.62, 1.25, 0.12, cloth, -0.42, 1.08, 0.37);
  coatTailL.rotation.x = -0.08;
  const coatTailR = coatTailL.clone();
  coatTailR.position.x = 0.42;
  body.add(coatTailL, coatTailR);

  // Shoulder armor.
  for (const side of [-1, 1]) {
    const pad = box(0.62, 0.25, 0.82, metal, side * 0.94, 2.82, 0);
    pad.rotation.z = side * -0.13;
    body.add(pad);
    const trim = box(0.64, 0.06, 0.84, accent, side * 0.94, 2.7, 0);
    trim.rotation.z = side * -0.13;
    body.add(trim);
  }

  // Neck and head.
  body.add(box(0.48, 0.2, 0.48, leather, 0, 3.18, 0));
  const headMats = [
    cloth, cloth, cloth, cloth,
    cloth,
    new THREE.MeshStandardMaterial({ map: makeFaceTexture('hunter'), roughness: 0.86, flatShading: true }),
  ];
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.94, 0.92), headMats);
  head.position.y = 3.69;
  head.castShadow = true;
  head.receiveShadow = true;
  body.add(head);

  // Hair / hood.
  const hair = box(1.02, 0.34, 1.0, mat(0x11111b, { roughness: 0.95 }), 0, 4.12, 0.02);
  body.add(hair);
  const fringe = box(0.9, 0.18, 0.1, mat(0x151522, { roughness: 0.95 }), 0, 3.99, -0.48);
  body.add(fringe);
  const fringeSide = box(0.16, 0.52, 0.12, mat(0x151522, { roughness: 0.95 }), -0.39, 3.82, -0.47);
  fringeSide.rotation.z = -0.18;
  body.add(fringeSide);
  const fringeSide2 = fringeSide.clone();
  fringeSide2.position.x = 0.39;
  fringeSide2.rotation.z = 0.18;
  body.add(fringeSide2);

  // Scarf.
  const scarf = box(0.95, 0.18, 0.92, accent, 0, 3.16, 0);
  body.add(scarf);
  const scarfTail = box(0.3, 0.8, 0.1, accent, 0.48, 2.75, 0.44);
  scarfTail.rotation.z = 0.14;
  body.add(scarfTail);

  // Arms.
  const leftArm = new THREE.Group();
  leftArm.position.set(-1.04, 2.78, 0);
  const leftUpper = box(0.46, 1.28, 0.46, cloth, 0, -0.61, 0);
  const leftHand = box(0.48, 0.28, 0.5, leather, 0, -1.34, 0);
  leftArm.add(leftUpper, leftHand);
  const rightArm = new THREE.Group();
  rightArm.position.set(1.04, 2.78, 0);
  const rightUpper = box(0.46, 1.28, 0.46, cloth, 0, -0.61, 0);
  const rightHand = box(0.5, 0.3, 0.52, leather, 0, -1.35, 0);
  rightArm.add(rightUpper, rightHand);
  body.add(leftArm, rightArm);

  // Sword.
  const sword = makeSword({ color: 0x9d7bff, length: 2.85, width: 0.115 });
  sword.position.set(0, -1.38, 0);
  sword.rotation.x = -0.06;
  rightArm.add(sword);
  const swordGlow = new THREE.PointLight(0x7f5bff, 1.2, 3.5, 2);
  swordGlow.position.y = -1.5;
  sword.add(swordGlow);

  // Legs.
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.4, 1.55, 0);
  leftLeg.add(box(0.58, 1.42, 0.64, cloth, 0, -0.7, 0));
  leftLeg.add(box(0.62, 0.22, 0.78, leather, 0, -1.44, -0.06));
  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.4, 1.55, 0);
  rightLeg.add(box(0.58, 1.42, 0.64, cloth, 0, -0.7, 0));
  rightLeg.add(box(0.62, 0.22, 0.78, leather, 0, -1.44, -0.06));
  body.add(leftLeg, rightLeg);

  // Cape and floor aura.
  const cape = makeCape();
  body.add(cape);
  const auraMat = new THREE.MeshBasicMaterial({
    color: 0x6d47ff, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide,
  });
  const aura = new THREE.Mesh(new THREE.RingGeometry(0.45, 1.1, 40), auraMat);
  aura.rotation.x = -Math.PI / 2;
  aura.position.y = 0.03;
  root.add(aura);
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.85, 28), new THREE.MeshBasicMaterial({
    color: 0x03030a, transparent: true, opacity: 0.42, depthWrite: false,
  }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.015;
  root.add(blob);

  root.userData.rig = {
    body, torso, head, leftArm, rightArm, leftLeg, rightLeg, cape, sword,
    swordGlow, aura, blob,
    baseMarkers: sword.userData,
    time: 0,
    attack: null,
    walk: 0,
  };
  return root;
}

export function animateHunter(rig, dt, opts = {}) {
  if (!rig) return;
  rig.time += dt;
  const time = rig.time;
  const speed = Math.min(1.6, opts.speed || 0);
  const move = Math.min(1, speed / 6);
  rig.walk += dt * (2.2 + speed * 1.25);
  const swing = Math.sin(rig.walk) * 0.6 * move;
  const bob = Math.abs(Math.sin(rig.walk)) * 0.06 * move;
  const breathe = Math.sin(time * 1.8) * 0.014;

  rig.body.position.y = bob + breathe;
  rig.body.rotation.z = Math.sin(rig.walk * 0.5) * 0.025 * move;
  rig.body.rotation.x = move * 0.05 + (opts.lean || 0);
  rig.head.rotation.y = Math.sin(time * 0.6) * 0.045;
  rig.head.rotation.x = -move * 0.04;

  rig.leftLeg.rotation.x = swing;
  rig.rightLeg.rotation.x = -swing;
  rig.leftArm.rotation.x = -swing * 0.78;
  rig.rightArm.rotation.x = swing * 0.5;
  rig.leftArm.rotation.z = -0.04;
  rig.rightArm.rotation.z = 0.04;
  rig.leftArm.rotation.y = 0;
  rig.rightArm.rotation.y = 0;
  rig.torso.rotation.y = 0;
  rig.torso.rotation.z = 0;

  const attack = opts.attack;
  if (attack) {
    const p = Math.min(1, attack.t / attack.dur);
    const windup = Math.min(1, p / 0.26);
    const strike = p < 0.26 ? 0 : Math.min(1, (p - 0.26) / 0.36);
    const recover = p < 0.62 ? 0 : (p - 0.62) / 0.38;
    const s = Math.sin(strike * Math.PI * 0.92) * (1 - recover * 0.85);
    const combo = attack.combo || 1;
    if (combo === 1) {
      rig.rightArm.rotation.x = -0.15 - windup * 0.9 - s * 2.0;
      rig.rightArm.rotation.z = 0.08 + s * 0.55;
      rig.torso.rotation.y = -windup * 0.38 + s * 0.55;
      rig.torso.rotation.z = -s * 0.12;
      rig.body.rotation.x += -s * 0.12;
    } else if (combo === 2) {
      rig.rightArm.rotation.x = -0.2 - s * 1.65;
      rig.rightArm.rotation.y = windup * 0.55 - s * 1.35;
      rig.torso.rotation.y = windup * 0.5 - s * 0.85;
      rig.body.rotation.x += s * 0.05;
    } else {
      rig.rightArm.rotation.x = -0.2 - windup * 2.6 + s * 1.2;
      rig.rightArm.rotation.z = -0.1 + s * 0.25;
      rig.torso.rotation.x = -windup * 0.16 + s * 0.24;
      rig.torso.rotation.y = -s * 0.3;
      rig.body.rotation.x += s * 0.18;
    }
    rig.leftArm.rotation.x += s * 0.4;
    rig.leftArm.rotation.z = -0.15 - s * 0.15;
  }

  if (opts.cast) {
    const c = opts.cast;
    const p = Math.min(1, c.t / c.dur);
    const wave = Math.sin(p * Math.PI);
    rig.leftArm.rotation.x = -1.6 * wave;
    rig.leftArm.rotation.z = -0.8 * wave;
    rig.rightArm.rotation.x = -1.1 * wave;
    rig.rightArm.rotation.z = 0.6 * wave;
    rig.body.rotation.x = -0.08 * wave;
    rig.head.rotation.x = -0.18 * wave;
  }
  if (opts.hurt > 0) {
    rig.body.rotation.x -= opts.hurt * 0.24;
    rig.body.rotation.z += Math.sin(time * 50) * 0.08 * opts.hurt;
  }
  if (opts.dead) {
    rig.body.rotation.z = Math.min(1.4, (opts.deadTime || 0) * 2.6);
    rig.body.position.y = Math.max(-0.4, -(opts.deadTime || 0) * 0.5);
  }
  rig.aura.material.opacity = 0.13 + Math.sin(time * 2.2) * 0.05 + (opts.auraBoost || 0) * 0.2;
  rig.aura.rotation.z += dt * 0.6;
  rig.aura.scale.setScalar(1 + Math.sin(time * 1.7) * 0.04 + (opts.auraBoost || 0) * 0.2);
  animateCape(rig.cape, time, speed, attack ? 0.18 : 0);
}

export function getSwordPoints(rig) {
  const { baseMarker, tipMarker } = rig.baseMarkers;
  const base = new THREE.Vector3();
  const tip = new THREE.Vector3();
  baseMarker.getWorldPosition(base);
  tipMarker.getWorldPosition(tip);
  return { base, tip };
}

function darkEnemyMat(color, emissive = 0x190a16, intensity = 0.2) {
  return mat(color, { roughness: 0.83, metalness: 0.1, emissive, emissiveIntensity: intensity });
}

export function createEnemyModel(type, tier = 0) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const rig = { body, type, time: Math.random() * 10, phase: Math.random() * TAU, materials: [] };

  const collect = () => root.traverse(o => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach(m => {
      if (!m || m.userData.__flash) return;
      m.userData.__flash = true;
      rig.materials.push({ m, emissive: m.emissive ? m.emissive.clone() : null, intensity: m.emissiveIntensity || 0 });
    });
  });

  if (type === 'imp') {
    const skin = darkEnemyMat(tier ? 0x432036 : 0x2a1b2e, 0x3b0c24, 0.35);
    const dark = darkEnemyMat(0x17101d, 0x1e0616, 0.2);
    const bone = mat(0xb9a8a0, { roughness: 0.8, emissive: 0x2b1118, emissiveIntensity: 0.2 });
    body.add(box(0.9, 0.9, 0.7, skin, 0, 1.25, 0));
    const head = box(0.8, 0.7, 0.76, skin, 0, 2.0, -0.08);
    body.add(head);
    const hornMat = mat(0x161018, { roughness: 0.5, metalness: 0.2 });
    const hornL = cone(0.13, 0.58, 5, hornMat, -0.32, 2.46, -0.02);
    hornL.rotation.z = 0.32;
    const hornR = hornL.clone(); hornR.position.x = 0.32; hornR.rotation.z = -0.32;
    body.add(hornL, hornR);
    addGlowEyes(body, 2.06, -0.47, 0.2, 0xff3d52, 1);
    const mouth = box(0.4, 0.08, 0.04, mat(0x13080c, { emissive: 0xff2c47, emissiveIntensity: 0.6 }), 0, 1.82, -0.47);
    body.add(mouth);
    const armL = new THREE.Group(); armL.position.set(-0.6, 1.55, 0);
    const armR = new THREE.Group(); armR.position.set(0.6, 1.55, 0);
    armL.add(box(0.3, 0.9, 0.3, skin, 0, -0.4, 0));
    armR.add(box(0.3, 0.9, 0.3, skin, 0, -0.4, 0));
    const clawL = cone(0.12, 0.4, 4, bone, 0, -0.94, 0); clawL.rotation.x = Math.PI;
    const clawR = clawL.clone();
    armL.add(clawL); armR.add(clawR);
    body.add(armL, armR);
    const legL = new THREE.Group(); legL.position.set(-0.26, 0.86, 0);
    const legR = new THREE.Group(); legR.position.set(0.26, 0.86, 0);
    legL.add(box(0.34, 0.7, 0.4, dark, 0, -0.32, 0));
    legR.add(box(0.34, 0.7, 0.4, dark, 0, -0.32, 0));
    body.add(legL, legR);
    const tail = cone(0.1, 0.85, 5, dark, 0, 1.22, 0.52);
    tail.rotation.x = -1.1;
    body.add(tail);
    rig.head = head; rig.leftArm = armL; rig.rightArm = armR; rig.leftLeg = legL; rig.rightLeg = legR;
    rig.height = 2.8;
    rig.scale = tier ? 1.35 : 1;
  } else if (type === 'swordsman') {
    const armor = darkEnemyMat(tier ? 0x30263f : 0x211b2b, 0x2a0820, 0.25);
    const cloth = darkEnemyMat(0x17131f, 0x180515, 0.15);
    const red = mat(0x8f2239, { roughness: 0.7, emissive: 0x6b0d20, emissiveIntensity: 0.55 });
    body.add(box(1.2, 1.35, 0.68, armor, 0, 1.9, 0));
    const chest = box(1.22, 0.18, 0.72, red, 0, 2.18, 0);
    body.add(chest);
    const head = box(0.78, 0.75, 0.72, darkEnemyMat(0x3b2d33, 0x250713, 0.2), 0, 2.98, 0);
    body.add(head);
    addGlowEyes(body, 3.0, -0.38, 0.19, 0xff405d, 0.9);
    const hat = cylinder(0.18, 0.72, 0.14, 8, mat(0x2c241f, { roughness: 0.95 }), 0, 3.45, 0);
    body.add(hat);
    const hatTop = cylinder(0.15, 0.2, 0.22, 8, mat(0x2c241f, { roughness: 0.95 }), 0, 3.6, 0);
    body.add(hatTop);
    const armL = new THREE.Group(); armL.position.set(-0.85, 2.4, 0);
    const armR = new THREE.Group(); armR.position.set(0.85, 2.4, 0);
    armL.add(box(0.36, 1.15, 0.4, armor, 0, -0.52, 0));
    armR.add(box(0.36, 1.15, 0.4, armor, 0, -0.52, 0));
    body.add(armL, armR);
    const legL = new THREE.Group(); legL.position.set(-0.32, 1.24, 0);
    const legR = new THREE.Group(); legR.position.set(0.32, 1.24, 0);
    legL.add(box(0.42, 1.2, 0.5, cloth, 0, -0.58, 0));
    legR.add(box(0.42, 1.2, 0.5, cloth, 0, -0.58, 0));
    body.add(legL, legR);
    const sword = makeSword({ color: 0xff415f, length: 2.35, width: 0.1, guardColor: 0x8a2538 });
    sword.position.set(0, -1.13, 0);
    sword.rotation.x = -0.08;
    armR.add(sword);
    rig.head = head; rig.leftArm = armL; rig.rightArm = armR; rig.leftLeg = legL; rig.rightLeg = legR;
    rig.sword = sword;
    rig.height = 3.65;
    rig.scale = tier ? 1.25 : 1;
  } else if (type === 'hound') {
    const hide = darkEnemyMat(0x231b2a, 0x2a0719, 0.24);
    const dark = darkEnemyMat(0x120e16, 0x160312, 0.18);
    const bodyMesh = box(1.25, 0.72, 1.85, hide, 0, 1.15, 0);
    body.add(bodyMesh);
    const head = box(0.72, 0.62, 0.8, hide, 0, 1.34, -1.1);
    body.add(head);
    const snout = box(0.42, 0.34, 0.46, dark, 0, 1.22, -1.62);
    body.add(snout);
    addGlowEyes(body, 1.46, -1.46, 0.2, 0xff334e, 0.8);
    for (let i = 0; i < 5; i++) {
      const spike = cone(0.12, 0.45, 4, mat(0x332337, { roughness: 0.7 }), 0, 1.58, 0.55 - i * 0.32);
      spike.rotation.x = 0.2;
      body.add(spike);
    }
    const legs = [];
    [[-0.52, -0.68], [0.52, -0.68], [-0.52, 0.65], [0.52, 0.65]].forEach(([x, z]) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.88, z);
      pivot.add(box(0.26, 0.86, 0.3, dark, 0, -0.42, 0));
      body.add(pivot);
      legs.push(pivot);
    });
    rig.head = head; rig.legs = legs; rig.height = 2.05; rig.scale = tier ? 1.35 : 1;
  } else {
    // Boss: abyss general.
    const armor = darkEnemyMat(0x191421, 0x3d071d, 0.3);
    const black = darkEnemyMat(0x0f0c15, 0x16030f, 0.25);
    const red = mat(0x9c1c37, { roughness: 0.5, metalness: 0.3, emissive: 0x9c0b2d, emissiveIntensity: 0.75 });
    const bone = mat(0xc0ae9c, { roughness: 0.7, emissive: 0x3b1218, emissiveIntensity: 0.3 });
    body.add(box(1.65, 1.8, 0.98, armor, 0, 2.55, 0));
    body.add(box(1.7, 0.24, 1.02, red, 0, 2.92, 0));
    body.add(box(1.15, 0.5, 1.04, black, 0, 1.68, 0));
    const head = box(1.03, 0.98, 0.95, black, 0, 3.86, 0);
    body.add(head);
    addGlowEyes(body, 3.88, -0.5, 0.25, 0xff2848, 1.3);
    const horns = [];
    for (const side of [-1, 1]) {
      const horn = cone(0.14, 1.0, 5, bone, side * 0.55, 4.5, 0.02);
      horn.rotation.z = side * -0.35;
      body.add(horn); horns.push(horn);
    }
    const crown = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), glowMaterial(0xff2949, 0.95));
    crown.position.set(0, 4.52, 0);
    body.add(crown);
    const armL = new THREE.Group(); armL.position.set(-1.18, 3.25, 0);
    const armR = new THREE.Group(); armR.position.set(1.18, 3.25, 0);
    armL.add(box(0.55, 1.5, 0.58, armor, 0, -0.7, 0));
    armR.add(box(0.55, 1.5, 0.58, armor, 0, -0.7, 0));
    armL.add(box(0.68, 0.25, 0.72, red, 0, -0.16, 0));
    armR.add(box(0.68, 0.25, 0.72, red, 0, -0.16, 0));
    body.add(armL, armR);
    const legL = new THREE.Group(); legL.position.set(-0.46, 1.62, 0);
    const legR = new THREE.Group(); legR.position.set(0.46, 1.62, 0);
    legL.add(box(0.6, 1.5, 0.72, black, 0, -0.72, 0));
    legR.add(box(0.6, 1.5, 0.72, black, 0, -0.72, 0));
    body.add(legL, legR);
    const cape = makeCape(0x180b1e, 0x7b0e28);
    cape.scale.set(1.9, 1.65, 1);
    cape.position.set(0, 2.65, 0.57);
    body.add(cape);
    const sword = makeSword({ color: 0xff2545, length: 4.2, width: 0.2, guardColor: 0x6f1c2e });
    sword.position.set(0, -1.5, 0);
    sword.rotation.x = -0.12;
    armR.add(sword);
    rig.head = head; rig.leftArm = armL; rig.rightArm = armR; rig.leftLeg = legL; rig.rightLeg = legR;
    rig.cape = cape; rig.sword = sword; rig.horns = horns; rig.crown = crown;
    rig.height = 5.5; rig.scale = 1;
  }

  root.scale.setScalar(rig.scale || 1);
  collect();
  root.userData.rig = rig;
  return root;
}

export function animateEnemy(rig, dt, opts = {}) {
  if (!rig) return;
  rig.time += dt;
  const t = rig.time;
  const speed = opts.speed || 0;
  const walk = Math.min(1, speed / 3.5);
  const cycle = t * (2.2 + speed * 0.8);
  const attack = opts.attack;
  const p = attack ? Math.min(1, attack.t / attack.dur) : 0;
  const s = attack ? Math.sin(Math.min(1, p * 1.3) * Math.PI) : 0;

  if (rig.type === 'hound') {
    rig.body.position.y = Math.abs(Math.sin(cycle * 2)) * 0.08 * walk;
    rig.body.rotation.x = attack ? -s * 0.35 : Math.sin(cycle) * 0.03 * walk;
    rig.legs.forEach((leg, i) => {
      leg.rotation.x = Math.sin(cycle + (i % 2) * Math.PI + (i > 1 ? Math.PI : 0)) * 0.55 * walk + (attack ? -s * 0.6 : 0);
    });
    if (rig.head) rig.head.rotation.x = attack ? s * 0.35 : 0;
    return;
  }

  const bob = Math.abs(Math.sin(cycle)) * 0.055 * walk;
  rig.body.position.y = bob;
  rig.body.rotation.z = Math.sin(cycle * 0.5) * 0.02 * walk;
  if (rig.legs) {
    rig.legs.forEach((leg, i) => leg.rotation.x = Math.sin(cycle + (i % 2) * Math.PI + (i > 1 ? Math.PI : 0)) * 0.45 * walk);
  } else {
    if (rig.leftLeg) rig.leftLeg.rotation.x = Math.sin(cycle) * 0.45 * walk;
    if (rig.rightLeg) rig.rightLeg.rotation.x = -Math.sin(cycle) * 0.45 * walk;
  }
  if (rig.leftArm) rig.leftArm.rotation.x = -Math.sin(cycle) * 0.3 * walk;
  if (rig.rightArm) {
    rig.rightArm.rotation.x = Math.sin(cycle) * 0.2 * walk;
    rig.rightArm.rotation.z = 0;
  }
  if (rig.head) rig.head.rotation.y = Math.sin(t * 0.8) * 0.08;
  if (rig.horns) rig.horns.forEach((h, i) => h.rotation.z = (i ? -1 : 1) * (-0.35 + Math.sin(t * 1.4) * 0.03));
  if (rig.crown) rig.crown.rotation.y += dt * 0.8;

  if (attack) {
    const wind = Math.min(1, p / 0.32);
    const strike = p < 0.32 ? 0 : Math.min(1, (p - 0.32) / 0.3);
    const ss = Math.sin(strike * Math.PI * 0.9);
    if (rig.type === 'boss') {
      if (rig.rightArm) {
        rig.rightArm.rotation.x = -0.2 - wind * 1.7 - ss * 1.4;
        rig.rightArm.rotation.z = -0.08 + ss * 0.5;
      }
      if (rig.leftArm) rig.leftArm.rotation.x = -0.1 - wind * 0.6;
      rig.body.rotation.y = -wind * 0.45 + ss * 0.7;
      rig.body.rotation.x = -ss * 0.12;
    } else if (rig.sword && rig.rightArm) {
      rig.rightArm.rotation.x = -0.2 - wind * 1.5 - ss * 1.9;
      rig.rightArm.rotation.y = -ss * 0.55;
      rig.body.rotation.y = -wind * 0.25 + ss * 0.45;
    } else {
      if (rig.leftArm) rig.leftArm.rotation.x = -1.7 * ss;
      if (rig.rightArm) rig.rightArm.rotation.x = -1.7 * ss;
      rig.body.rotation.x = -ss * 0.18;
    }
  }
  if (rig.cape) {
    const pos = rig.cape.geometry.attributes.position;
    const base = rig.cape.userData.base;
    for (let i = 0; i < pos.count; i++) {
      const bx = base[i * 3];
      const by = base[i * 3 + 1];
      const fall = Math.max(0, (0.95 - by) * 0.7);
      pos.setX(i, bx + Math.sin(t * 2.3 + by * 4 + bx) * 0.04 * fall);
      pos.setZ(i, base[i * 3 + 2] + Math.sin(t * 1.8 + bx * 3) * 0.04 * fall + walk * 0.04 * fall);
    }
    pos.needsUpdate = true;
  }
}

export function setEnemyFlash(rig, amount) {
  if (!rig) return;
  const boss = rig.type === 'boss';
  const tint = boss ? 0.5 : 1;
  const gain = boss ? 1.15 : 2.8;
  for (const item of rig.materials) {
    if (item.m.emissive) {
      item.m.emissive.copy(item.emissive || new THREE.Color(0));
      item.m.emissive.lerp(new THREE.Color(0xffffff), amount * tint);
      item.m.emissiveIntensity = item.intensity + amount * gain;
    }
  }
}

export function createShadowSoldier() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const shadow = mat(0x241447, {
    roughness: 0.6, metalness: 0.1, emissive: 0x7a40ff, emissiveIntensity: 0.9,
    transparent: true, opacity: 0.76, depthWrite: false,
  });
  const edge = new THREE.MeshBasicMaterial({
    color: 0x9d78ff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  body.add(box(1.1, 1.3, 0.6, shadow, 0, 1.75, 0));
  body.add(box(0.72, 0.7, 0.68, shadow, 0, 2.78, 0));
  addGlowEyes(body, 2.8, -0.36, 0.17, 0xd7c5ff, 0.8);
  const armL = new THREE.Group(); armL.position.set(-0.77, 2.3, 0);
  const armR = new THREE.Group(); armR.position.set(0.77, 2.3, 0);
  armL.add(box(0.34, 1.05, 0.38, shadow, 0, -0.5, 0));
  armR.add(box(0.34, 1.05, 0.38, shadow, 0, -0.5, 0));
  body.add(armL, armR);
  const legL = new THREE.Group(); legL.position.set(-0.3, 1.15, 0);
  const legR = new THREE.Group(); legR.position.set(0.3, 1.15, 0);
  legL.add(box(0.38, 1.1, 0.46, shadow, 0, -0.55, 0));
  legR.add(box(0.38, 1.1, 0.46, shadow, 0, -0.55, 0));
  body.add(legL, legR);
  const sword = makeSword({ color: 0xa37bff, length: 2.2, width: 0.08 });
  sword.position.set(0, -1.05, 0);
  armR.add(sword);
  const aura = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.9, 30), edge);
  aura.rotation.x = -Math.PI / 2;
  aura.position.y = 0.04;
  root.add(aura);
  const rig = { body, leftArm: armL, rightArm: armR, leftLeg: legL, rightLeg: legR, aura, sword, time: Math.random() * 10, type: 'shadow' };
  root.userData.rig = rig;
  return root;
}

export function animateShadow(rig, dt, opts = {}) {
  if (!rig) return;
  rig.time += dt;
  const cycle = rig.time * (3 + (opts.speed || 0));
  const walk = Math.min(1, (opts.speed || 0) / 4);
  rig.body.position.y = Math.abs(Math.sin(cycle)) * 0.05 * walk;
  rig.leftLeg.rotation.x = Math.sin(cycle) * 0.55 * walk;
  rig.rightLeg.rotation.x = -Math.sin(cycle) * 0.55 * walk;
  rig.leftArm.rotation.x = -Math.sin(cycle) * 0.35 * walk;
  rig.rightArm.rotation.x = Math.sin(cycle) * 0.25 * walk;
  if (opts.attack) {
    const p = Math.min(1, opts.attack.t / opts.attack.dur);
    const s = Math.sin(p * Math.PI);
    rig.rightArm.rotation.x = -0.2 - s * 2.3;
    rig.rightArm.rotation.z = s * 0.4;
    rig.body.rotation.y = s * 0.5;
  } else {
    rig.body.rotation.y *= 0.86;
  }
  rig.aura.rotation.z += dt * 1.5;
  rig.aura.material.opacity = 0.3 + Math.sin(rig.time * 3) * 0.12;
}

export { makeSword, addGlowEyes, glowMaterial };
