import type { AvifOptions, FormatEnum, GifOptions, HeifOptions, Jp2Options, JpegOptions, JxlOptions, KernelEnum, OutputOptions, PngOptions, TiffOptions, WebpOptions } from "sharp";
import type { TEMPLATES } from "../templates";

// Describes the object you feed to Klymene
export type ExportFormat = keyof FormatEnum;

export type SharpExportOptions = OutputOptions | JpegOptions | PngOptions | WebpOptions | AvifOptions | HeifOptions | JxlOptions | GifOptions | Jp2Options | TiffOptions;

export type ExportFormatObject = Partial<Record<ExportFormat, SharpExportOptions>>;

// This allows you to pass in images directly from a buffer, but you must associate a filename to it.
export interface InputFile {
	file?: Buffer;
	filename: string;
	tag?: string;
}

export interface IAtlasOutputSettings {
	// templated with this same object and `multipackIndex` index
	descriptorFileName: string;

	// templated with this same object and `multipackIndex` index
	textureFileName: string;

	// Base path for the output files
	outputDir: string;

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

	// What kind of export should sharp use. If more than 1 is set, multiple textures for a single atlas descriptor will be created!
	textureFormat: "base64" | ExportFormat | ExportFormat[] | ExportFormatObject;

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

	// The template for the descriptor file
	outputTemplate: keyof typeof TEMPLATES;

	// metadata for the descriptor file
	url: string;

	// metadata for the descriptor file
	version: string;
}

export const defaultInputSettings: IAtlasOutputSettings = {
	descriptorFileName: "atlas",
	textureFileName: "atlas",
	outputDir: "./",
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
	textureFormat: "png",
	scale: 1,
	scaleMethod: "nearest",
	outputTemplate: "jsonhash",
	url: "https://github.com/miltoncandelero/klymene",
	version: "__VERSION__", // hopefully replaced by rollup?
};
