import * as THREE from 'three';

export interface GunState {
  isADS: boolean;
  isReloading: boolean;
  ammo: number;
  maxAmmo: number;
  recoil: number;
  recoilRot: number;
}

export class GunModel {
  public mesh: THREE.Group;
  public muzzleFlash: THREE.Mesh;
  public muzzleLight: THREE.PointLight;
  private flashDuration: number = 0;

  // Hipfire vs ADS offsets relative to camera
  public readonly HIP_POS = new THREE.Vector3(0.24, -0.22, -0.48);
  public readonly HIP_ROT = new THREE.Euler(0.02, -0.04, 0);

  public readonly ADS_POS = new THREE.Vector3(0.0, -0.152, -0.38);
  public readonly ADS_ROT = new THREE.Euler(0, 0, 0);

  public currentPos = new THREE.Vector3();
  public currentRot = new THREE.Euler();

  private reloadAnimTime: number = 0;
  private readonly RELOAD_DURATION: number = 1.4; // 1.4 seconds

  constructor() {
    this.mesh = new THREE.Group();

    // 1. Gun Body / Receiver
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.3,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.4), bodyMat);
    body.position.set(0, 0, 0);
    this.mesh.add(body);

    // 2. Barrel
    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.9,
      roughness: 0.2,
    });
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.32), barrelMat);
    barrel.position.set(0, 0.02, -0.32);
    this.mesh.add(barrel);

    // Muzzle brake
    const brakeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9 });
    const brake = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, 0.06), brakeMat);
    brake.position.set(0, 0.02, -0.48);
    this.mesh.add(brake);

    // 3. Iron Sights (Precision aligned for ADS)
    // Front Sight Post (bright red tip)
    const frontSightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.025, 0.015), frontSightMat);
    frontSight.position.set(0, 0.054, -0.45);
    this.mesh.add(frontSight);

    // Rear Sight Notch (two small posts)
    const rearMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
    const rearLeft = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.022, 0.015), rearMat);
    rearLeft.position.set(-0.022, 0.062, 0.12);
    this.mesh.add(rearLeft);

    const rearRight = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.022, 0.015), rearMat);
    rearRight.position.set(0.022, 0.062, 0.12);
    this.mesh.add(rearRight);

    // 4. Pistol Grip
    const gripMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
    });
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.15, 0.08), gripMat);
    grip.position.set(0, -0.1, 0.12);
    grip.rotation.x = -0.35;
    this.mesh.add(grip);

    // 5. Magazine
    const magMat = new THREE.MeshStandardMaterial({
      color: 0xd97706, // High-visibility tactical magazine
      metalness: 0.5,
      roughness: 0.4,
    });
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.09), magMat);
    mag.position.set(0, -0.11, -0.06);
    mag.rotation.x = 0.15;
    this.mesh.add(mag);

    // 6. Muzzle Flash Sprite / Geometry
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      wireframe: true,
      transparent: true,
      opacity: 0,
    });
    this.muzzleFlash = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 1), flashMat);
    this.muzzleFlash.position.set(0, 0.02, -0.56);
    this.mesh.add(this.muzzleFlash);

    this.muzzleLight = new THREE.PointLight(0xfef08a, 0, 8);
    this.muzzleLight.position.set(0, 0.02, -0.56);
    this.mesh.add(this.muzzleLight);

    // Set starting position
    this.currentPos.copy(this.HIP_POS);
    this.currentRot.copy(this.HIP_ROT);
    this.mesh.position.copy(this.currentPos);
    this.mesh.rotation.copy(this.currentRot);
  }

  // Trigger firing recoil and muzzle burst
  public triggerShot() {
    this.flashDuration = 0.055; // seconds
    const flashMat = this.muzzleFlash.material as THREE.MeshBasicMaterial;
    flashMat.opacity = 1;
    this.muzzleFlash.scale.set(1 + Math.random() * 0.4, 1 + Math.random() * 0.4, 1.4);
    this.muzzleLight.intensity = 3.5;
  }

  public update(
    delta: number,
    isADS: boolean,
    isReloading: boolean,
    reloadProgress: number,
    isMoving: boolean,
    isSprinting: boolean,
    moveTimer: number
  ) {
    // 1. Muzzle Flash Fadeout
    if (this.flashDuration > 0) {
      this.flashDuration -= delta;
      if (this.flashDuration <= 0) {
        const flashMat = this.muzzleFlash.material as THREE.MeshBasicMaterial;
        flashMat.opacity = 0;
        this.muzzleLight.intensity = 0;
      }
    }

    // 2. Target Pos/Rot based on ADS and Reload
    const targetPos = new THREE.Vector3();
    const targetRot = new THREE.Euler();

    if (isReloading) {
      // Reload animation: dip weapon down and tilt
      const dip = Math.sin(reloadProgress * Math.PI) * 0.22;
      targetPos.copy(this.HIP_POS).add(new THREE.Vector3(-0.05, -dip, 0.05));
      targetRot.set(-0.35 * Math.sin(reloadProgress * Math.PI), -0.2, -0.3 * Math.sin(reloadProgress * Math.PI));
    } else if (isADS) {
      targetPos.copy(this.ADS_POS);
      targetRot.copy(this.ADS_ROT);
    } else {
      targetPos.copy(this.HIP_POS);
      targetRot.copy(this.HIP_ROT);

      // Walk / Sprint Bobbing (hipfire only)
      if (isMoving) {
        const speed = isSprinting ? 14 : 9;
        const bobX = Math.cos(moveTimer * speed * 0.5) * (isSprinting ? 0.014 : 0.008);
        const bobY = Math.abs(Math.sin(moveTimer * speed)) * (isSprinting ? 0.016 : 0.009);
        targetPos.x += bobX;
        targetPos.y += bobY;
        targetRot.z += bobX * 1.5;
      }
    }

    // 3. Smooth Lerp
    const lerpSpeed = isADS ? 18 * delta : 12 * delta;
    this.currentPos.lerp(targetPos, Math.min(1, lerpSpeed));
    this.currentRot.x = THREE.MathUtils.lerp(this.currentRot.x, targetRot.x, Math.min(1, lerpSpeed));
    this.currentRot.y = THREE.MathUtils.lerp(this.currentRot.y, targetRot.y, Math.min(1, lerpSpeed));
    this.currentRot.z = THREE.MathUtils.lerp(this.currentRot.z, targetRot.z, Math.min(1, lerpSpeed));

    this.mesh.position.copy(this.currentPos);
    this.mesh.rotation.copy(this.currentRot);
  }
}
