export type SnakeCase<S extends string> = S extends `${infer T}${infer U}`
	? `${T extends Capitalize<T> ? '_' : ''}${Lowercase<T>}${SnakeCase<U>}`
	: S;

export type ToSnakeCase<T> = {
	[K in keyof T as SnakeCase<string & K>]: T[K];
};
