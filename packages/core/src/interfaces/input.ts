import type { AvifOptions, FormatEnum, GifOptions, HeifOptions, Jp2Options, JpegOptions, JxlOptions, KernelEnum, PngOptions, TiffOptions, WebpOptions } from "sharp";
import type { TEMPLATES } from "../templates";

// Describes the object you feed to Klymene
export type ExportFormat = keyof FormatEnum;

export type SharpExportOptions =
	| (JpegOptions & { id: "jpg" })
	| (PngOptions & { id: "png" })
	| (WebpOptions & { id: "webp" })
	| (AvifOptions & { id: "avif" })
	| (HeifOptions & { id: "heif" })
	| (JxlOptions & { id: "jxl" })
	| (GifOptions & { id: "gif" })
	| (Jp2Options & { id: "jp2" })
	| (TiffOptions & { id: "tiff" });

// This allows you to pass in images directly from a buffer, but you must associate a filename to it.
export interface ITaggedFile extends IFile {
	tag?: string;
}

// represents a file that is ready to be written to disk or passed on to another process.
export interface IFile {
	file?: Buffer;
	filename: string;
}

export interface IPackingSettings {
	// # region PackOptions

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

	// Should the packer remove the folder name to the sprite name?
	removeFolderName: boolean;

	/**
	 * This will scale each sprite before packing them. Useful for making low res atlases for older devices.
	 * Beware, the atlas dimensions are not scaled, each individual sprite is scaled before packaging!
	 */
	scale: number;

	/**
	 * How to scale the sprites
	 * "nearest" - Nearest-neighbor interpolation
	 * "cubic" - Catmull-Rom interpolation
	 * "mitchell" - Mitchell-Netravali interpolation
	 * "lanczos2" - Lanczos-windowed sinc interpolation, a=2
	 * "lanczos3" - Lanczos-windowed sinc interpolation, a=3
	 */
	scaleMethod: keyof KernelEnum;

	// # end Region
}

export interface IAtlasOutputSettings {
	/**
	 * How should we append the multipack index?
	 * "always" - always append the multipack index, even if not a multipack.
	 * "ignore-first" - only append the multipack index if it's a multipack, the first atlas will NOT have an index.
	 * "auto" - only append the multipack index if it's a multipack, the first atlas WILL have an index.
	 */
	appendMultipackIndex: "always" | "ignore-first" | "auto";

	// Mostly used to set up if you want to count from 1 or from 0.
	startingMultipackIndex: number;

	// use `#` to insert the multipack index. Multiple `#` will be used to pad the index with zeros. ex: `###` would be `001`
	descriptorFileName: string;

	// use `#` to insert the multipack index. Multiple `#` will be used to pad the index with zeros. ex: `###` would be `001`
	textureFileName: string;

	// Base path for the output files. false to disable writing to disk and just get the output in buffer form
	outputDir: string | false;

	// What kind of export should sharp use. If more than 1 is set, multiple textures for a single atlas descriptor will be created!
	textureFormat: "base64" | ExportFormat | SharpExportOptions;

	// The template for the descriptor file
	outputTemplate: keyof typeof TEMPLATES;

	/**
	 * This will scale the resulting file.
	 * This can end up making decimal pixels!
	 */
	scale: number;

	/**
	 * How to scale the sprites
	 * "nearest" - Nearest-neighbor interpolation
	 * "cubic" - Catmull-Rom interpolation
	 * "mitchell" - Mitchell-Netravali interpolation
	 * "lanczos2" - Lanczos-windowed sinc interpolation, a=2
	 * "lanczos3" - Lanczos-windowed sinc interpolation, a=3
	 */
	scaleMethod: keyof KernelEnum;
}

export const defaultPackingSettings: IPackingSettings = {
	// pack options
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
	removeFolderName: false,
	scale: 1,
	scaleMethod: "nearest",
};

export const defaultOutputSettings: IAtlasOutputSettings = {
	// output settings
	appendMultipackIndex: "always",
	startingMultipackIndex: 1,
	descriptorFileName: "atlas",
	textureFileName: undefined,
	outputDir: "./",
	textureFormat: "png",
	outputTemplate: "jsonhash",
	scale: 1,
	scaleMethod: "nearest",
};
