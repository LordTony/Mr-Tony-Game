import { Color, DisplayMode, Engine, Loader } from 'excalibur';
import { Level } from './level';
import { Resources } from './resources';
import { initButtons } from './ui';

const padding = 10;

const handleResize = (game: Engine) => {
	console.log('resized in some way');
	const ui = document.getElementsByClassName('ui')[0] as HTMLElement;
	if (ui) {
		const mute_button_offset = padding + 10;
		ui.style.visibility = 'visible';
		ui.style.left = mute_button_offset + 'px';
		ui.style.bottom = mute_button_offset + 'px';
	}

	const double_padding = padding * 2;
	game.screen.viewport = {
		width: document.body.clientWidth - double_padding,
		height: document.body.clientHeight - double_padding
	};
	game.screen.applyResolutionAndViewport();
};

const double_padding = padding * 2;
const game = new Engine({
	width: document.body.clientWidth - double_padding,
	height: document.body.clientHeight - double_padding,
	backgroundColor: Color.fromHex('#54C0CA'),
	antialiasing: true,
	displayMode: DisplayMode.FitScreen,
	scenes: { Level }
});

const loader = new Loader(Object.values(Resources));
game.start(loader).then(() => {
	game.goToScene('Level');
	handleResize(game);
	initButtons();
});

game.screen.events.on('resize', () => handleResize(game));
game.screen.events.on('fullscreen', () => handleResize(game));
