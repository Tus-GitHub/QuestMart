import * as THREE from "three";
import { renderScale, clamp01 } from "./journey.mjs";
import { fitPhoto, caseSide, releaseVelocity } from "./showroom-motion.mjs";

// One renderer per visible room; cards use CSS, never individual WebGL contexts.
export function createShowroom(
  host,
  {
    mode,
    images,
    title = "",
    color = "#c1ef76",
    onReady,
    onUnavailable,
    onSide,
  },
) {
  const market = mode === "market",
    photos = mode === "photos";
  const compact = matchMedia("(max-width: 700px), (pointer: coarse)").matches;
  const resources = new Set(),
    keep = (value) => (resources.add(value), value);
  let renderer,
    resizeObserver,
    observer,
    frame = 0,
    disposed = false,
    lost = false;
  let visible = true,
    paused = false,
    orbit = true,
    last = 0,
    painted = 0,
    age = 0;
  let target = -0.3,
    turn = -0.3,
    velocity = 0,
    drag = null,
    selected = 0,
    zoom = 0,
    currentZoom = 0;
  let progress = 0,
    travel = 0,
    side = "",
    bounds,
    announced = false;
  const cursor = new THREE.Vector2(),
    pointer = new THREE.Vector2();
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2("#08111d", market ? 0.035 : 0.012);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  const subject = new THREE.Group(),
    rings = new THREE.Group(),
    exhibits = [];
  scene.add(
    subject,
    rings,
    new THREE.HemisphereLight("#d7e5ff", "#101721", 2.2),
  );
  const key = new THREE.DirectionalLight("#e5f0ff", 4);
  key.position.set(-4, 6, 8);
  scene.add(key);
  const rim = new THREE.PointLight(color, 35, 30);
  rim.position.set(5, 3, -1);
  scene.add(rim);
  const blue = new THREE.PointLight("#7d8fff", 30, 30);
  blue.position.set(-5, 1, 2);
  scene.add(blue);
  const box = keep(new THREE.BoxGeometry(1, 1, 1));
  const dark = keep(
    new THREE.MeshStandardMaterial({
      color: "#172333",
      metalness: 0.68,
      roughness: 0.32,
    }),
  );
  const light = keep(
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.65 }),
  );
  function mesh(geometry, material, position, scale, parent = scene) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(...position);
    if (scale) object.scale.set(...scale);
    parent.add(object);
    return object;
  }
  function texture(url, done) {
    // Same-origin image optimization also avoids cross-origin WebGL texture failures.
    const source = `/_next/image?url=${encodeURIComponent(url)}&w=640&q=75`;
    new THREE.TextureLoader().load(
      source,
      (result) => {
        if (disposed) {
          result.dispose();
          return;
        }
        keep(result);
        result.colorSpace = THREE.SRGBColorSpace;
        result.anisotropy = compact
          ? 1
          : Math.min(4, renderer.capabilities.getMaxAnisotropy());
        done(result);
        if (!announced) {
          announced = true;
          onReady?.();
        }
        wake();
      },
      undefined,
      () => {},
    );
  }
  function label(text, width = 512, height = 128) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#172333";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#dce8cc";
    ctx.font = `600 ${Math.round(height * 0.28)}px sans-serif`;
    ctx.textBaseline = "middle";
    ctx.fillText(text, 24, height / 2, width - 48);
    const map = keep(new THREE.CanvasTexture(canvas));
    map.colorSpace = THREE.SRGBColorSpace;
    return keep(new THREE.MeshBasicMaterial({ map }));
  }
  function makeCase(url, name, parent) {
    const group = new THREE.Group();
    parent.add(group);
    mesh(box, dark, [0, 0, 0], [2.25, 3.2, 0.24], group);
    const front = keep(
      new THREE.MeshStandardMaterial({
        color: "#50614e",
        roughness: 0.38,
        metalness: 0.08,
      }),
    );
    const art = mesh(
      keep(new THREE.PlaneGeometry(1, 1)),
      front,
      [0, 0, 0.125],
      [2.2, 3.14, 1],
      group,
    );
    const caption = mesh(
      keep(new THREE.PlaneGeometry(2.1, 0.48)),
      label(name),
      [0, -1.04, 0.128],
      null,
      group,
    );
    caption.visible = false;
    texture(url, (map) => {
      const [w, h] = fitPhoto(map.image.width, map.image.height, 2.2, 3.14);
      art.scale.set(w, h, 1);
      art.position.y = h < 2 ? 0.48 : 0;
      caption.visible = h < 2;
      front.map = map;
      front.color.set("#ffffff");
      front.needsUpdate = true;
    });
    const back = mesh(
      keep(new THREE.PlaneGeometry(2.18, 3.12)),
      label(`${name} · QUESTMART`, 512, 730),
      [0, 0, -0.125],
      null,
      group,
    );
    back.rotation.y = Math.PI;
    const spine = mesh(
      keep(new THREE.PlaneGeometry(3.05, 0.215)),
      label(name, 1024, 100),
      [-1.131, 0, 0],
      null,
      group,
    );
    spine.rotation.set(0, -Math.PI / 2, Math.PI / 2);
    return group;
  }
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
  }
  function wake() {
    if (!frame && !disposed && !lost && visible && !paused && !document.hidden)
      frame = requestAnimationFrame(tick);
  }
  function visibility() {
    if (document.hidden) stop();
    else wake();
  }
  function unavailable(event) {
    event.preventDefault();
    lost = true;
    stop();
    onUnavailable?.();
  }
  function resize() {
    if (disposed || lost) return;
    bounds = host.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const scale = renderScale(
      bounds.width,
      bounds.height,
      devicePixelRatio || 1,
      compact,
    );
    renderer.setPixelRatio(scale);
    renderer.setSize(bounds.width, bounds.height, false);
    camera.aspect = bounds.width / bounds.height;
    camera.updateProjectionMatrix();
    wake();
  }
  function down(event) {
    if (market || paused || event.button !== 0) return;
    drag = { x: event.clientX, last: performance.now(), delta: 0, dt: 0 };
    velocity = 0;
    host.setPointerCapture(event.pointerId);
    host.dataset.dragging = "true";
  }
  function move(event) {
    if (paused || !bounds) return;
    if (drag) {
      const now = performance.now();
      drag.delta = (event.clientX - drag.x) * 0.009;
      drag.dt = now - drag.last;
      target += drag.delta;
      if (photos) target = Math.max(-0.5, Math.min(0.5, target));
      drag.x = event.clientX;
      drag.last = now;
    } else if (!compact && event.pointerType === "mouse") {
      pointer.set(
        (event.clientX - bounds.left) / bounds.width - 0.5,
        (event.clientY - bounds.top) / bounds.height - 0.5,
      );
    }
    wake();
  }
  function up(event) {
    if (!drag) return;
    velocity =
      photos || event.type === "pointercancel"
        ? 0
        : releaseVelocity(
            drag.delta,
            Math.max(drag.dt, performance.now() - drag.last),
          );
    drag = null;
    delete host.dataset.dragging;
    if (host.hasPointerCapture(event.pointerId))
      host.releasePointerCapture(event.pointerId);
    if (photos) target = -0.12;
    wake();
  }
  function leave() {
    pointer.set(0, 0);
  }
  function tick(time) {
    frame = 0;
    if (disposed || lost || !visible || paused || document.hidden) {
      last = 0;
      return;
    }
    const dt = last ? Math.min((time - last) / 1000, 0.05) : 1 / 60;
    last = time;
    age += dt;
    if (!drag && Math.abs(velocity) > 0.00001) {
      target += velocity * dt * 1000;
      velocity *= Math.exp(-dt * 5);
    }
    turn += (target - turn) * (1 - Math.exp(-dt * 12));
    currentZoom += (zoom - currentZoom) * (1 - Math.exp(-dt * 10));
    travel += (progress - travel) * (1 - Math.exp(-dt * 6));
    cursor.lerp(pointer, 1 - Math.exp(-dt * 5));
    const galleryMoving =
      photos &&
      exhibits.some(
        (item, i) => Math.abs(item.position.x - (i - selected) * 4.9) > 0.002,
      );
    const moving =
      drag ||
      galleryMoving ||
      cursor.distanceTo(pointer) > 0.002 ||
      Math.abs(target - turn) > 0.002 ||
      Math.abs(zoom - currentZoom) > 0.002 ||
      Math.abs(progress - travel) > 0.001 ||
      age < 2.2;
    if (!moving && time - painted < 1000 / 24) {
      wake();
      return;
    }
    painted = time;
    const entrance = 1 - Math.pow(1 - Math.min(age / 1.8, 1), 3);
    rings.rotation.z = orbit ? Math.sin(age * 0.15) * 0.12 : 0;
    if (market) {
      camera.position.set(
        7 - entrance * 3 + cursor.x * 1.3 + travel * 1.5,
        4.7 - entrance * 1.4 + travel * 1.2,
        20 - entrance * 4 - travel * 5,
      );
      camera.lookAt(compact ? 3.4 : 0.7, 0.8, -2.5);
      exhibits.forEach((item, i) => {
        item.position.y = 1.4 + Math.sin(age * 0.45 + i * 2) * 0.22;
        item.rotation.y = -0.3 + Math.sin(age * 0.2 + i) * 0.2;
      });
    } else {
      const distance = photos ? 7 : 7.3;
      camera.position.set(
        cursor.x * 0.45,
        0.45 - cursor.y * 0.3,
        (distance + (1 - entrance) * 4 - currentZoom) *
          Math.max(1, 0.85 / camera.aspect),
      );
      camera.lookAt(0, -0.05, 0);
      subject.rotation.y =
        turn +
        (1 - entrance) * 1.2 +
        (orbit && !drag ? Math.sin(age * 0.4) * 0.12 : 0);
      subject.rotation.x = photos ? 0 : -0.06 + cursor.y * 0.07;
      subject.position.y = orbit ? Math.sin(age * 0.8) * 0.06 : 0;
      if (photos)
        exhibits.forEach((item, i) => {
          const offset = i - selected;
          item.position.x +=
            (offset * 4.9 - item.position.x) * (1 - Math.exp(-dt * 8));
          item.position.z +=
            ((offset ? -1.1 : 0) - item.position.z) * (1 - Math.exp(-dt * 8));
          item.rotation.y +=
            ((offset ? -Math.sign(offset) * 0.18 : 0) - item.rotation.y) *
            (1 - Math.exp(-dt * 8));
        });
      else {
        const next = caseSide(turn);
        if (side !== next) {
          side = next;
          onSide?.(side);
        }
      }
    }
    renderer.render(scene, camera);
    if (market || orbit || moving) wake();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    resizeObserver?.disconnect();
    observer?.disconnect();
    document.removeEventListener("visibilitychange", visibility);
    for (const [name, fn] of [
      ["pointerdown", down],
      ["pointermove", move],
      ["pointerup", up],
      ["pointercancel", up],
      ["pointerleave", leave],
    ])
      host.removeEventListener(name, fn);
    renderer?.domElement.removeEventListener("webglcontextlost", unavailable);
    resources.forEach((resource) => resource.dispose());
    scene.clear();
    renderer?.dispose();
    renderer?.forceContextLoss();
    renderer?.domElement.remove();
  }
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !compact,
      powerPreference: compact ? "low-power" : "default",
    });
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    host.appendChild(renderer.domElement);
    const floor = mesh(
      keep(new THREE.CircleGeometry(market ? 35 : 7, compact ? 48 : 80)),
      dark,
      [0, -2.15, -2],
    );
    floor.rotation.x = -Math.PI / 2;
    for (let i = 0; i < (market ? 6 : 3); i++) {
      const ring = mesh(
        keep(
          new THREE.TorusGeometry(
            market ? 6 : 3.2 + i * 0.45,
            0.014,
            4,
            compact ? 64 : 100,
          ),
        ),
        light,
        [
          market ? 3 : 0,
          market ? 1.6 : -0.2,
          market ? -i * 7 - 3 : -1.5 - i * 0.4,
        ],
        null,
        rings,
      );
      ring.rotation.z = i * 0.15;
    }
    if (market) {
      const columns = keep(new THREE.InstancedMesh(box, dark, 24)),
        transform = new THREE.Object3D();
      for (let i = 0; i < 24; i++) {
        transform.position.set(i % 2 ? 10 : -6, 2.5, -Math.floor(i / 2) * 5);
        transform.scale.set(0.3, 10, 0.4);
        transform.updateMatrix();
        columns.setMatrixAt(i, transform.matrix);
      }
      scene.add(columns);
      images.slice(0, 3).forEach((item, i) => {
        const model = makeCase(item.src, item.title, subject);
        model.position.set([1, 4, 7][i], 1.4, [-4, 0, -5][i]);
        exhibits.push(model);
      });
      const grid = new THREE.GridHelper(70, 35, "#69896d", "#263f49");
      grid.position.set(1, -2.12, -20);
      keep(grid.geometry);
      keep(grid.material);
      scene.add(grid);
    } else if (photos) {
      images.forEach((item, i) => {
        const group = new THREE.Group();
        subject.add(group);
        exhibits.push(group);
        group.position.x = i * 4.9;
        const panel = mesh(box, dark, [0, 0, -0.08], [4.35, 3.35, 0.13], group);
        const material = keep(
          new THREE.MeshBasicMaterial({ color: "#172333" }),
        );
        const plane = mesh(
          keep(new THREE.PlaneGeometry(1, 1)),
          material,
          [0, 0, 0],
          [4.2, 3.2, 1],
          group,
        );
        texture(item.src, (map) => {
          const [w, h] = fitPhoto(map.image.width, map.image.height);
          plane.scale.set(w, h, 1);
          panel.scale.set(w + 0.12, h + 0.12, 0.13);
          material.map = map;
          material.color.set("#ffffff");
          material.needsUpdate = true;
        });
      });
    } else makeCase(images[0].src, title, subject);
    for (const [name, fn] of [
      ["pointerdown", down],
      ["pointermove", move],
      ["pointerup", up],
      ["pointercancel", up],
      ["pointerleave", leave],
    ])
      host.addEventListener(name, fn, { passive: true });
    renderer.domElement.addEventListener("webglcontextlost", unavailable);
    document.addEventListener("visibilitychange", visibility);
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) wake();
      else stop();
    });
    observer.observe(host);
    resize();
    wake();
    return {
      setPaused(value) {
        paused = value;
        if (paused) {
          velocity = 0;
          drag = null;
          stop();
        } else wake();
      },
      setProgress(value) {
        progress = clamp01(value);
        wake();
      },
      rotate(amount) {
        velocity = 0;
        target += amount;
        wake();
      },
      reset() {
        velocity = 0;
        target = -0.3;
        zoom = 0;
        pointer.set(0, 0);
        wake();
      },
      setZoom(value) {
        zoom = value ? 1.4 : 0;
        wake();
      },
      setOrbit(value) {
        orbit = value;
        wake();
      },
      select(value) {
        selected = Math.max(0, Math.min(images.length - 1, value));
        target = -0.12;
        wake();
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
