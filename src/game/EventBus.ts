import { Events } from 'phaser';

/**
 * Custom EventBus for bi-directional communication between Phaser and React.
 * Phaser Scenes can emit events that React components listen to, and vice-versa.
 */
export const EventBus = new Events.EventEmitter();
