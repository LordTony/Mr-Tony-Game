import { Color, DisplayMode, Engine, Loader, Vector } from 'excalibur';
import { GlobalConfig } from './game-config';
import { PlayField } from './play-field';
import { Resources } from './resources';
import { debounce } from 'lodash-es';

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
	handleResizeDebounced();
	game.goToScene('PlayField');
});

function handleResize() {
	const pagePositionFromScreen = game.screen.worldToScreenCoordinates(Vector.Zero);
	const rootStyle = document.documentElement.style;
	rootStyle.setProperty('--screen-top-left-x', pagePositionFromScreen.x + 'px');
	rootStyle.setProperty('--screen-top-left-y', pagePositionFromScreen.y + 'px');
}

const handleResizeDebounced = debounce(handleResize, 100)

game.screen.events.on('resize', () => {
	handleResizeDebounced()
})