import { Actor, vec, Vector } from 'excalibur';
import { Level } from './level';
import { Config } from './config';

export class ScoreTrigger extends Actor {
	constructor(
		pos: Vector,
		private level: Level
	) {
		super({
			pos,
			width: 32,
			height: Config.PipeGap,
			anchor: vec(0, 0),
			// color: Color.Violet,
			vel: vec(-Config.PipeSpeed, 0),
		});

		this.on('exitviewport', () => {
			this.kill();
		});
	}

	override onCollisionStart(): void {
		this.level.incrementScore();
	}
}
