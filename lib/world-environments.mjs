import * as THREE from "three";

const noise = (n) => {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};

// Original, lightweight scenery. Game artwork is used only as a distant backdrop.
// Instanced architecture and shared geometry keep the mobile draw count bounded.
export function buildEnvironment(
  index,
  game,
  { compact, track, glowTexture, loadTexture },
) {
  const scene = new THREE.Scene();
  const palettes = [
    { sky: "#0b1722", haze: "#6b795d", ground: "#303b32", sun: "#ffe1a0" },
    { sky: "#080e28", haze: "#2c315d", ground: "#121c30", sun: "#83edeb" },
    { sky: "#3f2440", haze: "#c77f69", ground: "#8d4b3b", sun: "#ffd1a0" },
  ];
  const palette = palettes[index];
  scene.background = new THREE.Color(palette.sky);
  scene.fog = new THREE.FogExp2(palette.haze, index === 1 ? 0.018 : 0.012);
  scene.add(
    new THREE.HemisphereLight(
      palette.sun,
      palette.sky,
      index === 1 ? 1.7 : 2.8,
    ),
  );
  const sunlight = new THREE.DirectionalLight(
    palette.sun,
    index === 1 ? 2.2 : 3.5,
  );
  sunlight.position.set(index === 2 ? -18 : 9, 30, -25);
  scene.add(sunlight);
  const root = new THREE.Group();
  scene.add(root);
  const box = track(new THREE.BoxGeometry(1, 1, 1));
  const stone = track(
    new THREE.MeshStandardMaterial({
      color: palette.ground,
      roughness: 0.94,
      flatShading: true,
    }),
  );
  const basic = (color, options = {}) =>
    track(new THREE.MeshBasicMaterial({ color, ...options }));
  function mesh(
    geometry,
    material,
    position,
    scale = [1, 1, 1],
    parent = root,
  ) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(...position);
    object.scale.set(...scale);
    parent.add(object);
    return object;
  }
  function instances(geometry, material, items) {
    const object = track(new THREE.InstancedMesh(geometry, material, items.length)),
      transform = new THREE.Object3D();
    items.forEach((item, i) => {
      transform.position.set(...item.p);
      transform.scale.set(...item.s);
      transform.rotation.set(...(item.r || [0, 0, 0]));
      transform.updateMatrix();
      object.setMatrixAt(i, transform.matrix);
    });
    object.instanceMatrix.needsUpdate = true;
    root.add(object);
    return object;
  }
  function glow(color, position, size, opacity = 0.2) {
    const material = track(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    const sprite = new THREE.Sprite(material);
    sprite.position.set(...position);
    sprite.scale.set(size, size, 1);
    root.add(sprite);
    return sprite;
  }
  const skyUniforms = {
    top: { value: new THREE.Color(palette.sky) },
    bottom: { value: new THREE.Color(palette.haze) },
    art: { value: null },
    hasArt: { value: 0 },
    aspect: { value: 1 },
    artAspect: { value: 16 / 9 },
    artStrength: { value: index === 0 ? 0.16 : index === 1 ? 0.025 : 0.08 },
  };
  const sky = mesh(
    track(new THREE.PlaneGeometry(2, 2)),
    track(
      new THREE.ShaderMaterial({
        uniforms: skyUniforms,
        depthTest: false,
        depthWrite: false,
        vertexShader:
          "varying vec2 vUv; void main(){vUv=uv; gl_Position=vec4(position.xy,1.,1.);}",
        fragmentShader: `varying vec2 vUv; uniform vec3 top,bottom; uniform sampler2D art; uniform float hasArt,aspect,artAspect,artStrength;
      void main(){vec2 uv=vUv; float ratio=aspect/artAspect; if(ratio<1.)uv.x=(uv.x-.5)*ratio+.5;else uv.y=(uv.y-.5)/ratio+.5;
      vec3 color=mix(bottom,top,smoothstep(.05,1.,vUv.y));
      if(hasArt>.5)color=mix(color,texture2D(art,uv).rgb,artStrength);
      gl_FragColor=vec4(color,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
      }),
    ),
    [0, 0, 0],
  );
  sky.renderOrder = -1000;
  sky.frustumCulled = false;
  loadTexture(game.hero, (texture) => {
    skyUniforms.art.value = texture;
    skyUniforms.hasArt.value = 1;
    skyUniforms.artAspect.value = texture.image.width / texture.image.height;
  });

  const terrain = track(
    new THREE.PlaneGeometry(190, 190, compact ? 32 : 56, compact ? 32 : 56),
  );
  terrain.rotateX(-Math.PI / 2);
  const vertices = terrain.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i),
      z = vertices.getZ(i);
    const road = Math.min(1, Math.abs(x) / 12);
    const height =
      index === 1
        ? 0
        : (Math.sin(x * 0.16 + z * 0.08) * 1.1 + Math.cos(z * 0.19) * 0.7) *
          road;
    vertices.setY(i, height - 1.4);
  }
  terrain.computeVertexNormals();
  mesh(terrain, stone, [0, 0, -40]);
  const floaters = new THREE.Group();
  root.add(floaters);
  let landmark;

  if (index === 0) {
    const ringCenter = [5, 9, -28],
      radius = 8;
    const ruins = [];
    for (let i = 0; i < 30; i++) {
      if (i === 8 || i === 9 || i === 20) continue;
      const angle = (i / 30) * Math.PI * 2;
      ruins.push({
        p: [
          ringCenter[0] + Math.cos(angle) * radius,
          ringCenter[1] + Math.sin(angle) * radius,
          ringCenter[2],
        ],
        s: [1.45, 1.8, 1.6],
        r: [noise(i) * 0.1, 0, angle],
      });
    }
    for (let i = 0; i < 16; i++) {
      const side = i % 2 ? -1 : 1,
        h = 4 + noise(i + 7) * 10;
      ruins.push({
        p: [side * (8 + noise(i) * 14), h / 2 - 1, 10 - Math.floor(i / 2) * 10],
        s: [1.4 + noise(i) * 2, h, 1.7],
        r: [noise(i) * 0.12, noise(i) * 0.4, side * 0.07],
      });
    }
    instances(box, stone, ruins);
    landmark = mesh(
      track(new THREE.TorusGeometry(7.15, 0.055, 6, compact ? 64 : 100)),
      basic("#ffdc81"),
      ringCenter,
    );
    mesh(
      track(new THREE.TorusGeometry(6.7, 0.018, 4, 80, Math.PI * 1.65)),
      basic("#ffeab3"),
      [5, 9, -27.8],
    ).rotation.z = 0.6;
    glow("#ffd16d", [5, 9, -29], 29, 0.55);
    glow("#d8ca9b", [-9, 13, -45], 32, 0.26);
    const shards = [],
      shardGeometry = track(new THREE.OctahedronGeometry(1, 0));
    for (let i = 0; i < (compact ? 14 : 25); i++) {
      const shard = mesh(
        shardGeometry,
        stone,
        [
          Math.sin(i * 2.4) * 14 + 5,
          4 + noise(i) * 17,
          -18 - noise(i + 4) * 20,
        ],
        [0.35 + noise(i), 0.5 + noise(i + 2), 0.4],
        floaters,
      );
      shard.rotation.set(i, i * 0.3, i * 0.7);
      shards.push(shard);
    }
    // Branching light gives the skyline an organic focal point beyond the gate.
    const branchMaterial = basic("#d6bd75");
    for (let i = 0; i < 11; i++) {
      const a = i * 2.4,
        length = 5 + noise(i) * 10;
      const points = [
        [7, -1, -51],
        [7.5, 9, -51],
        [
          7 + Math.cos(a) * length * 0.5,
          15 + noise(i) * 6,
          -51 + Math.sin(a) * 4,
        ],
        [
          7 + Math.cos(a) * length,
          20 + noise(i + 9) * 8,
          -51 + Math.sin(a) * 6,
        ],
      ].map((p) => new THREE.Vector3(...p));
      mesh(
        track(
          new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3(points),
            16,
            i ? 0.055 : 0.3,
            4,
            false,
          ),
        ),
        branchMaterial,
        [0, 0, 0],
      );
    }
  } else if (index === 1) {
    const buildings = [],
      windows = [],
      rails = [];
    const buildingMaterial = track(
      new THREE.MeshStandardMaterial({
        color: "#182238",
        metalness: 0.62,
        roughness: 0.4,
      }),
    );
    for (let i = 0; i < (compact ? 30 : 44); i++) {
      const side = i % 2 ? -1 : 1,
        z = 12 - Math.floor(i / 2) * 5.6;
      const x = side * (9 + noise(i + 10) * 12),
        h = 8 + noise(i + 30) * 24,
        w = 3 + noise(i + 40) * 3.5;
      buildings.push({ p: [x, h / 2 - 1.2, z], s: [w, h, 4] });
      rails.push({
        p: [x - (side * w) / 2, h / 2, z + 2.04],
        s: [0.075, h, 0.08],
      });
      for (let y = 2; y < h - 1; y += compact ? 3.7 : 2.7) {
        windows.push({ p: [x, y, z + 2.05], s: [w * 0.72, 0.12, 0.04] });
      }
    }
    instances(box, buildingMaterial, buildings);
    instances(box, basic("#69c8d3"), windows);
    instances(box, basic("#c45b99"), rails);
    const road = track(
      new THREE.MeshStandardMaterial({
        color: "#0d2032",
        metalness: 0.6,
        roughness: 0.27,
      }),
    );
    mesh(box, road, [0, -1.32, -35], [13, 0.05, 140]);
    const lanes = [],
      reflections = [];
    for (let i = 0; i < 35; i++) {
      lanes.push({ p: [0, -1.27, 14 - i * 4], s: [0.1, 0.02, 1.7] });
      reflections.push({
        p: [(i % 2 ? -1 : 1) * (3 + noise(i) * 2), -1.25, 14 - i * 3],
        s: [0.1 + noise(i) * 0.3, 0.02, 2.5],
      });
    }
    instances(box, basic("#80b9c3"), lanes);
    instances(box, basic("#b75b9a"), reflections);
    mesh(box, basic("#a7f1ed"), [-7, 7, -21], [0.1, 6, 0.2]);
    mesh(box, basic("#ff739d"), [7, 8, -32], [0.1, 9, 0.2]);
    const bridge = mesh(box, buildingMaterial, [0, 16, -38], [25, 2, 3]);
    mesh(box, basic("#a7f1ed"), [0, 15, -36.4], [20, 0.06, 0.1]);
    glow("#467cff", [0, 15, -58], 55, 0.6);
    glow("#fc4ab1", [9, 7, -19], 18, 0.22);
    landmark = bridge;
    const traffic = track(new THREE.BoxGeometry(0.6, 0.12, 1.4));
    for (let i = 0; i < 12; i++)
      mesh(
        traffic,
        basic(i % 2 ? "#ff7597" : "#a7f1ed"),
        [i % 2 ? -2.5 : 2.5, -0.7, -i * 9],
        [1, 1, 1],
        floaters,
      );
  } else {
    const mesas = [],
      rocks = [],
      cactus = [];
    const mesaGeometry = track(new THREE.CylinderGeometry(1.5, 3, 1, 7));
    const rockGeometry = track(new THREE.DodecahedronGeometry(1, 0));
    for (let i = 0; i < 22; i++) {
      const side = i % 2 ? -1 : 1,
        h = 4 + noise(i + 19) * 12;
      mesas.push({
        p: [
          side * (10 + noise(i) * 30),
          h / 2 - 2,
          -15 - Math.floor(i / 2) * 7,
        ],
        s: [2 + noise(i) * 3, h, 2 + noise(i + 2) * 2],
        r: [0, i, 0],
      });
    }
    for (let i = 0; i < (compact ? 35 : 60); i++)
      rocks.push({
        p: [(noise(i) - 0.5) * 65, -0.65, 10 - noise(i + 3) * 90],
        s: [0.5 + noise(i), 0.3 + noise(i) * 0.5, 0.5 + noise(i + 7)],
        r: [0, i, 0.2],
      });
    instances(mesaGeometry, stone, mesas);
    instances(rockGeometry, stone, rocks);
    const dark = track(
      new THREE.MeshStandardMaterial({ color: "#342c27", roughness: 1 }),
    );
    for (let i = 0; i < 18; i++) {
      const x = (i % 2 ? -1 : 1) * (6 + noise(i) * 13),
        z = 8 - i * 4,
        h = 1.4 + noise(i) * 2;
      cactus.push({ p: [x, h / 2 - 1, z], s: [0.2, h, 0.2] });
      cactus.push({ p: [x + 0.35, h * 0.6 - 1, z], s: [0.8, 0.15, 0.17] });
      cactus.push({ p: [x + 0.7, h * 0.72 - 1, z], s: [0.16, h * 0.3, 0.17] });
    }
    instances(box, dark, cactus);
    const fence = [];
    for (let i = 0; i < 16; i++) {
      fence.push({
        p: [-4.8, -0.2, 10 - i * 3],
        s: [0.12, 1.8, 0.12],
        r: [0, 0, -0.08],
      });
      fence.push({ p: [-4.8, 0.2, 8.5 - i * 3], s: [0.08, 0.09, 3] });
    }
    instances(box, dark, fence);
    landmark = mesh(
      track(new THREE.CircleGeometry(8, 48)),
      basic("#ffd4a4", { fog: false }),
      [-14, 16, -78],
    );
    glow("#ffaf78", [-14, 16, -77], 55, 0.65);
  }
  const particlesGeometry = track(new THREE.BufferGeometry()),
    positions = [];
  for (let i = 0; i < (compact ? 100 : 230); i++)
    positions.push(
      (noise(i + index * 13) - 0.5) * 58,
      noise(i + 10) * 26,
      14 - noise(i + 5) * 85,
    );
  particlesGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  const particles = new THREE.Points(
    particlesGeometry,
    track(
      new THREE.PointsMaterial({
        color: palette.sun,
        map: glowTexture,
        size: index === 1 ? 0.09 : 0.16,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    ),
  );
  root.add(particles);
  const paths = [
    [
      [-2, 3.2, 18],
      [-4, 4.2, 5],
      [1, 5.5, -7],
      [5, 7.5, -19],
    ],
    [
      [6, 7, 19],
      [-1, 3.8, 4],
      [-3, 6, -12],
      [1, 12, -30],
    ],
    [
      [7, 5.5, 20],
      [2, 3, 7],
      [-2, 4.5, -5],
      [0, 8, -18],
    ],
  ];
  const path = new THREE.CatmullRomCurve3(
    paths[index].map((p) => new THREE.Vector3(...p)),
  );
  const focus = new THREE.Vector3(
    ...[
      [5, 8, -32],
      [0, 9, -52],
      [-5, 6, -65],
    ][index],
  );
  return {
    scene,
    path,
    focus,
    resize(aspect) {
      skyUniforms.aspect.value = aspect;
    },
    update(time, phase) {
      particles.position.y = Math.sin(time * 0.17) * 0.35;
      particles.rotation.y = Math.sin(time * 0.045) * 0.025;
      if (index === 0) {
        floaters.position.y = Math.sin(time * 0.6) * 0.3;
        floaters.rotation.y = phase * 0.06;
        landmark.rotation.z = time * 0.012;
      }
      if (index === 1) floaters.position.z = (time * 1.4) % 9;
    },
  };
}
