import { Color, DisplayMode, Engine, Loader, Vector } from 'excalibur';
import { debounce } from 'lodash-es';
import { GameConfig } from './game-config';
import { Resources } from './resources';
import { PlayField } from './screens/play-field';
import { StartMenu } from './screens/start-menu';

const game = new Engine({
	resolution: GameConfig.GameResolution,
	backgroundColor: Color.fromHex(GameConfig.BackgroundColorHex),
	displayMode: DisplayMode.FitContainerAndFill,
	scenes: { StartMenu, PlayField },
	canvasElementId: 'game'
});

const loader = new Loader(Object.values(Resources));
loader.backgroundColor = GameConfig.BackgroundColorHex;
game.start(loader).then(() => {
	handleResizeDebounced();
	game.goToScene('StartMenu');
});

function handleResize() {
	const pagePositionFromScreen = game.screen.worldToScreenCoordinates(Vector.Zero);
	const rootStyle = document.documentElement.style;
	rootStyle.setProperty('--screen-top-left-x', pagePositionFromScreen.x + 'px');
	rootStyle.setProperty('--screen-top-left-y', pagePositionFromScreen.y + 'px');
}

const handleResizeDebounced = debounce(handleResize, 150);

game.screen.events.on('resize', () => {
	handleResizeDebounced();
});
