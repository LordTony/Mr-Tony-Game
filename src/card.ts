import { Actor, ImageSource, Random, Vector } from 'excalibur';

const card_aspect_ratio = 88 / 63;
const card_height = 150 * card_aspect_ratio;
const card_width = 150;

export class Card extends Actor {
	private static top_of_draw_stack: number = 1;
	private static randy: Random = new Random();

	card_name: string = 'not loaded';
	card_img: ImageSource | undefined;
	constructor(start_pos: Vector) {
		super({
			pos: start_pos,
			height: card_height,
			width: card_width
		});
		this.z = Card.top_of_draw_stack;
		Card.top_of_draw_stack++;
	}

	override onInitialize(): void {
		const tapped_out = 'https://static.tappedout.net';
		const card_urls = [
			`${tapped_out}/mtg-cards-2/core-set-2021/baneslayer-angel/mtg-cards/_user-added/femme_fatale-baneslayer-angel-m21-15914872200.png`,
			`${tapped_out}/mtg-cards-2/DSC/sulfurous-springs/regular-1727063894.png`,
			`${tapped_out}/mtg-cards-2/mirrodin-besieged/mirran-crusader/mirran-crusader-cropped.jpg`,
			`${tapped_out}/mtg-cards/_user-added/femme_fatale-birthing-pod-nph-13875212970.png`,
			`${tapped_out}/mtg-cards-2/unlimited-edition/black-lotus/2014-black-lotus.jpg`,
			`${tapped_out}/mtg-cards-2/unglued/chaos-confetti/yesterday-chaos-confetti-16329202410.png`,
			`${tapped_out}/mtg-cards-2/duel-decks-phyrexia-vs-the-coalition/dark-ritual/dark-ritual-cropped.jpg`
		];
		this.card_name = Card.randy.pickOne(card_urls);
		this.card_img = new ImageSource(this.card_name);
		this.card_img.load().then(() => {
			const sprite = (this.card_img as ImageSource).toSprite({
				destSize: {
					height: card_height,
					width: card_width
				}
			});
			this.graphics.use(sprite);
		});
	}

	addToTopOfDrawStack() {
		Card.top_of_draw_stack++;
		this.z = Card.top_of_draw_stack;

		console.log(`added ${this.card_name} to the top of the draw stack ${this.z}`);
	}
}
