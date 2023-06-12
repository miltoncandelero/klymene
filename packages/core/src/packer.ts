import fs from "fs/promises";
import fsSync from "fs";
import type { Bin } from "maxrects-packer";
import { MaxRectsPacker } from "maxrects-packer";
import { makeTextureExtension, templatizeFilename } from "./stringUtils";
import { packBin, sharpToBase64, openMeasureTrimBufferAndHashImage } from "./imageUtils";
import type { IAtlasOutputSettings, IFile, IPackingSettings, ITaggedFile } from "./interfaces/input";
import { defaultPackingSettings, defaultOutputSettings } from "./interfaces/input";
import type { IAtlas, IPackedSprite } from "./interfaces/output";
import type { IImage, IPackableBufferImage, IPartialAtlas } from "./interfaces/pack";
import glob from "tiny-glob";
import path from "path";
import { TEMPLATES } from "./templates";
import Handlebars from "handlebars";
import sharp from "sharp";

/**
 * Writes atlas to disk.
 * @param images
 * @param outputs
 * @returns atlas
 */
export async function makeAtlasFiles(
	images: string | string[] | ITaggedFile[],
	packerSettings: Partial<IPackingSettings>,
	outputSettings: Partial<IAtlasOutputSettings[]>
): Promise<IFile[]> {
	packerSettings = { ...defaultPackingSettings, ...packerSettings };
	const atlases = await makeSharpAtlas(images, packerSettings as IPackingSettings);

	const retval: IFile[] = [];
	for (let currentOutput of outputSettings) {
		currentOutput = { ...defaultOutputSettings, ...currentOutput };
		currentOutput.textureFileName = currentOutput.textureFileName ?? currentOutput.descriptorFileName;

		// if we have only one of the filenames, both are the same filename
		if (!currentOutput.textureFileName && currentOutput.descriptorFileName) {
			currentOutput.textureFileName = currentOutput.descriptorFileName;
		}
		if (!currentOutput.descriptorFileName && currentOutput.textureFileName) {
			currentOutput.descriptorFileName = currentOutput.textureFileName;
		}

		// Names for all the linked atlases so we can have them actually linked.
		const descriptorFileNames = atlases.map((_, i) => {
			const always = currentOutput.appendMultipackIndex == "always";
			const auto = currentOutput.appendMultipackIndex == "auto" && atlases.length > 1;
			const isNotFirst = currentOutput.appendMultipackIndex == "ignore-first" && i > 0;
			if (always || auto || isNotFirst) {
				return templatizeFilename(currentOutput.descriptorFileName, currentOutput.startingMultipackIndex + i);
			} else {
				return currentOutput.descriptorFileName;
			}
		});
		for (let i = 0; i < atlases.length; i++) {
			const atlas = atlases[i] as IAtlas;

			let textureFileName: string = currentOutput.textureFileName;
			const always = currentOutput.appendMultipackIndex == "always";
			const auto = currentOutput.appendMultipackIndex == "auto" && atlases.length > 1;
			const isNotFirst = currentOutput.appendMultipackIndex == "ignore-first" && i > 0;
			if (always || auto || isNotFirst) {
				textureFileName = templatizeFilename(currentOutput.textureFileName, currentOutput.startingMultipackIndex + i);
			}

			atlas.metadata = atlas.metadata ?? ({} as any);
			atlas.metadata.oversized = atlas.metadata.oversized;
			atlas.metadata.size = { h: atlas.metadata.size.h, w: atlas.metadata.size.w };
			atlas.metadata.format = "RGBA8888";
			atlas.metadata.imageBaseName = textureFileName;
			atlas.metadata.image = currentOutput.textureFormat == "base64" ? "base64" : `${textureFileName}.${makeTextureExtension(currentOutput.textureFormat)}`;
			atlas.metadata.scale = packerSettings.scale * currentOutput.scale;
			atlas.metadata.url = "https://github.com/miltoncandelero/klymene";
			atlas.metadata.version = "__VERSION__"; // hopefully replaced by rollup
			atlas.metadata.relatedMultiPacks = descriptorFileNames.filter((_, j) => j != i); // Everything but my filename
			atlas.metadata.name = descriptorFileNames[i]; // My file name
		}

		for (const atlas of atlases as IAtlas[]) {
			// is the path a thing?
			if (currentOutput.outputDir != false) {
				if (!fsSync.existsSync(currentOutput.outputDir)) {
					await fs.mkdir(currentOutput.outputDir, { recursive: true });
				}
			}

			const scaledRects: IPackedSprite[] =
				currentOutput.scale == 1
					? atlas.rects
					: atlas.rects.map((rect) => {
							return {
								first: rect.first,
								frame: {
									h: rect.frame.h * currentOutput.scale,
									w: rect.frame.w * currentOutput.scale,
									x: rect.frame.x * currentOutput.scale,
									y: rect.frame.y * currentOutput.scale,
								},
								index: rect.index,
								trimmed: rect.trimmed,
								last: rect.last,
								name: rect.name,
								oversized: rect.oversized,
								rotated: rect.rotated,
								sourceSize: { h: rect.sourceSize.h * currentOutput.scale, w: rect.sourceSize.w * currentOutput.scale },
								spriteSourceSize: {
									h: rect.spriteSourceSize.h * currentOutput.scale,
									w: rect.spriteSourceSize.w * currentOutput.scale,
									x: rect.spriteSourceSize.x * currentOutput.scale,
									y: rect.spriteSourceSize.y * currentOutput.scale,
								},
								trimmedData: {
									bottom: rect.trimmedData.bottom * currentOutput.scale,
									left: rect.trimmedData.left * currentOutput.scale,
									right: rect.trimmedData.right * currentOutput.scale,
									top: rect.trimmedData.top * currentOutput.scale,
								},
							};
					  });

			let pipeline = atlas.pipeline;

			if (currentOutput.scale != 1) {
				const metadata = await pipeline.metadata();
				const { width, height } = metadata;

				// a simple .clone() doesn't work. no idea why.
				pipeline = sharp(await atlas.pipeline.raw().toBuffer(), {
					raw: {
						channels: 4,
						height: height,
						width: width,
					},
				}).resize({
					width: Math.round(width * currentOutput.scale),
					height: Math.round(height * currentOutput.scale),
					kernel: currentOutput.scaleMethod,
					fit: "fill",
				});
			}

			// write texture
			if (currentOutput.textureFormat != "base64") {
				const ext = makeTextureExtension(currentOutput.textureFormat);
				const textureFormat = currentOutput.textureFormat;

				if (currentOutput.outputDir != false) {
					// object where keys are extensions and values are sharp configs
					const textureFile = path.join(currentOutput.outputDir, `${atlas.metadata.imageBaseName}.${ext}`);
					await pipeline.toFormat(ext as any, typeof textureFormat == "string" ? undefined : textureFormat).toFile(textureFile);
					retval.push({ filename: textureFile });
				} else {
					retval.push({
						filename: `${atlas.metadata.imageBaseName}.${ext}`,
						file: await pipeline.toFormat(ext as any, typeof textureFormat == "string" ? undefined : textureFormat).toBuffer(),
					});
				}
			}

			// write descriptor
			if (Object.keys(TEMPLATES).includes(currentOutput.outputTemplate)) {
				if (currentOutput.textureFormat == "base64") {
					atlas.metadata.image = await sharpToBase64(pipeline);
				}

				const template = TEMPLATES[currentOutput.outputTemplate];
				if (!template.templateFunction) {
					template.templateFunction = Handlebars.compile(template.templateString);
				}

				// add the extension to the multipacks
				for (let i = 0; i < atlas.metadata.relatedMultiPacks.length; i++) {
					atlas.metadata.relatedMultiPacks[i] += `.${template.templateExtension}`;
				}

				const descriptorText = template.templateFunction({ ...atlas, rects: scaledRects }); // overwrite the rects with the scaled ones
				if (currentOutput.outputDir != false) {
					const descriptorFile = path.join(currentOutput.outputDir, `${atlas.metadata.name}.${template.templateExtension}`);
					await fs.writeFile(descriptorFile, descriptorText);
					retval.push({ filename: descriptorFile });
				} else {
					retval.push({ filename: `${atlas.metadata.name}.${template.templateExtension}`, file: Buffer.from(descriptorText, "utf-8") });
				}
			} else {
				// todo custom template file thingy?
			}
		}
	}

	return retval;
}

/**
 * Makes a middle of the road atlas. It has the sharp object and it's ready to write to disk but it doesn't.
 * This is useful if you want to hook into sharp and export yourself.
 * @param images The images ready to be processed. This can't eat globs.
 * @param settings The output settings
 * @returns sharp atlas
 */
export async function makeSharpAtlas(images: string | string[] | ITaggedFile[], settings: IPackingSettings): Promise<IPartialAtlas[]> {
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

	// loading defaults just in case...
	settings = { ...defaultOutputSettings, ...settings };

	// Now we pack!
	return await pack(images, settings);
}

export async function pack(inputFiles: ITaggedFile[], options: IPackingSettings): Promise<IPartialAtlas[]> {
	// make sharps, clean filenames
	const fullImages: IImage[] = await Promise.all(
		inputFiles.map((f) => {
			let spriteAlias = path.normalize(f.filename);
			if (options.removeFolderName) {
				spriteAlias = path.basename(spriteAlias);
			}
			if (options.removeFileExtension) {
				spriteAlias = spriteAlias.replace(/\.[^/.]+$/, "");
			}
			if (options.newRoot) {
				const normalizedRoot = path.normalize(options.newRoot + String(path.sep));
				const rootIndex = spriteAlias.indexOf(normalizedRoot);
				if (rootIndex != -1) {
					spriteAlias = spriteAlias.substring(rootIndex + normalizedRoot.length);
				}
			}

			return {
				file: f.file ?? f.filename,
				alias: [spriteAlias.replace(/\\/g, "/")],
				tag: f.tag,
			} as IImage;
		})
	);

	// trim and maybe resize images
	const packableImages = await Promise.all(
		fullImages.map((image) => openMeasureTrimBufferAndHashImage(image, options.scale, options.scaleMethod, options.extrude, options.extrudeMethod))
	);

	// deduplicate images but keeping their aliases
	const imageHashes: Record<string, IPackableBufferImage> = {};

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
		border: options.padding + options.extrude, // padding from the edge of the atlas
	};
	const packer = new MaxRectsPacker<IPackableBufferImage>(options.width, options.height, options.padding + options.extrude * 2, packingOptions);

	packer.addArray(deduplicatedImages); // Start packing with input array

	const bins: Bin<IPackableBufferImage>[] = packer.bins; // Get the bins

	const retPromises: Promise<IPartialAtlas>[] = [];
	for (const bin of bins) {
		retPromises.push(packBin(bin, options.extrude));
	}
	const retval = await Promise.all(retPromises);

	return retval;
}

function isStringArray(arr: unknown[]): arr is string[] {
	return typeof arr[0] === "string";
}
