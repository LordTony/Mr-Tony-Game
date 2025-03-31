export type DB_deck = {
	id: string;
	name: string;
	owner?: string;
	cards: DB_card[];
	side_board?: DB_card[];
	commander?: DB_card;
};

export type DB_card = {
	front_blob: Blob;
	back_blob?: Blob;
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
	private static deck_table = 'decks';
	private static current_version = 1;
	private database?: IDBDatabase;

	constructor() {}

	public async init(): Promise<IDBDatabase> {
		let openRequest = indexedDB.open(DB.name, DB.current_version);

		openRequest.onupgradeneeded = () => {
			let db = openRequest.result;
			var id_key: IDBObjectStoreParameters = { keyPath: 'id', autoIncrement: false };
			if (!db.objectStoreNames.contains(DB.deck_table)) {
				db.createObjectStore(DB.deck_table, id_key);
			}
		};

		return new Promise((resolve, reject) => {
			openRequest.onsuccess = () => {
				let db = openRequest.result;

				const deck_id_1 = 'ce05e70b-eee4-4a67-9673-1b0830f6b664';
				const deck_id_2 = 'ed5838a2-cee1-40dc-945e-bf5d9c10465a';

				this.getDecksByKey([deck_id_1, deck_id_2], db).then((decks) => {
					if (decks.every((deck) => deck)) {
						this.database = db;
						resolve(db);
						return;
					}

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
								front_blob: blob as Blob,
								count: (i % 4) + 1
							};
							return card;
						});

						const start_decks: DB_deck[] = [
							{ id: deck_id_1, name: 'Test Deck', cards: seed_cards },
							{ id: deck_id_2, name: 'Another Demo Deck', cards: [] }
						];

						const t = db.transaction(DB.deck_table, 'readwrite');
						start_decks.forEach((deck) => {
							t.objectStore(DB.deck_table).put(deck);
						});

						t.oncomplete = () => {
							this.database = db;
							resolve(db);
						};

						t.commit();
					});
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

	public async getAllDecks(db?: IDBDatabase): Promise<DB_deck[]> {
		if (!db && !this.database) {
			throw new Error('Database has not been initialized');
		}

		const db_to_use = db ?? this.database ?? new IDBDatabase();
		const t = db_to_use.transaction(DB.deck_table, 'readonly');
		const store = t.objectStore(DB.deck_table);
		const request = store.getAll();
		return await this.getResult<DB_deck[]>(request);
	}

	public async getDeck(deckId: string, db?: IDBDatabase): Promise<DB_deck> {
		if (!db && !this.database) {
			throw new Error('Database has not been initialized');
		}

		const db_to_use = db ?? this.database ?? new IDBDatabase();
		const t = db_to_use.transaction(DB.deck_table, 'readonly');
		const store = t.objectStore(DB.deck_table);
		const request = store.get(deckId);
		return await this.getResult<DB_deck>(request);
	}

	public async getDecksByKey(keys: string[], db?: IDBDatabase): Promise<(DB_deck | undefined)[]> {
		if (!db && !this.database) {
			throw new Error('Database has not been initialized');
		}

		const db_to_use = db ?? this.database ?? new IDBDatabase();
		return new Promise((resolve, reject) => {
			const transaction = db_to_use.transaction(DB.deck_table, 'readonly');
			const store = transaction.objectStore(DB.deck_table);

			const results: (DB_deck | undefined)[] = new Array(keys.length);
			let completed = 0;

			keys.forEach((key, index) => {
				const request = store.get(key);

				request.onsuccess = () => {
					results[index] = request.result as DB_deck | undefined;
					completed++;
					if (completed === keys.length) {
						resolve(results);
					}
				};

				request.onerror = () => {
					reject(request.error);
				};
			});
		});
	}
}
