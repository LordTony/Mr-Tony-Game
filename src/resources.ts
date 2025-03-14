import * as ex from 'excalibur';
import { Peer } from 'peerjs';

export const Resources = {
	// Relative to /public in vite

	// Images
	BirdImage: new ex.ImageSource('./images/bird.png'),
	PipeImage: new ex.ImageSource('./images/pipe.png', {
		wrapping: ex.ImageWrapping.Clamp, // Clamp is the default
	}),
	GroundImage: new ex.ImageSource('./images/ground.png', {
		wrapping: ex.ImageWrapping.Repeat,
	}),
} as const;

export const ConnectionManager: { Connection: Peer | undefined } = {
	Connection: undefined,
} as const;
