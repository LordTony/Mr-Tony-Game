import { Actor, Color, Engine, SpriteSheet, vec } from 'excalibur';
import { Level } from './level';
import { Resources } from './resources';

const BirdStartPos = vec(300, 300);

export class Bird extends Actor {
	playing = false;
	dragging = false;
	drag_offset = vec(0, 0);
	constructor(private level: Level) {
		super({
			pos: BirdStartPos,
			radius: 8,
			color: Color.Yellow
		});
	}

	override onInitialize(): void {
		const spriteSheet = SpriteSheet.fromImageSource({
			image: Resources.BirdImage,
			grid: {
				rows: 1,
				columns: 4,
				spriteWidth: 32,
				spriteHeight: 32
			}
		});

		this.graphics.add('start', spriteSheet.getSprite(1, 0));
		this.graphics.use('start');

		this.on('pointerdown', (event) => {
			this.dragging = true;
			this.drag_offset = this.pos.sub(event.worldPos);
		});

		const mouse = this.level.input.pointers.primary;
		mouse.on('up', () => {
			this.dragging = false;
		});

		mouse.on('move', (event) => {
			if (this.dragging) {
				this.pos = event.worldPos.add(this.drag_offset);
			}
		});
	}

	override onPostUpdate(engine: Engine): void {
		if (!this.playing) return;
	}

	start() {
		this.playing = true;
		this.dragging = false;
		this.pos = BirdStartPos;
	}

	reset() {
		this.pos = BirdStartPos; // starting position
		this.stop();
	}

	stop() {
		this.dragging = false;
		this.playing = false;
	}
}
