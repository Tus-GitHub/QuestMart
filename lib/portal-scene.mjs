// Loaded only when a visitor chooses the portal. One canvas, a finite camera
// flight, and no postprocessing buffers or remote 3D assets on mobile.
import * as THREE from "three";

export function createPortalScene(host, { onFinish, onUnavailable }) {
  const resources = new Set();
  const track = (resource) => {
    resources.add(resource);
    return resource;
  };
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 70);
  const compact = window.matchMedia(
    "(max-width: 700px), (pointer: coarse)",
  ).matches;
  let renderer,
    observer,
    disposed = false,
    elapsed = 0,
    lastTime = 0,
    finished = false;
  const duration = compact ? 3.5 : 4.2;
  const gate = new THREE.Group();
  const rings = [];
  const uniforms = { time: { value: 0 } };
  function mesh(geometry, material, parent = gate) {
    const item = new THREE.Mesh(track(geometry), track(material));
    parent.add(item);
    return item;
  }
  function stop() {
    renderer?.setAnimationLoop(null);
  }
  function lost(event) {
    event.preventDefault();
    stop();
    if (!finished && !disposed) {
      finished = true;
      onUnavailable?.();
    }
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    observer?.disconnect();
    document.removeEventListener("visibilitychange", visibility);
    renderer?.domElement.removeEventListener("webglcontextlost", lost);
    resources.forEach((resource) => resource.dispose());
    scene.clear();
    renderer?.dispose();
    renderer?.forceContextLoss();
    renderer?.domElement.remove();
  }
  function visibility() {
    lastTime = 0;
    if (!disposed && !finished)
      renderer?.setAnimationLoop(document.hidden ? null : animate);
  }
  function animate(time) {
    if (disposed || finished) return;
    elapsed += lastTime ? Math.min((time - lastTime) / 1000, 0.06) : 0;
    lastTime = time;
    const p = Math.min(elapsed / duration, 1);
    const travel = p * p * (3 - 2 * p);
    uniforms.time.value = elapsed;
    camera.position.set(
      (1 - travel) * 0.65,
      (1 - travel) * 0.26,
      8.6 - travel * 13,
    );
    camera.rotation.set(0, (1 - travel) * 0.055, Math.sin(p * Math.PI) * 0.035);
    gate.rotation.z = elapsed * 0.075;
    rings.forEach((ring, i) => {
      ring.rotation.z = elapsed * (i % 2 ? -0.28 : 0.23) + i;
    });
    host.style.setProperty("--flight", p.toFixed(4));
    host.parentElement.style.setProperty("--flight", p.toFixed(4));
    renderer.render(scene, camera);
    if (p === 1) {
      finished = true;
      stop();
      onFinish?.();
    }
  }
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !compact,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, compact ? 1.15 : 1.5),
    );
    renderer.setClearColor(0x05080e, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    host.appendChild(renderer.domElement);
    scene.add(gate, new THREE.HemisphereLight(0xc6dbff, 0x181122, 3));
    const light = new THREE.PointLight(0xb6ff71, 70, 15);
    light.position.set(-2, 1, 4);
    scene.add(light);
    const violet = new THREE.PointLight(0x9875ff, 85, 15);
    violet.position.set(2, -1, 3);
    scene.add(violet);
    mesh(
      new THREE.TorusGeometry(1.92, 0.16, 12, 100),
      new THREE.MeshStandardMaterial({
        color: 0x202a3b,
        metalness: 0.8,
        roughness: 0.3,
      }),
    );
    const energy = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexShader: `varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `uniform float time; varying vec2 vUv; void main(){float pulse=sin(vUv.x*180.-time*6.)*.25+sin(vUv.x*61.+time*3.)*.25+.5;vec3 color=mix(vec3(.48,.25,1.),vec3(.77,1.,.4),sin(vUv.x*18.+time)*.5+.5);float edge=pow(max(0.,1.-abs(vUv.y-.5)*2.),.65);gl_FragColor=vec4(color*(1.3+pulse),edge*.85);}`,
    });
    mesh(new THREE.TorusGeometry(1.76, 0.065, 12, 160), energy);
    for (let i = 0; i < 3; i++) {
      const halo = mesh(
        new THREE.TorusGeometry(1.76, 0.1 + i * 0.065, 8, 100),
        new THREE.MeshBasicMaterial({
          color: i % 2 ? 0x916bff : 0xc1ef76,
          transparent: true,
          opacity: 0.055 - i * 0.012,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      halo.position.z = -0.02;
      const ring = mesh(
        new THREE.TorusGeometry(2.13 + i * 0.21, 0.014, 5, 90, Math.PI * 1.4),
        new THREE.MeshBasicMaterial({
          color: i % 2 ? 0x987fff : 0xc1ef76,
          transparent: true,
          opacity: 0.75,
        }),
      );
      ring.position.z = -0.15 - i * 0.14;
      rings.push(ring);
    }
    const shardGeometry = track(new THREE.BoxGeometry(0.07, 0.24, 0.13));
    const shardMaterial = track(
      new THREE.MeshStandardMaterial({
        color: 0x7b929d,
        emissive: 0xc1ef76,
        emissiveIntensity: 0.22,
        metalness: 0.8,
        roughness: 0.3,
      }),
    );
    for (let i = 0; i < 36; i++) {
      const angle = (i / 36) * Math.PI * 2;
      const part = new THREE.Mesh(shardGeometry, shardMaterial);
      part.position.set(Math.cos(angle) * 1.93, Math.sin(angle) * 1.93, 0.15);
      part.rotation.z = angle;
      gate.add(part);
    }
    const vertices = [],
      colors = [];
    for (let i = 0; i < (compact ? 190 : 360); i++) {
      const angle = i * 2.39996,
        radius = 1.45 + (i % 17) * 0.2;
      vertices.push(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        -18 + (i % 31) * 0.8,
      );
      colors.push(i % 3 ? 0.75 : 0.6, i % 3 ? 0.95 : 0.5, i % 3 ? 0.6 : 1);
    }
    const geometry = track(new THREE.BufferGeometry());
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    scene.add(
      new THREE.Points(
        geometry,
        track(
          new THREE.PointsMaterial({
            size: compact ? 0.027 : 0.021,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        ),
      ),
    );
    function resize() {
      if (disposed) return;
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.fov = width < height ? 67 : 52;
      camera.updateProjectionMatrix();
    }
    observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    renderer.domElement.addEventListener("webglcontextlost", lost);
    document.addEventListener("visibilitychange", visibility);
    visibility();
    return { dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
