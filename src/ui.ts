import Peer from "peerjs";
import { Resources } from "./resources";

export function initButtons() {
    const ui_buttons = document.querySelectorAll('.ui button');
    ui_buttons.forEach(elem => {
        const button = elem as HTMLElement;
        button.addEventListener('click', toggleButtonClickHandler);
        button.addEventListener('keydown', toggleButtonKeydownHandler);
        button.addEventListener('keyup', toggleButtonKeyupHandler);
    })
}


/**
 * Toggles the toggle button’s state if it’s actually a button element or has
 * the `role` attribute set to `button`.
 *
 * @param {MouseEvent} event
 */
function toggleButtonClickHandler(event: any) {
    toggleButtonState(event!.currentTarget as HTMLButtonElement);
}

/**
 * Toggles the toggle button’s state with the enter key.
 *
 * @param {KeyboardEvent} event
 */
function toggleButtonKeydownHandler(event: KeyboardEvent) {
    if (event.keyCode === 32) {
        event.preventDefault();
    } else if (event.keyCode === 13) {
        event.preventDefault();
        toggleButtonState(event!.currentTarget as HTMLButtonElement);
    }
}

/**
 * Toggles the toggle button’s state with space key.
 *
 * @param {KeyboardEvent} event
 */
function toggleButtonKeyupHandler(event: KeyboardEvent) {
    if (event.keyCode === 32) {
        event.preventDefault();
        toggleButtonState(event!.currentTarget as HTMLButtonElement);
    }
}

/**
 * Toggles the toggle button’s state between *pressed* and *not pressed*.
 *
 * @param {HTMLElement} button
 */
function toggleButtonState(button: HTMLElement) {
    if(button.id === 'create-game') {
        const peer = new Peer("player-1");
        peer.on('open', actualId => {
            console.log(`Connect using ${actualId}`);

        });
        peer.on('connection', (conn) => {
            console.log("Connection established with Player 2!");
            conn.on("data", (data) => {
              console.log("Player 2 says:", data); // Log the data from Player 2
            });
          });
    } else if(button.id === 'join-game') {
        const peer = new Peer("player-2");
        peer.on('open', actualId => {
            console.log(`My actual id is ${actualId}`)
            const conn = peer.connect((document.getElementById('connection-id') as HTMLInputElement).value);
            conn.on('open', () => {
                console.log("Connection to Player 1 established!");
                conn.send("Hello from Player 2!"); // Send a message to Player 1
              });

            conn.on('data', (data) => {
                console.log("Received data:", data);
            });
            
        });
    }
}
