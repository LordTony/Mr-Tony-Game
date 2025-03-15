import Peer from 'peerjs';
import { MoveObjectMessage, PlayZoneType } from './messages/move-object.message';
import { PacketEventManager } from './packet-event-manager';

export function initButtons() {
	const ui_buttons = document.querySelectorAll('.ui button');
	ui_buttons.forEach((elem) => {
		const button = elem as HTMLElement;
		button.addEventListener('click', toggleButtonClickHandler);
		button.addEventListener('keydown', toggleButtonKeydownHandler);
		button.addEventListener('keyup', toggleButtonKeyupHandler);
	});
}

function toggleButtonClickHandler(event: any) {
	toggleButtonState(event!.currentTarget as HTMLButtonElement);
}

function toggleButtonKeydownHandler(event: KeyboardEvent) {
	if (event.keyCode === 32) {
		event.preventDefault();
	} else if (event.keyCode === 13) {
		event.preventDefault();
		toggleButtonState(event!.currentTarget as HTMLButtonElement);
	}
}

function toggleButtonKeyupHandler(event: KeyboardEvent) {
	if (event.keyCode === 32) {
		event.preventDefault();
		toggleButtonState(event!.currentTarget as HTMLButtonElement);
	}
}

function toggleButtonState(button: HTMLElement) {
	if (button.id === 'create-game') {
		const peer = new Peer('player-1');
		peer.on('open', (actualId) => {
			console.log(`Connect using ${actualId}`);
		});
		peer.on('connection', (conn) => {
			console.log('Connection established with Player 2!');
			conn.on('data', (data) => {
				//PacketEventManager.HandleMessage(data);
			});
		});
	} else if (button.id === 'join-game') {
		const peer = new Peer('player-2');
		peer.on('open', (actualId) => {
			console.log(`My actual id is ${actualId}`);
			const conn = peer.connect(
				(document.getElementById('connection-id') as HTMLInputElement).value
			);
			conn.on('open', () => {
				console.log('Connection to Player 1 established!');
				const moveItemMessage = new MoveObjectMessage(
					15,
					PlayZoneType.Joiner_Hand,
					420,
					69
				);
				conn.send(PacketEventManager.Encode(moveItemMessage)); // Send a message to Player 1
			});

			conn.on('data', (data) => {
				console.log('Received data:', data);
			});
		});
	}
}
