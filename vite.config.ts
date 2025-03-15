import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig(() => {
	return {
		// This is specifically so we can get access to Node's "Buffer" in the browser
		plugins: [nodePolyfills()],
	};
});
