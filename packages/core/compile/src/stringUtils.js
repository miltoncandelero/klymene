"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.templatizeFilename = exports.makeTextureExtension = void 0;
const handlebars_1 = __importDefault(require("handlebars"));
function makeTextureExtension(formats) {
    if (typeof formats === "string") {
        return formats;
    }
    if (!Array.isArray(formats)) {
        formats = Object.keys(formats);
    }
    if (formats.length === 1) {
        return formats[0];
    }
    else {
        return `{${formats.join(",")}}`;
    }
}
exports.makeTextureExtension = makeTextureExtension;
function templatizeFilename(filename, data) {
    if (!filename.includes("{{multipackIndex}}")) {
        // multipack index is pretty much mandatory!
        filename += "{{#if multiPackIndex}}-{{multiPackIndex}}{{/if}}";
    }
    const template = handlebars_1.default.compile(filename);
    return template(data);
}
exports.templatizeFilename = templatizeFilename;
//# sourceMappingURL=stringUtils.js.map