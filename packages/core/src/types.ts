import type { Sharp } from "sharp";
import type { TEMPLATES } from "./templates";

export interface ISize {
	w: number;
	h: number;
}

export interface IFrame extends ISize {
	x: number;
	y: number;
}

export interface ITrimData {
	top: number;
	bottom: number;
	left: number;
	right: number;
}

export interface ISharpImage {
	pipeline: Sharp; // The image
	alias: string[]; // The list of names this image will be known by (duplicate detection)
	tag?: string; // Images are forced to the same atlas by tags. tags are never merged.
	originalInfo?: Record<string, IOriginalInfo>; // Duplicate is done after trimming, we might have different trims
}

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

export interface ISharpAtlas {
	pipeline: Sharp;
	metadata: IPackMetadata;
	rects: IPackedSpriteData[];
}

export interface IOriginalInfo {
	originalSize?: ISize;
	trim?: ITrimData;
}

// stuff needed for the export
export interface IPackedSpriteData {
	name: string;
	frame: IFrame; // the coordinates, width and height of the sprite inside the spritesheet.
	trimmed: boolean;
	rotated: boolean;
	oversized: boolean;
	spriteSourceSize: IFrame; // the coordinates and size of the trimmed sprite inside the original image.
	sourceSize: ISize; // the size of the original image.
	trimmedData: ITrimData;
	index: number;
	first: boolean;
	last: boolean;
}

export interface IPackMetadata {
	format: string; // "RGBA8888" ?;
	size: ISize;
	oversized: boolean;
}

export interface IAtlasMetadata {
	image: string;
	format: string; // "RGBA8888" ?;
	scale: number;
	size: ISize;
	oversized: boolean;
	// normal_map?: string; ???
	relatedMultiPacks?: string[];
	url: string;
	version: string;
}

type ExportFormat = "png" | "jpg" | "webp" | "avif" | "base64";

export interface IAtlasOutputSettings {
	// templated with this same object and `multipack` index
	descriptorFileName: string;

	// templated with this same object and `multipack` index
	textureFileName: string;

	// width of the final atlas
	width: number;

	// height of the final atlas
	height: number;

	/**
	 * What to do when a sprite is too big for the atlas
	 * "ignore" - ignore the sprite
	 * "warn" - log a warning, but continue
	 * "error" - throw an error, halt the entire process
	 * "special" - create an special atlas with only the oversized sprite
	 */
	oversizedBehaviour: "ignore" | "error" | "special";

	// if true, the altas will always be the size specified in `width` and `height`, otherwise it could be smaller
	fixedSize: boolean;

	// keep the atlas size a power of two
	powerOfTwo: boolean;

	// keep the atlas size a square
	sqaure: boolean;

	// padding between sprites
	padding: number;

	// extend the sprite by copying the last pixel to try to avoid transparent edges between tiles. This extra pixel is NOT included in the sprite when using them
	extrude: number;

	/**
	 * How to extrude the sprite
	 * "copy" - copy the last pixel
	 * "mirror" - repeat the texture in a mirrored way (like copy but nicer for some cases)
	 * "repeat" - repeat the texture (good for seamless tiles)
	 */
	extrudeMethod: "copy" | "mirror" | "repeat";

	// Should the packer rotate the sprite to better accomodate it?
	allowRotation: boolean;

	// Should the packer detect identical sprites and only pack one?
	detectIdentical: boolean;

	/**
	 * What to do with transparent pixels around the sprite
	 * "trim" - Removes the transparency around a sprite. The sprites appear to have their original size when using them.
	 * "crop" - Removes the transparency around a sprite. The sprites appear to have the smaller size when using them. The sprite appears in the sheet as if it never had any transparency.
	 * "none" - Keep the sprites as they are. Do not remove transparent pixels.
	 */
	trimMode: "trim" | "crop" | "none";

	// The alpha threshold to use when trimming
	alphaThreshold: number;

	// Should the packer remove the file extension from the sprite name?
	removeFileExtension: boolean;

	// Should the packer prepend the folder name to the sprite name?
	prependFolderName: boolean;

	// What kind of export should sharp use
	textureFormat: ExportFormat;

	// scale the sprites / the output
	scale: number;

	/**
	 * Should the packer scale the sprites before packing?
	 * If true, the sprites will be scaled before packing, which is slower but should result on a better atlas
	 * If false, the sprites will be scaled after packing, which is faster but might result in a worse atlas (decimal pixels)
	 */
	scaleBefore: boolean;

	/**
	 * How to scale the sprites
	 * "nearest" - Nearest-neighbor interpolation
	 * "cubic" - Catmull-Rom interpolation
	 * "mitchell" - Mitchell-Netravali interpolation
	 * "lanczos2" - Lanczos-windowed sinc interpolation, a=2
	 * "lanczos3" - Lanczos-windowed sinc interpolation, a=3
	 */
	scaleMethod: "nearest" | "cubic" | "mitchell" | "lanczos2" | "lanczos3";

	// The template for the descriptor file
	outputTemplate: keyof typeof TEMPLATES;

	// metadata for the descriptor file
	url: string;

	// metadata for the descriptor file
	version: string;
}

export const defaultInputSettings: IAtlasOutputSettings = {
	descriptorFileName: "atlas-{{multipack}}",
	textureFileName: "atlas-{{multipack}}",
	width: 2048,
	height: 2048,
	oversizedBehaviour: "special",
	fixedSize: false,
	powerOfTwo: true,
	sqaure: false,
	padding: 2,
	extrude: 0,
	extrudeMethod: "copy",
	allowRotation: true,
	detectIdentical: true,
	trimMode: "trim",
	alphaThreshold: 0,
	removeFileExtension: false,
	prependFolderName: true,
	textureFormat: "png",
	scale: 1,
	scaleBefore: true,
	scaleMethod: "nearest",
	outputTemplate: "jsonhash",
	url: "https://github.com/miltoncandelero/clymene",
	version: "1.0.0",
};
