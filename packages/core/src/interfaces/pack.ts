import type { Sharp } from "sharp";
import type { IPackedSprite } from "./output";
import type { ISize, ITrimData } from "./utils";

// Temporal and adapter objects for the packing process

// The first time we load the sharp image
export interface ISharpImage {
	pipeline: Sharp; // The image
	alias: string[]; // The list of names this image will be known by (duplicate detection)
	tag?: string; // Images are forced to the same atlas by tags. tags are never merged.
	originalInfo?: Record<string, IOriginalInfo>; // Duplicate is done after trimming, we might have different trims
}

// The sharp image we can feed into the bin packer
export interface IPackableSharpImage {
	width: number; // Trimmed size, ready to pack
	height: number; // Trimmed size, ready to pack

	x: number; // Not actually used before packing, but needed for maxrectpacker
	y: number; // Not actually used before packing, but needed for maxrectpacker

	data: ISharpImage; // The only kosher way that maxrectpack likes extra data

	hash?: string; // The hash of the trimmed image used to detect equal images and an UNDOCUMENTED AF feature for maxrectpacker

	rot?: boolean; // did the image get rotated during packaging?
	oversized?: boolean; // is this rectangle bigger than the atlas?
}

// Stores the original size and trim data of the image
export interface IOriginalInfo {
	originalSize?: ISize;
	trim?: ITrimData;
}

// Partial metadata, we are missing a lot of data...
export interface IPartialMetadata {
	size: ISize;
	oversized: boolean;
}

// This is almost the final thing, we are missing some a lot of metadata...
export interface IPartialAtlas {
	pipeline: Sharp;
	metadata: IPartialMetadata;
	rects: IPackedSprite[];
}
