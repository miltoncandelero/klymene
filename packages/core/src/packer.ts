import fs from "fs/promises";
import { Bin, MaxRectsPacker } from "maxrects-packer";
import sharp from "sharp";
import { hashImage, packBinAndReleaseMemory, trimAlpha } from "./imageUtils";
import type { IAtlasOutputSettings, InputFile } from "./interfaces/input";
import type { IAtlas } from "./interfaces/output";
import type { ISharpImage, IPackableSharpImage, IPartialAtlas } from "./interfaces/pack";

export async function entryPoint(images: string[] | InputFile[], outputs: IAtlasOutputSettings | IAtlasOutputSettings[]): Promise<IAtlas[]> {
	if (!Array.isArray(outputs)) {
		outputs = [outputs];
	}

	// if we got string, make the cool objects
	if (isStringArray(images)) {
		images = images.map((imagePath) => {
			return { filename: imagePath };
		});
	}

	// To be filled and returned
	const retval: IAtlas[] = [];

	// split by tag
	const imagesByTag = splitByTag(images);

	for (const tag in imagesByTag) {
		const inputFiles = imagesByTag[tag];

		// make sure we have promises
		inputFiles.forEach((f) => {
			if (f.file == undefined) {
				f.file = fs.readFile(f.filename);
			}
		});

		if (inputFiles.length === 0) {
			throw new Error(`No images to pack with tag: ${tag}`);
		}

		// Slow pack, resize before
		const scaleBeforeOutputs = outputs.filter((o) => o.scaleBefore);
		for (const options of scaleBeforeOutputs) {
			for await (const atlas of pack(inputFiles, options)) {
				console.log(atlas);
				// save using options for this particular output
				// please remember to fill `retval`
			}
		}

		// Faster pack, resize only at the end
		const scaleAfterOutputs = outputs.filter((o) => o.scaleBefore);
		if (scaleAfterOutputs.length > 0) {
			const auxOpt = { ...scaleAfterOutputs[0] };
			auxOpt.scale = undefined; // we will scale in the future.
			auxOpt.scaleMethod = undefined; // we will scale in the future.
			for await (const atlas of pack(inputFiles, auxOpt)) {
				console.log(atlas);
				for (const options of scaleAfterOutputs) {
					// Atlas here will always have scale of 1 !!!
					// Save using options, resize final atlases and divide the output
					// please remember to fill `retval`
				}
			}
		}
	}

	return retval;
}

export async function* pack(inputFiles: InputFile[], options: IAtlasOutputSettings): AsyncGenerator<IPartialAtlas> {
	// make sharps
	const fullImages: ISharpImage[] = await Promise.all(
		inputFiles.map(async (f) => {
			return {
				pipeline: sharp(await f.file),
				alias: [f.filename],
				tag: f.tag,
			};
		})
	);

	// trim and maybe resize images
	const packableImages = await Promise.all(fullImages.map((image) => trimAlpha(image, options.scale, options.scaleMethod)));

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
		tag: false,
		border: options.padding, // padding from the edge of the atlas
	}; // Set packing options
	const packer = new MaxRectsPacker<IPackableSharpImage>(options.width, options.height, options.padding, packingOptions); // width, height, padding, options

	packer.addArray(deduplicatedImages); // Start packing with input array

	const bins: Bin<IPackableSharpImage>[] = packer.bins; // Get the bins

	for (const bin of bins) {
		// 	yield {
		// 		pipeline: sharp({
		// 			create: {
		// 				width: bin.width,
		// 				height: bin.height,
		// 				channels: 4,
		// 				background: { r: 255, g: 0, b: 0, alpha: Math.random() },
		// 			},
		// 		}),
		// 		oversized: false,
		// 		rects: [],
		// 		texSize: { width: 0, height: 0 },
		// 	};

		yield packBinAndReleaseMemory(bin);
	}
}

function isStringArray(arr: unknown[]): arr is string[] {
	return typeof arr[0] === "string";
}

function splitByTag(images: InputFile[]): Record<string, InputFile[]> {
	const result: Record<string, InputFile[]> = {};
	for (const image of images) {
		const tag = image.tag ?? "";
		if (!result[tag]) {
			result[tag] = [];
		}
		result[tag].push(image);
	}
	return result;
}
