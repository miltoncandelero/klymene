import crypto from "crypto";
import type { Bin } from "maxrects-packer";
import sharp, { KernelEnum, OverlayOptions, Sharp } from "sharp";
import type { IPackedSprite } from "./interfaces/output";
import type { IPackableBufferImage, IPartialAtlas, IImage } from "./interfaces/pack";

// Slow, but we need many comparisons and we needed a hash anyway (in place)
function hashImage(image: IPackableBufferImage): IPackableBufferImage {
	const hashSum = crypto.createHash("sha1");
	hashSum.update(image.data.file);
	image.hash = hashSum.digest("base64") + image.tag ?? "";

	return image;
}

/**
 * This is quite the monolythic function.
 * This is by design so I can make a thread that does all of this and make a happy thread pool
 */
export async function openMeasureTrimBufferAndHashImage(image: IImage): Promise<IPackableBufferImage>;
export async function openMeasureTrimBufferAndHashImage(image: IImage, scale: number, kernel: keyof KernelEnum): Promise<IPackableBufferImage>;
export async function openMeasureTrimBufferAndHashImage(image: IImage, scale?: number, kernel?: keyof KernelEnum): Promise<IPackableBufferImage> {
	const pipeline: Sharp = sharp(image.file);

	// TODO: Extrude images

	const metadata = await pipeline.metadata();
	let { width, height } = metadata;
	const { hasAlpha } = metadata;

	if (scale !== 1 && scale !== undefined) {
		pipeline.resize({ width: Math.round(width * scale), height: Math.round(height * scale), kernel: kernel, fit: "fill" });
		width = Math.round(width * scale);
		height = Math.round(height * scale);
	}

	if (!hasAlpha) {
		//  No alpha = No trimming!
		// however, we add alpha anyway to allow for easier compositiong
		pipeline.ensureAlpha();

		image.originalInfo = {};
		image.originalInfo[image.alias[0]] = { originalSize: { w: width, h: height }, trim: { top: 0, bottom: 0, left: 0, right: 0 } };

		const retval = { data: { ...image, file: await pipeline.raw().toBuffer() }, height, width, x: 0, y: 0 };

		pipeline.destroy();

		return hashImage(retval);
	}

	pipeline.trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 }); // TODO: Check for colored alpha? maybe not? this allows for sdf atlases?
	const { info } = await pipeline.toBuffer({ resolveWithObject: true });

	image.originalInfo = {};
	image.originalInfo[image.alias[0]] = {
		originalSize: { w: width, h: height },
		trim: {
			top: info.trimOffsetTop, // Easy, directly out of sharp
			left: info.trimOffsetLeft, // Easy, directly out of sharp
			bottom: height - info.trimOffsetTop - info.height, // We start with the full size and subtract until nothing is left.
			right: width - info.trimOffsetLeft - info.width, // We start with the full size and subtract until nothing is left.
		},
	};

	const retval = {
		data: { ...image, file: await pipeline.raw().toBuffer() },
		height: info.height,
		width: info.width,
		x: 0, // needed for maxrect
		y: 0, // needed for maxrect
	};

	pipeline.destroy();

	return hashImage(retval);
}

export async function packBin(bin: Bin<IPackableBufferImage>): Promise<IPartialAtlas> {
	// Create the pipeline for the final atlas
	const pipeline = sharp({
		create: {
			width: bin.width,
			height: bin.height,
			channels: 4,
			background: { r: 0, g: 0, b: 0, alpha: 0 },
		},
	});

	// Make the buffers to compare the thingy
	const buffersToCompose = await Promise.all(
		bin.rects.map(async (r) => {
			if (r.rot) {
				r.data.file = await sharp(r.data.file, {
					raw: {
						channels: 4,
						height: r.height,
						width: r.width,
					},
				})
					.rotate(90)
					.raw()
					.toBuffer();
			}

			const retval: OverlayOptions = {
				input: r.data.file,
				raw: {
					channels: 4,
					width: r.rot ? r.height : r.width,
					height: r.rot ? r.width : r.height,
				},
				left: r.x,
				top: r.y,
			};

			return retval;
		})
	);

	// do the actual pixel blitting
	pipeline.composite(buffersToCompose);

	const outputRects: IPackedSprite[] = [];
	let oversized = false;

	for (const rect of bin.rects) {
		for (const imageAlias of rect.data.alias) {
			oversized = oversized || rect.oversized;
			const originalRectData = rect.data.originalInfo[imageAlias];
			const packedSprite: IPackedSprite = {
				frame: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
				name: imageAlias,
				rotated: rect.rot,
				oversized: rect.oversized,
				trimmed: originalRectData.trim.top !== 0 || originalRectData.trim.bottom !== 0 || originalRectData.trim.left !== 0 || originalRectData.trim.right !== 0,
				sourceSize: { w: originalRectData.originalSize.w, h: originalRectData.originalSize.h },
				spriteSourceSize: { x: originalRectData.trim.left, y: originalRectData.trim.top, w: rect.width, h: rect.height },
				trimmedData: originalRectData.trim,

				// will be set later
				index: -1,
				first: false,
				last: false,
			};

			outputRects.push(packedSprite);
		}
	}

	// fill the silly info
	for (let i = 0; i < outputRects.length; i++) {
		if (i === 0) {
			outputRects[i].first = true;
		}
		if (i === outputRects.length - 1) {
			outputRects[i].last = true;
		}
		outputRects[i].index = i;
	}

	// now let's make the return object
	return {
		pipeline,
		rects: outputRects,
		metadata: {
			size: { w: bin.width, h: bin.height },
			oversized: oversized,
		},
	};
}

export async function sharpToBase64(pipeline: Sharp): Promise<string> {
	const imageBuf = await pipeline.png().toBuffer();
	return `data:image/png;base64,${imageBuf.toString("base64")}`;
}
