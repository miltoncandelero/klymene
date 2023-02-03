import type { ExportFormat, ExportFormatObject } from "./interfaces/input";
export declare function makeTextureExtension(formats: ExportFormat | ExportFormat[] | ExportFormatObject): string;
export declare function templatizeFilename(filename: string, data: any): string;
