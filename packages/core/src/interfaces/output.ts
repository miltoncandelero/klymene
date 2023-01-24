import type { IPartialAtlas, IPartialMetadata } from "./pack";
import type { IFrame, ISize, ITrimData } from "./utils";

// describes the objects you get from Klymene

// Final object that we get
export interface IAtlas extends IPartialAtlas {
	metadata: IMetadata;
}

// object for ONE packed sprite
export interface IPackedSprite {
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

// Metadata of the final packed atlas
export interface IMetadata extends IPartialMetadata {
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
