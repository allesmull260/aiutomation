import * as THREE from 'three';

export function mountHeroThree(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0.7, 3.5);

  const group = new THREE.Group();
  scene.add(group);

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0x88ccff, 0.95);
  key.position.set(3, 2, 3);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x7c5cff, 0.65);
  rim.position.set(-3, 1, -2);
  scene.add(rim);

  // Particles / nodes
  const nodeGeo = new THREE.IcosahedronGeometry(0.06, 1);
  const nodeMat = new THREE.MeshStandardMaterial({
    color: 0x9ee7ff,
    emissive: 0x2030ff,
    emissiveIntensity: 0.35,
    roughness: 0.35,
    metalness: 0.25,
  });

  const nodes: THREE.Mesh[] = [];
  const N = 44;
  const radius = 1.25;
  for (let i = 0; i < N; i++) {
    const m = new THREE.Mesh(nodeGeo, nodeMat);
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = radius * (0.55 + Math.random() * 0.6);
    m.position.set(
      r * Math.sin(phi) * Math.cos(theta),
      r * (Math.cos(phi) * 0.65),
      r * Math.sin(phi) * Math.sin(theta)
    );
    m.rotation.set(Math.random(), Math.random(), Math.random());
    group.add(m);
    nodes.push(m);
  }

  // Lines between close nodes
  const linePositions: number[] = [];
  const maxDist = 0.55;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i].position;
      const b = nodes[j].position;
      const d = a.distanceTo(b);
      if (d < maxDist) {
        linePositions.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
  }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
  const lineMat = new THREE.LineBasicMaterial({ color: 0x5c86ff, transparent: true, opacity: 0.22 });
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  group.add(lines);

  // Backdrop glow
  const glowGeo = new THREE.SphereGeometry(2.0, 48, 48);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x243bff, transparent: true, opacity: 0.06 });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  scene.add(glow);

  // Orbit rings (adds a more "premium" 3D feel without heavy postprocessing)
  const ringGeo = new THREE.TorusGeometry(1.05, 0.02, 16, 160);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x24d7ff, transparent: true, opacity: 0.18 });
  const ring1 = new THREE.Mesh(ringGeo, ringMat);
  ring1.rotation.set(0.6, 0.2, 0.1);
  group.add(ring1);

  const ringMat2 = new THREE.MeshBasicMaterial({ color: 0x7c5cff, transparent: true, opacity: 0.14 });
  const ring2 = new THREE.Mesh(ringGeo, ringMat2);
  ring2.rotation.set(-0.3, 0.9, 0.2);
  group.add(ring2);

  // Pulsing point light
  const pulse = new THREE.PointLight(0x24d7ff, 0.55, 10);
  pulse.position.set(0.2, 0.4, 1.8);
  scene.add(pulse);


  let raf = 0;
  let alive = true;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  // Interactivity: subtle parallax
  let mx = 0;
  let my = 0;
  const onMove = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    mx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    my = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  };
  window.addEventListener('pointermove', onMove, { passive: true });

  const clock = new THREE.Clock();
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const tick = () => {
    if (!alive) return;
    const t = clock.getElapsedTime();

    const speed = prefersReduced ? 0.0 : 1.0;
    group.rotation.y = t * 0.22 * speed + mx * 0.18;
    group.rotation.x = t * 0.08 * speed + -my * 0.12;

    // Orbit rings
    ring1.rotation.z += 0.004 * speed;
    ring2.rotation.z -= 0.003 * speed;

    // Subtle line shimmer
    (lines.material as THREE.LineBasicMaterial).opacity = 0.14 + (Math.sin(t * 0.9) * 0.5 + 0.5) * 0.12;

    // Gentle breathing motion
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      n.rotation.x += 0.004 * (0.2 + 0.8 * speed);
      n.rotation.y += 0.003 * (0.2 + 0.8 * speed);
      n.position.y += Math.sin(t * 0.9 + i) * 0.0006 * speed;
    }

    // Light pulse
    pulse.intensity = 0.45 + (Math.sin(t * 1.1) * 0.5 + 0.5) * 0.35;

    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  };
  tick();

  const cleanup = () => {
    alive = false;
    cancelAnimationFrame(raf);
    ro.disconnect();
    window.removeEventListener('pointermove', onMove);
    renderer.dispose();
    lineGeo.dispose();
    nodeGeo.dispose();
    glowGeo.dispose();
    ringGeo.dispose();
    // @ts-ignore
    nodeMat.dispose?.();
    // @ts-ignore
    lineMat.dispose?.();
    // @ts-ignore
    glowMat.dispose?.();
    // @ts-ignore
    ringMat.dispose?.();
    // @ts-ignore
    ringMat2.dispose?.();
  };

  return cleanup;
}
