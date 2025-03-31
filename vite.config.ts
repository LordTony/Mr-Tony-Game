import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import glsl from 'vite-plugin-glsl';

export default defineConfig(() => {
	return {
		// This is specifically so we can get access to Node's "Buffer" in the browser
		plugins: [nodePolyfills(), glsl()]
	};
});
