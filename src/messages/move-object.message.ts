import { Parser } from 'binary-parser-encoder';
import { PacketMessageType } from '../packet-event-manager';
import { Cache } from '../utils/cache-attribute';
import { BasePacketMessage } from './base-packet.message';

export enum PlayZoneType {
	Board,
	Host_Hand,
	Host_Graveyard,
	Host_Exile,
	Joiner_Hand,
	Joiner_Graveyard,
	Joiner_Exile
}

export class MoveObjectMessage implements BasePacketMessage {
	public message_type: PacketMessageType = PacketMessageType.Move_Obj;

	constructor(
		public obj_id: number,
		public play_zone: PlayZoneType,
		public x: number,
		public y: number
	) {}

	@Cache
	static GetParser(): Parser {
		return new Parser().bit10('obj_id').bit3('play_zone').uint16('x').uint16('y');
	}
}
