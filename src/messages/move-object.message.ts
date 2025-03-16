import { PacketMessageType } from '../packet-event-manager';
import { GetEnumParserFunction, ParserFunc } from '../utils/parser-func.attribute';
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

	@ParserFunc('bit10')
	public obj_id: number;

	@ParserFunc(GetEnumParserFunction(PlayZoneType))
	public play_zone: PlayZoneType;

	@ParserFunc('uint16')
	public x: number;

	@ParserFunc('uint16')
	public y: number;

	constructor(obj_id: number, play_zone: PlayZoneType, x: number, y: number) {
		this.obj_id = obj_id;
		this.play_zone = play_zone;
		this.x = x;
		this.y = y;
	}
}
