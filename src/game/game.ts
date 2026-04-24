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
        backgroundColor: '#000000',
        scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH,
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
