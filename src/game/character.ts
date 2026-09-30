import * as THREE from 'three';

export interface EnemyCharacter {
  id: number;
  name: string;
  group: THREE.Group;
  // Body parts for procedural animation
  torso: THREE.Mesh;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  weapon: THREE.Group;
  healthBar: THREE.Mesh;
  materials: THREE.Material[];
  
  // Gameplay stats
  health: number;
  maxHealth: number;
  flashTimer: number;
  speed: number;
  attackCooldown: number;
  walkCycle: number;
  isDying: boolean;
  deathTimer: number;
}

// College rival enemy archetypes with distinct uniform colors
const ENEMY_VARIANTS = [
  { name: 'Campus Raider', jacketColor: 0xdc2626, pantsColor: 0x1e293b, skinColor: 0xe0ac69, visorColor: 0x38bdf8 },
  { name: 'Tech Enforcer', jacketColor: 0x2563eb, pantsColor: 0x0f172a, skinColor: 0xd2996e, visorColor: 0xf59e0b },
  { name: 'Hostel Striker', jacketColor: 0x16a34a, pantsColor: 0x334155, skinColor: 0xbb8756, visorColor: 0xef4444 },
  { name: 'Robotics Sentinel', jacketColor: 0x7c3aed, pantsColor: 0x18181b, skinColor: 0xc68642, visorColor: 0x10b981 },
  { name: 'Varsity Brawler', jacketColor: 0xe11d48, pantsColor: 0x1e293b, skinColor: 0xe0ac69, visorColor: 0xfacc15 },
  { name: 'Cyber Rogue', jacketColor: 0x0d9488, pantsColor: 0x0f172a, skinColor: 0xd2996e, visorColor: 0xec4899 },
];

export function createHumanoidEnemy(id: number): EnemyCharacter {
  const variant = ENEMY_VARIANTS[id % ENEMY_VARIANTS.length];
  const group = new THREE.Group();
  const materials: THREE.Material[] = [];

  const createMat = (color: number, roughness = 0.5, metalness = 0.1) => {
    const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    materials.push(mat);
    return mat;
  };

  const jacketMat = createMat(variant.jacketColor, 0.6);
  const pantsMat = createMat(variant.pantsColor, 0.7);
  const skinMat = createMat(variant.skinColor, 0.5);
  const shoeMat = createMat(0x0f172a, 0.8);
  const darkGearMat = createMat(0x18181b, 0.4, 0.3);
  const visorMat = new THREE.MeshBasicMaterial({ color: variant.visorColor });
  materials.push(visorMat);

  // 1. HIPS / PELVIS
  const pelvisGeo = new THREE.BoxGeometry(0.38, 0.18, 0.24);
  const pelvis = new THREE.Mesh(pelvisGeo, pantsMat);
  pelvis.position.y = 0.95;
  pelvis.castShadow = true;
  group.add(pelvis);

  // 2. TORSO (College hoodie / tactical jacket)
  const torsoGeo = new THREE.BoxGeometry(0.42, 0.5, 0.26);
  const torso = new THREE.Mesh(torsoGeo, jacketMat);
  torso.position.y = 1.28;
  torso.castShadow = true;
  torso.receiveShadow = true;
  group.add(torso);

  // Tactical vest straps & emblem
  const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.35, 0.08), darkGearMat);
  chestPlate.position.set(0, 1.3, 0.12);
  chestPlate.castShadow = true;
  group.add(chestPlate);

  // College logo badge on chest
  const badge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.02), visorMat);
  badge.position.set(-0.1, 1.35, 0.17);
  group.add(badge);

  // 3. HEAD GROUP
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.62, 0);

  // Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.1, 8), skinMat);
  neck.position.y = -0.04;
  headGroup.add(neck);

  // Face / Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.24), skinMat);
  head.position.y = 0.1;
  head.castShadow = true;
  headGroup.add(head);

  // Hair / Tactical Cap
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.28), darkGearMat);
  cap.position.set(0, 0.2, -0.01);
  headGroup.add(cap);

  const capBrim = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.03, 0.12), darkGearMat);
  capBrim.position.set(0, 0.18, 0.16);
  headGroup.add(capBrim);

  // Cyber combat visor / shades
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.07, 0.08), visorMat);
  visor.position.set(0, 0.11, 0.11);
  headGroup.add(visor);

  // Headset earpiece & mic
  const earpiece = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.27, 8), darkGearMat);
  earpiece.rotation.z = Math.PI / 2;
  earpiece.position.set(0, 0.12, 0);
  headGroup.add(earpiece);

  const mic = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.14), darkGearMat);
  mic.position.set(0.12, 0.06, 0.08);
  headGroup.add(mic);

  group.add(headGroup);

  // 4. LEFT ARM (Pivot at shoulder)
  const leftArm = new THREE.Group();
  leftArm.position.set(0.26, 1.45, 0);

  const leftShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.12), jacketMat);
  leftShoulder.position.y = -0.1;
  leftShoulder.castShadow = true;
  leftArm.add(leftShoulder);

  const leftForearm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.1), skinMat);
  leftForearm.position.y = -0.3;
  leftForearm.castShadow = true;
  leftArm.add(leftForearm);

  const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.08), darkGearMat);
  leftHand.position.y = -0.42;
  leftArm.add(leftHand);

  group.add(leftArm);

  // 5. RIGHT ARM & WEAPON (Pivot at shoulder)
  const rightArm = new THREE.Group();
  rightArm.position.set(-0.26, 1.45, 0);

  const rightShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.12), jacketMat);
  rightShoulder.position.y = -0.1;
  rightShoulder.castShadow = true;
  rightArm.add(rightShoulder);

  const rightForearm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.1), skinMat);
  rightForearm.position.y = -0.3;
  rightForearm.castShadow = true;
  rightArm.add(rightForearm);

  const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.08), darkGearMat);
  rightHand.position.y = -0.42;
  rightArm.add(rightHand);

  // Enemy Blaster Rifle in hand
  const weapon = new THREE.Group();
  const gunReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.32), darkGearMat);
  gunReceiver.position.set(0, -0.44, 0.12);
  const gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 8), darkGearMat);
  gunBarrel.rotation.x = Math.PI / 2;
  gunBarrel.position.set(0, -0.43, 0.36);
  const gunGlow = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.15), visorMat);
  gunGlow.position.set(0, -0.39, 0.14);

  weapon.add(gunReceiver);
  weapon.add(gunBarrel);
  weapon.add(gunGlow);
  rightArm.add(weapon);

  group.add(rightArm);

  // 6. LEFT LEG (Pivot at hip)
  const leftLeg = new THREE.Group();
  leftLeg.position.set(0.12, 0.9, 0);

  const leftThigh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.15), pantsMat);
  leftThigh.position.y = -0.2;
  leftThigh.castShadow = true;
  leftLeg.add(leftThigh);

  const leftCalf = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.38, 0.13), pantsMat);
  leftCalf.position.y = -0.55;
  leftCalf.castShadow = true;
  leftLeg.add(leftCalf);

  const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.12, 0.22), shoeMat);
  leftBoot.position.set(0, -0.78, 0.04);
  leftBoot.castShadow = true;
  leftLeg.add(leftBoot);

  group.add(leftLeg);

  // 7. RIGHT LEG (Pivot at hip)
  const rightLeg = new THREE.Group();
  rightLeg.position.set(-0.12, 0.9, 0);

  const rightThigh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.15), pantsMat);
  rightThigh.position.y = -0.2;
  rightThigh.castShadow = true;
  rightLeg.add(rightThigh);

  const rightCalf = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.38, 0.13), pantsMat);
  rightCalf.position.y = -0.55;
  rightCalf.castShadow = true;
  rightLeg.add(rightCalf);

  const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.12, 0.22), shoeMat);
  rightBoot.position.set(0, -0.78, 0.04);
  rightBoot.castShadow = true;
  rightLeg.add(rightBoot);

  group.add(rightLeg);

  // 8. BILLBOARD FLOATING HEALTH BAR WITH NAME TAG
  const barCanvas = document.createElement('canvas');
  barCanvas.width = 128;
  barCanvas.height = 28;
  const ctx = barCanvas.getContext('2d')!;
  
  // Background
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(0, 0, 128, 28);
  // Name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(variant.name, 64, 11);
  // Health track
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(10, 16, 108, 7);
  // Health fill
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(10, 16, 108, 7);

  const barTexture = new THREE.CanvasTexture(barCanvas);
  const barMat = new THREE.MeshBasicMaterial({ map: barTexture, transparent: true });
  materials.push(barMat);
  const barGeo = new THREE.PlaneGeometry(1.2, 0.26);
  const healthBar = new THREE.Mesh(barGeo, barMat);
  healthBar.position.set(0, 2.15, 0);
  group.add(healthBar);

  return {
    id,
    name: variant.name,
    group,
    torso,
    headGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    weapon,
    healthBar,
    materials,
    health: 100,
    maxHealth: 100,
    flashTimer: 0,
    speed: 3.2 + Math.random() * 0.8,
    attackCooldown: 0,
    walkCycle: Math.random() * Math.PI * 2,
    isDying: false,
    deathTimer: 0,
  };
}

export function updateCharacterHealthDisplay(char: EnemyCharacter) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 28;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(0, 0, 128, 28);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(char.name, 64, 11);

  ctx.fillStyle = '#334155';
  ctx.fillRect(10, 16, 108, 7);

  const pct = Math.max(0, char.health / char.maxHealth);
  ctx.fillStyle = pct > 0.4 ? '#22c55e' : '#ef4444';
  ctx.fillRect(10, 16, 108 * pct, 7);

  const mat = char.healthBar.material as THREE.MeshBasicMaterial;
  if (mat.map) mat.map.dispose();
  mat.map = new THREE.CanvasTexture(canvas);
  mat.needsUpdate = true;
}

// Animate limbs during walking / aiming
export function animateCharacter(char: EnemyCharacter, delta: number, isMoving: boolean, isAttacking: boolean) {
  if (char.isDying) {
    // Ragdoll topple backward
    char.group.rotation.x = THREE.MathUtils.lerp(char.group.rotation.x, -Math.PI / 2, 8 * delta);
    char.group.position.y = THREE.MathUtils.lerp(char.group.position.y, 0.15, 8 * delta);
    return;
  }

  if (isMoving) {
    char.walkCycle += delta * (char.speed * 2.6);
    const swing = Math.sin(char.walkCycle);

    // Alternating leg swing
    char.leftLeg.rotation.x = swing * 0.65;
    char.rightLeg.rotation.x = -swing * 0.65;

    // Torso subtle up-and-down bounce
    char.torso.position.y = 1.28 + Math.abs(Math.sin(char.walkCycle * 2)) * 0.04;
    char.headGroup.position.y = 1.62 + Math.abs(Math.sin(char.walkCycle * 2)) * 0.04;

    // Left arm counter swing
    char.leftArm.rotation.x = -swing * 0.55;

    // Right arm with weapon raised forward toward player
    if (isAttacking) {
      char.rightArm.rotation.x = -Math.PI / 2.8;
      char.rightArm.rotation.y = 0.2;
    } else {
      char.rightArm.rotation.x = -Math.PI / 4 + swing * 0.15;
    }
  } else {
    // Idle stance breathing
    char.walkCycle += delta * 2;
    const breathe = Math.sin(char.walkCycle) * 0.01;
    char.torso.position.y = 1.28 + breathe;
    char.leftLeg.rotation.x = 0;
    char.rightLeg.rotation.x = 0;
    char.leftArm.rotation.x = Math.sin(char.walkCycle) * 0.05;
    char.rightArm.rotation.x = -Math.PI / 3.2;
  }
}
