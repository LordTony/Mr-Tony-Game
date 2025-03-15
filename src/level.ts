import {
	Color,
	Engine,
	Font,
	Label,
	Random,
	Scene,
	SceneActivationContext,
	TextAlign
} from 'excalibur';
import { Bird } from './bird';
import { MoveObjEvent, PacketEventManager } from './packet-event-manager';

export class Level extends Scene {
	score: number = 0;
	best: number = 0;
	random = new Random();
	bird = new Bird(this);
	packet_event_manager = new PacketEventManager();

	startGameLabel = new Label({
		text: 'Tap to Start',
		x: 200,
		y: 200,
		z: 2,
		font: new Font({
			size: 30,
			color: Color.White,
			textAlign: TextAlign.Center
		})
	});

	scoreLabel = new Label({
		text: 'Score: 0',
		x: 0,
		y: 0,
		z: 2,
		font: new Font({
			size: 20,
			color: Color.White
		})
	});

	bestLabel = new Label({
		text: 'Best: 0',
		x: 400,
		y: 0,
		z: 2,
		font: new Font({
			size: 20,
			color: Color.White,
			textAlign: TextAlign.End
		})
	});

	override onActivate(): void {
		this.packet_event_manager.Events.on('move_obj', (event: MoveObjEvent) => {
			alert(
				`Object Id to move: ${event.target.obj_id} to X,Y: ${event.target.x},${event.target.y}`
			);
		});
	}

	override onDeactivate(_context: SceneActivationContext): void {}

	override onInitialize(engine: Engine): void {
		this.add(this.bird);

		this.add(this.startGameLabel);
		this.add(this.scoreLabel);
		this.add(this.bestLabel);

		const bestScore = localStorage.getItem('bestScore');
		if (bestScore) {
			this.best = +bestScore;
			this.setBestScore(this.best);
		} else {
			this.setBestScore(0);
		}

		this.showStartInstructions();
	}

	incrementScore() {
		this.scoreLabel.text = `Score: ${++this.score}`;
		this.setBestScore(this.score);
	}

	setBestScore(score: number) {
		if (score > this.best) {
			localStorage.setItem('bestScore', this.score.toString());
			this.best = score;
		}
		this.bestLabel.text = `Best: ${this.best}`;
	}

	showStartInstructions() {
		this.startGameLabel.graphics.isVisible = true;
		this.engine.input.pointers.once('down', () => {
			this.reset();

			this.startGameLabel.graphics.isVisible = false;
			this.bird.start();
		});
	}

	reset() {
		this.bird.reset();
		this.score = 0;
		this.scoreLabel.text = `Score: ${this.score}`;
	}

	triggerGameOver() {
		this.bird.stop();
		this.showStartInstructions();
	}
}
