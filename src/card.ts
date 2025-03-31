import { Actor, ImageSource, Vector } from 'excalibur';
import { Config } from './config';

export class Card extends Actor {
	private static top_of_draw_stack: number = 1;

	img_src: ImageSource;

	constructor(loaded_img_source: ImageSource, pos: Vector) {
		super({
			pos: pos,
			height: Config.CardWidth * Config.CardAspectRatio,
			width: Config.CardWidth
		});
		this.z = Card.top_of_draw_stack;
		this.img_src = loaded_img_source;
		Card.top_of_draw_stack++;
	}

	override onInitialize(): void {
		const sprite = this.img_src.toSprite({
			destSize: {
				height: Config.CardWidth * Config.CardAspectRatio,
				width: Config.CardWidth
			}
		});
		this.graphics.use(sprite);
	}

	moveToTopOfDrawStack() {
		Card.top_of_draw_stack++;
		this.z = Card.top_of_draw_stack;
	}
}
