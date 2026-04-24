import * as Phaser from 'phaser';

export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // Initial assets for preloader (e.g., logo, progress bar)
    this.load.image('background', 'https://labs.phaser.io/assets/skies/space3.png');
  }

  create() {
    this.scene.start('Preloader');
  }
}
