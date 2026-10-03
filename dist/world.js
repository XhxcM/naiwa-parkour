'use strict';

class ForestWorld {
  constructor(canvas) {
    const T = THREE;
    this.renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.scene = new T.Scene();
    this.scene.background = new T.Color('#b9ddd5');
    this.scene.fog = new T.Fog('#b9ddd5', 38, 128);

    this.camera = new T.PerspectiveCamera(53, 1, 0.1, 180);
    this.camera.position.set(0, 5.8, 10);
    this.camera.lookAt(0, 1.05, -23);

    this.scene.add(new T.HemisphereLight(0xf1fbdf, 0x4d693d, 2.3));
    const sun = new T.DirectionalLight(0xffdf9a, 3.1);
    sun.position.set(-12, 25, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -42, near: 0.5, far: 85 });
    sun.shadow.bias = -0.001;
    sun.shadow.normalBias = 0.035;
    sun.target.position.set(0, 0, -20);
    this.scene.add(sun, sun.target);

    this.materials = {};
    const colors = {
      grass: 0x74a948, grassDark: 0x4d843b, grassBright: 0x8fcd38,
      dirt: 0xdab77d, dirtEdge: 0xb99259, mark: 0xb58d58,
      bark: 0x7d4c2d, barkLight: 0xa76732, leaf: 0x2f8747,
      leafLight: 0x65b936, leafBright: 0x89d231, pine: 0x17703f,
      pineLight: 0x29934d, rock: 0x829092, rockLight: 0xaeb9b4,
      yellow: 0xf8bd28, yellowLight: 0xffd247, belly: 0xffe2a0, bellyLight: 0xffedbd,
      claw: 0x54483e, eye: 0x2aa75b, eyeDark: 0x092b22, white: 0xffffff,
      mouth: 0x41291e, red: 0xe93d2f, cream: 0xfff4dc,
      navy: 0x344b59, steel: 0x6c8290, warning: 0xffcf24,
      christmas: 0xc9362e, pajama: 0x617cb8, pajamaLight: 0x9db5dc,
      space: 0xe8ecea, spaceBlue: 0x6ca8c1, explorer: 0x4f7b42,
      explorerLight: 0x83a84f, leather: 0x8a572f, gold: 0xe6aa30
    };
    for (const [name, color] of Object.entries(colors)) {
      this.materials[name] = new T.MeshStandardMaterial({ color, roughness: 0.88, flatShading: true });
    }

    this.tiles = [];
    for (let i = 0; i < 14; i += 1) {
      const tile = new T.Group();
      this.box(tile, 160, 0.15, 12, 0, -0.13, 0, i % 2 ? 'grass' : 'grassDark', false);
      this.box(tile, 7.7, 0.13, 12, 0, -0.04, 0, 'dirtEdge', false);
      this.box(tile, 7.2, 0.14, 12, 0, -0.025, 0, 'dirt', false);
      for (const x of [-1.2, 1.2]) this.box(tile, 0.035, 0.006, 12, x, 0.05, 0, 'mark', false);
      for (let j = 0; j < 18; j += 1) {
        const x = Math.sin(i * 72 + j * 53) * 3.4;
        const z = Math.cos(i * 45 + j * 29) * 5.7;
        this.box(tile, 0.035 + (j % 3) * 0.02, 0.008, 0.12 + (j % 4) * 0.07, x, 0.051, z, j % 2 ? 'dirtEdge' : 'mark', false);
      }
      tile.userData.offset = i * 12;
      this.scene.add(tile);
      this.tiles.push(tile);
    }

    this.scenery = [];
    for (let i = 0; i < 120; i += 1) {
      const side = i % 2 ? -1 : 1;
      const row = Math.floor(i / 2);
      const x = side * (5.1 + (row % 3) * 3.8 + this.hash(i) * 2.2);
      let prop;
      if (row % 5 === 0) prop = this.broadleaf(0.75 + this.hash(i + 7) * 0.5);
      else if (row % 4 === 0) prop = this.bush(0.8 + this.hash(i + 11) * 0.55);
      else if (row % 7 === 0) prop = this.rockCluster(0.7 + this.hash(i + 13) * 0.45);
      else prop = this.pine(0.72 + this.hash(i + 37) * 0.65);
      prop.position.x = x;
      prop.userData.offset = row * 2.6;
      this.scene.add(prop);
      this.scenery.push(prop);

      if (row % 2 === 0) {
        const grass = this.grassTuft(0.65 + this.hash(i + 19) * 0.65);
        grass.position.x = side * (4.3 + this.hash(i + 23) * 2.7);
        grass.userData.offset = row * 2.6 + 1.1;
        this.scene.add(grass);
        this.scenery.push(grass);
      }
    }

    for (let i = 0; i < 8; i += 1) {
      const mountain = new T.Mesh(
        new T.ConeGeometry(15 + (i % 3) * 4, 20 + (i % 4) * 5, 5),
        new T.MeshStandardMaterial({ color: i % 2 ? 0x8fb4a0 : 0xa2c5b2, flatShading: true })
      );
      mountain.position.set((i - 3.5) * 23, 8, -115);
      this.scene.add(mountain);
    }

    this.obstacles = new Map();
    this.menuTurn = 0;
    this.skinIndex = 0;
    this.player = this.makePlayer();
    this.scene.add(this.player);
  }

  hash(n) {
    return (Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1 * 0.5 + 0.5;
  }

  mesh(group, geometry, material, x, y, z, shadow = true) {
    const mesh = new THREE.Mesh(geometry, this.materials[material]);
    mesh.position.set(x, y, z);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  box(group, width, height, depth, x, y, z, material, shadow = true) {
    return this.mesh(group, new THREE.BoxGeometry(width, height, depth), material, x, y, z, shadow);
  }

  voxelBlob(group, x, y, z, scale, material) {
    const sizes = [
      [-0.55, 0, 0, 0.75], [0, 0.25, 0, 0.95], [0.55, 0, 0, 0.72],
      [-0.25, 0.65, 0, 0.72], [0.35, 0.68, 0, 0.65]
    ];
    for (const [dx, dy, dz, s] of sizes) this.box(group, s * scale, s * scale, s * scale, x + dx * scale, y + dy * scale, z + dz * scale, material);
  }

  pine(scale = 1) {
    const group = new THREE.Group();
    this.box(group, 0.42, 4.2, 0.42, 0, 2.1, 0, 'bark');
    const layers = [[3.6, 2.2], [4.7, 1.8], [5.65, 1.35]];
    for (const [y, width] of layers) {
      for (let level = 0; level < 3; level += 1) {
        const w = width * (1 - level * 0.23);
        this.box(group, w, 0.58, w, 0, y + level * 0.42, 0, level % 2 ? 'pineLight' : 'pine');
      }
    }
    group.scale.setScalar(scale);
    return group;
  }

  broadleaf(scale = 1) {
    const group = new THREE.Group();
    this.box(group, 0.62, 3.7, 0.62, 0, 1.85, 0, 'barkLight');
    this.voxelBlob(group, 0, 4.15, 0, 1.35, 'leaf');
    this.voxelBlob(group, -0.55, 4.65, 0.12, 0.92, 'leafLight');
    this.voxelBlob(group, 0.65, 4.45, -0.1, 0.82, 'leafBright');
    group.scale.setScalar(scale);
    return group;
  }

  bush(scale = 1) {
    const group = new THREE.Group();
    this.voxelBlob(group, 0, 0.48, 0, 0.95, 'leafLight');
    group.scale.setScalar(scale);
    return group;
  }

  grassTuft(scale = 1) {
    const group = new THREE.Group();
    for (let i = 0; i < 7; i += 1) {
      const blade = this.box(group, 0.18, 0.6 + (i % 3) * 0.18, 0.18, (i - 3) * 0.16, 0.32, (i % 2) * 0.16, i % 2 ? 'leafBright' : 'leafLight');
      blade.rotation.z = (i - 3) * 0.08;
    }
    group.scale.setScalar(scale);
    return group;
  }

  rockCluster(scale = 1) {
    const group = new THREE.Group();
    this.box(group, 0.75, 0.55, 0.72, -0.3, 0.28, 0, 'rock');
    this.box(group, 0.58, 0.42, 0.54, 0.35, 0.21, 0.1, 'rockLight');
    this.box(group, 0.44, 0.34, 0.4, 0.05, 0.17, -0.45, 'rock');
    group.scale.setScalar(scale);
    return group;
  }

  stripedRail(group, y, materialA = 'red', materialB = 'cream') {
    const segments = 6;
    for (let i = 0; i < segments; i += 1) {
      const x = -0.92 + i * 0.37;
      const bar = this.box(group, 0.39, 0.38, 0.28, x, y, 0, i % 2 ? materialB : materialA);
      bar.rotation.z = i % 2 ? -0.18 : 0.18;
    }
  }

  barrier(type) {
    const group = new THREE.Group();
    if (type === 'fence') {
      for (const x of [-1.12, 1.12]) {
        this.box(group, 0.28, 1.15, 0.34, x, 0.58, 0, 'navy');
        this.box(group, 0.46, 0.18, 0.48, x, 0.09, 0, 'steel');
        this.box(group, 0.38, 0.22, 0.4, x, 1.05, 0, 'red');
      }
      this.stripedRail(group, 0.76);
      return group;
    }

    const isHigh = type === 'highGate';
    const postHeight = isHigh ? 2.9 : 1.75;
    const railHeight = isHigh ? 2.08 : 1.48;
    for (const x of [-1.12, 1.12]) {
      this.box(group, 0.32, postHeight, 0.38, x, postHeight / 2, 0, 'navy');
      this.box(group, 0.5, 0.2, 0.52, x, 0.1, 0, 'steel');
      this.box(group, 0.44, 0.22, 0.44, x, postHeight - 0.08, 0, 'warning');
    }
    this.stripedRail(group, railHeight, 'warning', 'navy');
    if (isHigh) {
      for (const x of [-0.75, 0, 0.75]) this.box(group, 0.26, 0.72, 0.3, x, 1.68, 0, 'warning');
      this.stripedRail(group, 2.58, 'warning', 'navy');
    }
    return group;
  }

  fallenTree() {
    const group = new THREE.Group();
    const trunk = this.box(group, 2.5, 0.7, 0.72, 0, 0.78, 0, 'barkLight');
    trunk.rotation.z = -0.16;
    this.box(group, 0.78, 0.84, 0.82, -0.96, 0.77, 0, 'bark');
    this.voxelBlob(group, 0.78, 1.3, 0, 0.8, 'leaf');
    this.voxelBlob(group, 0.55, 2.05, 0.1, 0.62, 'leafLight');
    this.box(group, 0.34, 1.25, 0.34, 0.5, 1.5, 0, 'bark');
    return group;
  }

  obstacle(type) {
    return type === 'tree' ? this.fallenTree() : this.barrier(type);
  }

  voxelEllipsoid(group, rx, ry, rz, x, y, z, cell, materialNames) {
    const buckets = materialNames.map(() => []);
    const xCount = Math.ceil(rx / cell);
    const yCount = Math.ceil(ry / cell);
    const zCount = Math.ceil(rz / cell);

    for (let ix = -xCount; ix <= xCount; ix += 1) {
      for (let iy = -yCount; iy <= yCount; iy += 1) {
        for (let iz = -zCount; iz <= zCount; iz += 1) {
          const px = ix * cell;
          const py = iy * cell;
          const pz = iz * cell;
          const distance = (px / rx) ** 2 + (py / ry) ** 2 + (pz / rz) ** 2;
          if (distance > 1.04) continue;
          const shade = Math.abs(ix * 17 + iy * 31 + iz * 47) % materialNames.length;
          buckets[shade].push([x + px, y + py, z + pz]);
        }
      }
    }

    const geometry = new THREE.BoxGeometry(cell * 1.035, cell * 1.035, cell * 1.035);
    const matrix = new THREE.Matrix4();
    buckets.forEach((positions, index) => {
      if (!positions.length) return;
      const mesh = new THREE.InstancedMesh(geometry, this.materials[materialNames[index]], positions.length);
      positions.forEach((position, instance) => {
        matrix.makeTranslation(...position);
        mesh.setMatrixAt(instance, matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      group.add(mesh);
    });
  }

  voxelEllipsePlate(group, rx, ry, x, y, z, cell, materialNames, depth = 0.11) {
    const buckets = materialNames.map(() => []);
    const xCount = Math.ceil(rx / cell);
    const yCount = Math.ceil(ry / cell);

    for (let ix = -xCount; ix <= xCount; ix += 1) {
      for (let iy = -yCount; iy <= yCount; iy += 1) {
        const px = ix * cell;
        const py = iy * cell;
        if ((px / rx) ** 2 + (py / ry) ** 2 > 1.05) continue;
        const shade = Math.abs(ix * 19 + iy * 37) % materialNames.length;
        buckets[shade].push([x + px, y + py, z]);
      }
    }

    const geometry = new THREE.BoxGeometry(cell * 1.04, cell * 1.04, depth);
    const matrix = new THREE.Matrix4();
    buckets.forEach((positions, index) => {
      if (!positions.length) return;
      const mesh = new THREE.InstancedMesh(geometry, this.materials[materialNames[index]], positions.length);
      positions.forEach((position, instance) => {
        matrix.makeTranslation(...position);
        mesh.setMatrixAt(instance, matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      group.add(mesh);
    });
  }

  makePlayer() {
    const root = new THREE.Group();
    const visual = new THREE.Group();
    visual.position.y = 1.1;
    root.add(visual);
    root.userData.visual = visual;

    const body = new THREE.Group();
    visual.add(body);
    root.userData.body = body;
    this.voxelEllipsoid(body, 0.72, 0.76, 0.5, 0, -0.03, 0, 0.14, ['yellow']);
    this.voxelEllipsePlate(body, 0.49, 0.47, 0, -0.06, -0.505, 0.12, ['belly']);

    const head = new THREE.Group();
    head.position.y = 0.86;
    body.add(head);
    root.userData.head = head;
    this.voxelEllipsoid(head, 0.64, 0.5, 0.47, 0, 0, 0, 0.12, ['yellowLight']);
    this.box(head, 0.48, 0.12, 0.5, 0, 0.53, 0.01, 'yellowLight');
    for (const side of [-1, 1]) {
      this.box(head, 0.28, 0.33, 0.11, side * 0.3, 0.1, -0.48, 'white');
      this.box(head, 0.19, 0.24, 0.065, side * 0.3, 0.08, -0.56, 'eye');
      this.box(head, 0.1, 0.16, 0.035, side * 0.3, 0.055, -0.61, 'eyeDark');
      this.box(head, 0.06, 0.075, 0.024, side * 0.27, 0.145, -0.64, 'white');
    }
    this.box(head, 0.31, 0.075, 0.055, 0, -0.25, -0.58, 'mouth');

    root.userData.arms = [];
    root.userData.legs = [];
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(side * 0.73, 0.36, 0);
      arm.userData.restZ = side * 0.17;
      this.voxelEllipsoid(arm, 0.23, 0.48, 0.23, 0, -0.43, 0, 0.13, ['yellow']);
      this.box(arm, 0.34, 0.2, 0.38, 0, -0.91, -0.04, 'claw');
      body.add(arm);
      root.userData.arms.push(arm);

      const leg = new THREE.Group();
      leg.position.set(side * 0.32, -0.61, 0);
      this.voxelEllipsoid(leg, 0.28, 0.35, 0.29, 0, -0.26, 0, 0.13, ['yellow']);
      this.box(leg, 0.52, 0.2, 0.64, 0, -0.54, -0.1, 'yellow');
      for (const toe of [-0.15, 0, 0.15]) this.box(leg, 0.12, 0.14, 0.16, toe, -0.58, -0.45, 'claw');
      body.add(leg);
      root.userData.legs.push(leg);
    }

    const tail = new THREE.Group();
    body.add(tail);
    root.userData.tail = tail;
    const tailBlocks = [[0.42, -0.27, 0.46, 0.54], [0.68, -0.34, 0.72, 0.42], [0.91, -0.39, 0.93, 0.28]];
    for (const [x, y, z, size] of tailBlocks) this.box(tail, size, size, size, x, y, z, 'yellow');

    root.userData.skins = [];

    const original = new THREE.Group();
    body.add(original);
    root.userData.skins.push(original);

    const christmas = new THREE.Group();
    this.box(christmas, 1.27, 0.9, 0.86, 0, -0.04, 0, 'christmas');
    this.box(christmas, 0.28, 0.68, 0.7, -0.69, -0.01, 0, 'christmas');
    this.box(christmas, 0.28, 0.68, 0.7, 0.69, -0.01, 0, 'christmas');
    this.box(christmas, 0.13, 0.78, 0.06, 0, -0.03, -0.47, 'cream');
    this.box(christmas, 1.28, 0.15, 0.08, 0, -0.48, -0.47, 'cream');
    this.box(christmas, 1.2, 0.14, 0.08, 0, -0.14, -0.48, 'claw');
    this.box(christmas, 0.17, 0.17, 0.08, 0, -0.15, -0.48, 'gold');
    this.box(christmas, 1.08, 0.18, 0.86, 0, 1.49, 0, 'cream');
    this.box(christmas, 0.8, 0.36, 0.74, 0.05, 1.69, 0.02, 'christmas');
    this.box(christmas, 0.48, 0.31, 0.52, 0.32, 1.91, 0.04, 'christmas');
    this.box(christmas, 0.24, 0.24, 0.24, 0.52, 2.08, 0.04, 'cream');
    body.add(christmas);
    root.userData.skins.push(christmas);

    const pajamas = new THREE.Group();
    this.box(pajamas, 1.27, 0.9, 0.86, 0, -0.04, 0, 'pajama');
    this.box(pajamas, 0.28, 0.68, 0.7, -0.69, -0.01, 0, 'pajama');
    this.box(pajamas, 0.28, 0.68, 0.7, 0.69, -0.01, 0, 'pajama');
    this.box(pajamas, 0.13, 0.78, 0.06, 0, -0.03, -0.47, 'pajamaLight');
    for (const y of [0.21, -0.02, -0.25]) this.box(pajamas, 0.1, 0.1, 0.07, 0.2, y, -0.51, 'cream');
    this.box(pajamas, 1.05, 0.17, 0.84, 0, 1.49, 0, 'pajamaLight');
    this.box(pajamas, 0.72, 0.3, 0.66, 0.04, 1.68, 0, 'pajama');
    this.box(pajamas, 0.42, 0.26, 0.46, 0.32, 1.87, 0.02, 'pajama');
    this.box(pajamas, 0.22, 0.22, 0.22, 0.52, 2.02, 0.02, 'pajamaLight');
    body.add(pajamas);
    root.userData.skins.push(pajamas);

    const astronaut = new THREE.Group();
    this.box(astronaut, 1.29, 0.98, 0.88, 0, -0.03, 0, 'space');
    this.box(astronaut, 0.3, 0.72, 0.72, -0.7, -0.01, 0, 'space');
    this.box(astronaut, 0.3, 0.72, 0.72, 0.7, -0.01, 0, 'space');
    this.box(astronaut, 0.82, 0.31, 0.08, 0, 0.05, -0.49, 'spaceBlue');
    this.box(astronaut, 0.42, 0.14, 0.08, 0, -0.18, -0.52, 'navy');
    this.box(astronaut, 0.26, 0.1, 0.09, -0.12, -0.18, -0.52, 'red');
    this.box(astronaut, 0.25, 0.1, 0.09, 0.14, -0.18, -0.52, 'warning');
    this.box(astronaut, 0.88, 0.75, 0.2, 0, 0.02, 0.5, 'spaceBlue');
    this.box(astronaut, 1.1, 0.17, 0.88, 0, 1.49, 0, 'space');
    this.box(astronaut, 1.15, 0.16, 0.12, 0, 0.36, -0.51, 'spaceBlue');
    for (const side of [-1, 1]) this.box(astronaut, 0.15, 0.84, 0.13, side * 0.58, 0.88, -0.49, 'spaceBlue');
    body.add(astronaut);
    root.userData.skins.push(astronaut);

    const explorer = new THREE.Group();
    this.box(explorer, 1.27, 0.84, 0.86, 0, -0.01, 0, 'explorer');
    this.box(explorer, 0.28, 0.62, 0.7, -0.69, -0.01, 0, 'explorer');
    this.box(explorer, 0.28, 0.62, 0.7, 0.69, -0.01, 0, 'explorer');
    this.box(explorer, 0.18, 0.75, 0.07, 0, -0.02, -0.47, 'explorerLight');
    this.box(explorer, 1.22, 0.14, 0.08, 0, -0.31, -0.49, 'leather');
    this.box(explorer, 0.17, 0.17, 0.08, 0, -0.31, -0.49, 'gold');
    this.box(explorer, 1.14, 0.14, 0.88, 0, 1.49, 0, 'leather');
    this.box(explorer, 0.82, 0.25, 0.72, 0, 1.64, 0, 'explorer');
    this.box(explorer, 0.3, 0.44, 0.16, 0.45, 0.05, 0.51, 'leather');
    body.add(explorer);
    root.userData.skins.push(explorer);

    root.userData.skins.forEach((skin, index) => { skin.visible = index === 0; });

    return root;
  }

  setSkin(index) {
    this.skinIndex = ((index % 5) + 5) % 5;
    this.player.userData.skins.forEach((skin, skinIndex) => { skin.visible = skinIndex === this.skinIndex; });
  }

  setMenuTurn(progress) {
    this.menuTurn = Math.max(0, Math.min(1, progress));
  }

  resize(width, height) {
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.fov = width / height < 0.65 ? 65 : 53;
    this.camera.updateProjectionMatrix();
  }

  render(game, paused) {
    for (const tile of this.tiles) tile.position.z = 18 - ((tile.userData.offset - game.distance % 168 + 168) % 168);
    for (const item of this.scenery) item.position.z = 14 - ((item.userData.offset - game.distance % 156 + 156) % 156);

    const active = new Set(game.obstacles);
    for (const [item, mesh] of this.obstacles) {
      if (!active.has(item)) {
        this.scene.remove(mesh);
        mesh.traverse(object => { if (object.geometry) object.geometry.dispose(); });
        this.obstacles.delete(item);
      }
    }
    for (const item of game.obstacles) {
      let mesh = this.obstacles.get(item);
      if (!mesh) {
        mesh = this.obstacle(item.type);
        this.obstacles.set(item, mesh);
        this.scene.add(mesh);
      }
      mesh.position.set(item.lane * 2.4, 0, game.distance - item.z);
    }

    const menuMode = game.state === 'ready';
    const moving = game.state === 'running' && !paused;
    const stride = moving && !game.isJumping && !game.isRolling ? Math.sin(game.distance * 2.65) : 0;
    const idle = menuMode ? Math.sin(performance.now() * 0.0024) : 0;
    const visual = this.player.userData.visual;
    const body = this.player.userData.body;
    const head = this.player.userData.head;
    const legs = this.player.userData.legs;
    const arms = this.player.userData.arms;
    const tail = this.player.userData.tail;

    this.player.position.set(game.x * 2.4, game.height + (menuMode ? 3.05 * (1 - this.menuTurn) : 0), 0);
    this.player.rotation.y = menuMode ? Math.PI * (1 - this.menuTurn) : 0;
    this.player.rotation.z = (game.lane - game.x) * -0.1;
    visual.rotation.set(0, 0, 0);
    visual.scale.setScalar(0.78);
    visual.position.y = 1.1;
    body.rotation.set(0, 0, stride * 0.035 + idle * 0.025);
    body.position.y = Math.abs(stride) * 0.045 + idle * 0.025;
    head.position.y = 0.86;
    head.rotation.z = -stride * 0.035;
    tail.rotation.y = moving ? Math.sin(game.distance * 1.8) * 0.18 : idle * 0.16;

    legs.forEach((leg, index) => {
      leg.position.set(index ? 0.32 : -0.32, -0.61, 0);
      leg.rotation.x = game.isJumping ? (index ? -0.65 : 0.55) : stride * (index ? -0.72 : 0.72);
      leg.rotation.z = 0;
    });
    arms.forEach((arm, index) => {
      arm.position.set(index ? 0.73 : -0.73, 0.36, 0);
      arm.rotation.x = game.isJumping ? -0.85 : stride * (index ? 0.64 : -0.64);
      arm.rotation.z = game.isJumping ? (index ? -0.35 : 0.35) : arm.userData.restZ;
    });

    if (game.isJumping) {
      visual.rotation.y = game.jumpProgress * Math.PI * 2;
      body.rotation.x = -0.08;
    } else {
      body.rotation.x = 0;
    }

    if (game.isRolling) {
      visual.position.y = 0.88;
      visual.rotation.x = -game.rollProgress * Math.PI * 2;
      head.position.y = 0.54;
      legs.forEach((leg, index) => {
        leg.position.x = index ? 0.14 : -0.14;
        leg.position.y = -0.36;
        leg.rotation.x = -1.5;
        leg.rotation.z = index ? -0.5 : 0.5;
      });
      arms.forEach((arm, index) => {
        arm.position.x = index ? 0.34 : -0.34;
        arm.position.y = 0.12;
        arm.rotation.x = 1.45;
        arm.rotation.z = index ? 0.65 : -0.65;
      });
      head.rotation.x = -0.32;
    } else {
      head.rotation.x = 0;
    }

    this.renderer.render(this.scene, this.camera);
  }
}
