"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEMPLATES = void 0;
// List the templates
const jsonhash_hbs_1 = __importDefault(require("./jsonhash.hbs"));
exports.TEMPLATES = {
    jsonhash: { templateString: jsonhash_hbs_1.default, templateFunction: undefined, templateExtension: "json" },
};
//# sourceMappingURL=index.js.map