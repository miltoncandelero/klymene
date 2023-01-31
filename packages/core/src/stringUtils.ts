import type { ExportFormat, ExportFormatObject } from "./interfaces/input";
import Handlebars from "handlebars";

export function makeTextureExtension(formats: ExportFormat | ExportFormat[] | ExportFormatObject): string {
	if (typeof formats === "string") {
		return formats;
	}

	if (!Array.isArray(formats)) {
		formats = Object.keys(formats) as ExportFormat[];
	}

	if (formats.length === 1) {
		return formats[0];
	} else {
		return `{${formats.join(",")}}`;
	}
}

export function templatizeFilename(filename: string, data: any): string {
	if (!filename.includes("{{multipackIndex}}")) {
		// multipack index is pretty much mandatory!
		filename += "{{#if multiPackIndex}}-{{multiPackIndex}}{{/if}}";
	}
	const template = Handlebars.compile(filename);
	return template(data);
}
