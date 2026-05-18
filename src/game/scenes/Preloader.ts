import * as Phaser from 'phaser';

export class Preloader extends Phaser.Scene {
  constructor() {
    super('Preloader');
  }

  preload() {
    // Assets loading progress can be tracked here
    this.add.image(512, 384, 'background');
    
    // Simple progress bar
    const progress = this.add.graphics();
    this.load.on('progress', (value: number) => {
      progress.clear();
      progress.fillStyle(0xffffff, 1);
      progress.fillRect(256, 370, 512 * value, 28);
    });

    // Load game assets
    this.load.setPath('/assets/');
    this.load.image('lineart', 'lineart.png');
  }

  create() {
    this.scene.start('MainGame');
  }
}
