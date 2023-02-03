import type { IAtlasOutputSettings } from "./input";
import type { IPartialAtlas, IPartialMetadata } from "./pack";
import type { IFrame, ISize, ITrimData } from "./utils";
export interface IAtlas extends IPartialAtlas {
    metadata: IMetadata;
    outputOptions: IAtlasOutputSettings;
}
export interface IPackedSprite {
    name: string;
    frame: IFrame;
    trimmed: boolean;
    rotated: boolean;
    oversized: boolean;
    spriteSourceSize: IFrame;
    sourceSize: ISize;
    trimmedData: ITrimData;
    index: number;
    first: boolean;
    last: boolean;
}
export interface IMetadata extends IPartialMetadata {
    image: string;
    imageBaseName: string;
    format: string;
    scale: number;
    size: ISize;
    oversized: boolean;
    relatedMultiPacks?: string[];
    url: string;
    version: string;
    name: string;
}
