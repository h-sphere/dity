export type ArgsToDeps<
	DEPS extends Record<string, any>,
	K extends Array<keyof DEPS>
> = {
	[I in keyof K]: Awaited<K[I] extends keyof DEPS ? DEPS[K[I]] : K[I]>
}
