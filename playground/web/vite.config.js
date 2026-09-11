import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// The playground always runs against the workspace source, so it works before
// the library has ever been built (package exports point at dist/*).
export default defineConfig({
	base: "/scroll-active-toc/",
	plugins: [tailwindcss()],
	resolve: {
		alias: {
			"scroll-active-toc": fileURLToPath(new URL("../../src/index.ts", import.meta.url)),
		},
	},
	server: {
		port: 5173,
		open: false,
	},
});
