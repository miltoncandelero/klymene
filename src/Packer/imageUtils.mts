import type { IPackableSharpImage, IPackedSpriteData, ISharpAtlas, ISharpImage } from "./types.mjs";
import crypto from "crypto";
import type { Bin } from "maxrects-packer";
import sharp, { OverlayOptions } from "sharp";

// Slow, but we need many comparisons and we needed a hash anyway (in place)
export async function hashImage(image: IPackableSharpImage): Promise<IPackableSharpImage> {
	image.data.pipeline.raw();

	const hashSum = crypto.createHash("sha1");
	hashSum.update(await image.data.pipeline.toBuffer());
	image.hash = hashSum.digest("base64");

	return image;
}

export async function trimAlpha(image: ISharpImage): Promise<IPackableSharpImage> {
	const { width, height, hasAlpha } = await image.pipeline.metadata();

	if (!hasAlpha) {
		//  No alpha = No trimming!
		image.originalInfo = {};
		image.originalInfo[image.alias[0]] = { originalSize: { w: width, h: height }, trim: { top: 0, bottom: 0, left: 0, right: 0 } };

		return { data: image, height, width, x: 0, y: 0 };
	}

	const pipeline = image.pipeline; // Ref for easier code.

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

	return {
		data: image,
		height: info.height,
		width: info.width,
		x: 0, // needed for maxrect
		y: 0, // needed for maxrect
	};
}

export async function packBinAndReleaseMemory(bin: Bin<IPackableSharpImage>): Promise<ISharpAtlas> {
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
				r.data.pipeline.rotate(90);
			}

			const retval: OverlayOptions = {
				input: await r.data.pipeline.ensureAlpha().raw().toBuffer(),
				raw: {
					channels: 4,
					width: r.rot ? r.height : r.width,
					height: r.rot ? r.width : r.height,
				},
				left: r.x,
				top: r.y,
			};

			// free memory!
			r.data.pipeline.destroy();
			r.data.pipeline = null;

			return retval;
		})
	);

	// do the actual pixel blitting
	pipeline.composite(buffersToCompose);

	const outputRects: IPackedSpriteData[] = [];

	for (const rect of bin.rects) {
		for (const imageAlias of rect.data.alias) {
			const originalRectData = rect.data.originalInfo[imageAlias];
			const packedSprite: IPackedSpriteData = {
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
			// todo write this
			// todo multipack stuff!
		},
	};
}
