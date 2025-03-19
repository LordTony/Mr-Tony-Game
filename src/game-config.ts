import { Resolution } from 'excalibur';

export const GlobalConfig = {
	GameResolution: {
		height: Resolution.Standard.height,
		width: Resolution.Standard.width * 1.2
	} as Resolution,
	BackgroundColorHex: '#54C0CA',
	CardAspectRatio: 88 / 63,
	CardWidth: 150
} as const;
