import { Resolution } from 'excalibur';

export const GameConfig = {
	GameResolution: {
		height: Resolution.Standard.height * .8,
		width: Resolution.Standard.width
	} as Resolution,
	BackgroundColorHex: '#54C0CA',
	CardAspectRatio: 88 / 63,
	CardWidth: 150,
	CardZoomViewWidth: 300,
	CardLabelBottomViewOffset: 20
} as const;
