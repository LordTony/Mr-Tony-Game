import { Parser } from "binary-parser-encoder";

const PACKET_MESSAGE_TYPES = [
    "draw_to_hand",
    "draw_7",
    "share_deck_guid",
    "request_deck_guid",
    "move_obj",
    "tap",
    "untap"
] as const;

export type PacketMessageType = typeof PACKET_MESSAGE_TYPES[number];

const PacketMessageTypeEnum = Object.fromEntries(
    PACKET_MESSAGE_TYPES.map((type, index) => [type, index])
) as { [K in PacketMessageType]: number };

const MESSAGE_TYPE_KEY: keyof BasePacketMessage = "message_type";
const PARSER: Parser = new Parser().bit5(MESSAGE_TYPE_KEY);

export class BasePacketMessage {

    constructor(
        public message_type: PacketMessageType
    ) {}

    GetParser(): Parser {
        return PARSER;
    }

    GetPacketData(): any {
        return {
            message_type: PacketMessageTypeEnum[this.message_type],
        };  
    }

    Encode(): Uint8Array {
        return this.GetParser().encode(this.GetPacketData()) as Uint8Array;
    }
}