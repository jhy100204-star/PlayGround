import * as THREE from 'three';

const MAX_PARTICLES = 900;

const particleVert = /* glsl */`
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = aColor;
    vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (420.0 / max(1.0, -mv.z));
    gl_Position = projectionMatrix * mv;
  }
`;

const particleFrag = /* glsl */`
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float d = length(p);
    float core = smoothstep(0.5, 0.0, d);
    float spark = smoothstep(0.16, 0.0, d);
    float a = core * 0.55 + spark * 0.9;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor * (0.7 + spark * 1.4), a * vAlpha);
  }
`;

class ParticlePool {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(MAX_PARTICLES * 3);
    this.col = new Float32Array(MAX_PARTICLES * 3);
    this.size = new Float32Array(MAX_PARTICLES);
    this.alpha = new Float32Array(MAX_PARTICLES);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    this.geo = geo;
    this.material = new THREE.ShaderMaterial({
      vertexShader: particleVert,
      fragmentShader: particleFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);
  }

  spawn(position, color, count, opts = {}) {
    const c = new THREE.Color(color);
    const speed = opts.speed ?? 4;
    const size = opts.size ?? 0.16;
    const life = opts.life ?? 0.65;
    const gravity = opts.gravity ?? 7;
    const spread = opts.spread ?? 1;
    const dir = opts.direction || null;
    const up = opts.up ?? 0.6;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
      const angle = Math.random() * Math.PI * 2;
      const radial = Math.random() * spread;
      let vx = Math.cos(angle) * radial * speed;
      let vz = Math.sin(angle) * radial * speed;
      let vy = (Math.random() * 0.8 + up) * speed;
      if (dir) {
        vx += dir.x * speed * (0.4 + Math.random() * 0.8);
        vy += dir.y * speed * 0.5;
        vz += dir.z * speed * (0.4 + Math.random() * 0.8);
      }
      const p = {
        pos: position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4)),
        vel: new THREE.Vector3(vx, vy, vz),
        color: c.clone().offsetHSL((Math.random() - 0.5) * 0.06, 0, (Math.random() - 0.5) * 0.15),
        size: size * (0.6 + Math.random() * 0.9),
        life: life * (0.6 + Math.random() * 0.7),
        maxLife: life,
        gravity,
        drag: opts.drag ?? 0.96,
      };
      this.particles.push(p);
    }
  }

  update(dt) {
    const n = this.particles.length;
    for (let i = n - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vel.y -= p.gravity * dt;
      p.vel.multiplyScalar(Math.pow(p.drag, dt * 60));
      p.pos.addScaledVector(p.vel, dt);
      if (p.pos.y < 0.05) {
        p.pos.y = 0.05;
        p.vel.y *= -0.22;
        p.vel.x *= 0.7;
        p.vel.z *= 0.7;
      }
    }
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (p) {
        const a = Math.max(0, p.life / p.maxLife);
        this.pos[i * 3] = p.pos.x;
        this.pos[i * 3 + 1] = p.pos.y;
        this.pos[i * 3 + 2] = p.pos.z;
        this.col[i * 3] = p.color.r;
        this.col[i * 3 + 1] = p.color.g;
        this.col[i * 3 + 2] = p.color.b;
        this.size[i] = p.size * (0.55 + a * 0.7);
        this.alpha[i] = Math.min(1, a * 1.8);
      } else {
        this.size[i] = 0;
        this.alpha[i] = 0;
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aColor.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
  }
}

class SwordTrail {
  constructor(scene) {
    this.scene = scene;
    this.max = 11;
    this.points = [];
    this.color = new THREE.Color(0x9d7bff);
    this.active = false;
    this.fade = 0;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.max * 2 * 3);
    const colors = new Float32Array(this.max * 2 * 3);
    const indices = [];
    for (let i = 0; i < this.max - 1; i++) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.setDrawRange(0, 0);
    this.geo = geo;
    this.material = new THREE.MeshBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.5, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 4;
    scene.add(this.mesh);
  }

  start(color) {
    this.color.set(color);
    this.points.length = 0;
    this.active = true;
    this.fade = 1;
    this.material.opacity = 1;
  }

  push(base, tip) {
    if (!this.active) return;
    this.points.unshift({ base: base.clone(), tip: tip.clone() });
    if (this.points.length > this.max) this.points.pop();
  }

  end() {
    this.active = false;
  }

  update(dt) {
    if (!this.active) this.fade = Math.max(0, this.fade - dt * 3.8);
    else this.fade = Math.min(1, this.fade + dt * 8);
    const positions = this.geo.attributes.position.array;
    const colors = this.geo.attributes.color.array;
    const count = this.points.length;
    for (let i = 0; i < count; i++) {
      const p = this.points[i];
      const idx = i * 6;
      positions[idx] = p.base.x;
      positions[idx + 1] = p.base.y;
      positions[idx + 2] = p.base.z;
      positions[idx + 3] = p.tip.x;
      positions[idx + 4] = p.tip.y;
      positions[idx + 5] = p.tip.z;
      const a = Math.pow(1 - i / this.max, 1.7) * this.fade;
      const c = this.color;
      colors[idx] = c.r * a * 0.22;
      colors[idx + 1] = c.g * a * 0.22;
      colors[idx + 2] = c.b * a * 0.22;
      colors[idx + 3] = c.r * a * 0.82;
      colors[idx + 4] = c.g * a * 0.82;
      colors[idx + 5] = c.b * a * 0.82;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
    this.geo.setDrawRange(0, Math.max(0, (count - 1) * 6));
    this.material.opacity = this.fade * 0.5;
    this.mesh.visible = this.fade > 0.01 && count > 1;
    if (!this.active && this.fade <= 0.01) this.points.length = 0;
  }
}

export class Effects {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.particles = new ParticlePool(scene);
    this.trail = new SwordTrail(scene);
    this.items = [];
    this.flashLights = [];
  }

  startTrail(color = 0x9d7bff) { this.trail.start(color); }
  pushTrail(base, tip) { this.trail.push(base, tip); }
  endTrail() { this.trail.end(); }

  burst(position, color = 0x9d7bff, count = 12, opts = {}) {
    this.particles.spawn(position, color, count, opts);
  }

  hitSpark(position, color = 0xd9c8ff) {
    this.particles.spawn(position, color, 14, { speed: 7, size: 0.13, life: 0.35, gravity: 12, up: 0.3 });
    this.particles.spawn(position, 0xffffff, 5, { speed: 9, size: 0.09, life: 0.18, gravity: 2, up: 0.4 });
  }

  bloodBurst(position, color = 0xff3e63) {
    this.particles.spawn(position, color, 16, { speed: 5.5, size: 0.15, life: 0.6, gravity: 14, up: 0.45 });
    this.particles.spawn(position, 0x3a0a22, 8, { speed: 3, size: 0.3, life: 0.8, gravity: 2, up: 0.7 });
  }

  soulBurst(position, color = 0xa67bff, count = 24) {
    this.particles.spawn(position, color, count, { speed: 3.8, size: 0.19, life: 1.2, gravity: -1.2, up: 0.9, drag: 0.93 });
    this.particles.spawn(position, 0xe8dbff, 6, { speed: 2.5, size: 0.24, life: 1.5, gravity: -2.5, up: 1.1, drag: 0.9 });
  }

  spawnRing(position, color = 0x9d7bff, opts = {}) {
    const geo = new THREE.RingGeometry(0.45, 0.64, 64);
    const material = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: opts.opacity ?? 0.85, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(position);
    mesh.position.y = opts.y ?? 0.06;
    mesh.scale.setScalar(opts.startScale ?? 1);
    this.scene.add(mesh);
    this.items.push({
      mesh, t: 0, dur: opts.duration ?? 0.5, startScale: opts.startScale ?? 1,
      endScale: opts.endScale ?? 4, opacity: material.opacity, rise: opts.rise ?? 0,
    });
    return mesh;
  }

  spawnSlash(position, facing, color = 0x9d7bff, opts = {}) {
    const group = new THREE.Group();
    const forward = new THREE.Vector3(-Math.sin(facing), 0, -Math.cos(facing));
    const radius = opts.radius ?? (opts.outer ? opts.outer * 0.78 : 2.5);
    const arc = opts.arc ?? opts.theta ?? 2.0;
    const tube = opts.tube ?? Math.max(0.075, radius * 0.035);
    const distance = opts.distance ?? Math.min(3.2, radius * 0.55);
    group.position.copy(position).addScaledVector(forward, distance);
    group.position.y = opts.y ?? 2.05;
    group.rotation.y = facing;
    const material = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.92, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 6, 42, arc), material);
    mesh.rotation.z = Math.PI * 0.5 - arc * 0.5 + (opts.spin ?? 0);
    group.add(mesh);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.34, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const core = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.002, tube * 0.34, 5, 42, arc), coreMat);
    core.rotation.z = mesh.rotation.z;
    group.add(core);
    this.scene.add(group);
    this.items.push({
      mesh: group, t: 0, dur: opts.duration ?? 0.28, startScale: 0.74,
      endScale: opts.endScale ?? 1.22, opacity: 0.92, rise: 0, spin: opts.spinSpeed ?? 0,
    });
    return group;
  }

  flameSlash(position, facing, radius = 7) {
    const forward = new THREE.Vector3(-Math.sin(facing), 0, -Math.cos(facing));
    for (let i = 0; i < 7; i++) {
      const spread = (i - 3) * 0.27;
      const dir = new THREE.Vector3(-Math.sin(facing + spread), 0, -Math.cos(facing + spread));
      const dist = 1.2 + (i % 3) * 0.9;
      const p = position.clone().addScaledVector(dir, dist);
      p.y = 0.35 + Math.random() * 1.6;
      this.particles.spawn(p, i % 3 === 0 ? 0xffd08a : i % 2 ? 0xff8b3d : 0xff4a2e, 12, {
        speed: 2.2, size: 0.34, life: 0.52, gravity: -2.4, up: 0.55, spread: 0.9,
        direction: dir,
      });
    }
    for (let i = 0; i < 4; i++) {
      this.spawnSlash(position, facing + (i - 1.5) * 0.36, i === 2 ? 0xffd08a : 0xff6a2f, {
        radius: 1.15 + (i % 2) * 0.42, arc: 1.55, distance: 1.1 + i * 0.46,
        y: 1.05 + (i % 3) * 0.42, tube: 0.075 + i * 0.012, duration: 0.34, endScale: 1.2,
      });
    }
    this.spawnRing(position, 0xff5a2f, { endScale: 5.2, duration: 0.48, opacity: 0.28, y: 0.08 });
  }

  shadowStep(from, to, color = 0x8d63ff) {
    const dir = to.clone().sub(from);
    const steps = 8;
    for (let i = 0; i < steps; i++) {
      const p = from.clone().addScaledVector(dir, i / steps);
      p.y = 0.2 + Math.random() * 1.8;
      this.particles.spawn(p, i % 3 ? color : 0x2b115e, 9, { speed: 2.4, size: 0.26, life: 0.55, gravity: -1, up: 0.8 });
    }
    this.spawnRing(from, color, { endScale: 3.2, duration: 0.4 });
    this.spawnRing(to, color, { endScale: 3.8, duration: 0.55 });
  }

  arise(position) {
    const p = position.clone();
    for (let i = 0; i < 5; i++) {
      const ring = this.spawnRing(p, i % 2 ? 0x8f5cff : 0x3b197f, {
        endScale: 2.2 + i * 0.8, duration: 0.7 + i * 0.15, y: 0.08 + i * 0.03, opacity: 0.55 - i * 0.06,
      });
      ring.position.x += (Math.random() - 0.5) * 1.2;
      ring.position.z += (Math.random() - 0.5) * 1.2;
    }
    this.particles.spawn(p.clone().setY(0.3), 0x7b4cff, 65, { speed: 2.2, size: 0.26, life: 1.5, gravity: -3.8, up: 1.2, spread: 1.4, drag: 0.94 });
    this.particles.spawn(p.clone().setY(0.2), 0x1b0b3c, 30, { speed: 3.5, size: 0.45, life: 1.1, gravity: -1, up: 0.6, spread: 1.7 });
  }

  domain(position, facing = 0) {
    const p = position.clone();
    for (let i = 0; i < 7; i++) {
      const ring = this.spawnRing(p, i % 2 ? 0xb28cff : 0x6d3bff, {
        endScale: 14 + i * 2.2, duration: 0.85 + i * 0.09, y: 0.06 + i * 0.03, opacity: 0.55 - i * 0.05,
      });
    }
    const pillarMat = new THREE.MeshBasicMaterial({
      color: 0x7d4cff, transparent: true, opacity: 0.14, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(10.8, 10.8, 9, 64, 1, true), pillarMat);
    pillar.position.copy(p).setY(4.5);
    this.scene.add(pillar);
    this.items.push({ mesh: pillar, t: 0, dur: 1.4, startScale: 0.6, endScale: 1.05, opacity: 0.14, rise: 0 });
    this.particles.spawn(p.clone().setY(0.4), 0x8e5dff, 150, { speed: 5, size: 0.26, life: 1.6, gravity: -4.5, up: 1.4, spread: 1.5, drag: 0.94 });
    this.particles.spawn(p.clone().setY(0.5), 0xffffff, 30, { speed: 3, size: 0.18, life: 1.1, gravity: -2, up: 1.6, spread: 1 });
    for (let i = 0; i < 3; i++) {
      this.spawnSlash(p, facing, i === 1 ? 0xf2e8ff : 0x9b6bff, {
        radius: 4.5 + i * 2.0, arc: 2.9, distance: 2.0 + i * 2.2,
        y: 2.0 + i * 0.6, tube: 0.22 + i * 0.05, duration: 0.65, endScale: 1.35,
      });
    }
  }

  bossSlam(position) {
    this.spawnRing(position, 0xff2949, { endScale: 9, duration: 0.65, opacity: 0.65 });
    this.spawnRing(position, 0xff7a4a, { endScale: 5, duration: 0.4, opacity: 0.45 });
    this.particles.spawn(position.clone().setY(0.2), 0xff3d52, 70, { speed: 7, size: 0.28, life: 0.85, gravity: 13, up: 0.8 });
    this.particles.spawn(position.clone().setY(0.2), 0x3a1120, 25, { speed: 4, size: 0.5, life: 1, gravity: 3, up: 0.8 });
  }

  heal(position) {
    this.particles.spawn(position.clone().setY(1), 0x6dffc2, 25, { speed: 2, size: 0.16, life: 1.2, gravity: -4, up: 1.4, drag: 0.95 });
  }

  update(dt) {
    this.particles.update(dt);
    this.trail.update(dt);
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.t += dt;
      const p = item.t / item.dur;
      if (p >= 1) {
        this.scene.remove(item.mesh);
        item.mesh.traverse(o => {
          if (o.geometry) o.geometry.dispose();
          if (o.material) {
            if (Array.isArray(o.material)) o.material.forEach(m => m.dispose());
            else o.material.dispose();
          }
        });
        this.items.splice(i, 1);
        continue;
      }
      const ease = 1 - Math.pow(1 - p, 3);
      const scale = item.startScale + (item.endScale - item.startScale) * ease;
      item.mesh.scale.setScalar(scale);
      if (item.rise) item.mesh.position.y += item.rise * dt;
      if (item.spin) item.mesh.rotation.z += item.spin * dt;
      const fade = 1 - p;
      item.mesh.traverse(o => {
        if (o.material && o.material.transparent && o.material.opacity !== undefined) {
          if (!o.userData.__baseOpacity) o.userData.__baseOpacity = o.material.opacity;
          o.material.opacity = o.userData.__baseOpacity * fade;
        }
      });
    }
  }
}
