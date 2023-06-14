import type { Plugin, PluginOptions, Processor, TransformDataFile } from "@assetpack/core";
import { hasTag, path, SavableAssetCache } from "@assetpack/core";
import { IAtlasOutputSettings, IFile, IPackingSettings, makeAtlasFiles } from "@klymene/core";
import fs from "fs/promises";

export interface KlymenePackerOptions extends PluginOptions<"kly"> {
	packerSettings: Partial<Omit<IPackingSettings, "newRoot">>;
	outputSettings: Partial<Omit<IAtlasOutputSettings, "outputDir">>[];
}

export function klymenePacker(options?: Partial<KlymenePackerOptions>): Plugin<KlymenePackerOptions> {
	const defaultOptions: KlymenePackerOptions = {
		tags: {
			kly: "kly",
			...options?.tags,
		},
		packerSettings: options.packerSettings ?? {},
		outputSettings: options.outputSettings ?? [
			{
				appendMultipackIndex: "always",
				descriptorFileName: "",
				startingMultipackIndex: 1,
				textureFormat: "png",
				outputTemplate: "jsonhash",
				scale: 1,
				scaleMethod: "nearest",
			},
		],
	};

	return {
		folder: true,
		name: "klymene-packer",
		test(tree, _p, opts) {
			const opt = { ...defaultOptions.tags, ...opts.tags };

			return hasTag(tree, "file", opt.kly);
		},
		async transform(tree, processor, optionOverrides) {
			const globPath = `${String(tree.path)}/**/*.{jpg,png,gif}`;

			const cacheMap = new Map<string, TransformDataFile>();

			const opt: KlymenePackerOptions = {
				...defaultOptions,
				...optionOverrides,
			};

			(opt.packerSettings as IPackingSettings).newRoot = tree.path;

			opt.outputSettings.forEach((o: IAtlasOutputSettings) => {
				o.outputDir = false;
				o.textureFileName = o.textureFileName ? path.basename(processor.inputToOutput(tree.path)) + o.textureFileName : undefined;
				o.descriptorFileName = path.basename(processor.inputToOutput(tree.path)) + o.descriptorFileName;
			});

			const res = await makeAtlasFiles(globPath, opt.packerSettings, opt.outputSettings as any);
			const out = await processklyFiles(res, processor.inputToOutput(tree.path), processor);

			out.forEach((o) => {
				const oo = o.split(".")[0];

				if (o.endsWith(".json")) {
					// eslint-disable-next-line @typescript-eslint/no-unused-expressions
					if (!cacheMap.get(path.basename(processor.inputToOutput(tree.path)))) {
						cacheMap.set(path.basename(processor.inputToOutput(tree.path)), { paths: [], name: processor.trimOutputPath(`${oo}.json`) });
					}

					const d = cacheMap.get(path.basename(processor.inputToOutput(tree.path)));

					d.paths.push(processor.trimOutputPath(o));
				}

				processor.addToTree({
					tree,
					outputOptions: {
						outputPathOverride: o,
					},
					transformId: "kly",
				});
			});

			SavableAssetCache.set(tree.path, {
				tree,
				transformData: {
					type: this.name!,
					files: [...cacheMap.values()],
				},
			});
		},
	};
}

async function processklyFiles(files: IFile[], output: string, processor: Processor): Promise<string[]> {
	const outputFilePaths = [];

	for (const item of files) {
		const outputDir = output;

		// make sure the folder we save to exists
		await fs.mkdir(outputDir, { recursive: true });

		// this is where we save the files
		const outputFile = path.joinSafe(outputDir, item.filename);

		// so one thing FREE texture packer does different is that it either puts the full paths in
		// or the image name.
		// we rely on the folder names being preserved in the frame data.
		// we need to modify the frame names before we save so they are the same
		// eg raw-assets/image/icons{kly}/cool/image.png -> cool/image.png

		processor.saveToOutput({
			tree: undefined as any,
			outputOptions: {
				outputPathOverride: outputFile,
				outputData: item.file,
			},
		});

		outputFilePaths.push(outputFile);
	}

	return outputFilePaths;
}
