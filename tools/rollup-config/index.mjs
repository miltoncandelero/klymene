import path from "node:path";
import rename from "@pixi/rollup-plugin-rename-node-modules";
import json from '@rollup/plugin-json';
import esbuild from "rollup-plugin-esbuild";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import { string } from "rollup-plugin-string";
import replace from "@rollup/plugin-replace";

// function that eats arguments and spits rollup configs
export default (pkg) => {
	const externalNpm = [].concat(Object.keys(pkg.peerDependencies || {})).concat(Object.keys(pkg.dependencies || {}));

	// Plugins for module and browser output
	const plugins = [
		commonjs(),
		resolve(),
		json(),
		string({
			include: ["**/*.hbs"],
		}),
		replace({
			// eslint-disable-next-line @typescript-eslint/naming-convention
			__VERSION__: pkg.version,
		}),
		// rename(),
		esbuild({ target: "ES2020" })
	];

	const source = pkg.source ?? "src/index.ts";
	const basePath = path.dirname(path.join(process.cwd(), source));
	const mainDir = path.dirname(path.join(process.cwd(), pkg.main));
	const moduleDir = path.dirname(path.join(process.cwd(), pkg.module));

	return [
		{
			plugins: plugins,
			external: externalNpm,
			input: source,
			output: [
				{
					dir: mainDir,
					entryFileNames: "[name].js",
					format: "cjs",
					preserveModules: true,
					preserveModulesRoot: basePath,
					sourcemap: true,
					exports: "named",
				},
				{
					dir: moduleDir,
					entryFileNames: "[name].mjs",
					format: "esm",
					preserveModules: true,
					preserveModulesRoot: basePath,
					sourcemap: true,
					exports: "named",
				},
			],
		},
	];
};
