import { Actor, Color, Line, vec, Vector } from 'excalibur';

export class RectangleZone extends Actor {
	constructor(start_pos: Vector, width: number, height: number) {
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
	}
}
