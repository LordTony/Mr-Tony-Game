import { Actor, Color, Line, vec, Vector } from 'excalibur';
import { GameConfig } from './game-config';
import { Create_Sprite_From_HtmlElement_Async } from './utils/dom-img-src';

export class RectangleZone extends Actor {
	constructor(
		start_pos: Vector,
		width: number,
		height: number,
		public label?: string
	) {
		super({
			pos: start_pos,
			width: width,
			height: height,
			anchor: Vector.Zero,
			z: -1
		});
	}

	override onInitialize(): void {
		const verticalLine = new Line({
			color: Color.Black,
			start: Vector.Zero,
			end: vec(0, this.height),
			thickness: 2
		});

		const horizontalLine = new Line({
			color: Color.Black,
			start: Vector.Zero,
			end: vec(this.width, 0),
			thickness: 2
		});

		const lineOpacity = 0.4;
		const leftLine = new Actor({
			pos: Vector.Zero,
			anchor: Vector.Zero,
			opacity: lineOpacity
		});
		leftLine.graphics.use(verticalLine);
		this.addChild(leftLine);

		const rightLine = new Actor({
			pos: vec(this.width, 0),
			anchor: Vector.Zero,
			opacity: lineOpacity
		});
		rightLine.graphics.use(verticalLine);
		this.addChild(rightLine);

		const topLine = new Actor({
			pos: Vector.Zero,
			anchor: Vector.Zero,
			opacity: lineOpacity
		});
		topLine.graphics.use(horizontalLine);

		this.addChild(topLine);

		const bottomLine = new Actor({
			pos: vec(0, this.height),
			anchor: Vector.Zero,
			opacity: lineOpacity
		});
		bottomLine.graphics.use(horizontalLine);
		this.addChild(bottomLine);

		if (this.label) {
			const elem = document.createElement('div');
			elem.append(this.label);
			elem.style.borderRadius = '10px';
			elem.style.backgroundColor = 'darkslateblue';
			elem.style.boxShadow = '2px grey';
			elem.style.color = 'white';
			elem.style.writingMode = 'vertical-lr';
			elem.style.textOrientation = 'upright';
			elem.style.fontSize = '25px';
			elem.style.whiteSpace = 'nowrap';
			elem.style.padding = '15px';

			Create_Sprite_From_HtmlElement_Async(
				elem,
				vec(100, GameConfig.GameResolution.height / 2)
			).then((sprite) => {
				const test_label = new Actor({
					pos: vec(this.width / 2, this.height / 2)
				});
				test_label.graphics.use(sprite);
				this.addChild(test_label);
			});
		}
	}
}
