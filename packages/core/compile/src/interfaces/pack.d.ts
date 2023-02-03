import type { Sharp } from "sharp";
import type { IPackedSprite } from "./output";
import type { ISize, ITrimData } from "./utils";
export interface ISharpImage {
    pipeline: Sharp;
    alias: string[];
    tag?: string;
    originalInfo?: Record<string, IOriginalInfo>;
}
export interface IPackableSharpImage {
    width: number;
    height: number;
    x: number;
    y: number;
    data: ISharpImage;
    hash?: string;
    rot?: boolean;
    oversized?: boolean;
    tag?: string;
}
export interface IOriginalInfo {
    originalSize?: ISize;
    trim?: ITrimData;
}
export interface IPartialMetadata {
    size: ISize;
    oversized: boolean;
}
export interface IPartialAtlas {
    pipeline: Sharp;
    metadata: IPartialMetadata;
    rects: IPackedSprite[];
}
