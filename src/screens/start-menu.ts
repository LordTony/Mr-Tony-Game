import { Engine, Label, Scene, Slide } from 'excalibur';
import { GameConfig } from '../game-config';

export class StartMenu extends Scene {
	solo_game_label: Label;

	constructor() {
		super();

		this.solo_game_label = new Label({
			text: 'Solo Game',
			x: GameConfig.GameResolution.width / 2,
			y: GameConfig.GameResolution.height / 2 + 40,
			z: 2,
			font: GameConfig.GameButtonFont
		});
	}

	override onInitialize(_engine: Engine): void {
		this.add(this.solo_game_label);

		this.solo_game_label.events.on('pointerdown', () => {
			this.engine.goToScene('PlayField', {
				destinationIn: new Slide({ slideDirection: 'left', duration: 1000 }),
				sourceOut: new Slide({ slideDirection: 'left', duration: 1000 })
			});
		});
	}
}
