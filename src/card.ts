import { Actor, ImageSource, vec, Vector } from 'excalibur';
import { Level } from './level';
import { MoveObjectMessage, PlayZoneType } from './messages/move-object.message';

const card_aspect_ratio = 88 / 63;

export class Card extends Actor {
	dragging = false;
	drag_offset = vec(0, 0);
	card_img: ImageSource | undefined;
	constructor(
		private level: Level,
		start_pos: Vector
	) {
		super({
			pos: start_pos,
			radius: 8
		});
	}

	override onInitialize(): void {
		this.card_img = new ImageSource(
			'https://static.tappedout.net/mtg-cards-2/DSC/sulfurous-springs/regular-1727063894.png'
		);
		this.card_img.load().then(() => {
			const sprite = (this.card_img as ImageSource).toSprite({
				destSize: {
					height: 150 * card_aspect_ratio,
					width: 150
				}
			});
			this.graphics.use(sprite);

			this.on('pointerenter', (event) => {
				if (!this.dragging) {
					this.level.preview_card_zone.setPreviewImage(this.card_img);
				}
				event.cancel();
			});

			this.on('pointerleave', () => {
				if (!this.dragging) {
					this.level.preview_card_zone.setPreviewImage(null);
				}
			});

			this.on('pointerdown', (event) => {
				this.dragging = true;
				this.drag_offset = this.pos.sub(event.worldPos);
				event.cancel();
			});

			const mouse = this.level.input.pointers.primary;
			mouse.on('up', () => {
				if (this.dragging && this.level.packet_event_manager) {
					const message = new MoveObjectMessage(
						this.id,
						PlayZoneType.Board,
						this.pos.x,
						this.pos.y
					);
					this.level.packet_event_manager.SendThrottledMoveObjectMessage(message);
				}
				this.dragging = false;
			});

			mouse.on('move', (event) => {
				if (this.dragging) {
					this.pos = event.worldPos.add(this.drag_offset);
				}
			});
		});
	}
}
