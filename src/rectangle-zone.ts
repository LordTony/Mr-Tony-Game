import { Actor, Color, Direction, Font, Label, Line, Rectangle, TextAlign, vec, Vector } from 'excalibur';

export class RectangleZone extends Actor {
	private static label_font: Font;

	static {
		RectangleZone.label_font = new Font({
			size: 30,
			color: Color.White,
			textAlign: TextAlign.Center,
			family: "Comic Sans MS"
		});
	}
	constructor(start_pos: Vector, width: number, height: number, public label?: string) {
		super({
			pos: start_pos,
			width: width,
			height: height,
			anchor: Vector.Zero,
			z: -1,
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

		if(this.label) {
			const test = document.createElement("span");
			test.textContent = this.label;
			test.className = 'vertical-label';
			document.getElementById("ui")?.append(test);

			const itemWidth = test.clientWidth;
			const itemHeight = test.clientHeight;

			test.style.left = `${this.pos.x + this.width / 2 - itemWidth / 2}px`;
			test.style.top = `${this.pos.y + this.height / 2 - itemHeight / 2}px`;
		}
	}
}
