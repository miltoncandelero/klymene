import { IAtlasOutputSettings, InputFile } from "./interfaces/input";
import type { IAtlas } from "./interfaces/output";
import type { IPartialAtlas } from "./interfaces/pack";
/**
 * Writes atlas to disk.
 * @param images
 * @param outputs
 * @returns atlas
 */
export declare function makeAtlas(images: string | string[] | InputFile[], outputs: Partial<IAtlasOutputSettings> | Partial<IAtlasOutputSettings>[]): Promise<void>;
/**
 * Makes a middle of the road atlas. It has the sharp object and it's ready to write to disk but it doesn't.
 * This is useful if you want to hook into sharp and export yourself.
 * @param images The images ready to be processed. This can't eat globs.
 * @param outputs The output settings
 * @returns sharp atlas
 */
export declare function makeSharpAtlas(images: InputFile[], outputs: Partial<IAtlasOutputSettings> | Partial<IAtlasOutputSettings>[]): Promise<IAtlas[]>;
export declare function pack(inputFiles: InputFile[], options: IAtlasOutputSettings): Promise<IPartialAtlas[]>;
