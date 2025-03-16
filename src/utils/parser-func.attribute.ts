import { Parser } from 'binary-parser-encoder';

const PARSER_FUNC_METADATA = Symbol('PARSER_FUNC_METADATA');

export type ParserFunctionKeys = {
	[K in keyof Parser]: Parser[K] extends (...args: any[]) => any ? K : never;
}[keyof Parser];

export function ParserFunc(parserFuncName: ParserFunctionKeys) {
	return function (target: any, propertyKey: string | symbol, parameterIndex?: number): void {
		if (parameterIndex !== undefined) {
			throw new Error('ParserFunc decorator can only be used on properties, not parameters');
		}

		const ctor = target.constructor;
		if (!ctor[PARSER_FUNC_METADATA]) {
			ctor[PARSER_FUNC_METADATA] = {};
		}

		ctor[PARSER_FUNC_METADATA][propertyKey] = parserFuncName;
	};
}

export function GetBitWidthMetadata(target: any): { [key: string]: ParserFunctionKeys } {
	return target[PARSER_FUNC_METADATA] || {};
}

export function GetEnumParserFunction<T extends { [key: string]: number | string }>(
	enumObj: T
): ParserFunctionKeys {
	const keys = Object.keys(enumObj).filter((key) => isNaN(Number(key)));
	const bitWidth = Math.ceil(Math.log2(keys.length));
	// assumes no enum will have more than 2 ^ 16 items in it
	if (bitWidth > 8) {
		return 'uint16';
	}
	return bitWidth == 8 ? 'uint8' : (('bit' + bitWidth) as ParserFunctionKeys);
}
