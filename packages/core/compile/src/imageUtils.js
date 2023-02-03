"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sharpToBase64 = exports.packBinAndReleaseMemory = exports.trimAlpha = exports.hashImage = void 0;
const crypto_1 = __importDefault(require("crypto"));
const sharp_1 = __importDefault(require("sharp"));
// Slow, but we need many comparisons and we needed a hash anyway (in place)
async function hashImage(image) {
    image.data.pipeline.raw();
    const hashSum = crypto_1.default.createHash("sha1");
    hashSum.update(await image.data.pipeline.toBuffer());
    image.hash = hashSum.digest("base64") + image.tag ?? "";
    return image;
}
exports.hashImage = hashImage;
async function trimAlpha(image, scale, kernel) {
    const metadata = await image.pipeline.metadata();
    let { width, height } = metadata;
    const { hasAlpha } = metadata;
    if (scale !== 1 && scale !== undefined) {
        image.pipeline.resize({ width: Math.round(width * scale), height: Math.round(height * scale), kernel: kernel, fit: "fill" });
        width = Math.round(width * scale);
        height = Math.round(height * scale);
    }
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
            top: info.trimOffsetTop,
            left: info.trimOffsetLeft,
            bottom: height - info.trimOffsetTop - info.height,
            right: width - info.trimOffsetLeft - info.width, // We start with the full size and subtract until nothing is left.
        },
    };
    return {
        data: image,
        height: info.height,
        width: info.width,
        x: 0,
        y: 0, // needed for maxrect
    };
}
exports.trimAlpha = trimAlpha;
async function packBinAndReleaseMemory(bin) {
    // Create the pipeline for the final atlas
    const pipeline = (0, sharp_1.default)({
        create: {
            width: bin.width,
            height: bin.height,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
    });
    // Make the buffers to compare the thingy
    const buffersToCompose = await Promise.all(bin.rects.map(async (r) => {
        if (r.rot) {
            r.data.pipeline.rotate(90);
        }
        const retval = {
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
    }));
    // do the actual pixel blitting
    pipeline.composite(buffersToCompose);
    const outputRects = [];
    let oversized = false;
    for (const rect of bin.rects) {
        for (const imageAlias of rect.data.alias) {
            oversized = oversized || rect.oversized;
            const originalRectData = rect.data.originalInfo[imageAlias];
            const packedSprite = {
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
exports.packBinAndReleaseMemory = packBinAndReleaseMemory;
async function sharpToBase64(pipeline) {
    const imageBuf = await pipeline.png().toBuffer();
    return `data:image/png;base64,${imageBuf.toString("base64")}`;
}
exports.sharpToBase64 = sharpToBase64;
//# sourceMappingURL=imageUtils.js.map