import * as THREE from 'three';

export interface Obstacle {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  type?: 'pillar' | 'wall' | 'table' | 'box' | 'building';
  radius?: number;
  centerX?: number;
  centerZ?: number;
}

export interface Landmark {
  name: string;
  x: number;
  z: number;
  label: string;
}

export interface CampusSceneData {
  scene: THREE.Scene;
  obstacles: Obstacle[];
  spawnPoints: THREE.Vector3[];
  playerSpawn: THREE.Vector3;
  landmarks: Landmark[];
}

export function buildCampusMap(): CampusSceneData {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x7dd3fc); // Coastal sky blue
  scene.fog = new THREE.FogExp2(0x7dd3fc, 0.0055); // Expansive distance fog

  const obstacles: Obstacle[] = [];

  const addAABB = (minX: number, maxX: number, minZ: number, maxZ: number, type: Obstacle['type'] = 'box') => {
    obstacles.push({ minX, maxX, minZ, maxZ, type });
  };

  const addCylinderObstacle = (x: number, z: number, radius: number) => {
    obstacles.push({
      minX: x - radius,
      maxX: x + radius,
      minZ: z - radius,
      maxZ: z + radius,
      centerX: x,
      centerZ: z,
      radius,
      type: 'pillar',
    });
  };

  // 1. LIGHTING (Sunny coastal Mangalore atmosphere)
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x2e7d32, 0.85);
  hemiLight.position.set(0, 80, 0);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xfff7ed, 1.35);
  sunLight.position.set(65, 85, 45);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 300;
  sunLight.shadow.camera.left = -110;
  sunLight.shadow.camera.right = 110;
  sunLight.shadow.camera.top = 110;
  sunLight.shadow.camera.bottom = -110;
  sunLight.shadow.bias = -0.0005;
  scene.add(sunLight);

  // 2. EXPANSIVE GROUND (220m x 220m MITE Campus terrain)
  const groundGeo = new THREE.PlaneGeometry(240, 240, 32, 32);
  const grassMat = new THREE.MeshStandardMaterial({
    color: 0x4d7c0f, // Tropical coastal green lawn
    roughness: 0.88,
    metalness: 0.05,
  });
  const ground = new THREE.Mesh(groundGeo, grassMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // 3. ASPHALT ROADWAYS (Faithful to MITE Campus Map)
  const asphaltMat = new THREE.MeshStandardMaterial({
    color: 0x334155, // Dark asphalt
    roughness: 0.8,
  });
  const curbMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.6,
  });

  // Helper to build asphalt road segment with white curb strips
  const buildRoadSegment = (x: number, z: number, w: number, d: number, rotY: number = 0) => {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(w, d), asphaltMat);
    road.rotation.x = -Math.PI / 2;
    road.rotation.z = rotY;
    road.position.set(x, 0.03, z);
    road.receiveShadow = true;
    scene.add(road);

    // Curbs
    const curbW = w > d ? w : 0.35;
    const curbD = w > d ? 0.35 : d;
    const curbL = new THREE.Mesh(new THREE.PlaneGeometry(curbW, curbD), curbMat);
    curbL.rotation.x = -Math.PI / 2;
    curbL.rotation.z = rotY;
    const offset = (w > d ? d : w) / 2 - 0.2;
    curbL.position.set(x + (w > d ? 0 : -offset), 0.04, z + (w > d ? -offset : 0));
    scene.add(curbL);

    const curbR = new THREE.Mesh(new THREE.PlaneGeometry(curbW, curbD), curbMat);
    curbR.rotation.x = -Math.PI / 2;
    curbR.rotation.z = rotY;
    curbR.position.set(x + (w > d ? 0 : offset), 0.04, z + (w > d ? offset : 0));
    scene.add(curbR);
  };

  // Road 1: Main Entrance Gate Driveway (from East X: 85 down to X: 20, Z: 10)
  buildRoadSegment(52, 10, 68, 9, 0.12);

  // Road 2: Central Spine through Ganapati Temple (from X: 20, Z: 10 to X: -20, Z: 0)
  buildRoadSegment(0, 5, 48, 9, -0.15);

  // Road 3: South Curve towards PG Block (from X: -20, Z: 0 down to X: -42, Z: 35)
  buildRoadSegment(-32, 18, 9, 42, -0.3);

  // Road 4: Loop towards MITE Food Court (from PG Block to X: -20, Z: 75)
  buildRoadSegment(-28, 56, 9, 45, 0.35);
  buildRoadSegment(-15, 78, 38, 9, 0.05);

  // Road 5: North Branch towards MITE Greenery (from X: 20, Z: 10 to X: -10, Z: -50)
  buildRoadSegment(6, -20, 9, 65, 0.38);
  buildRoadSegment(-22, -50, 48, 9, 0);

  // Road 6: North-West Hostel/Academic Road
  buildRoadSegment(-45, -25, 9, 60, 0);

  // 4. ICONIC MITE MAIN ENTRANCE GATE (East Entrance: X ~ 82, Z ~ 10)
  // Matching Image 3: Bold golden-yellow curved walls, red & yellow entrance gate
  const gateYellowMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b, // Vibrant MITE Golden Yellow
    roughness: 0.45,
    metalness: 0.1,
  });
  const gateRedTrimMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626, // Crimson red trim
    roughness: 0.4,
  });
  const gateIronMat = new THREE.MeshStandardMaterial({
    color: 0xb91c1c, // Red iron gates
    metalness: 0.8,
    roughness: 0.3,
  });

  const gateGroup = new THREE.Group();
  gateGroup.position.set(80, 0, 10);

  // Left Curved Yellow Wall
  const leftCurveGeo = new THREE.CylinderGeometry(8, 8, 5.5, 24, 1, true, 0.2, Math.PI * 0.4);
  const leftCurve = new THREE.Mesh(leftCurveGeo, gateYellowMat);
  leftCurve.position.set(-6, 2.75, -8);
  leftCurve.rotation.y = Math.PI * 0.7;
  leftCurve.castShadow = true;
  gateGroup.add(leftCurve);

  // Left Signboard Wall Front ("MANGALORE INSTITUTE OF TECHNOLOGY AND ENGINEERING")
  const leftSignWall = new THREE.Mesh(new THREE.BoxGeometry(1.2, 5.5, 12), gateYellowMat);
  leftSignWall.position.set(0, 2.75, -9);
  leftSignWall.castShadow = true;
  gateGroup.add(leftSignWall);

  // Red cap on left wall
  const leftCap = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.4, 12.4), gateRedTrimMat);
  leftCap.position.set(0, 5.7, -9);
  gateGroup.add(leftCap);

  // English 3D text banner plate
  const engPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 1.2, 10),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 })
  );
  engPlate.position.set(-0.65, 3.8, -9);
  gateGroup.add(engPlate);

  // Right Curved Yellow Wall (with Kannada sign)
  const rightSignWall = new THREE.Mesh(new THREE.BoxGeometry(1.2, 5.5, 12), gateYellowMat);
  rightSignWall.position.set(0, 2.75, 9);
  rightSignWall.castShadow = true;
  gateGroup.add(rightSignWall);

  const rightCap = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.4, 12.4), gateRedTrimMat);
  rightCap.position.set(0, 5.7, 9);
  gateGroup.add(rightCap);

  const kanPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 1.2, 10),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 })
  );
  kanPlate.position.set(-0.65, 3.8, 9);
  gateGroup.add(kanPlate);

  // Center Main Gate Pillars
  const pillar1 = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 6.2, 16), gateYellowMat);
  pillar1.position.set(0, 3.1, -2.8);
  pillar1.castShadow = true;
  gateGroup.add(pillar1);

  const pillar2 = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 6.2, 16), gateYellowMat);
  pillar2.position.set(0, 3.1, 2.8);
  pillar2.castShadow = true;
  gateGroup.add(pillar2);

  // Red Gate Archway Overhead
  const gateArch = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 7.6), gateRedTrimMat);
  gateArch.position.set(0, 6.4, 0);
  gateGroup.add(gateArch);

  // Iron Gates (opened slightly for tactical entry)
  const gateLeftDoor = new THREE.Mesh(new THREE.BoxGeometry(0.15, 4.2, 2.4), gateIronMat);
  gateLeftDoor.position.set(-0.8, 2.2, -1.8);
  gateLeftDoor.rotation.y = 0.4;
  gateGroup.add(gateLeftDoor);

  const gateRightDoor = new THREE.Mesh(new THREE.BoxGeometry(0.15, 4.2, 2.4), gateIronMat);
  gateRightDoor.position.set(-0.8, 2.2, 1.8);
  gateRightDoor.rotation.y = -0.4;
  gateGroup.add(gateRightDoor);

  // Security Guard Cabin
  const guardCabin = new THREE.Mesh(
    new THREE.BoxGeometry(4.5, 3.6, 3.8),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.6 })
  );
  guardCabin.position.set(4, 1.8, -14);
  guardCabin.castShadow = true;
  gateGroup.add(guardCabin);

  scene.add(gateGroup);
  addAABB(78, 86, -17, -3, 'building');
  addAABB(78, 82, 3, 16, 'building');

  // 5. GANAPATI TEMPLE (Central Landmark: X ~ -8, Z ~ 2)
  // Traditional coastal Karnataka temple architecture
  const templeGroup = new THREE.Group();
  templeGroup.position.set(-8, 0, 2);

  // Stone Elevated Plinth / Courtyard
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(22, 0.8, 22),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 })
  );
  plinth.position.y = 0.4;
  plinth.receiveShadow = true;
  templeGroup.add(plinth);

  // Sanctum Sanctorum (Garbhagriha)
  const sanctumMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
  const sanctum = new THREE.Mesh(new THREE.BoxGeometry(8, 5.5, 8), sanctumMat);
  sanctum.position.set(0, 3.55, -2);
  sanctum.castShadow = true;
  templeGroup.add(sanctum);

  // Traditional Terracotta Shikhara / Pagoda Sloping Roof
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.6 }); // Mangalore terracotta tile red
  const shikhara = new THREE.Mesh(new THREE.ConeGeometry(6.8, 4.5, 4), roofMat);
  shikhara.position.set(0, 8.5, -2);
  shikhara.rotation.y = Math.PI / 4;
  shikhara.castShadow = true;
  templeGroup.add(shikhara);

  // Golden Brass Kalasha Finial
  const kalasha = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.45, 1.2, 12),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9, roughness: 0.2 })
  );
  kalasha.position.set(0, 11.2, -2);
  templeGroup.add(kalasha);

  // Pillared Mandapa Veranda (Pradakshina Path)
  const templePillars = [
    [-3.8, 4],
    [-1.3, 4],
    [1.3, 4],
    [3.8, 4],
    [-3.8, 7],
    [3.8, 7],
  ];
  const templePillarMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5 });
  templePillars.forEach(([px, pz]) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 4.2, 12), templePillarMat);
    col.position.set(px, 2.9, pz);
    col.castShadow = true;
    templeGroup.add(col);
    addCylinderObstacle(-8 + px, 2 + pz, 0.5);
  });

  // Mandapa Sloping Tiled Roof
  const mandapaRoof = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.4, 7), roofMat);
  mandapaRoof.position.set(0, 5.2, 5.5);
  mandapaRoof.rotation.x = 0.15;
  mandapaRoof.castShadow = true;
  templeGroup.add(mandapaRoof);

  // Traditional Temple Brass Bell
  const bell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.45, 0.6, 12),
    new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.9, roughness: 0.3 })
  );
  bell.position.set(0, 4.4, 4.5);
  templeGroup.add(bell);

  // Temple Stone Perimeter Balustrade / Railing
  const railingMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 });
  const railBack = new THREE.Mesh(new THREE.BoxGeometry(21.6, 1.1, 0.5), railingMat);
  railBack.position.set(0, 1.35, -10.6);
  templeGroup.add(railBack);

  const railLeft = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.1, 21.6), railingMat);
  railLeft.position.set(-10.6, 1.35, 0);
  templeGroup.add(railLeft);

  const railRight = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.1, 21.6), railingMat);
  railRight.position.set(10.6, 1.35, 0);
  templeGroup.add(railRight);

  scene.add(templeGroup);
  addAABB(-14, -2, -7, 4, 'building');

  // 6. MITE PG BLOCK (Academic Complex: X ~ -48, Z ~ 35)
  // Multi-story modern engineering college building with classrooms, windows & pillars
  const pgGroup = new THREE.Group();
  pgGroup.position.set(-48, 0, 35);

  const pgWallMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.6 });
  const pgGlassMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.85, roughness: 0.15 });
  const pgRedAccentMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.6 });

  // Main 3-Story Academic Wing
  const pgBody = new THREE.Mesh(new THREE.BoxGeometry(36, 13, 18), pgWallMat);
  pgBody.position.set(0, 6.5, 0);
  pgBody.castShadow = true;
  pgBody.receiveShadow = true;
  pgGroup.add(pgBody);

  // Horizontal window strips for 3 floors
  for (let floor = 0; floor < 3; floor++) {
    const winStrip = new THREE.Mesh(new THREE.BoxGeometry(32, 1.6, 18.2), pgGlassMat);
    winStrip.position.set(0, 2.5 + floor * 3.8, 0);
    pgGroup.add(winStrip);

    const louverStrip = new THREE.Mesh(new THREE.BoxGeometry(32.5, 0.25, 18.4), pgRedAccentMat);
    louverStrip.position.set(0, 3.4 + floor * 3.8, 0);
    pgGroup.add(louverStrip);
  }

  // Entrance Portico with columns
  const portico = new THREE.Mesh(new THREE.BoxGeometry(14, 0.6, 6), pgWallMat);
  portico.position.set(0, 5.2, 11);
  portico.castShadow = true;
  pgGroup.add(portico);

  [-5, 5].forEach((cx) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 5.2, 16), pgWallMat);
    col.position.set(cx, 2.6, 11);
    col.castShadow = true;
    pgGroup.add(col);
    addCylinderObstacle(-48 + cx, 35 + 11, 0.7);
  });

  // PG Block Signboard
  const pgSign = new THREE.Mesh(
    new THREE.BoxGeometry(12, 1.2, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 })
  );
  pgSign.position.set(0, 13.5, 9.1);
  pgGroup.add(pgSign);

  scene.add(pgGroup);
  addAABB(-67, -29, 25, 45, 'building');

  // 7. M.I.T.E FOOD COURT (Dining Complex: X ~ -22, Z ~ 76)
  // Open-air covered dining pavilion + outdoor food plaza
  const fcGroup = new THREE.Group();
  fcGroup.position.set(-22, 0, 76);

  // Plaza Deck
  const fcDeck = new THREE.Mesh(
    new THREE.BoxGeometry(32, 0.35, 26),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 })
  );
  fcDeck.position.set(0, 0.175, 0);
  fcDeck.receiveShadow = true;
  fcGroup.add(fcDeck);

  // Food Court Kitchen & Stall Counters (Back wall)
  const fcBackWall = new THREE.Mesh(
    new THREE.BoxGeometry(30, 4.5, 6),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 })
  );
  fcBackWall.position.set(0, 2.25, -9.5);
  fcBackWall.castShadow = true;
  fcGroup.add(fcBackWall);

  // Colorful Canopy Roof Over Tables
  const fcCanopy = new THREE.Mesh(
    new THREE.BoxGeometry(32, 0.5, 18),
    new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 }) // Vibrant amber campus canopy
  );
  fcCanopy.position.set(0, 5.5, 2);
  fcCanopy.castShadow = true;
  fcGroup.add(fcCanopy);

  // Steel Support Columns
  const canopyPosts = [
    [-14, -6],
    [14, -6],
    [-14, 10],
    [14, 10],
  ];
  canopyPosts.forEach(([cx, cz]) => {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 5.5, 12),
      new THREE.MeshStandardMaterial({ color: 0x1e293b })
    );
    post.position.set(cx, 2.75, cz);
    post.castShadow = true;
    fcGroup.add(post);
    addCylinderObstacle(-22 + cx, 76 + cz, 0.5);
  });

  // Food Court Tables with Parasol Umbrellas (Cover for firefights!)
  const fcTablePositions = [
    [-9, -1],
    [-3, -1],
    [3, -1],
    [9, -1],
    [-9, 5],
    [-3, 5],
    [3, 5],
    [9, 5],
  ];
  const tableMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.7 });
  const umbrellaMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 });

  fcTablePositions.forEach(([tx, tz], idx) => {
    // Table Top
    const table = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.12, 16), tableMat);
    table.position.set(tx, 1.05, tz);
    table.castShadow = true;
    fcGroup.add(table);

    // Table Leg
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.05, 8), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
    leg.position.set(tx, 0.525, tz);
    fcGroup.add(leg);

    // 4 Attached Stools
    for (let a = 0; a < 4; a++) {
      const angle = (a * Math.PI) / 2;
      const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.6, 8), tableMat);
      stool.position.set(tx + Math.cos(angle) * 1.5, 0.3, tz + Math.sin(angle) * 1.5);
      stool.castShadow = true;
      fcGroup.add(stool);
    }

    // Umbrella on half the tables
    if (idx % 2 === 0) {
      const umbrellaPole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 2.8, 8),
        new THREE.MeshStandardMaterial({ color: 0x475569 })
      );
      umbrellaPole.position.set(tx, 2.4, tz);
      fcGroup.add(umbrellaPole);

      const umbrellaCone = new THREE.Mesh(new THREE.ConeGeometry(2.2, 0.8, 8), umbrellaMat);
      umbrellaCone.position.set(tx, 3.6, tz);
      umbrellaCone.castShadow = true;
      fcGroup.add(umbrellaCone);
    }

    addAABB(-22 + tx - 1.5, -22 + tx + 1.5, 76 + tz - 1.5, 76 + tz + 1.5, 'table');
  });

  scene.add(fcGroup);
  addAABB(-38, -6, 63, 73, 'building');

  // 8. MULTI-SPORT COURT (Basketball / Tennis / Volleyball Court: X ~ 12, Z ~ -32)
  // High-contrast vibrant blue & terracotta court with painted court lines and hoops
  const courtGroup = new THREE.Group();
  courtGroup.position.set(12, 0, -32);

  // Court Surface
  const courtSurface = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 18),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.55 }) // Vibrant blue sports floor
  );
  courtSurface.rotation.x = -Math.PI / 2;
  courtSurface.position.y = 0.05;
  courtSurface.receiveShadow = true;
  courtGroup.add(courtSurface);

  // Key Area (Terracotta Red)
  const keyMat = new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.6 });
  const keyLeft = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), keyMat);
  keyLeft.rotation.x = -Math.PI / 2;
  keyLeft.position.set(-10, 0.06, 0);
  courtGroup.add(keyLeft);

  const keyRight = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), keyMat);
  keyRight.rotation.x = -Math.PI / 2;
  keyRight.position.set(10, 0.06, 0);
  courtGroup.add(keyRight);

  // Center Circle
  const centerCircle = new THREE.Mesh(new THREE.RingGeometry(2.4, 2.6, 24), curbMat);
  centerCircle.rotation.x = -Math.PI / 2;
  centerCircle.position.set(0, 0.06, 0);
  courtGroup.add(centerCircle);

  // Center Line
  const centerLine = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 17.6), curbMat);
  centerLine.rotation.x = -Math.PI / 2;
  centerLine.position.set(0, 0.06, 0);
  courtGroup.add(centerLine);

  // Basketball Hoops & Backboards
  [-13, 13].forEach((hx, i) => {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 4.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x1e293b })
    );
    pole.position.set(hx, 2.1, 0);
    pole.castShadow = true;
    courtGroup.add(pole);

    const backboard = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 1.2, 1.8),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
    );
    backboard.position.set(hx + (i === 0 ? 0.4 : -0.4), 3.8, 0);
    backboard.castShadow = true;
    courtGroup.add(backboard);

    const hoop = new THREE.Mesh(
      new THREE.TorusGeometry(0.35, 0.04, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0xea580c })
    );
    hoop.rotation.x = Math.PI / 2;
    hoop.position.set(hx + (i === 0 ? 0.8 : -0.8), 3.4, 0);
    courtGroup.add(hoop);

    addCylinderObstacle(12 + hx, -32, 0.4);
  });

  // Chainlink / Wire Fence Boundary around court
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0x64748b, wireframe: true });
  const fenceBack = new THREE.Mesh(new THREE.BoxGeometry(29, 3.2, 0.1), fenceMat);
  fenceBack.position.set(0, 1.6, -9.1);
  courtGroup.add(fenceBack);

  const fenceFront = new THREE.Mesh(new THREE.BoxGeometry(29, 3.2, 0.1), fenceMat);
  fenceFront.position.set(0, 1.6, 9.1);
  courtGroup.add(fenceFront);

  scene.add(courtGroup);
  addAABB(-2, 26, -41, -23, 'box');

  // 9. MITE GREENERY (Landscaped Botanical Garden: X ~ -32, Z ~ -58)
  const gardenGroup = new THREE.Group();
  gardenGroup.position.set(-32, 0, -58);

  // Circular Raised Planter Plaza
  const gardenPlaza = new THREE.Mesh(
    new THREE.CylinderGeometry(14, 15, 0.4, 32),
    new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.7 })
  );
  gardenPlaza.position.y = 0.2;
  gardenGroup.add(gardenPlaza);

  // Central Campus Fountain / Botanical Memorial
  const fountainBase = new THREE.Mesh(
    new THREE.CylinderGeometry(4.5, 5, 1.2, 24),
    new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5 })
  );
  fountainBase.position.y = 0.8;
  fountainBase.castShadow = true;
  gardenGroup.add(fountainBase);

  const fountainWater = new THREE.Mesh(
    new THREE.CylinderGeometry(4.2, 4.2, 0.1, 24),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.1 })
  );
  fountainWater.position.y = 1.35;
  gardenGroup.add(fountainWater);

  const fountainSpire = new THREE.Mesh(
    new THREE.ConeGeometry(0.8, 2.5, 8),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 })
  );
  fountainSpire.position.y = 2.6;
  gardenGroup.add(fountainSpire);

  // Concentric Shrub Hedges
  const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.9 });
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const hedge = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.1, 1.2), hedgeMat);
    hedge.position.set(Math.cos(angle) * 9, 0.75, Math.sin(angle) * 9);
    hedge.rotation.y = angle + Math.PI / 2;
    hedge.castShadow = true;
    gardenGroup.add(hedge);
  }

  scene.add(gardenGroup);
  addAABB(-37, -27, -63, -53, 'box');

  // 10. CAMPUS PERIMETER BOUNDARY WALLS (200m x 200m Arena)
  const perimeterWallMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });
  const pSize = 190;
  const pHeight = 5.5;

  // North Wall
  const northWall = new THREE.Mesh(new THREE.BoxGeometry(pSize, pHeight, 2), perimeterWallMat);
  northWall.position.set(0, pHeight / 2, -95);
  northWall.castShadow = true;
  scene.add(northWall);
  addAABB(-95, 95, -96, -94, 'wall');

  // South Wall
  const southWall = new THREE.Mesh(new THREE.BoxGeometry(pSize, pHeight, 2), perimeterWallMat);
  southWall.position.set(0, pHeight / 2, 95);
  southWall.castShadow = true;
  scene.add(southWall);
  addAABB(-95, 95, 94, 96, 'wall');

  // West Wall
  const westWall = new THREE.Mesh(new THREE.BoxGeometry(2, pHeight, pSize), perimeterWallMat);
  westWall.position.set(-95, pHeight / 2, 0);
  westWall.castShadow = true;
  scene.add(westWall);
  addAABB(-96, -94, -95, 95, 'wall');

  // East Wall (North of Main Gate)
  const eastWallN = new THREE.Mesh(new THREE.BoxGeometry(2, pHeight, 80), perimeterWallMat);
  eastWallN.position.set(95, pHeight / 2, -55);
  eastWallN.castShadow = true;
  scene.add(eastWallN);
  addAABB(94, 96, -95, -15, 'wall');

  // East Wall (South of Main Gate)
  const eastWallS = new THREE.Mesh(new THREE.BoxGeometry(2, pHeight, 80), perimeterWallMat);
  eastWallS.position.set(95, pHeight / 2, 55);
  eastWallS.castShadow = true;
  scene.add(eastWallS);
  addAABB(94, 96, 15, 95, 'wall');

  // 11. TROPICAL PALM TREES & FLOWERING TREES (Faithful to coastal Karnataka / Mangalore MITE scenery)
  const palmTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9 });
  const palmFrondMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.7 });

  const treeLocations = [
    // Near Main Entrance
    [65, -15], [68, 25], [75, 35], [58, -30],
    // Near Ganapati Temple
    [-18, -14], [-24, 8], [8, 16], [5, -14],
    // Along PG Block Road
    [-35, 12], [-40, -5], [-55, 18], [-62, 55],
    // Near Food Court
    [-10, 65], [-35, 75], [-12, 90], [5, 78],
    // Near Greenery & Sports Court
    [-20, -42], [-48, -48], [-15, -75], [5, -55], [28, -25], [32, -45],
    // Along Perimeter
    [-80, -70], [-80, 0], [-80, 70], [80, -70], [80, 70], [0, -85], [0, 85]
  ];

  treeLocations.forEach(([tx, tz], i) => {
    const isPalm = i % 2 === 0;
    if (isPalm) {
      // Tall Coastal Coconut Palm
      const palmGroup = new THREE.Group();
      palmGroup.position.set(tx, 0, tz);

      // Curved Trunk
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.45, 9, 8), palmTrunkMat);
      trunk.position.set(0.3, 4.5, 0);
      trunk.rotation.z = 0.07;
      trunk.castShadow = true;
      palmGroup.add(trunk);

      // Palm Crown / Fronds
      for (let f = 0; f < 6; f++) {
        const frondAngle = (f * Math.PI) / 3;
        const frond = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.12, 0.75), palmFrondMat);
        frond.position.set(Math.cos(frondAngle) * 1.8, 9, Math.sin(frondAngle) * 1.8);
        frond.rotation.y = frondAngle;
        frond.rotation.z = 0.35;
        frond.castShadow = true;
        palmGroup.add(frond);
      }
      scene.add(palmGroup);
    } else {
      // Lush Deciduous Campus Shade Tree
      const tree = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.55, 3.8, 8), palmTrunkMat);
      tree.position.set(tx, 1.9, tz);
      tree.castShadow = true;
      scene.add(tree);

      const canopy1 = new THREE.Mesh(new THREE.DodecahedronGeometry(3.2, 1), palmFrondMat);
      canopy1.position.set(tx, 5.2, tz);
      canopy1.castShadow = true;
      scene.add(canopy1);
    }

    addCylinderObstacle(tx, tz, 0.9);
  });

  // 12. CAMPUS STREETLIGHTS
  const lightPoleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 });
  const lightBulbMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  const lightCoords = [
    [70, 6], [45, 8], [25, 8], [2, 7], [-15, 12],
    [-28, 25], [-24, 48], [-18, 68],
    [8, -15], [10, -42], [-15, -35], [-30, -50]
  ];

  lightCoords.forEach(([lx, lz]) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6, 8), lightPoleMat);
    pole.position.set(lx, 3, lz);
    pole.castShadow = true;
    scene.add(pole);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.12), lightPoleMat);
    arm.position.set(lx - 0.45, 6, lz);
    scene.add(arm);

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), lightBulbMat);
    bulb.position.set(lx - 0.9, 5.8, lz);
    scene.add(bulb);

    addCylinderObstacle(lx, lz, 0.4);
  });

  // Map Landmarks for Radar & HUD Zone Detection
  const landmarks: Landmark[] = [
    { name: 'MITE Main Gate', x: 80, z: 10, label: 'Main Entrance' },
    { name: 'Ganapati Temple', x: -8, z: 2, label: 'Temple' },
    { name: 'MITE PG Block', x: -48, z: 35, label: 'PG Block' },
    { name: 'M.I.T.E Food Court', x: -22, z: 76, label: 'Food Court' },
    { name: 'Sports Court', x: 12, z: -32, label: 'Sports Court' },
    { name: 'MITE Greenery', x: -32, z: -58, label: 'Greenery' },
  ];

  // Spawn points distributed realistically across the expanded MITE campus
  const spawnPoints: THREE.Vector3[] = [
    new THREE.Vector3(65, 0, 8),    // Near Main Gate driveway
    new THREE.Vector3(30, 0, 10),   // Central road approach
    new THREE.Vector3(-6, 0, 14),   // Front of Ganapati Temple
    new THREE.Vector3(-38, 0, 24),  // Path towards PG Block
    new THREE.Vector3(-48, 0, 48),  // Beside PG Block portico
    new THREE.Vector3(-18, 0, 68),  // Approaching Food Court
    new THREE.Vector3(-24, 0, 85),  // Food Court open plaza
    new THREE.Vector3(12, 0, -22),  // Outside Basketball Court
    new THREE.Vector3(22, 0, -42),  // Sports perimeter
    new THREE.Vector3(-24, 0, -48), // Road to Mite Greenery
    new THREE.Vector3(-32, 0, -68), // Greenery Fountain Plaza
    new THREE.Vector3(-55, 0, -20), // North-West academic area
  ];

  // Player begins right inside the iconic MITE Main Entrance Gate facing west toward the campus!
  const playerSpawn = new THREE.Vector3(72, 1.6, 10);

  return {
    scene,
    obstacles,
    spawnPoints,
    playerSpawn,
    landmarks,
  };
}
