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
  const tick = () => {
    if (!alive) return;
    const t = clock.getElapsedTime();
    group.rotation.y = t * 0.22 + mx * 0.18;
    group.rotation.x = t * 0.08 + -my * 0.12;

    // Gentle breathing motion
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      n.rotation.x += 0.004;
      n.rotation.y += 0.003;
      n.position.y += Math.sin(t * 0.9 + i) * 0.0006;
    }

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
    // @ts-ignore
    nodeMat.dispose?.();
    // @ts-ignore
    lineMat.dispose?.();
    // @ts-ignore
    glowMat.dispose?.();
  };

  return cleanup;
}
