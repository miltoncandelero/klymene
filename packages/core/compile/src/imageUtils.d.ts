import type { Bin } from "maxrects-packer";
import { KernelEnum, Sharp } from "sharp";
import type { IPackableSharpImage, IPartialAtlas, ISharpImage } from "./interfaces/pack";
export declare function hashImage(image: IPackableSharpImage): Promise<IPackableSharpImage>;
export declare function trimAlpha(image: ISharpImage): Promise<IPackableSharpImage>;
export declare function trimAlpha(image: ISharpImage, scale: number, kernel: keyof KernelEnum): Promise<IPackableSharpImage>;
export declare function packBinAndReleaseMemory(bin: Bin<IPackableSharpImage>): Promise<IPartialAtlas>;
export declare function sharpToBase64(pipeline: Sharp): Promise<string>;
