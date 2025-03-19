import { Color, DisplayMode, Engine, Loader } from 'excalibur';
import { GlobalConfig } from './game-config';
import { PlayField } from './play-field';
import { Resources } from './resources';

const game = new Engine({
	resolution: GlobalConfig.GameResolution,
	backgroundColor: Color.fromHex(GlobalConfig.BackgroundColorHex),
	antialiasing: true,
	displayMode: DisplayMode.FitContainerAndFill,
	scenes: { PlayField },
	canvasElementId: 'game'
});

const loader = new Loader(Object.values(Resources));
loader.backgroundColor = GlobalConfig.BackgroundColorHex;
game.start(loader).then(() => {
	game.goToScene('PlayField');
});
