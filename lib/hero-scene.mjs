// This module is imported only in the browser after the hero is visible.
import * as THREE from "three";

function controllerShape() {
  const shape = new THREE.Shape();
  shape.moveTo(-1.22, 0.72);
  shape.bezierCurveTo(-1.8, 0.84, -1.85, 0.15, -2.03, -0.7);
  shape.bezierCurveTo(-2.23, -1.48, -1.62, -1.62, -1.27, -1.08);
  shape.lineTo(-0.86, -0.56);
  shape.lineTo(0.86, -0.56);
  shape.lineTo(1.27, -1.08);
  shape.bezierCurveTo(1.62, -1.62, 2.23, -1.48, 2.03, -0.7);
  shape.bezierCurveTo(1.85, 0.15, 1.8, 0.84, 1.22, 0.72);
  shape.lineTo(0.66, 0.63);
  shape.lineTo(-0.66, 0.63);
  shape.closePath();
  return shape;
}

function buildController(track) {
  const pad = new THREE.Group();
  const shell = track(
    new THREE.MeshStandardMaterial({
      color: 0x16212f,
      roughness: 0.38,
      metalness: 0.45,
    }),
  );
  const face = track(
    new THREE.MeshStandardMaterial({
      color: 0x263645,
      roughness: 0.4,
      metalness: 0.45,
    }),
  );
  const rubber = track(
    new THREE.MeshStandardMaterial({
      color: 0x090e17,
      roughness: 0.7,
      metalness: 0.12,
    }),
  );
  const silver = track(
    new THREE.MeshStandardMaterial({
      color: 0xa1b4c3,
      roughness: 0.32,
      metalness: 0.6,
    }),
  );
  const lime = track(new THREE.MeshBasicMaterial({ color: 0xc1ef76 }));
  const violet = track(new THREE.MeshBasicMaterial({ color: 0x9b9dff }));
  function mesh(geometry, material, x = 0, y = 0, z = 0) {
    const item = new THREE.Mesh(track(geometry), material);
    item.position.set(x, y, z);
    pad.add(item);
    return item;
  }
  const shape = controllerShape();
  mesh(
    new THREE.ExtrudeGeometry(shape, {
      depth: 0.32,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.1,
      bevelThickness: 0.09,
      curveSegments: 20,
    }),
    shell,
  );
  const top = mesh(
    new THREE.ExtrudeGeometry(shape, {
      depth: 0.035,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.035,
      bevelThickness: 0.025,
      curveSegments: 20,
    }),
    face,
    0,
    0,
    0.36,
  );
  top.scale.set(0.955, 0.955, 1);
  const rimPoints = shape
    .getPoints(64)
    .map(({ x, y }) => new THREE.Vector3(x * 0.98, y * 0.98, 0.38));
  const rim = new THREE.LineLoop(
    track(new THREE.BufferGeometry().setFromPoints(rimPoints)),
    track(
      new THREE.LineBasicMaterial({
        color: 0xc1ef76,
        transparent: true,
        opacity: 0.85,
      }),
    ),
  );
  pad.add(rim);

  function cylinder(radius, depth, material, x, y, z) {
    const item = mesh(
      new THREE.CylinderGeometry(radius, radius * 1.08, depth, 32),
      material,
      x,
      y,
      z,
    );
    item.rotation.x = Math.PI / 2;
    return item;
  }
  for (const [x, accent] of [
    [-0.63, lime],
    [0.63, violet],
  ]) {
    cylinder(0.34, 0.07, rubber, x, -0.38, 0.44);
    mesh(new THREE.TorusGeometry(0.3, 0.022, 8, 40), accent, x, -0.38, 0.5);
    cylinder(0.19, 0.18, rubber, x, -0.38, 0.54);
    cylinder(0.25, 0.1, shell, x, -0.38, 0.66);
    mesh(new THREE.TorusGeometry(0.19, 0.012, 6, 32), silver, x, -0.38, 0.72);
  }
  cylinder(0.33, 0.06, rubber, -1.2, 0.22, 0.43);
  mesh(new THREE.BoxGeometry(0.13, 0.48, 0.1), silver, -1.2, 0.22, 0.5);
  mesh(new THREE.BoxGeometry(0.48, 0.13, 0.1), silver, -1.2, 0.22, 0.5);
  cylinder(0.09, 0.105, rubber, -1.2, 0.22, 0.5);
  const colors = [0xc1ef76, 0x9b9dff, 0x71dbe5, 0xf0a6ca];
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const x = 1.19 + Math.sin(angle) * 0.24;
    const y = 0.22 + Math.cos(angle) * 0.24;
    cylinder(0.115, 0.1, rubber, x, y, 0.47);
    mesh(
      new THREE.TorusGeometry(0.08, 0.022, 8, 24),
      track(new THREE.MeshBasicMaterial({ color: colors[i] })),
      x,
      y,
      0.54,
    );
  }
  mesh(new THREE.BoxGeometry(0.76, 0.42, 0.035), rubber, 0, 0.3, 0.42);
  mesh(new THREE.TorusGeometry(0.115, 0.018, 8, 32), lime, 0, 0.31, 0.46);
  const tail = mesh(
    new THREE.BoxGeometry(0.13, 0.025, 0.025),
    lime,
    0.1,
    0.21,
    0.46,
  );
  tail.rotation.z = -Math.PI / 4;
  for (const x of [-0.55, 0.55])
    mesh(new THREE.BoxGeometry(0.13, 0.055, 0.04), silver, x, 0.29, 0.44);
  for (const x of [-1.2, 1.2]) {
    mesh(new THREE.BoxGeometry(0.65, 0.13, 0.23), rubber, x, 0.73, 0.12);
    mesh(new THREE.BoxGeometry(0.42, 0.025, 0.025), lime, x, 0.8, 0.22);
  }
  for (let i = 0; i < 4; i++) {
    mesh(
      new THREE.BoxGeometry(0.18, 0.018, 0.022),
      silver,
      -1.66 + i * 0.035,
      -0.67 - i * 0.09,
      0.42,
    ).rotation.z = -0.35;
    mesh(
      new THREE.BoxGeometry(0.18, 0.018, 0.022),
      silver,
      1.66 - i * 0.035,
      -0.67 - i * 0.09,
      0.42,
    ).rotation.z = 0.35;
  }
  return pad;
}

export function createHeroScene(host, { paused = false, onUnavailable } = {}) {
  const resources = new Set();
  const track = (value) => {
    resources.add(value);
    return value;
  };
  const scene = new THREE.Scene();
  const pointerTarget = host.closest(".hero-section") || host;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  let renderer, resizeObserver, visibilityObserver;
  let disposed = false,
    lost = false,
    visible = true,
    running = false;
  let elapsed = 0,
    lastTime = 0;
  const pointer = { x: 0, y: 0, currentX: 0, currentY: 0 };
  let pointerBox;

  function dispose() {
    if (disposed) return;
    disposed = true;
    resizeObserver?.disconnect();
    visibilityObserver?.disconnect();
    pointerTarget.removeEventListener("pointermove", move);
    pointerTarget.removeEventListener("pointerleave", leave);
    window.removeEventListener("scroll", invalidatePointer);
    document.removeEventListener("visibilitychange", sync);
    renderer?.domElement.removeEventListener("webglcontextlost", contextLost);
    renderer?.setAnimationLoop(null);
    resources.forEach((resource) => resource.dispose());
    scene.clear();
    renderer?.dispose();
    renderer?.forceContextLoss();
    renderer?.domElement.remove();
    delete host.dataset.rendering;
  }
  function move(event) {
    if (paused || !finePointer.matches || event.pointerType !== "mouse") return;
    pointerBox ||= pointerTarget.getBoundingClientRect();
    pointer.x = THREE.MathUtils.clamp(
      ((event.clientX - pointerBox.left) / pointerBox.width) * 2 - 1,
      -1,
      1,
    );
    pointer.y = THREE.MathUtils.clamp(
      ((event.clientY - pointerBox.top) / pointerBox.height) * 2 - 1,
      -1,
      1,
    );
  }
  function leave() {
    pointer.x = 0;
    pointer.y = 0;
    pointerBox = null;
  }
  function invalidatePointer() {
    pointerBox = null;
  }
  function contextLost(event) {
    event.preventDefault();
    lost = true;
    sync();
    onUnavailable?.();
  }
  let animate;
  function sync() {
    if (disposed || !renderer) return;
    const next = !lost && !paused && visible && !document.hidden;
    host.dataset.rendering = next ? "active" : paused ? "paused" : "idle";
    if (next !== running) {
      running = next;
      lastTime = 0;
      renderer.setAnimationLoop(next ? animate : null);
    }
  }

  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, finePointer.matches ? 1.5 : 1.25),
    );
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.45;
    renderer.domElement.className = "scene-canvas";
    host.appendChild(renderer.domElement);
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 40);
    camera.position.set(0, 0.05, 7.4);
    scene.add(new THREE.HemisphereLight(0xd8edff, 0x182037, 3));
    const key = new THREE.DirectionalLight(0xe7f3ff, 5);
    key.position.set(-2, 4, 5);
    const green = new THREE.PointLight(0xc1ef76, 20, 12);
    green.position.set(-3, 1, 3);
    const blue = new THREE.PointLight(0x9b8cff, 24, 12);
    blue.position.set(3, -1, 2);
    scene.add(key, green, blue);

    const pad = buildController(track);
    scene.add(pad);
    const orbit = new THREE.Group();
    orbit.position.set(0, -0.22, -0.7);
    scene.add(orbit);
    const rings = [];
    for (const [radius, color, arc, tilt] of [
      [2.62, 0xc1ef76, 4.8, 1.15],
      [2.87, 0x9496ff, 3.6, -0.82],
    ]) {
      const ring = new THREE.Mesh(
        track(new THREE.TorusGeometry(radius, 0.012, 6, 120, arc)),
        track(
          new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.65,
          }),
        ),
      );
      ring.rotation.set(tilt, 0.2, 0.1);
      orbit.add(ring);
      rings.push(ring);
    }
    const satellites = [];
    for (const [x, y, scale, color] of [
      [-2.3, 1.2, 0.19, 0xc1ef76],
      [2.15, -1.32, 0.24, 0x9496ff],
      [2.4, 1.3, 0.11, 0x71dbe5],
    ]) {
      const item = new THREE.Mesh(
        track(new THREE.OctahedronGeometry(scale)),
        track(
          new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.12,
            metalness: 0.55,
            roughness: 0.25,
            wireframe: scale < 0.2,
          }),
        ),
      );
      item.position.set(x, y, -0.2);
      scene.add(item);
      satellites.push(item);
    }
    const positions = [];
    for (let i = 0; i < 65; i++) {
      const angle = i * 2.39996;
      const radius = 1.6 + (i % 9) * 0.17;
      positions.push(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius * 0.66,
        -1.4 - (i % 5) * 0.3,
      );
    }
    const starsGeometry = track(new THREE.BufferGeometry());
    starsGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    const stars = new THREE.Points(
      starsGeometry,
      track(
        new THREE.PointsMaterial({
          color: 0xb0d8d6,
          size: 0.025,
          transparent: true,
          opacity: 0.65,
          depthWrite: false,
        }),
      ),
    );
    scene.add(stars);

    function draw(delta = 0) {
      elapsed += delta;
      const blend = 1 - Math.exp(-delta * 6);
      pointer.currentX += (pointer.x - pointer.currentX) * blend;
      pointer.currentY += (pointer.y - pointer.currentY) * blend;
      pad.rotation.set(
        -0.22 + pointer.currentY * 0.24,
        -0.28 + pointer.currentX * 0.4,
        -0.12 + pointer.currentX * 0.07 + Math.sin(elapsed * 0.5) * 0.025,
      );
      pad.position.y = 0.14 + Math.sin(elapsed * 0.85) * 0.1;
      rings[0].rotation.z = elapsed * 0.14;
      rings[1].rotation.z = -elapsed * 0.1 + 1.3;
      stars.rotation.z = elapsed * 0.012;
      satellites.forEach((item, i) => {
        item.rotation.set(elapsed * 0.18, elapsed * 0.3 + i, 0.4);
      });
      camera.position.x = pointer.currentX * 0.1;
      camera.position.y = 0.05 - pointer.currentY * 0.07;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    }
    animate = (time) => {
      const minimumInterval = finePointer.matches ? 1000 / 60 : 1000 / 30;
      if (lastTime && time - lastTime < minimumInterval - 1) return;
      const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
      lastTime = time;
      draw(delta);
    };
    function resize() {
      if (disposed || lost) return;
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.position.z = Math.max(7.4, 7.2 / camera.aspect);
      camera.updateProjectionMatrix();
      pointerBox = null;
      draw();
    }
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    visibilityObserver.observe(host);
    pointerTarget.addEventListener("pointermove", move, { passive: true });
    pointerTarget.addEventListener("pointerleave", leave);
    window.addEventListener("scroll", invalidatePointer, { passive: true });
    document.addEventListener("visibilitychange", sync);
    renderer.domElement.addEventListener("webglcontextlost", contextLost);
    resize();
    sync();
    return {
      setPaused(value) {
        paused = value;
        sync();
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
