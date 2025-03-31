import {
	Actor,
	clamp,
	EasingFunctions,
	Engine,
	ImageSource,
	Label,
	Scene,
	vec,
	Vector
} from 'excalibur';
import { remove } from 'lodash-es';
import { Card } from '../card';
import { CardZone } from '../card-zone';
import { GameConfig } from '../game-config';
import { MoveObjectMessage, PlayZoneType } from '../messages/move-object.message';
import { PacketEventManager, PeerType } from '../packet-event-manager';
import { RectangleZone } from '../rectangle-zone';
import { DB } from '../utils/database';

const z_desc_sorter = (a: Actor, b: Actor) => b.z - a.z;

export class PlayField extends Scene {
	packet_event_manager: PacketEventManager = new PacketEventManager();
	card_dict: Record<number, Card> = {};
	cards_on_board: Set<Card> = new Set();
	cards_in_player_hand: Card[] = [];
	cards_in_opponent_hand: Card[] = [];
	preview_card_zone = new CardZone(Vector.Zero);
	dragged_card: Card | undefined | null;
	dragged_card_offset: Vector = Vector.Zero;

	database: DB = new DB();

	create_game_label = new Label({
		text: 'Create and Host Game',
		x: GameConfig.GameResolution.width / 2,
		y: GameConfig.GameResolution.height / 2 - 40,
		z: 2,
		font: GameConfig.GameButtonFont
	});

	join_game_label = new Label({
		text: 'Join Game',
		x: GameConfig.GameResolution.width / 2,
		y: GameConfig.GameResolution.height / 2,
		z: 2,
		font: GameConfig.GameButtonFont
	});

	solo_game_label = new Label({
		text: 'Solo Game',
		x: GameConfig.GameResolution.width / 2,
		y: GameConfig.GameResolution.height / 2 + 40,
		z: 2,
		font: GameConfig.GameButtonFont
	});

	resolution_visualizer = new RectangleZone(
		Vector.Zero,
		GameConfig.GameResolution.width,
		GameConfig.GameResolution.height
	);

	left_zone = new RectangleZone(
		Vector.Zero,
		GameConfig.CardZoomViewWidth,
		GameConfig.GameResolution.height
	);

	top_zone = new RectangleZone(
		vec(this.left_zone.width, 0),
		GameConfig.GameResolution.width - this.left_zone.width,
		GameConfig.GameResolution.height / 2
	);

	bottom_zone = new RectangleZone(
		vec(this.left_zone.width, GameConfig.GameResolution.height / 2),
		GameConfig.GameResolution.width - this.left_zone.width,
		GameConfig.GameResolution.height / 2
	);

	top_hand_zone = new RectangleZone(
		vec(GameConfig.GameResolution.width - GameConfig.CardWidth, 0),
		GameConfig.CardWidth,
		GameConfig.GameResolution.height / 2,
		'Opponent Hand'
	);

	bottom_hand_zone = new RectangleZone(
		vec(
			GameConfig.GameResolution.width - GameConfig.CardWidth,
			GameConfig.GameResolution.height / 2
		),
		GameConfig.CardWidth,
		GameConfig.GameResolution.height / 2,
		'Player Hand'
	);

	opponent_exile_zone = new RectangleZone(
		vec(this.top_hand_zone.collider.bounds.left - GameConfig.DeckZoneWidth, 0),
		GameConfig.DeckZoneWidth,
		GameConfig.DeckZoneWidth * GameConfig.CardAspectRatio,
		'Exile'
	);

	opponent_grave_zone = new RectangleZone(
		vec(this.opponent_exile_zone.collider.bounds.left - GameConfig.DeckZoneWidth, 0),
		GameConfig.DeckZoneWidth,
		GameConfig.DeckZoneWidth * GameConfig.CardAspectRatio,
		'Grave'
	);

	opponent_deck_zone = new RectangleZone(
		vec(this.opponent_grave_zone.collider.bounds.left - GameConfig.DeckZoneWidth, 0),
		GameConfig.DeckZoneWidth,
		GameConfig.DeckZoneWidth * GameConfig.CardAspectRatio,
		'Deck'
	);

	exile_zone = new RectangleZone(
		vec(
			this.top_hand_zone.collider.bounds.left - GameConfig.DeckZoneWidth,
			GameConfig.GameResolution.height - GameConfig.DeckZoneWidth * GameConfig.CardAspectRatio
		),
		GameConfig.DeckZoneWidth,
		GameConfig.DeckZoneWidth * GameConfig.CardAspectRatio,
		'Exile'
	);

	grave_zone = new RectangleZone(
		vec(
			this.opponent_exile_zone.collider.bounds.left - GameConfig.DeckZoneWidth,
			GameConfig.GameResolution.height - GameConfig.DeckZoneWidth * GameConfig.CardAspectRatio
		),
		GameConfig.DeckZoneWidth,
		GameConfig.DeckZoneWidth * GameConfig.CardAspectRatio,
		'Grave'
	);

	deck_zone = new RectangleZone(
		vec(
			this.opponent_grave_zone.collider.bounds.left - GameConfig.DeckZoneWidth,
			GameConfig.GameResolution.height - GameConfig.DeckZoneWidth * GameConfig.CardAspectRatio
		),
		GameConfig.DeckZoneWidth,
		GameConfig.DeckZoneWidth * GameConfig.CardAspectRatio,
		'Deck'
	);

	constructor() {
		super();
	}

	override onInitialize(_engine: Engine): void {
		this.add(this.create_game_label);
		this.add(this.join_game_label);
		this.add(this.solo_game_label);
		this.add(this.preview_card_zone);
		this.add(this.resolution_visualizer);

		this.add(this.left_zone);
		this.add(this.top_zone);
		this.add(this.bottom_zone);

		this.add(this.top_hand_zone);
		this.add(this.bottom_hand_zone);

		this.add(this.opponent_deck_zone);
		this.add(this.opponent_grave_zone);
		this.add(this.opponent_exile_zone);

		this.add(this.deck_zone);
		this.add(this.grave_zone);
		this.add(this.exile_zone);

		this.database.init().then(() => {
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
						this.loadCardsFromDB('ce05e70b-eee4-4a67-9673-1b0830f6b664');
						return;
					}

					this.packet_event_manager.Connect('test-game', item.type).then((_connection) => {
						this.loadCardsFromDB('ce05e70b-eee4-4a67-9673-1b0830f6b664');

						this.packet_event_manager.Events.on('move_obj', (event) => {
							const cardToMove = this.card_dict[event.target.obj_id];
							const distanceToMove = cardToMove.pos.distance(vec(event.target.x, event.target.y));

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
		});

		this.initializeDraggingEvents();
	}

	private async loadCardsFromDB(deckId: string) {
		const deck = await this.database.getDeck(deckId);
		const load_promises = deck.cards.map(
			(card) =>
				new Promise((resolve, _reject) => {
					const object_url = URL.createObjectURL(card.front_blob);
					const img_src = new ImageSource(object_url);
					img_src.load().then(() => {
						resolve({ count: card.count, src: img_src });
					});
				})
		);

		const img_srcs = (await Promise.all(load_promises)) as { count: number; src: ImageSource }[];

		for (let i = 0; i < img_srcs.length; i++) {
			for (let j = 0; j < img_srcs[i].count; j++) {
				const card_pos = vec(
					this.bottom_zone.pos.x + GameConfig.CardWidth / 2 + i * (GameConfig.CardWidth + 5),
					this.bottom_zone.pos.y + 150 + j * GameConfig.CardLabelBottomViewOffset
				);
				const nextCard = new Card(img_srcs[i].src, card_pos);
				this.card_dict[nextCard.id] = nextCard;
				this.cards_on_board.add(nextCard);
				this.add(nextCard);
			}
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
						this.left_zone.collider.bounds.right + half_card_width,
						GameConfig.GameResolution.width - half_card_width
					),
					clamp(
						desiredPoint.y,
						half_card_height,
						GameConfig.GameResolution.height - half_card_height
					)
				);
				this.dragged_card.pos = clampedPoint;
			} else {
				const hovered_card = this.getTopCardHoveredCardAtPoint(evt.worldPos);
				this.preview_card_zone.setPreviewImage(hovered_card ? hovered_card.img_src : null);
			}
		});

		cursor.on('down', (evt) => {
			const pt = evt.worldPos;
			const top_clicked_card = this.getTopCardHoveredCardAtPoint(pt);

			if (top_clicked_card) {
				this.dragged_card = top_clicked_card;
				this.dragged_card_offset = this.dragged_card.pos.sub(pt);

				this.dragged_card.moveToTopOfDrawStack();
			}
		});

		cursor.on('up', () => {
			if (this.dragged_card) {
				const pt = this.dragged_card.collider.bounds.bottomRight;
				const dropped_in_hand_zone =
					this.bottom_hand_zone.contains(pt.x, pt.y, false) ||
					this.top_hand_zone.contains(pt.x, pt.y, false);
				if (dropped_in_hand_zone) {
					this.addCardToHand(this.dragged_card);
				} else {
					this.remove_card_from_hand_if_its_there(this.dragged_card);
					remove(this.cards_in_player_hand, this.dragged_card);
					const message = new MoveObjectMessage(
						this.dragged_card.id,
						PlayZoneType.Board,
						this.dragged_card.pos.x,
						this.dragged_card.pos.y
					);

					this.packet_event_manager.SendThrottledMoveObjectMessage(message);
				}
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

	addCardToHand(card: Card) {
		this.remove_card_from_hand_if_its_there(card);
		this.cards_on_board.delete(card);

		const hand_card_count = this.cards_in_player_hand.length;
		const hand = this.bottom_hand_zone.collider.bounds;
		const x_pos = hand.left + card.width / 2;
		const y_pos =
			hand.top + card.height / 2 + hand_card_count * GameConfig.CardLabelBottomViewOffset;

		const position_in_hand = vec(x_pos, y_pos);
		card.actions.moveTo({
			pos: position_in_hand,
			duration: 150,
			easing: EasingFunctions.EaseOutCubic
		});
		this.cards_in_player_hand.push(card);
	}

	remove_card_from_hand_if_its_there(card: Card) {
		const card_was_in_hand = this.cards_in_player_hand.includes(card);
		if (!card_was_in_hand) {
			return;
		}

		this.cards_on_board.add(card);
		remove(this.cards_in_player_hand, card);

		// adjust all cards that were in the hand
		const hand = this.bottom_hand_zone.collider.bounds;
		const x_pos = hand.left + card.width / 2;
		const start_y = hand.top + card.height / 2;
		this.cards_in_player_hand.forEach((hand_card, adjusted_index) => {
			const y_pos = start_y + adjusted_index * GameConfig.CardLabelBottomViewOffset;
			const position_in_hand = vec(x_pos, y_pos);
			hand_card.actions.moveTo({
				pos: position_in_hand,
				duration: 150,
				easing: EasingFunctions.EaseOutCubic
			});
		});
	}
}
