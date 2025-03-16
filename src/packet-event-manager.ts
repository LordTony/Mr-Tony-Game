import { Parser } from 'binary-parser-encoder';
import { EventEmitter, GameEvent } from 'excalibur';
import { throttle } from 'lodash-es';
import { DataConnection, Peer } from 'peerjs';
import { BasePacketMessage } from './messages/base-packet.message';
import { MoveObjectMessage } from './messages/move-object.message';
import { GetBitWidthMetadata } from './utils/parser-func.attribute';

export enum PeerType {
	Host,
	Guest
}

export enum PacketMessageType {
	Draw_To_Hand,
	Draw_7,
	Share_Deck_Guid,
	Request_Deck_Guid,
	Move_Obj,
	Tap,
	Untap
}

export class MoveObjectEvent extends GameEvent<MoveObjectMessage> {
	constructor(public target: MoveObjectMessage) {
		super();
	}
}

type PacketEvents = {
	//draw_to_hand: DrawToHandEvent,
	//draw_7: Draw7Event,
	//share_deck_guid: ShareDeckGuidEvent,
	//request_deck_guid: RequestDeckGuidEvent,
	move_obj: MoveObjectEvent;
	//tap: TapEvent,
	//untap: UntapEvent
};

export class PacketEventManager {
	public Events = new EventEmitter<PacketEvents>();
	private _parser: Parser;

	private _peer_type: PeerType | undefined;
	private _connection: DataConnection | undefined;
	private _peer: Peer | undefined;

	constructor() {
		this._parser = new Parser().bit5('message_type').choice({
			tag: 'message_type',
			choices: {
				[PacketMessageType.Move_Obj]: PacketEventManager.CreateParser(MoveObjectMessage)
			}
		});
	}

	private static CreateParser(objectType: any): Parser {
		const bitWidthMetaData = GetBitWidthMetadata(objectType);

		let parser = new Parser();
		Object.keys(bitWidthMetaData).forEach((propName) => {
			if (propName in bitWidthMetaData) {
				const parserFuncName = bitWidthMetaData[propName];
				parser = (parser[parserFuncName] as Function)(propName);
			} else {
				alert(`could not find a parser size for property "${objectType}.${propName}"`);
			}
		});
		return parser;
	}

	public async Connect(game_name: string, peer_type: PeerType): Promise<DataConnection> {
		return new Promise((resolve, _reject) => {
			this._peer_type = peer_type;
			const host_id = `${game_name}-host`;
			const guest_id = `${game_name}-guest`;
			if (this._peer_type == PeerType.Host) {
				this._peer = new Peer(host_id)
					.on('open', (actualId) => {
						console.log(`Game P2P ConnectionId: ${actualId}`);
					})
					.on('connection', (conn) => {
						resolve(conn);
						console.log('Connection established with Player 2!');
						this._connection = conn.on('data', (data) => {
							this.HandleMessage(data);
						});
					});
				return;
			}

			this._peer = new Peer(guest_id).on('open', (_actualId) => {
				this._connection = this._peer
					?.connect(host_id)
					.on('open', () => {
						console.log('Connection to Host established!');
						resolve(this._connection as DataConnection);
					})
					.on('data', (data) => {
						this.HandleMessage(data);
					});
			});
		});
	}

	private HandleMessage(message: any): void {
		const arrayMessage: Uint8Array = new Uint8Array(message);
		const parsedMessage: BasePacketMessage = this._parser.parse(arrayMessage);
		switch (parsedMessage.message_type) {
			case PacketMessageType.Move_Obj:
				const move_obj: keyof PacketEvents = 'move_obj';
				const event = new MoveObjectEvent(parsedMessage as MoveObjectMessage);
				this.Events.emit(move_obj, event);
				return;
			default:
				console.log("Couldn't read message", parsedMessage);
		}
	}

	public SendPacketMessage(message: BasePacketMessage) {
		const encodedMessage = this._parser.encode(message);
		this._connection?.send(encodedMessage);
	}

	private SendMoveObjectMessage(message: MoveObjectMessage) {
		this.SendPacketMessage(message);
	}

	public SendThrottledMoveObjectMessage = throttle(this.SendMoveObjectMessage, 100);
}
