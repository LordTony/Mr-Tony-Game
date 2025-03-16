import {
	Actor,
	Color,
	EasingFunctions,
	Engine,
	Font,
	Label,
	Resolution,
	Scene,
	SceneActivationContext,
	TextAlign,
	vec,
	Vector
} from 'excalibur';
import { Card } from './card';
import { CardZone } from './card-zone';
import { MoveObjectMessage, PlayZoneType } from './messages/move-object.message';
import { PacketEventManager, PeerType } from './packet-event-manager';

const z_desc_sorter = (a: Actor, b: Actor) => b.z - a.z;

export class Level extends Scene {
	packet_event_manager: PacketEventManager = new PacketEventManager();
	card_dict: Record<number, Card> = {};
	preview_card_zone = new CardZone(vec(20, 20));
	dragged_card: Card | undefined | null;
	dragged_card_offset: Vector = Vector.Zero;

	labelFont = new Font({
		size: 30,
		color: Color.White,
		textAlign: TextAlign.Center
	});

	create_game_label = new Label({
		text: 'Create and Host Game',
		x: Resolution.Standard.width / 2,
		y: Resolution.Standard.height / 2 - 50,
		z: 2,
		font: this.labelFont
	});

	join_game_label = new Label({
		text: 'Join Game',
		x: Resolution.Standard.width / 2,
		y: Resolution.Standard.height / 2 + 50,
		z: 2,
		font: this.labelFont
	});

	override onDeactivate(_context: SceneActivationContext): void {}

	override onInitialize(_engine: Engine): void {
		this.add(this.create_game_label);
		this.add(this.join_game_label);

		this.add(this.preview_card_zone);

		// Setup the buttons to create or join a game
		// Then hook up the
		[
			{ button: this.create_game_label, type: PeerType.Host },
			{ button: this.join_game_label, type: PeerType.Guest }
		].forEach((item) => {
			item.button.graphics.isVisible = true;
			item.button.once('pointerdown', () => {
				this.create_game_label.graphics.isVisible = false;
				this.join_game_label.graphics.isVisible = false;
				this.packet_event_manager.Connect('test-game', item.type).then((_connection) => {
					for (let i = 0; i < 5; i++) {
						const nextCard = new Card(vec(600 + i * 50, 300));
						this.card_dict[nextCard.id] = nextCard;
						this.add(nextCard);
					}

					this.packet_event_manager.Events.on('move_obj', (event) => {
						const cardToMove = this.card_dict[event.target.obj_id];
						const distanceToMove = cardToMove.pos.distance(
							vec(event.target.x, event.target.y)
						);

						cardToMove.addToTopOfDrawStack();
						cardToMove.actions.moveTo({
							pos: vec(event.target.x, event.target.y),
							duration: distanceToMove < 200 ? 300 : 500,
							easing: EasingFunctions.EaseOutCubic
						});
					});
				});
			});
		});

		this.initializeDraggingEvents();
	}

	private initializeDraggingEvents() {
		const cursor = this.input.pointers.primary;
		cursor.on('move', (evt) => {
			if (this.dragged_card) {
				this.dragged_card.pos = evt.worldPos.add(this.dragged_card_offset);
			} else {
				const hovered_card = this.getTopCardHoveredCardAtPoint(evt.worldPos);
				this.preview_card_zone.setPreviewImage(hovered_card ? hovered_card.card_img : null);
			}
		});

		cursor.on('down', (evt) => {
			const top_clicked_card = this.getTopCardHoveredCardAtPoint(evt.worldPos);

			if (top_clicked_card) {
				this.dragged_card = top_clicked_card;
				this.dragged_card_offset = this.dragged_card.pos.sub(evt.worldPos);

				this.dragged_card.addToTopOfDrawStack();
			}
		});

		cursor.on('up', () => {
			if (this.dragged_card && this.packet_event_manager) {
				const message = new MoveObjectMessage(
					this.dragged_card.id,
					PlayZoneType.Board,
					this.dragged_card.pos.x,
					this.dragged_card.pos.y
				);

				this.packet_event_manager.SendThrottledMoveObjectMessage(message);
			}

			this.dragged_card = null;
		});
	}

	getTopCardHoveredCardAtPoint(point: Vector): Card | null {
		const hovered_cards = this.actors
			.filter((actor) => actor instanceof Card && actor.contains(point.x, point.y, false))
			.toSorted(z_desc_sorter);

		return hovered_cards.length > 0 ? (hovered_cards[0] as Card) : null;
	}
}
