import { PacketMessageType } from '../packet-event-manager';

export interface BasePacketMessage {
	message_type: PacketMessageType;
}
