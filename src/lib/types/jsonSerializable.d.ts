export type JsonSerializable = string | number | boolean | null | JsonArray | JsonObject;

export type JsonArray = Array<JsonSerializable>;

export interface JsonObject {
	[key: string | number]: JsonSerializable;
}
