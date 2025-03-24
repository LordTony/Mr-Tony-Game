export type DB_deck = {
	id: string;
	name: string;
	owner?: string;
	cards: DB_card[];
	commander?: DB_card;
};

export type DB_card = {
	blob: Blob;
	count: number;
};

export const getImageBlobFromUrl = async (url: string): Promise<Blob | null> => {
	try {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		return await response.blob();
	} catch (error) {
		console.error('Error fetching image:', error);
		return null;
	}
};

export class DB {
	private static name = 'mr_tony_game_db';
	private static current_version = 1;
	private database?: IDBDatabase;

	constructor() {}

	public async init(): Promise<IDBDatabase> {
		let openRequest = indexedDB.open(DB.name, DB.current_version);

		openRequest.onupgradeneeded = () => {
			let db = openRequest.result;
			var id_key: IDBObjectStoreParameters = { keyPath: 'id', autoIncrement: false };
			if (!db.objectStoreNames.contains('decks')) {
				db.createObjectStore('decks', id_key);
			}
		};

		return new Promise((resolve, reject) => {
			openRequest.onsuccess = () => {
				let db = openRequest.result;
				console.log('DB opened');
				const tapped_out = 'https://static.tappedout.net';
				const card_urls = [
					`${tapped_out}/mtg-cards-2/core-set-2021/baneslayer-angel/mtg-cards/_user-added/femme_fatale-baneslayer-angel-m21-15914872200.png`,
					`${tapped_out}/mtg-cards-2/DSC/sulfurous-springs/regular-1727063894.png`,
					`${tapped_out}/mtg-cards-2/mirrodin-besieged/mirran-crusader/mirran-crusader-cropped.jpg`,
					`${tapped_out}/mtg-cards/_user-added/femme_fatale-birthing-pod-nph-13875212970.png`,
					`${tapped_out}/mtg-cards-2/unlimited-edition/black-lotus/2014-black-lotus.jpg`,
					`${tapped_out}/mtg-cards-2/unglued/chaos-confetti/yesterday-chaos-confetti-16329202410.png`,
					`${tapped_out}/mtg-cards-2/duel-decks-phyrexia-vs-the-coalition/dark-ritual/dark-ritual-cropped.jpg`
				];

				var fetches = card_urls.map((url) => getImageBlobFromUrl(url));
				Promise.all(fetches).then((card_images) => {
					const seed_cards: DB_card[] = card_images.map((blob, i) => {
						const card: DB_card = {
							blob: blob as Blob,
							count: (i % 4) + 1
						};
						return card;
					});

					const start_decks: DB_deck[] = [
						{ id: 'ce05e70b-eee4-4a67-9673-1b0830f6b664', name: 'Test Deck', cards: seed_cards },
						{ id: 'ed5838a2-cee1-40dc-945e-bf5d9c10465a', name: 'Another Demo Deck', cards: [] },
						{ id: '01ff62b4-792c-472f-b119-3b540ec4c101', name: 'Blah Blah Blah', cards: [] }
					];

					const t = db.transaction('decks', 'readwrite');
					start_decks.forEach((deck) => {
						t.objectStore('decks').put(deck);
					});

					t.oncomplete = () => {
						this.database = db;
						resolve(db);
					};

					t.commit();
				});
			};

			openRequest.onerror = () => {
				console.error('Error', openRequest.error);
				reject(openRequest.error);
			};
		});
	}

	private async getResult<T>(request: IDBRequest<any>): Promise<T> {
		return new Promise((resolve, reject) => {
			request.onsuccess = () => {
				resolve(request.result as T);
			};

			request.onerror = () => {
				reject(request.error);
			};
		});
	}

	public async getAllDecks(): Promise<DB_deck[]> {
		if (!this.database) {
			throw new Error('Database has not been initialized');
		}

		const t = this.database.transaction('decks', 'readonly');
		const store = t.objectStore('decks');
		const request = store.getAll();
		return await this.getResult<DB_deck[]>(request);
	}

	public async getDeck(deckId: string): Promise<DB_deck> {
		if (!this.database) {
			throw new Error('Database has not been initialized');
		}

		const t = this.database.transaction('decks', 'readonly');
		const store = t.objectStore('decks');
		const request = store.get(deckId);
		return await this.getResult<DB_deck>(request);
	}
}
