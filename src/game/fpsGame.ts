import * as THREE from 'three';
import { sound } from './audio';
import { GunModel } from './gun';
import { buildCampusMap, CampusSceneData, Landmark } from './map';
import {
  EnemyCharacter,
  createHumanoidEnemy,
  updateCharacterHealthDisplay,
  animateCharacter,
} from './character';

export interface GameStats {
  health: number;
  maxHealth: number;
  ammo: number;
  maxAmmo: number;
  score: number;
  kills: number;
  shotsFired: number;
  shotsHit: number;
  isReloading: boolean;
  reloadProgress: number;
  isADS: boolean;
  hitmarkerActive: boolean;
  damageVignette: boolean;
  isGameOver: boolean;
  killstreak: number;
  recentKillText: string;
  currentZone: string;
}

export interface SparkParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class FPSGame {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private sceneData: CampusSceneData;
  private gun: GunModel;

  // Player State
  public cameraPitch: number = 0;
  public cameraYaw: number = Math.PI / 2; // Face west from Main Gate into campus
  public playerPos: THREE.Vector3 = new THREE.Vector3(72, 1.6, 10);
  public playerVelocity: THREE.Vector3 = new THREE.Vector3();
  public isGrounded: boolean = true;
  private moveTimer: number = 0;

  // Key States
  private keys: Record<string, boolean> = {
    KeyW: false,
    KeyA: false,
    KeyS: false,
    KeyD: false,
    ShiftLeft: false,
    ShiftRight: false,
    Space: false,
    KeyR: false,
  };

  // Mouse States
  private isPointerLocked: boolean = false;
  private isMouseDown: boolean = false;
  private isRightMouseDown: boolean = false;
  private shootCooldown: number = 0;

  // Gameplay Settings
  public mouseSensitivity: number = 0.0022;

  // Game Stats
  public stats: GameStats = {
    health: 100,
    maxHealth: 100,
    ammo: 30,
    maxAmmo: 30,
    score: 0,
    kills: 0,
    shotsFired: 0,
    shotsHit: 0,
    isReloading: false,
    reloadProgress: 0,
    isADS: false,
    hitmarkerActive: false,
    damageVignette: false,
    isGameOver: false,
    killstreak: 0,
    recentKillText: '',
    currentZone: 'MITE Main Gate',
  };

  private reloadTimer: number = 0;
  private readonly RELOAD_TIME: number = 1.35;
  private hitmarkerTimer: number = 0;
  private damageVignetteTimer: number = 0;
  private killFeedTimer: number = 0;

  // Humanoid Enemies
  private enemies: EnemyCharacter[] = [];
  private readonly ENEMY_COUNT: number = 7;

  // Debris / Hit Particles
  private particles: SparkParticle[] = [];

  // Raycasting
  private raycaster: THREE.Raycaster = new THREE.Raycaster();

  // Animation Loop
  private animationFrameId: number | null = null;
  private lastTime: number = performance.now();
  private onStatsUpdate?: (stats: GameStats) => void;
  private onPointerLockChange?: (locked: boolean) => void;

  constructor(
    container: HTMLElement,
    callbacks?: {
      onStatsUpdate?: (stats: GameStats) => void;
      onPointerLockChange?: (locked: boolean) => void;
    }
  ) {
    this.container = container;
    this.onStatsUpdate = callbacks?.onStatsUpdate;
    this.onPointerLockChange = callbacks?.onPointerLockChange;

    // 1. Renderer Setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // 2. Map & Scene Setup
    this.sceneData = buildCampusMap();
    this.playerPos.copy(this.sceneData.playerSpawn);

    // 3. Camera Setup (75 FOV default)
    this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.05, 300);
    this.camera.position.copy(this.playerPos);
    this.sceneData.scene.add(this.camera);

    // 4. Gun Attached to Camera
    this.gun = new GunModel();
    this.camera.add(this.gun.mesh);

    // 5. Spawn Humanoid Enemies across MITE Campus
    this.spawnEnemies();

    // 6. Bind Event Listeners
    this.bindEvents();

    // 7. Start Loop
    this.lastTime = performance.now();
    this.animate();
  }

  // Spawn Humanoid Rival Characters across the MITE Campus
  private spawnEnemies() {
    for (let i = 0; i < this.ENEMY_COUNT; i++) {
      const enemy = createHumanoidEnemy(i);
      const spawnPt = this.getRandomSpawnPoint(true);
      enemy.group.position.copy(spawnPt);
      this.sceneData.scene.add(enemy.group);
      this.enemies.push(enemy);
    }
  }

  private getRandomSpawnPoint(avoidPlayer: boolean = false): THREE.Vector3 {
    const pts = this.sceneData.spawnPoints;
    let chosen = pts[Math.floor(Math.random() * pts.length)].clone();
    if (avoidPlayer) {
      const valid = pts.filter((p) => p.distanceTo(this.playerPos) > 22);
      if (valid.length > 0) {
        chosen = valid[Math.floor(Math.random() * valid.length)].clone();
      }
    }
    chosen.x += (Math.random() - 0.5) * 5;
    chosen.z += (Math.random() - 0.5) * 5;
    chosen.y = 0;
    return chosen;
  }

  private bindEvents() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('contextmenu', this.handleContextMenu);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    window.addEventListener('resize', this.handleResize);
  }

  private unbindEvents() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('contextmenu', this.handleContextMenu);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    window.removeEventListener('resize', this.handleResize);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (this.keys[e.code] !== undefined) {
      this.keys[e.code] = true;
    }
    if (e.code === 'KeyR') {
      this.triggerReload();
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    if (this.keys[e.code] !== undefined) {
      this.keys[e.code] = false;
    }
  };

  private handleMouseDown = (e: MouseEvent) => {
    if (!this.isPointerLocked) return;

    if (e.button === 0) {
      this.isMouseDown = true;
      this.fireWeapon();
    } else if (e.button === 2) {
      this.isRightMouseDown = true;
      this.stats.isADS = true;
    }
  };

  private handleMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      this.isMouseDown = false;
    } else if (e.button === 2) {
      this.isRightMouseDown = false;
      this.stats.isADS = false;
    }
  };

  private handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.isPointerLocked || this.stats.isGameOver) return;

    const sensMultiplier = this.stats.isADS ? 0.6 : 1.0;
    const sens = this.mouseSensitivity * sensMultiplier;

    this.cameraYaw -= e.movementX * sens;
    this.cameraPitch -= e.movementY * sens;

    const maxPitch = (85 * Math.PI) / 180;
    this.cameraPitch = Math.max(-maxPitch, Math.min(maxPitch, this.cameraPitch));
  };

  private handlePointerLockChange = () => {
    this.isPointerLocked = document.pointerLockElement === this.renderer.domElement;
    if (this.onPointerLockChange) {
      this.onPointerLockChange(this.isPointerLocked);
    }
  };

  private handleResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public requestPointerLock() {
    this.renderer.domElement.requestPointerLock();
  }

  public triggerReload() {
    if (this.stats.isReloading || this.stats.ammo === this.stats.maxAmmo || this.stats.isGameOver) {
      return;
    }
    this.stats.isReloading = true;
    this.reloadTimer = 0;
    sound.playReload();
  }

  // Hitscan Fire
  public fireWeapon() {
    if (this.stats.isGameOver || this.shootCooldown > 0) return;
    if (this.stats.isReloading) return;

    if (this.stats.ammo <= 0) {
      sound.playEmpty();
      this.triggerReload();
      return;
    }

    this.stats.ammo -= 1;
    this.stats.shotsFired += 1;
    this.shootCooldown = 0.125;

    sound.playGunshot();
    this.gun.triggerShot();

    if (this.stats.ammo <= 0) {
      setTimeout(() => this.triggerReload(), 150);
    }

    // Raycast from center
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

    // Collect all enemy meshes (excluding healthbars)
    const enemyMeshToChar = new Map<THREE.Object3D, EnemyCharacter>();
    const shootableMeshes: THREE.Object3D[] = [];

    this.enemies.forEach((enemy) => {
      if (enemy.isDying) return;
      enemy.group.traverse((child) => {
        if (child instanceof THREE.Mesh && child !== enemy.healthBar) {
          shootableMeshes.push(child);
          enemyMeshToChar.set(child, enemy);
        }
      });
    });

    const intersects = this.raycaster.intersectObjects(shootableMeshes, false);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const enemy = enemyMeshToChar.get(hit.object);

      if (enemy && !enemy.isDying) {
        this.stats.shotsHit += 1;
        this.stats.hitmarkerActive = true;
        this.hitmarkerTimer = 0.12;
        sound.playHitmarker();

        // White Flash hit reaction across materials
        enemy.flashTimer = 0.12;
        enemy.materials.forEach((m) => {
          if ('color' in m) (m as THREE.MeshStandardMaterial).color.set(0xffffff);
        });

        // Headshot detection (upper head group)
        const hitLocalY = hit.point.y - enemy.group.position.y;
        const isHeadshot = hitLocalY > 1.5;
        const damage = isHeadshot ? 65 : 35;
        enemy.health -= damage;
        updateCharacterHealthDisplay(enemy);

        this.spawnHitSparks(hit.point, 0xffffff, 8);

        if (enemy.health <= 0) {
          this.eliminateEnemy(enemy, isHeadshot);
        }
      }
    } else {
      // Environment hit sparks
      const envIntersects = this.raycaster.intersectObjects(this.sceneData.scene.children, true);
      const validEnv = envIntersects.find(
        (i) => i.object !== this.gun.mesh && !this.gun.mesh.children.includes(i.object)
      );
      if (validEnv && validEnv.distance < 120) {
        this.spawnHitSparks(validEnv.point, 0xd1d5db, 5);
      }
    }
  }

  private eliminateEnemy(enemy: EnemyCharacter, isHeadshot: boolean) {
    enemy.isDying = true;
    enemy.deathTimer = 1.1; // Ragdoll duration before respawn
    this.stats.kills += 1;
    this.stats.killstreak += 1;

    const basePoints = isHeadshot ? 150 : 100;
    const bonus = Math.min(150, this.stats.killstreak * 25);
    this.stats.score += basePoints + bonus;

    sound.playKill();

    const streakLabels = ['', '', 'DOUBLE CLASH!', 'TRIPLE CLASH!', 'MITE DOMINATOR!', 'UNSTOPPABLE!'];
    const streakTitle = streakLabels[Math.min(this.stats.killstreak, streakLabels.length - 1)] || 'UNSTOPPABLE!';
    this.stats.recentKillText = isHeadshot
      ? `HEADSHOT ELIMINATION! (+${basePoints + bonus})`
      : `${streakTitle} (+${basePoints + bonus})`;
    this.killFeedTimer = 2.4;

    this.spawnHitSparks(enemy.group.position.clone().add(new THREE.Vector3(0, 1.2, 0)), 0xdc2626, 20);
  }

  private respawnEnemy(enemy: EnemyCharacter) {
    enemy.isDying = false;
    enemy.deathTimer = 0;
    enemy.health = 100;
    enemy.group.rotation.x = 0;
    enemy.group.position.y = 0;
    updateCharacterHealthDisplay(enemy);

    // Restore colors
    this.revertEnemyColors(enemy);

    const newSpawn = this.getRandomSpawnPoint(true);
    enemy.group.position.copy(newSpawn);
  }

  private revertEnemyColors(enemy: EnemyCharacter) {
    // Re-create proper materials on color recovery
    const refreshed = createHumanoidEnemy(enemy.id);
    enemy.materials = refreshed.materials;
  }

  private spawnHitSparks(pos: THREE.Vector3, color: number, count: number) {
    const mat = new THREE.MeshBasicMaterial({ color });
    const geo = new THREE.BoxGeometry(0.08, 0.08, 0.08);

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      this.sceneData.scene.add(mesh);

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        Math.random() * 5 + 1.5,
        (Math.random() - 0.5) * 8
      );

      this.particles.push({
        mesh,
        velocity,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.25,
      });
    }
  }

  public damagePlayer(amount: number) {
    if (this.stats.isGameOver) return;
    this.stats.health = Math.max(0, this.stats.health - amount);
    this.stats.killstreak = 0;
    this.stats.damageVignette = true;
    this.damageVignetteTimer = 0.25;
    sound.playHurt();

    if (this.stats.health <= 0) {
      this.stats.isGameOver = true;
      sound.playGameOver();
      document.exitPointerLock();
    }
  }

  public respawnGame() {
    this.stats.health = 100;
    this.stats.ammo = 30;
    this.stats.score = 0;
    this.stats.kills = 0;
    this.stats.shotsFired = 0;
    this.stats.shotsHit = 0;
    this.stats.isReloading = false;
    this.stats.isGameOver = false;
    this.stats.killstreak = 0;
    this.stats.recentKillText = '';

    this.playerPos.copy(this.sceneData.playerSpawn);
    this.playerVelocity.set(0, 0, 0);
    this.cameraYaw = Math.PI / 2;
    this.cameraPitch = 0;

    this.enemies.forEach((enemy) => {
      this.respawnEnemy(enemy);
    });

    this.requestPointerLock();
  }

  private animate = () => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const now = performance.now();
    const delta = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    if (!this.stats.isGameOver) {
      this.updatePlayer(delta);
      this.updateEnemies(delta);
      this.updateParticles(delta);
      this.updateTimers(delta);
      this.updateCurrentZone();
    }

    this.renderer.render(this.sceneData.scene, this.camera);

    if (this.onStatsUpdate) {
      this.onStatsUpdate({ ...this.stats });
    }
  };

  // Detect nearest MITE campus landmark for zone notification
  private updateCurrentZone() {
    let closestLandmark = 'MITE Campus';
    let minDist = 40;

    this.sceneData.landmarks.forEach((lm) => {
      const dx = this.playerPos.x - lm.x;
      const dz = this.playerPos.z - lm.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < minDist) {
        minDist = d;
        closestLandmark = lm.name;
      }
    });

    this.stats.currentZone = closestLandmark;
  }

  private updatePlayer(delta: number) {
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.cameraYaw;
    this.camera.rotation.x = this.cameraPitch;

    const targetFOV = this.stats.isADS ? 48 : 75;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFOV, 14 * delta);
    this.camera.updateProjectionMatrix();

    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);

    const moveDir = new THREE.Vector3();
    if (this.keys.KeyW) moveDir.add(forward);
    if (this.keys.KeyS) moveDir.sub(forward);
    if (this.keys.KeyD) moveDir.add(right);
    if (this.keys.KeyA) moveDir.sub(right);

    const isMoving = moveDir.lengthSq() > 0.001;
    if (isMoving) {
      moveDir.normalize();
      this.moveTimer += delta;
    }

    // High speed sprint for the 200m map
    const isSprinting = (this.keys.ShiftLeft || this.keys.ShiftRight) && this.keys.KeyW && !this.stats.isADS;
    const moveSpeed = isSprinting ? 18.5 : 10.5;

    this.playerVelocity.x = moveDir.x * moveSpeed;
    this.playerVelocity.z = moveDir.z * moveSpeed;

    const GRAVITY = -28;
    this.playerVelocity.y += GRAVITY * delta;

    if (this.keys.Space && this.isGrounded) {
      this.playerVelocity.y = 11.0;
      this.isGrounded = false;
      sound.playJump();
    }

    const nextX = this.playerPos.x + this.playerVelocity.x * delta;
    const nextZ = this.playerPos.z + this.playerVelocity.z * delta;
    const nextY = this.playerPos.y + this.playerVelocity.y * delta;

    const radius = 0.55;
    const canMoveX = !this.checkObstacleCollision(nextX, this.playerPos.z, radius);
    const canMoveZ = !this.checkObstacleCollision(this.playerPos.x, nextZ, radius);

    if (canMoveX) this.playerPos.x = nextX;
    if (canMoveZ) this.playerPos.z = nextZ;

    if (nextY <= 1.6) {
      this.playerPos.y = 1.6;
      this.playerVelocity.y = 0;
      this.isGrounded = true;
    } else {
      this.playerPos.y = nextY;
      this.isGrounded = false;
    }

    // Clamp within 190m campus perimeter boundaries
    this.playerPos.x = Math.max(-92, Math.min(92, this.playerPos.x));
    this.playerPos.z = Math.max(-92, Math.min(92, this.playerPos.z));

    this.camera.position.copy(this.playerPos);

    this.gun.update(
      delta,
      this.stats.isADS,
      this.stats.isReloading,
      this.stats.reloadProgress,
      isMoving,
      isSprinting,
      this.moveTimer
    );
  }

  private checkObstacleCollision(x: number, z: number, radius: number): boolean {
    for (const obs of this.sceneData.obstacles) {
      if (obs.type === 'pillar' && obs.centerX !== undefined && obs.centerZ !== undefined && obs.radius !== undefined) {
        const dx = x - obs.centerX;
        const dz = z - obs.centerZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < radius + obs.radius) return true;
      } else {
        if (x + radius > obs.minX && x - radius < obs.maxX && z + radius > obs.minZ && z - radius < obs.maxZ) {
          return true;
        }
      }
    }
    return false;
  }

  // Update Enemy Humanoids (Movement, Walk Cycle, Stance & Attacks)
  private updateEnemies(delta: number) {
    this.enemies.forEach((enemy) => {
      // 1. Death / Respawn Timer
      if (enemy.isDying) {
        enemy.deathTimer -= delta;
        animateCharacter(enemy, delta, false, false);
        if (enemy.deathTimer <= 0) {
          this.respawnEnemy(enemy);
        }
        return;
      }

      // 2. White Hit Flash recovery
      if (enemy.flashTimer > 0) {
        enemy.flashTimer -= delta;
        if (enemy.flashTimer <= 0) {
          this.revertEnemyColors(enemy);
        }
      }

      // 3. Billboard Health Bar to Camera
      enemy.healthBar.quaternion.copy(this.camera.quaternion);

      // 4. Movement towards player
      const toPlayer = new THREE.Vector3().subVectors(this.playerPos, enemy.group.position).setY(0);
      const dist = toPlayer.length();

      if (dist > 0.1) {
        enemy.group.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
      }

      const isChasing = dist > 1.8 && dist < 120;
      if (isChasing) {
        toPlayer.normalize();
        const nextX = enemy.group.position.x + toPlayer.x * enemy.speed * delta;
        const nextZ = enemy.group.position.z + toPlayer.z * enemy.speed * delta;

        if (Math.abs(nextX) < 92) enemy.group.position.x = nextX;
        if (Math.abs(nextZ) < 92) enemy.group.position.z = nextZ;
      }

      // Procedural limb animation (walk cycle / weapon aim)
      animateCharacter(enemy, delta, isChasing, dist < 25);

      // 5. Tactical attack
      if (dist < 2.0) {
        enemy.attackCooldown -= delta;
        if (enemy.attackCooldown <= 0) {
          enemy.attackCooldown = 0.65;
          this.damagePlayer(14);
        }
      } else {
        enemy.attackCooldown = Math.max(0, enemy.attackCooldown - delta);
      }
    });
  }

  private updateParticles(delta: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += delta;
      p.mesh.position.addScaledVector(p.velocity, delta);
      p.velocity.y -= 14 * delta;
      const scale = Math.max(0, 1 - p.life / p.maxLife);
      p.mesh.scale.set(scale, scale, scale);

      if (p.life >= p.maxLife) {
        this.sceneData.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        this.particles.splice(i, 1);
      }
    }
  }

  private updateTimers(delta: number) {
    if (this.shootCooldown > 0) {
      this.shootCooldown -= delta;
      if (this.shootCooldown <= 0 && this.isMouseDown && !this.stats.isReloading) {
        this.fireWeapon();
      }
    }

    if (this.stats.isReloading) {
      this.reloadTimer += delta;
      this.stats.reloadProgress = Math.min(1, this.reloadTimer / this.RELOAD_TIME);
      if (this.reloadTimer >= this.RELOAD_TIME) {
        this.stats.ammo = this.stats.maxAmmo;
        this.stats.isReloading = false;
        this.stats.reloadProgress = 0;
      }
    }

    if (this.stats.hitmarkerActive) {
      this.hitmarkerTimer -= delta;
      if (this.hitmarkerTimer <= 0) this.stats.hitmarkerActive = false;
    }

    if (this.stats.damageVignette) {
      this.damageVignetteTimer -= delta;
      if (this.damageVignetteTimer <= 0) this.stats.damageVignette = false;
    }

    if (this.killFeedTimer > 0) {
      this.killFeedTimer -= delta;
      if (this.killFeedTimer <= 0) this.stats.recentKillText = '';
    }
  }

  // Radar information matching the MITE campus map
  public getRadarData() {
    return {
      player: {
        x: this.playerPos.x,
        z: this.playerPos.z,
        yaw: this.cameraYaw,
      },
      enemies: this.enemies.map((e) => ({
        x: e.group.position.x,
        z: e.group.position.z,
        isDying: e.isDying,
        name: e.name,
      })),
      landmarks: this.sceneData.landmarks,
      bounds: 95,
    };
  }

  public destroy() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.unbindEvents();
    this.particles.forEach((p) => {
      this.sceneData.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
    });
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
