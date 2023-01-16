import type { Sharp } from "sharp";

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
	metadata: IAtlasMetadata;
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

export interface IAtlasInputSettings{
	textureName: string;
	width: number;
	height: number;
	fixedSize: boolean;
	powerOfTwo: boolean;
	sqaure: boolean;
	padding: number;
	allowRotation: boolean;
	detectIdentical: boolean;
	trimMode: "trim" | "crop" | "none";
	alphaThreshold: number;
	removeFileExtension: boolean;
	prependFolderName: boolean;
	textureFormat: ExportFormat | ExportFormat[];
	scale: number;
	scaleMethod: "nearest" | "cubic" | "mitchell" | "lanczos2" | "lanczos3";
	outputTemplate: string;
	url:string;
	version:string;
}

export const defaultInputSettings: IAtlasInputSettings = {
	textureName: "atlas",
	width: 2048,
	height: 2048,
	fixedSize: false,
	powerOfTwo: true,
	sqaure: false,
	padding: 2,
	allowRotation: true,
	detectIdentical: true,
	trimMode: "trim",
	alphaThreshold: 0,
	removeFileExtension: false,
	prependFolderName: true,
	textureFormat: "png",
	scale: 1,
	scaleMethod: "nearest",
	outputTemplate: "",
	url: "https://github.com/miltoncandelero/clymene",
	version: "1.0.0",
};