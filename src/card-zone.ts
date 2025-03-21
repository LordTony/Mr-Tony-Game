import {
	Actor,
	ImageSource,
	NineSlice,
	NineSliceConfig,
	NineSliceStretch,
	Vector
} from 'excalibur';
import { GameConfig } from './game-config';
import { Resources } from './resources';

export class CardZone extends Actor {
	private static zone_size = {
		width: GameConfig.CardZoomViewWidth,
		height: GameConfig.CardZoomViewWidth * GameConfig.CardAspectRatio
	};
	private img_placeholder: NineSlice;
	private current_card_image: ImageSource | undefined | null;

	constructor(position: Vector) {
		super({ pos: position, anchor: Vector.Zero });

		const myNineSliceConfig: NineSliceConfig = {
			width: CardZone.zone_size.width,
			height: CardZone.zone_size.height,
			source: Resources.CardZone,
			sourceConfig: {
				width: 105,
				height: 104,
				topMargin: 11,
				leftMargin: 11,
				bottomMargin: 11,
				rightMargin: 11
			},
			destinationConfig: {
				drawCenter: true,
				horizontalStretch: NineSliceStretch.Stretch,
				verticalStretch: NineSliceStretch.Tile
			}
		};

		this.img_placeholder = new NineSlice(myNineSliceConfig);
		this.graphics.use(this.img_placeholder);
	}

	setPreviewImage(card_img: ImageSource | undefined | null) {
		if (card_img == this.current_card_image) {
			return;
		}
		if (card_img && card_img.isLoaded()) {
			this.graphics.use(card_img.toSprite({ destSize: CardZone.zone_size }));
		} else {
			this.graphics.use(this.img_placeholder);
		}
		this.current_card_image = card_img;
	}
}
