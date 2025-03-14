import { Parser } from 'binary-parser-encoder';
import { BasePacketMessage } from './base-packet.message';
import { cloneDeep } from 'lodash-es';

const PLAY_ZONE_TYPES = ['board', 'host_hand', 'joiner_hand'] as const;

export type PlayZoneType = (typeof PLAY_ZONE_TYPES)[number];

const PlayZoneTypeEnum = Object.fromEntries(
    PLAY_ZONE_TYPES.map((type, index) => [type, index])
) as { [K in PlayZoneType]: number };

let PARSER: Parser | undefined;
let OBJ_ID_KEY: keyof MoveObjectMessage = 'obj_id';
let PLAY_ZONE_KEY: keyof MoveObjectMessage = 'play_zone';
let X_KEY: keyof MoveObjectMessage = 'x';
let Y_KEY: keyof MoveObjectMessage = 'y';

export class MoveObjectMessage extends BasePacketMessage {
    constructor(
        public obj_id: number,
        public play_zone: PlayZoneType,
        public x: number,
        public y: number
    ) {
        super('move_obj');
    }

    override GetParser(): Parser {
        if (!PARSER) {
            PARSER = cloneDeep(super.GetParser())
                .bit6(OBJ_ID_KEY)
                .bit2(PLAY_ZONE_KEY)
                .bit11(X_KEY)
                .bit11(Y_KEY);
        }
        return PARSER;
    }

    override GetPacketData(): any {
        return {
            ...super.GetPacketData(),
            obj_id: this.obj_id,
            play_zone: PlayZoneTypeEnum[this.play_zone],
            x: this.x,
            y: this.y,
        };
    }
}
