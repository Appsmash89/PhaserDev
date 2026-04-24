import * as Phaser from 'phaser';
import { EventBus } from '../EventBus';

export class MainGame extends Phaser.Scene {
    private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

    constructor() {
        super('MainGame');
    }

    create() {
        // 1. Notify UI that game is ready
        EventBus.emit('current-scene-ready', this);

        // 2. Add a high-fidelity placeholder (A simple physics-enabled brand logo)
        this.player = this.physics.add.sprite(this.cameras.main.centerX, this.cameras.main.centerY, 'logo');
        this.player.setCollideWorldBounds(true);
        this.player.setInteractive();

        // 3. THE "HOOK": Sync Phaser Interaction -> React State
        this.player.on('pointerdown', () => {
            // Trigger the "addScore" in our Zustand store via the EventBus bridge
            EventBus.emit('game-score-increment', 10);
            
            // Add some "Juice" (CEO-approved high-quality feel)
            this.tweens.add({
                targets: this.player,
                scale: 1.2,
                duration: 100,
                yoyo: true
            });
        });

        // 4. Listen for UI-driven events (e.g., Pause from React)
        EventBus.on('ui-pause-toggle', (isPaused: boolean) => {
            if (isPaused) {
                this.physics.pause();
                this.tweens.pauseAll();
            } else {
                this.physics.resume();
                this.tweens.resumeAll();
            }
        });
    }

    update() {
        // High-performance logic goes here
    }
}
