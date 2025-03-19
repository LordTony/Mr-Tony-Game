import {
	Actor,
	clamp,
	Color,
	EasingFunctions,
	Engine,
	Font,
	Label,
	Scene,
	TextAlign,
	vec,
	Vector
} from 'excalibur';
import { Card } from './card';
import { CardZone } from './card-zone';
import { GlobalConfig } from './game-config';
import { MoveObjectMessage, PlayZoneType } from './messages/move-object.message';
import { PacketEventManager, PeerType } from './packet-event-manager';
import { RectangleZone } from './rectangle-zone';

const z_desc_sorter = (a: Actor, b: Actor) => b.z - a.z;

export class PlayField extends Scene {
	packet_event_manager: PacketEventManager = new PacketEventManager();
	card_dict: Record<number, Card> = {};
	preview_card_zone = new CardZone(Vector.Zero);
	dragged_card: Card | undefined | null;
	dragged_card_offset: Vector = Vector.Zero;

	labelFont = new Font({
		size: 30,
		color: Color.White,
		textAlign: TextAlign.Center
	});

	create_game_label = new Label({
		text: 'Create and Host Game',
		x: GlobalConfig.GameResolution.width / 2,
		y: GlobalConfig.GameResolution.height / 2 - 40,
		z: 2,
		font: this.labelFont
	});

	join_game_label = new Label({
		text: 'Join Game',
		x: GlobalConfig.GameResolution.width / 2,
		y: GlobalConfig.GameResolution.height / 2,
		z: 2,
		font: this.labelFont
	});

	solo_game_label = new Label({
		text: 'Solo Game',
		x: GlobalConfig.GameResolution.width / 2,
		y: GlobalConfig.GameResolution.height / 2 + 40,
		z: 2,
		font: this.labelFont
	});

	resolution_visualizer = new RectangleZone(
		Vector.Zero,
		GlobalConfig.GameResolution.width,
		GlobalConfig.GameResolution.height
	);

	left_zone = new RectangleZone(Vector.Zero, 450, GlobalConfig.GameResolution.height);
	top_zone = new RectangleZone(
		vec(this.left_zone.width, 0),
		GlobalConfig.GameResolution.width - this.left_zone.width,
		GlobalConfig.GameResolution.height / 2
	);
	bottom_zone = new RectangleZone(
		vec(this.left_zone.width, GlobalConfig.GameResolution.height / 2),
		GlobalConfig.GameResolution.width - this.left_zone.width,
		GlobalConfig.GameResolution.height / 2
	);

	top_deck_zone = new RectangleZone(
		vec(this.left_zone.width, GlobalConfig.GameResolution.height / 2),
		GlobalConfig.GameResolution.width - this.left_zone.width,
		GlobalConfig.GameResolution.height / 2
	);

	top_grave_zone = new RectangleZone(
		vec(this.left_zone.width, GlobalConfig.GameResolution.height / 2),
		GlobalConfig.GameResolution.width - this.left_zone.width,
		GlobalConfig.GameResolution.height / 2
	);

	top_exile_zone = new RectangleZone(
		vec(this.left_zone.width, GlobalConfig.GameResolution.height / 2),
		GlobalConfig.GameResolution.width - this.left_zone.width,
		GlobalConfig.GameResolution.height / 2
	);

	override onInitialize(_engine: Engine): void {
		this.add(this.create_game_label);
		this.add(this.join_game_label);
		this.add(this.solo_game_label);
		this.add(this.preview_card_zone);
		this.add(this.resolution_visualizer);

		this.add(this.left_zone);
		this.add(this.top_zone);
		this.add(this.bottom_zone);

		// Setup the buttons to create or join a game
		// Then hook up the
		const items = [
			{ button: this.create_game_label, type: PeerType.Host },
			{ button: this.join_game_label, type: PeerType.Guest },
			{ button: this.solo_game_label, type: null }
		];
		items.forEach((item) => {
			item.button.graphics.isVisible = true;
			item.button.once('pointerdown', () => {
				// hide all the labels
				items.forEach((item) => {
					item.button.graphics.isVisible = false;
				});

				// solo game
				if (item.type == null) {
					this.createRandomCards(5);
					return;
				}

				this.packet_event_manager.Connect('test-game', item.type).then((_connection) => {
					this.createRandomCards(5);

					this.packet_event_manager.Events.on('move_obj', (event) => {
						const cardToMove = this.card_dict[event.target.obj_id];
						const distanceToMove = cardToMove.pos.distance(
							vec(event.target.x, event.target.y)
						);

						cardToMove.moveToTopOfDrawStack();
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

	private createRandomCards(cardCount: number) {
		for (let i = 0; i < cardCount; i++) {
			const card_pos = vec(
				this.bottom_zone.pos.x + 100 + i * 75,
				this.bottom_zone.pos.y + 150
			);
			const nextCard = new Card(card_pos);
			this.card_dict[nextCard.id] = nextCard;
			this.add(nextCard);
		}
	}

	private initializeDraggingEvents() {
		const cursor = this.input.pointers.primary;
		cursor.on('move', (evt) => {
			if (this.dragged_card) {
				const desiredPoint = evt.worldPos.add(this.dragged_card_offset);
				const half_card_width = this.dragged_card.width / 2;
				const half_card_height = this.dragged_card.height / 2;
				const clampedPoint = vec(
					clamp(
						desiredPoint.x,
						this.left_zone.width + half_card_width,
						GlobalConfig.GameResolution.width - half_card_width
					),
					clamp(
						desiredPoint.y,
						half_card_height,
						GlobalConfig.GameResolution.height - half_card_height
					)
				);
				this.dragged_card.pos = clampedPoint;
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

				this.dragged_card.moveToTopOfDrawStack();
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
