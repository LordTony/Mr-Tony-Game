export const Cache = (_target: any, _key: string, descriptor: PropertyDescriptor) => {
	const originalMethod = descriptor.value;
	const cache = new Map<string, any>();

	descriptor.value = function (...args: any[]) {
		const key = JSON.stringify(args) + _target.name;
		if (cache.has(key)) {
			return cache.get(key);
		}
		const result = originalMethod.apply(this, args);
		cache.set(key, result);
		return result;
	};

	return descriptor;
};
