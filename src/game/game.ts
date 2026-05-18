import * as Phaser from 'phaser';
import { Boot } from './scenes/Boot';
import { Preloader } from './scenes/Preloader';
import { MainGame } from './scenes/MainGame';

export const StartGame = (parent: string) => {
    return new Phaser.Game({
        type: Phaser.AUTO,
        parent: parent,
        width: 1024,
        height: 768,
        backgroundColor: '#ffffff',
        transparent: false,
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: 1080,
            height: 1920,
        },
        physics: {
            default: 'arcade',
            arcade: { 
                gravity: { x: 0, y: 0 },
                debug: false
            }
        },
        scene: [Boot, Preloader, MainGame]
    });
};

export default StartGame;
