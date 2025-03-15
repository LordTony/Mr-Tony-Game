import { Parser } from 'binary-parser-encoder';
import { EventEmitter, GameEvent } from 'excalibur';
import { BasePacketMessage } from './messages/base-packet.message';
import { MoveObjectMessage } from './messages/move-object.message';
import { Cache } from './utils/cache-attribute';

export enum PacketMessageType {
	Draw_To_Hand,
	Draw_7,
	Share_Deck_Guid,
	Request_Deck_Guid,
	Move_Obj,
	Tap,
	Untap
}

// TODO: need to add the other events
export class MoveObjEvent extends GameEvent<MoveObjectMessage> {
	constructor(public target: MoveObjectMessage) {
		super();
	}
}

type PacketEvents = {
	//draw_to_hand: DrawToHandEvent,
	//draw_7: Draw7Event,
	//share_deck_guid: ShareDeckGuidEvent,
	//request_deck_guid: RequestDeckGuidEvent,
	move_obj: MoveObjEvent;
	//tap: TapEvent,
	//untap: UntapEvent
};

export class PacketEventManager {
	public Events = new EventEmitter<PacketEvents>();

	@Cache
	public static GetParser(): Parser {
		return new Parser().bit5('message_type').choice({
			tag: 'message_type',
			choices: {
				[PacketMessageType.Move_Obj]: MoveObjectMessage.GetParser()
			}
		});
	}

	public static Encode(message: BasePacketMessage): Uint8Array {
		console.log('encoding message:', message);
		return PacketEventManager.GetParser().encode(message);
	}

	public HandleMessage(message: any): void {
		const arrayMessage: Uint8Array = new Uint8Array(message);
		const parsedMessage: BasePacketMessage = PacketEventManager.GetParser().parse(arrayMessage);
		switch (parsedMessage.message_type) {
			case PacketMessageType.Move_Obj:
				const move_obj: keyof PacketEvents = 'move_obj';
				const event = new MoveObjEvent(parsedMessage as MoveObjectMessage);
				this.Events.emit(move_obj, event);
				return;
			default:
				console.log("Couldn't read message", parsedMessage);
		}
	}
}
