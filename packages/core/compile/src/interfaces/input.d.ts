/// <reference types="node" />
import type { AvifOptions, FormatEnum, GifOptions, HeifOptions, Jp2Options, JpegOptions, JxlOptions, KernelEnum, OutputOptions, PngOptions, TiffOptions, WebpOptions } from "sharp";
import type { TEMPLATES } from "../templates";
export type ExportFormat = keyof FormatEnum;
export type SharpExportOptions = OutputOptions | JpegOptions | PngOptions | WebpOptions | AvifOptions | HeifOptions | JxlOptions | GifOptions | Jp2Options | TiffOptions;
export type ExportFormatObject = Partial<Record<ExportFormat, SharpExportOptions>>;
export interface InputFile {
    file?: Promise<Buffer>;
    filename: string;
    tag?: string;
}
export interface IAtlasOutputSettings {
    descriptorFileName: string;
    textureFileName: string;
    width: number;
    height: number;
    /**
     * What to do when a sprite is too big for the atlas
     * "ignore" - ignore the sprite
     * "warn" - log a warning, but continue
     * "error" - throw an error, halt the entire process
     * "special" - create an special atlas with only the oversized sprite
     */
    oversizedBehaviour: "ignore" | "error" | "special";
    fixedSize: boolean;
    powerOfTwo: boolean;
    sqaure: boolean;
    padding: number;
    extrude: number;
    /**
     * How to extrude the sprite
     * "copy" - copy the last pixel
     * "mirror" - repeat the texture in a mirrored way (like copy but nicer for some cases)
     * "repeat" - repeat the texture (good for seamless tiles)
     */
    extrudeMethod: "copy" | "mirror" | "repeat";
    allowRotation: boolean;
    detectIdentical: boolean;
    /**
     * What to do with transparent pixels around the sprite
     * "trim" - Removes the transparency around a sprite. The sprites appear to have their original size when using them.
     * "crop" - Removes the transparency around a sprite. The sprites appear to have the smaller size when using them. The sprite appears in the sheet as if it never had any transparency.
     * "none" - Keep the sprites as they are. Do not remove transparent pixels.
     */
    trimMode: "trim" | "crop" | "none";
    alphaThreshold: number;
    removeFileExtension: boolean;
    removeFolderName: boolean;
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
    outputTemplate: keyof typeof TEMPLATES;
    url: string;
    version: string;
}
export declare const defaultInputSettings: IAtlasOutputSettings;
