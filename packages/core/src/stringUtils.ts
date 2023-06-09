import type { ExportFormat, SharpExportOptions } from "./interfaces/input";

export function makeTextureExtension(format: ExportFormat | SharpExportOptions): string {
	if (typeof format === "string") {
		return format;
	}
	return format.id;
}

export function templatizeFilename(filename: string, index: number): string {
	if (!filename.includes("#")) {
		// multipack index is pretty much mandatory!
		filename += "#";
	}
	// Construct a new RegExp object
	const regexp = new RegExp(`#+`); // purposefully not global. we only want the first occurence
	const idx = index.toString().padStart(regexp.exec(filename)[0].length, "0");
	return filename.replace(regexp, idx);
}
