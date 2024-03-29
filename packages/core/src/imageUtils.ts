import crypto from "crypto";
import type { Bin } from "maxrects-packer";
import type { KernelEnum, OverlayOptions, Sharp } from "sharp";
import sharp from "sharp";
import type { IPackedSprite } from "./interfaces/output";
// import { spawn, Pool, Worker } from "threads";
import type { IPackableBufferImage, IPartialAtlas, IImage, IOriginalInfo, IBufferImage } from "./interfaces/pack";
import type { ITrimData } from "./interfaces/utils";

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
export async function openMeasureTrimBufferAndHashImage(
	image: IImage,
	scale: number,
	kernel: keyof KernelEnum,
	extrude: number,
	extrudeMethod: "copy" | "mirror" | "repeat"
): Promise<IPackableBufferImage> {
	const pipeline: Sharp = sharp(image.file);

	const metadata = await pipeline.metadata();
	let { width, height } = metadata;
	width = width ?? 0;
	height = height ?? 0;
	const { hasAlpha } = metadata;

	if (scale !== 1 && scale !== undefined) {
		pipeline.resize({ width: Math.round(width * scale), height: Math.round(height * scale), kernel: kernel, fit: "fill" });
		width = Math.round(width * scale);
		height = Math.round(height * scale);
	}

	if (!hasAlpha) {
		//  No alpha = No trimming!
		// however, we add alpha anyway to allow for easier compositiong
		// we also extend here because this is an early exit!
		pipeline.ensureAlpha().extend({
			extendWith: extrudeMethod,
			bottom: extrude,
			top: extrude,
			left: extrude,
			right: extrude,
		});

		image.originalInfo = {};
		image.originalInfo[image.alias[0]] = { originalSize: { w: width, h: height }, trim: { top: 0, bottom: 0, left: 0, right: 0 } };
		image.file = await pipeline.raw().toBuffer();

		const retval: IPackableBufferImage = { data: image as IBufferImage, height, width, x: 0, y: 0, hash: "" };

		pipeline.destroy();

		return hashImage(retval);
	}

	// even if this is a heavy load, it's faster to keep in the same thread
	const trimInfo = measureTrim(new Uint8Array((await pipeline.raw().toBuffer()).buffer), width, height);

	// actually trim by using extract
	const data = await pipeline
		.extract({
			top: trimInfo.top,
			left: trimInfo.left,
			width: width - trimInfo.left - trimInfo.right,
			height: height - trimInfo.top - trimInfo.bottom,
		})
		.extend({
			extendWith: extrudeMethod,
			bottom: extrude,
			top: extrude,
			left: extrude,
			right: extrude,
		})
		.raw()
		.toBuffer();

	image.originalInfo = {} as Record<string, IOriginalInfo>;
	image.originalInfo[image.alias[0]] = {
		originalSize: { w: width, h: height },
		trim: trimInfo,
	};
	image.file = data;

	const retval: IPackableBufferImage = {
		data: image as IBufferImage,
		width: width - trimInfo.left - trimInfo.right,
		height: height - trimInfo.top - trimInfo.bottom,
		x: 0, // needed for maxrect
		y: 0, // needed for maxrect
		hash: "",
	};

	pipeline.destroy();

	return hashImage(retval);
}

export async function packBin(bin: Bin<IPackableBufferImage>, extrude: number): Promise<IPartialAtlas> {
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
						height: r.height + extrude * 2,
						width: r.width + extrude * 2,
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
					width: (r.rot ? r.height : r.width) + extrude * 2,
					height: (r.rot ? r.width : r.height) + extrude * 2,
				},
				left: r.x - extrude,
				top: r.y - extrude,
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
			oversized = oversized || Boolean(rect.oversized);
			const originalRectData = rect.data.originalInfo[imageAlias];
			const packedSprite: IPackedSprite = {
				frame: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
				name: imageAlias,
				rotated: Boolean(rect.rot),
				oversized: Boolean(rect.oversized),
				trimmed: originalRectData.trim?.top !== 0 || originalRectData.trim?.bottom !== 0 || originalRectData.trim?.left !== 0 || originalRectData.trim?.right !== 0,
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

function getAlpha(data: Uint8Array, width: number, x: number, y: number): number {
	return data[y * (width * 4) + x * 4 + 3];
}

function getLeftSpace(data: Uint8Array, width: number, height: number, threshold: number = 0): number {
	let x = 0;

	for (x = 0; x < width; x++) {
		for (let y = 0; y < height; y++) {
			if (getAlpha(data, width, x, y) > threshold) {
				return x;
			}
		}
	}

	return 0;
}

function getRightSpace(data: Uint8Array, width: number, height: number, threshold: number = 0): number {
	let x = 0;

	for (x = width - 1; x >= 0; x--) {
		for (let y = 0; y < height; y++) {
			if (getAlpha(data, width, x, y) > threshold) {
				return width - x - 1;
			}
		}
	}

	return 0;
}

function getTopSpace(data: Uint8Array, width: number, height: number, threshold: number = 0): number {
	let y = 0;

	for (y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			if (getAlpha(data, width, x, y) > threshold) {
				return y;
			}
		}
	}

	return 0;
}

function getBottomSpace(data: Uint8Array, width: number, height: number, threshold: number = 0): number {
	let y = 0;

	for (y = height - 1; y >= 0; y--) {
		for (let x = 0; x < width; x++) {
			if (getAlpha(data, width, x, y) > threshold) {
				return height - y - 1;
			}
		}
	}

	return 0;
}

function measureTrim(data: Uint8Array, width: number, height: number, threshold = 0): ITrimData {
	const spaces: ITrimData = { left: 0, right: 0, top: 0, bottom: 0 };

	spaces.left = getLeftSpace(data, width, height, threshold);

	if (spaces.left !== width) {
		spaces.right = getRightSpace(data, width, height, threshold);
		spaces.top = getTopSpace(data, width, height, threshold);
		spaces.bottom = getBottomSpace(data, width, height, threshold);
	} else {
		spaces.left = 0;
	}

	return spaces;
}
