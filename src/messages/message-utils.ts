export interface PacketMessage {
    message_type: PacketMessageType;
}

export type PacketMessageType =
    "draw_to_hand" |
    "draw_7" |
    "share_deck_guid" |
    "request_deck_guid" |
    "move_obj"