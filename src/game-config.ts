import { Color, Font, Resolution, TextAlign } from 'excalibur';

export const GameConfig = {
	GameResolution: {
		height: Resolution.Standard.height * 0.8,
		width: Resolution.Standard.width
	} as Resolution,
	BackgroundColorHex: '#54C0CA',
	CardAspectRatio: 88 / 63,
	CardWidth: 150,
	CardZoomViewWidth: 300,
	CardLabelBottomViewOffset: 20,
	DeckZoneWidth: 125,
	GameButtonFont: new Font({
		size: 30,
		color: Color.White,
		textAlign: TextAlign.Center
	})
} as const;
