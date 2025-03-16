import { ImageSource } from 'excalibur';

export const Resources = {
	// Relative to /public in vite
	BirdImage: new ImageSource('./images/bird.png'),
	CardZone: new ImageSource('./images/nine-slice-card-zone-2.png')
} as const;
