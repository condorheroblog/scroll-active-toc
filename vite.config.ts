import { copyFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import dts from "unplugin-dts/vite";
import { defineConfig } from "vite";

const pkg = JSON.parse(
	readFileSync(fileURLToPath(new URL("./package.json", import.meta.url)), "utf-8"),
);

const banner = `/**
 * Name: ${pkg.name}
 * Version: ${pkg.version}
 * Author: ${pkg.author?.name ?? pkg.author}
 * Homepage: ${pkg.homepage}
 * License ${pkg.license} © 2026-Present
 */
`;

/**
 * @zh 递归处理 dist 下的类型声明：
 * - dts 插件（多入口 bundleTypes 模式）产出的是自包含的 .d.ts，
 *   为每个 .d.ts 补齐同名 .d.mts 与 .d.cts，供 import/require 两种入口引用；
 * - 若插件直接产出 .d.mts，则照旧复制为 .d.cts。
 * @en Processes declaration files under dist recursively:
 * - the dts plugin (multi-entry bundleTypes mode) emits self-contained .d.ts
 *   files; for each one, produce same-named .d.mts and .d.cts for the
 *   import/require entries;
 * - when the plugin emits .d.mts directly, copy it to .d.cts as before.
 */
function copyDtsFiles(dir: string): void {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const fullPath = join(dir, entry.name);
		if (entry.isDirectory()) {
			copyDtsFiles(fullPath);
			continue;
		}

		if (entry.name.endsWith(".d.mts")) {
			copyFileSync(fullPath, fullPath.replace(/\.d\.mts$/, ".d.cts"));
		}
		else if (entry.name.endsWith(".d.ts")) {
			const mtsPath = fullPath.replace(/\.d\.ts$/, ".d.mts");
			const ctsPath = fullPath.replace(/\.d\.ts$/, ".d.cts");
			if (!existsSync(mtsPath))
				copyFileSync(fullPath, mtsPath);
			if (!existsSync(ctsPath))
				copyFileSync(fullPath, ctsPath);
		}
	}
}

export default defineConfig({
	build: {
		emptyOutDir: true,

		lib: {
			// @zh 单入口：无框架纯 TS 引擎，产物 0 运行时依赖
			// @en Single entry: the framework-agnostic pure-TS engine, with zero runtime dependencies
			entry: {
				index: "src/index.ts",
			},
			name: "scroll-active-toc",
			formats: ["es", "cjs"],
			fileName: (format, entryName = "index") => {
				if (format === "es")
					return `${entryName}.mjs`;
				if (format === "cjs")
					return `${entryName}.cjs`;
				return `${entryName}.${format}`;
			},
		},
		rolldownOptions: {
			output: {
				minify: {
					compress: {
						dropConsole: true,
					},
				},
				postBanner: banner,
			},
		},
	},
	plugins: [
		dts({
			bundleTypes: true,
			// @zh 不配置 outDirs：配合 bundleTypes 时它会让 .d.cts/.d.mts 变成路径引用而非内联类型，
			// 且引用的文件并不存在。依赖默认输出按入口生成 .d.mts，再在 afterBuild 中复制为 .d.cts。
			// @en Do not configure outDirs: with bundleTypes it would turn .d.cts/.d.mts into path references
			// instead of inlined types, and the referenced files do not exist. Rely on the default per-entry
			// .d.mts output, then copy them to .d.cts in afterBuild.
			afterBuild: () => {
				copyDtsFiles(fileURLToPath(new URL("./dist", import.meta.url)));
			},
		}),
	],
});
