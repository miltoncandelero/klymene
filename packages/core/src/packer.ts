import fs from "fs/promises";
import fsSync from "fs";
import { Bin, MaxRectsPacker } from "maxrects-packer";
import sharp from "sharp";
import { makeTextureExtension, templatizeFilename } from "./stringUtils";
import { hashImage, packBinAndReleaseMemory, sharpToBase64, trimAlpha } from "./imageUtils";
import { defaultInputSettings, IAtlasOutputSettings, InputFile } from "./interfaces/input";
import type { IAtlas, IMetadata } from "./interfaces/output";
import type { ISharpImage, IPackableSharpImage, IPartialAtlas } from "./interfaces/pack";
import glob from "tiny-glob";
import path from "path";
import { TEMPLATES } from "./templates";
import Handlebars from "handlebars";

/**
 * Writes atlas to disk.
 * @param images
 * @param outputs
 * @returns atlas
 */
export async function makeAtlasFiles(images: string | string[] | InputFile[], outputs: Partial<IAtlasOutputSettings> | Partial<IAtlasOutputSettings>[]): Promise<void> {
	const atlases = await makeSharpAtlas(images, outputs);
	for (const atlas of atlases) {
		// is the path a thing?
		if (!fsSync.existsSync(atlas.outputOptions.outputDir)) {
			await fs.mkdir(atlas.outputOptions.outputDir, { recursive: true });
		}

		// write descriptor
		if (Object.keys(TEMPLATES).includes(atlas.outputOptions.outputTemplate)) {
			const template = TEMPLATES[atlas.outputOptions.outputTemplate];
			if (!template.templateFunction) {
				template.templateFunction = Handlebars.compile(template.templateString);
			}

			// add the extension to the multipacks
			for (let i = 0; i < atlas.metadata.relatedMultiPacks.length; i++) {
				atlas.metadata.relatedMultiPacks[i] += `.${template.templateExtension}`;
			}

			const descriptorText = template.templateFunction(atlas);
			const descriptorFile = path.join(atlas.outputOptions.outputDir, `${atlas.metadata.name}.${template.templateExtension}`);
			await fs.writeFile(descriptorFile, descriptorText);
		} else {
			// todo custom template file thingy?
		}

		// write texture
		if (atlas.outputOptions.textureFormat != "base64") {
			let textureFormat = atlas.outputOptions.textureFormat;
			if (typeof textureFormat == "string") {
				textureFormat = [textureFormat];
			}

			if (Array.isArray(textureFormat)) {
				// array of extensions, make a nice object
				textureFormat = textureFormat.reduce((acc, ext) => {
					acc[ext] = undefined;
					return acc;
				}, {} as Record<string, any>);
			}

			// object where keys are extensions and values are sharp configs
			for (const [ext, options] of Object.entries(textureFormat)) {
				const textureFile = path.join(atlas.outputOptions.outputDir, `${atlas.metadata.imageBaseName}.${ext}`);
				await atlas.pipeline.toFormat(ext as any, options).toFile(textureFile);
			}
		}
	}
}

/**
 * Makes a middle of the road atlas. It has the sharp object and it's ready to write to disk but it doesn't.
 * This is useful if you want to hook into sharp and export yourself.
 * @param images The images ready to be processed. This can't eat globs.
 * @param outputs The output settings
 * @returns sharp atlas
 */
export async function makeSharpAtlas(images: string | string[] | InputFile[], outputs: Partial<IAtlasOutputSettings> | Partial<IAtlasOutputSettings>[]): Promise<IAtlas[]> {
	if (!Array.isArray(outputs)) {
		outputs = [outputs];
	}

	if (!Array.isArray(images)) {
		images = [images];
	}

	// if we got strings, expand the globs, make the cool objects
	if (isStringArray(images)) {
		const expandedPaths = [...new Set((await Promise.all(images.map((imageGlob) => glob(imageGlob)))).flat())];
		images = expandedPaths.map((imagePath) => {
			return { filename: imagePath };
		});
	}

	// To be filled and returned
	const retval: IAtlas[] = [];

	// make sure we have promises
	const inputFiles = images.map((f) => {
		if (f.file == undefined) {
			f.file = fs.readFile(f.filename);
		}
		return f;
	});

	for (let options of outputs) {
		// if we have only one of the filenames, both are the same filename
		if (!options.textureFileName && options.descriptorFileName) {
			options.textureFileName = options.descriptorFileName;
		}
		if (!options.descriptorFileName && options.textureFileName) {
			options.descriptorFileName = options.textureFileName;
		}

		// loading defaults just in case...
		options = { ...defaultInputSettings, ...options };

		// Now we pack!
		const atlases = await pack(inputFiles, options as IAtlasOutputSettings);

		// Names for all the linked atlases so we can have them actually linked.
		const descriptorFileNames = atlases.map((_, i) => templatizeFilename(options.descriptorFileName, { ...options, multiPackIndex: i }));
		for (let i = 0; i < atlases.length; i++) {
			const atlas = atlases[i];
			const textureFileName = templatizeFilename(options.textureFileName, { ...options, multiPackIndex: i });
			const metadata: IMetadata = {
				oversized: atlas.metadata.oversized,
				size: atlas.metadata.size,
				format: "RGBA8888",
				imageBaseName: textureFileName,
				image: options.textureFormat == "base64" ? await sharpToBase64(atlas.pipeline) : `${textureFileName}.${makeTextureExtension(options.textureFormat)}`,
				scale: options.scale,
				url: options.url,
				version: options.version,
				relatedMultiPacks: descriptorFileNames.filter((_, j) => j != i), // Everything but my filename
				name: descriptorFileNames[i], // My file name
			};
			retval.push({ metadata: metadata, pipeline: atlas.pipeline, rects: atlas.rects, outputOptions: options as IAtlasOutputSettings });
		}
	}

	return retval;
}

export async function pack(inputFiles: InputFile[], options: IAtlasOutputSettings): Promise<IPartialAtlas[]> {
	// make sharps, clean filenames
	const fullImages: ISharpImage[] = await Promise.all(
		inputFiles.map(async (f) => {
			let spriteAlias = f.filename;
			if (options.removeFolderName) {
				spriteAlias = path.basename(spriteAlias);
			}
			if (options.removeFileExtension) {
				spriteAlias = spriteAlias.replace(/\.[^/.]+$/, "");
			}
			return {
				pipeline: sharp(await f.file),
				alias: [spriteAlias],
				tag: f.tag,
			};
		})
	);

	// trim and maybe resize images
	const packableImages = await Promise.all(fullImages.map((image) => trimAlpha(image, options.scale, options.scaleMethod)));

	// TODO: Extrude images

	// hash images (it's in place, we just wait it.)
	await Promise.all(packableImages.map((image) => hashImage(image)));

	// deduplicate images but keeping their aliases
	const imageHashes: Record<string, IPackableSharpImage> = {};

	// deduplicate and store the important information
	for (const img of packableImages) {
		if (imageHashes[img.hash]) {
			// we have seen this hash before, we have a duplicate!

			const existingImageData = imageHashes[img.hash].data;
			const repeatedImageData = img.data;

			existingImageData.alias.push(...repeatedImageData.alias);
			existingImageData.originalInfo = { ...existingImageData.originalInfo, ...repeatedImageData.originalInfo };
		} else {
			// this is the first occurence!
			imageHashes[img.hash] = img;
		}
	}

	// back to array.
	const deduplicatedImages = Object.values(imageHashes);

	const packingOptions = {
		smart: true,
		pot: options.powerOfTwo,
		square: options.sqaure,
		allowRotation: options.allowRotation,
		tag: deduplicatedImages.some((i) => i.tag),
		border: options.padding, // padding from the edge of the atlas
	};
	const packer = new MaxRectsPacker<IPackableSharpImage>(options.width, options.height, options.padding, packingOptions);

	packer.addArray(deduplicatedImages); // Start packing with input array

	const bins: Bin<IPackableSharpImage>[] = packer.bins; // Get the bins

	const retPromises: Promise<IPartialAtlas>[] = [];
	for (const bin of bins) {
		retPromises.push(packBinAndReleaseMemory(bin));
	}

	return Promise.all(retPromises);
}

function isStringArray(arr: unknown[]): arr is string[] {
	return typeof arr[0] === "string";
}
