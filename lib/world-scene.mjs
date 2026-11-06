import * as THREE from "three";

// A continuous camera journey through artwork in 3D space. Rendering sleeps
// when the camera settles, the section leaves view, or motion is disabled.
export function createWorldScene(
  host,
  games,
  { paused = false, onReady, onUnavailable },
) {
  const resources = new Set(),
    scene = new THREE.Scene();
  const track = (resource) => {
    resources.add(resource);
    return resource;
  };
  let renderer,
    observer,
    visibilityObserver,
    disposed = false,
    lost = false,
    visible = true,
    frame = 0,
    target = 0,
    current = 0,
    last = 0;
  const compact = window.matchMedia(
    "(max-width: 700px), (pointer: coarse)",
  ).matches;
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 70);
  const look = new THREE.Vector3();
  scene.fog = new THREE.Fog(0x070b14, 12, 43);
  function draw() {
    if (disposed || lost) return;
    const between = Math.sin((current % 1) * Math.PI);
    camera.position.set(
      current * 11 + Math.sin(current * Math.PI) * 0.7,
      0.18 + between * 0.65,
      7.1 - current * 7 + between * 2.2,
    );
    look.set(current * 11, 0, -current * 7);
    camera.lookAt(look);
    camera.rotateZ(Math.sin(current * Math.PI) * 0.025);
    renderer.render(scene, camera);
  }
  function tick(time) {
    frame = 0;
    if (paused || !visible || document.hidden || disposed || lost) {
      last = 0;
      return;
    }
    const dt = last ? Math.min((time - last) / 1000, 0.05) : 1 / 60;
    last = time;
    current += (target - current) * (1 - Math.exp(-dt * 8));
    if (Math.abs(target - current) < 0.0005) current = target;
    draw();
    if (current !== target) frame = requestAnimationFrame(tick);
    else last = 0;
  }
  function wake() {
    if (!frame && !disposed && !lost && visible && !paused && !document.hidden)
      frame = requestAnimationFrame(tick);
  }
  function visibility() {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
    } else wake();
  }
  function contextLost(event) {
    event.preventDefault();
    lost = true;
    cancelAnimationFrame(frame);
    frame = 0;
    onUnavailable?.();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    observer?.disconnect();
    visibilityObserver?.disconnect();
    document.removeEventListener("visibilitychange", visibility);
    renderer?.domElement.removeEventListener("webglcontextlost", contextLost);
    resources.forEach((resource) => resource.dispose());
    scene.clear();
    renderer?.dispose();
    renderer?.forceContextLoss();
    renderer?.domElement.remove();
  }
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: !compact,
      alpha: false,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, compact ? 1 : 1.5),
    );
    renderer.setClearColor(0x070b14, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    host.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xbad7ef, 0x0b1021, 3));
    const light = new THREE.DirectionalLight(0xc6e8ff, 3);
    light.position.set(-3, 6, 8);
    scene.add(light);
    const loader = new THREE.TextureLoader();
    games.forEach((game, index) => {
      const world = new THREE.Group();
      world.position.set(index * 11, 0, -index * 7);
      world.rotation.y = index % 2 ? -0.09 : 0.045;
      scene.add(world);
      const casing = new THREE.Mesh(
        track(new THREE.BoxGeometry(10.3, 6.15, 0.32)),
        track(
          new THREE.MeshStandardMaterial({
            color: 0x192533,
            roughness: 0.4,
            metalness: 0.6,
          }),
        ),
      );
      world.add(casing);
      const imageMaterial = track(
        new THREE.MeshBasicMaterial({ color: 0x111c2a }),
      );
      const image = new THREE.Mesh(
        track(new THREE.PlaneGeometry(10, 5.85)),
        imageMaterial,
      );
      image.position.z = 0.18;
      world.add(image);
      loader.load(
        game.hero,
        (texture) => {
          if (disposed) {
            texture.dispose();
            return;
          }
          track(texture);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = Math.min(
            4,
            renderer.capabilities.getMaxAnisotropy(),
          );
          imageMaterial.map = texture;
          imageMaterial.color.set(0xffffff);
          imageMaterial.needsUpdate = true;
          draw();
          if (index === 0) onReady?.();
        },
        undefined,
        () => {
          if (!disposed && index === 0) onUnavailable?.();
        },
      );
      const edgeMaterial = track(
        new THREE.MeshBasicMaterial({ color: game.color || 0xc1ef76 }),
      );
      for (const y of [-3.12, 3.12]) {
        const rail = new THREE.Mesh(
          track(new THREE.BoxGeometry(10.5, 0.022, 0.04)),
          edgeMaterial,
        );
        rail.position.set(0, y, 0.2);
        world.add(rail);
      }
      for (const x of [-5.24, 5.24]) {
        const post = new THREE.Mesh(
          track(new THREE.BoxGeometry(0.045, 6.3, 0.12)),
          edgeMaterial,
        );
        post.position.set(x, 0, 0);
        world.add(post);
      }
      const floor = new THREE.GridHelper(
        16,
        16,
        game.color || 0xc1ef76,
        0x20303c,
      );
      track(floor.geometry);
      track(floor.material);
      floor.material.transparent = true;
      floor.material.opacity = 0.25;
      floor.position.y = -3.5;
      world.add(floor);
    });
    const vertices = [];
    for (let i = 0; i < (compact ? 90 : 180); i++)
      vertices.push(
        Math.sin(i * 2.4) * 9 + 11,
        Math.cos(i * 1.9) * 6,
        6 - (i % 37),
      );
    const geometry = track(new THREE.BufferGeometry());
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    scene.add(
      new THREE.Points(
        geometry,
        track(
          new THREE.PointsMaterial({
            color: 0xa4b3da,
            size: 0.018,
            transparent: true,
            opacity: 0.5,
          }),
        ),
      ),
    );
    function resize() {
      if (disposed || lost) return;
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.fov = compact ? 56 : 48;
      camera.updateProjectionMatrix();
      draw();
    }
    observer = new ResizeObserver(resize);
    observer.observe(host);
    visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) wake();
      else {
        cancelAnimationFrame(frame);
        frame = 0;
        last = 0;
      }
    });
    visibilityObserver.observe(host);
    document.addEventListener("visibilitychange", visibility);
    renderer.domElement.addEventListener("webglcontextlost", contextLost);
    resize();
    return {
      setProgress(value) {
        target = THREE.MathUtils.clamp(value, 0, games.length - 1);
        if (paused) {
          current = target;
          draw();
        } else wake();
      },
      setPaused(value) {
        paused = value;
        if (paused) {
          cancelAnimationFrame(frame);
          frame = 0;
          last = 0;
        } else wake();
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
