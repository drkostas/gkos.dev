import Phaser from "phaser";

/**
 * OG-style map name popup (map_name_popup.c).
 *
 * Renders in world coordinates and repositions every frame to track
 * the camera (scrollFactor(0) doesn't work reliably with zoomed cameras).
 *
 * OG timing:
 *   Slide in:  ~333ms
 *   Stay:      ~2000ms (120 frames)
 *   Slide out: ~333ms
 */

const WAIT_MS = 2000;
const SLIDE_DURATION = 333;

export class MapNamePopup {
  private scene: Phaser.Scene;
  private bg: Phaser.GameObjects.Image | null = null;
  private text: Phaser.GameObjects.Text | null = null;
  private active = false;
  private currentZoneId: string | null = null;
  private pendingTimeout: Phaser.Time.TimerEvent | null = null;
  /** Offset from camera top-left in game pixels. Animated for slide. */
  private offsetX = 3;
  private offsetY = -24;
  private popupW = 80;
  private popupH = 20;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  show(zoneName: string, zoneId: string, theme: "marble" | "wood"): void {
    if (this.currentZoneId === zoneId) return;
    this.currentZoneId = zoneId;

    if (this.active) {
      this.cleanup();
    }
    this.createAndSlideIn(zoneName, theme);
  }

  /** Call every frame to track the camera (world-coordinate popup). */
  update(): void {
    if (!this.bg || !this.text) return;
    const cam = this.scene.cameras.main;
    const worldX = cam.scrollX + this.offsetX;
    const worldY = cam.scrollY + this.offsetY;

    this.bg.setPosition(worldX, worldY);
    this.text.setPosition(worldX + this.popupW / 2, worldY + this.popupH / 2 + 1);
  }

  private createAndSlideIn(zoneName: string, theme: "marble" | "wood"): void {
    this.cleanup();

    const textureKey = `popup_${theme}`;
    this.popupW = Math.max(80, zoneName.length * 7 + 20);
    this.popupH = 20;

    // Create in world coords — position will be set by update()
    this.bg = this.scene.add.image(0, 0, textureKey);
    this.bg.setOrigin(0, 0);
    this.bg.setDisplaySize(this.popupW, this.popupH);
    this.bg.setDepth(99999);

    this.text = this.scene.add.text(0, 0, zoneName, {
      fontFamily: "'Pokemon DS', 'Pokemon GB', monospace",
      fontSize: "10px",
      color: "#383838",
    });
    this.text.setOrigin(0.5, 0.5);
    this.text.setDepth(99999);

    // Start offscreen (above camera view)
    this.offsetX = 3;
    this.offsetY = -this.popupH - 2;
    this.active = true;

    // Immediately position
    this.update();

    // Slide in: tween offsetY from offscreen to onscreen
    const target = { y: this.offsetY };
    this.scene.tweens.add({
      targets: target,
      y: 3, // 3px below camera top edge
      duration: SLIDE_DURATION,
      ease: "Sine.easeOut",
      onUpdate: () => {
        this.offsetY = target.y;
      },
      onComplete: () => {
        this.pendingTimeout = this.scene.time.delayedCall(WAIT_MS, () => {
          this.slideOut();
        });
      },
    });
  }

  private slideOut(): void {
    if (this.pendingTimeout) {
      this.pendingTimeout.destroy();
      this.pendingTimeout = null;
    }
    if (!this.bg) {
      this.active = false;
      return;
    }

    const target = { y: this.offsetY };
    this.scene.tweens.add({
      targets: target,
      y: -this.popupH - 2,
      duration: SLIDE_DURATION,
      ease: "Sine.easeIn",
      onUpdate: () => {
        this.offsetY = target.y;
      },
      onComplete: () => {
        this.cleanup();
        this.active = false;
      },
    });
  }

  private cleanup(): void {
    if (this.pendingTimeout) {
      this.pendingTimeout.destroy();
      this.pendingTimeout = null;
    }
    if (this.bg) { this.bg.destroy(); this.bg = null; }
    if (this.text) { this.text.destroy(); this.text = null; }
  }
}
