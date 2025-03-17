import { Color, DisplayMode, Engine, Loader, Resolution } from 'excalibur';
import { Level } from './level';
import { Resources } from './resources';

const game = new Engine({
	resolution: Resolution.Standard,
	backgroundColor: Color.fromHex('#54C0CA'),
	antialiasing: true,
	displayMode: DisplayMode.FitContainerAndFill,
	scenes: { Level },
	canvasElementId: 'game'
});

const loader = new Loader(Object.values(Resources));
game.start(loader).then(() => {
	game.goToScene('Level');
});
