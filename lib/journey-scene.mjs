import * as THREE from "three";
import { buildEnvironment } from "./world-environments.mjs";
import { clamp01, renderScale, sampleJourney } from "./journey.mjs";

export function createWorldScene(
  host,
  games,
  { paused = false, onReady, onUnavailable },
) {
  const resources = new Set(),
    track = (resource) => {
      resources.add(resource);
      return resource;
    };
  const compact = window.matchMedia(
    "(max-width: 700px), (pointer: coarse)",
  ).matches;
  let renderer,
    resizeObserver,
    visibilityObserver,
    disposed = false,
    lost = false,
    visible = true;
  let frame = 0,
    target = 0,
    current = 0,
    last = 0,
    paintedAt = 0,
    elapsed = 0,
    slowFrames = 0,
    quality = 1;
  let width = 1,
    height = 1,
    bounds;
  const pointer = new THREE.Vector2(),
    cursor = new THREE.Vector2();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 180),
    cameraPosition = new THREE.Vector3(),
    focus = new THREE.Vector3();
  const worlds = [],
    stage = host.parentElement;
  let targets, composition, compositionCamera, uniforms;
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
  }
  function unavailable(event) {
    event?.preventDefault();
    lost = true;
    stop();
    onUnavailable?.();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    resizeObserver?.disconnect();
    visibilityObserver?.disconnect();
    document.removeEventListener("visibilitychange", visibility);
    stage?.removeEventListener("pointermove", move);
    stage?.removeEventListener("pointerleave", leave);
    renderer?.domElement.removeEventListener("webglcontextlost", unavailable);
    resources.forEach((resource) => resource.dispose());
    worlds.forEach((world) => world.scene.clear());
    composition?.clear();
    renderer?.dispose();
    renderer?.forceContextLoss();
    renderer?.domElement.remove();
  }
  function wake() {
    if (!frame && !disposed && !lost && visible && !paused && !document.hidden)
      frame = requestAnimationFrame(tick);
  }
  function visibility() {
    if (document.hidden) stop();
    else wake();
  }
  function move(event) {
    if (compact || paused || event.pointerType !== "mouse" || !bounds) return;
    pointer.set(
      (event.clientX - bounds.left) / bounds.width - 0.5,
      (event.clientY - bounds.top) / bounds.height - 0.5,
    );
  }
  function leave() {
    pointer.set(0, 0);
  }
  function resize() {
    if (disposed || lost) return;
    bounds = host.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    if (!width || !height) return;
    const ratio =
      renderScale(width, height, window.devicePixelRatio || 1, compact) *
      quality;
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    targets.forEach((target) =>
      target.setSize(
        Math.max(1, Math.round(width * ratio)),
        Math.max(1, Math.round(height * ratio)),
      ),
    );
    camera.aspect = width / height;
    uniforms.aspect.value = width / height;
    worlds.forEach((world) => world.resize(width / height));
    camera.updateProjectionMatrix();
    wake();
  }
  function renderWorld(index, phase, target, time) {
    const world = worlds[index];
    world.update(time, phase);
    world.path.getPoint(phase, cameraPosition);
    camera.position.copy(cameraPosition);
    camera.position.x += cursor.x * 0.9;
    camera.position.y -= cursor.y * 0.45;
    focus.copy(world.focus);
    focus.x += cursor.x * 0.3;
    camera.lookAt(focus);
    camera.rotateZ(Math.sin(phase * Math.PI) * (index === 1 ? -0.045 : 0.022));
    camera.fov =
      (width < height ? 62 : 49) +
      Math.sin(phase * Math.PI) * 5 +
      Math.max(0, phase - 0.76) * 23;
    camera.updateProjectionMatrix();
    renderer.setRenderTarget(target);
    renderer.render(world.scene, camera);
  }
  function tick(time) {
    frame = 0;
    if (disposed || lost || !visible || paused || document.hidden) {
      last = 0;
      return;
    }
    const dt = last ? Math.min((time - last) / 1000, 0.08) : 1 / 60;
    last = time;
    elapsed += dt;
    current += (target - current) * (1 - Math.exp(-dt * 9));
    if (Math.abs(target - current) < 0.00005) current = target;
    cursor.lerp(pointer, 1 - Math.exp(-dt * 5));
    // Full frame rate while travelling; 24fps atmosphere at rest. No background work.
    const moving =
      Math.abs(target - current) > 0.0001 || cursor.distanceTo(pointer) > 0.005;
    if (!moving && time - paintedAt < 1000 / 24) {
      wake();
      return;
    }
    if (moving && dt > 0.04) slowFrames++;
    else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames > 35 && quality > 0.72) {
      quality = Math.max(0.72, quality * 0.85);
      slowFrames = 0;
      resize();
    }
    paintedAt = time;
    const sample = sampleJourney(current);
    renderWorld(sample.segment, sample.phase, targets[0], elapsed);
    if (sample.blend > 0)
      renderWorld(sample.segment + 1, 0, targets[1], elapsed);
    uniforms.mixAmount.value = sample.blend;
    uniforms.clock.value = elapsed;
    uniforms.tint.value.set(["#ffe3a6", "#98edeb", "#ffc695"][sample.chapter]);
    renderer.setRenderTarget(null);
    renderer.render(composition, compositionCamera);
    wake();
  }
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: false,
      antialias: false,
      powerPreference: compact ? "low-power" : "default",
    });
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    host.appendChild(renderer.domElement);
    const glowCanvas = document.createElement("canvas");
    glowCanvas.width = glowCanvas.height = 64;
    const ctx = glowCanvas.getContext("2d"),
      gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.18, "rgba(255,255,255,.55)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const glowTexture = track(new THREE.CanvasTexture(glowCanvas));
    const loader = new THREE.TextureLoader();
    function loadTexture(url, callback) {
      loader.load(
        url,
        (texture) => {
          if (disposed) {
            texture.dispose();
            return;
          }
          track(texture);
          texture.colorSpace = THREE.SRGBColorSpace;
          callback(texture);
        },
        undefined,
        () => {},
      );
    }
    games.forEach((game, index) =>
      worlds.push(
        buildEnvironment(index, game, {
          compact,
          track,
          glowTexture,
          loadTexture,
        }),
      ),
    );
    const type = renderer.extensions.has("EXT_color_buffer_float")
      ? THREE.HalfFloatType
      : THREE.UnsignedByteType;
    targets = [0, 1].map(() =>
      track(
        new THREE.WebGLRenderTarget(1, 1, {
          type,
          depthBuffer: true,
          stencilBuffer: false,
        }),
      ),
    );
    uniforms = {
      first: { value: targets[0].texture },
      second: { value: targets[1].texture },
      mixAmount: { value: 0 },
      clock: { value: 0 },
      aspect: { value: 1 },
      tint: { value: new THREE.Color("#ffe3a6") },
    };
    composition = new THREE.Scene();
    compositionCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const material = track(
      new THREE.ShaderMaterial({
        uniforms,
        depthTest: false,
        depthWrite: false,
        vertexShader:
          "varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}",
        fragmentShader: `varying vec2 vUv; uniform sampler2D first,second; uniform float mixAmount,clock,aspect; uniform vec3 tint;
        float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
        void main(){vec2 p=(vUv-.5)*vec2(aspect,1.); float radius=length(p)/length(vec2(aspect*.5,.5));
          float edge=noise(p*8.+clock*.08)*.09; float opening=mixAmount*1.35-.17;
          float mask=mixAmount<=.001?0.:smoothstep(radius+edge-.07,radius+edge+.07,opening);
          float seam=4.*mask*(1.-mask)*sin(mixAmount*3.14159265);
          vec2 offset=normalize(p+vec2(.0001))*.013*seam;
          vec3 color=mix(texture2D(first,clamp(vUv+offset,0.,1.)).rgb,texture2D(second,clamp(vUv-offset,0.,1.)).rgb,mask);
          color+=tint*seam*.16; color*=1.-smoothstep(.28,1.1,radius)*.17;
          gl_FragColor=vec4(color,1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      }),
    );
    composition.add(
      new THREE.Mesh(track(new THREE.PlaneGeometry(2, 2)), material),
    );
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) wake();
      else stop();
    });
    visibilityObserver.observe(host);
    renderer.domElement.addEventListener("webglcontextlost", unavailable);
    document.addEventListener("visibilitychange", visibility);
    stage.addEventListener("pointermove", move, { passive: true });
    stage.addEventListener("pointerleave", leave);
    resize();
    onReady?.();
    wake();
    return {
      setProgress(value) {
        target = clamp01(value);
        wake();
      },
      setPaused(value) {
        paused = value;
        if (paused) stop();
        else wake();
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
