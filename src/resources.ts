import { ImageSource, ImageWrapping } from 'excalibur';
import { Peer } from 'peerjs';

export const Resources = {
	// Relative to /public in vite

	// Images
	BirdImage: new ImageSource('./images/bird.png'),
	PipeImage: new ImageSource('./images/pipe.png', {
		wrapping: ImageWrapping.Clamp // Clamp is the default
	}),
	GroundImage: new ImageSource('./images/ground.png', {
		wrapping: ImageWrapping.Repeat
	})
} as const;

export const ConnectionManager: { Connection: Peer | undefined } = {
	Connection: undefined
} as const;
