"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pack = exports.makeSharpAtlas = exports.makeAtlas = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const maxrects_packer_1 = require("maxrects-packer");
const sharp_1 = __importDefault(require("sharp"));
const stringUtils_1 = require("./stringUtils");
const imageUtils_1 = require("./imageUtils");
const input_1 = require("./interfaces/input");
const globby_1 = require("globby");
const path_1 = __importDefault(require("path"));
const templates_1 = require("./templates");
const handlebars_1 = __importDefault(require("handlebars"));
/**
 * Writes atlas to disk.
 * @param images
 * @param outputs
 * @returns atlas
 */
async function makeAtlas(images, outputs) {
    if (!Array.isArray(images)) {
        images = [images];
    }
    // if we got string, make the cool objects
    if (isStringArray(images)) {
        const expandedPaths = await (0, globby_1.globby)(images);
        console.log(images, expandedPaths);
        images = expandedPaths.map((imagePath) => {
            return { filename: imagePath };
        });
    }
    const atlases = await makeSharpAtlas(images, outputs);
    for (const atlas of atlases) {
        if (Object.keys(templates_1.TEMPLATES).includes(atlas.outputOptions.outputTemplate)) {
            // write descriptor
            const template = templates_1.TEMPLATES[atlas.outputOptions.outputTemplate];
            if (!template.templateFunction) {
                template.templateFunction = handlebars_1.default.compile(template.templateString);
            }
            // add the extension to the multipacks
            for (let i = 0; i < atlas.metadata.relatedMultiPacks.length; i++) {
                atlas.metadata.relatedMultiPacks[i] += `.${template.templateExtension}`;
            }
            const descriptorText = template.templateFunction(atlas);
            await promises_1.default.writeFile(`${atlas.metadata.name}.${template.templateExtension}`, descriptorText);
            // write texture
            if (atlas.outputOptions.textureFormat != "base64") {
                let textureFormat = atlas.outputOptions.textureFormat;
                if (typeof textureFormat == "string") {
                    textureFormat = [textureFormat];
                }
                if (Array.isArray(textureFormat)) {
                    // array of extensions
                    textureFormat = [...new Set(textureFormat)];
                    for (const ext of textureFormat) {
                        await atlas.pipeline.toFormat(ext).toFile(`${atlas.metadata.imageBaseName}.${ext}`);
                    }
                }
                else {
                    // object where keys are extensions and values are sharp configs
                    for (const [ext, options] of Object.entries(textureFormat)) {
                        await atlas.pipeline.toFormat(ext, options).toFile(`${atlas.metadata.image}.${ext}`);
                    }
                }
            }
        }
        else {
            // todo custom template file thingy?
        }
    }
}
exports.makeAtlas = makeAtlas;
/**
 * Makes a middle of the road atlas. It has the sharp object and it's ready to write to disk but it doesn't.
 * This is useful if you want to hook into sharp and export yourself.
 * @param images The images ready to be processed. This can't eat globs.
 * @param outputs The output settings
 * @returns sharp atlas
 */
async function makeSharpAtlas(images, outputs) {
    if (!Array.isArray(outputs)) {
        outputs = [outputs];
    }
    // To be filled and returned
    const retval = [];
    // make sure we have promises
    const inputFiles = images.map((f) => {
        if (f.file == undefined) {
            f.file = promises_1.default.readFile(f.filename);
        }
        return f;
    });
    for (let options of outputs) {
        // if we have only one of the filenames, both are the same filename
        if (!options.textureFileName && options.descriptorFileName) {
            options.textureFileName = options.descriptorFileName;
        }
        if (!options.descriptorFileName && options.textureFileName) {
            options.descriptorFileName = options.textureFileName;
        }
        // loading defaults just in case...
        options = { ...input_1.defaultInputSettings, ...options };
        // Now we pack!
        const atlases = await pack(inputFiles, options);
        // Names for all the linked atlases so we can have them actually linked.
        const descriptorFileNames = atlases.map((_, i) => (0, stringUtils_1.templatizeFilename)(options.descriptorFileName, { ...options, multiPackIndex: i }));
        console.log(descriptorFileNames);
        for (let i = 0; i < atlases.length; i++) {
            const atlas = atlases[i];
            const textureFileName = (0, stringUtils_1.templatizeFilename)(options.textureFileName, { ...options, multiPackIndex: i });
            const metadata = {
                oversized: atlas.metadata.oversized,
                size: atlas.metadata.size,
                format: "RGBA8888",
                imageBaseName: textureFileName,
                image: options.textureFormat == "base64" ? await (0, imageUtils_1.sharpToBase64)(atlas.pipeline) : `${textureFileName}.${(0, stringUtils_1.makeTextureExtension)(options.textureFormat)}`,
                scale: options.scale,
                url: options.url,
                version: options.version,
                relatedMultiPacks: descriptorFileNames.filter((_, j) => j != i),
                name: descriptorFileNames[i], // My file name
            };
            retval.push({ metadata: metadata, pipeline: atlas.pipeline, rects: atlas.rects, outputOptions: options });
        }
    }
    return retval;
}
exports.makeSharpAtlas = makeSharpAtlas;
async function pack(inputFiles, options) {
    // make sharps, clean filenames
    const fullImages = await Promise.all(inputFiles.map(async (f) => {
        console.log(f.filename);
        let spriteAlias = f.filename;
        if (options.removeFolderName) {
            spriteAlias = path_1.default.basename(spriteAlias);
        }
        if (options.removeFileExtension) {
            spriteAlias = spriteAlias.replace(/\.[^/.]+$/, "");
        }
        return {
            pipeline: (0, sharp_1.default)(await f.file),
            alias: [spriteAlias],
            tag: f.tag,
        };
    }));
    // trim and maybe resize images
    const packableImages = await Promise.all(fullImages.map((image) => (0, imageUtils_1.trimAlpha)(image, options.scale, options.scaleMethod)));
    // TODO: Extrude images
    // hash images (it's in place, we just wait it.)
    await Promise.all(packableImages.map((image) => (0, imageUtils_1.hashImage)(image)));
    // deduplicate images but keeping their aliases
    const imageHashes = {};
    // deduplicate and store the important information
    for (const img of packableImages) {
        if (imageHashes[img.hash]) {
            // we have seen this hash before, we have a duplicate!
            const existingImageData = imageHashes[img.hash].data;
            const repeatedImageData = img.data;
            existingImageData.alias.push(...repeatedImageData.alias);
            existingImageData.originalInfo = { ...existingImageData.originalInfo, ...repeatedImageData.originalInfo };
        }
        else {
            // this is the first occurence!
            imageHashes[img.hash] = img;
        }
    }
    // back to array.
    const deduplicatedImages = Object.values(imageHashes);
    const packingOptions = {
        smart: true,
        pot: options.powerOfTwo,
        square: options.sqaure,
        allowRotation: options.allowRotation,
        tag: deduplicatedImages.some((i) => i.tag),
        border: options.padding, // padding from the edge of the atlas
    };
    const packer = new maxrects_packer_1.MaxRectsPacker(options.width, options.height, options.padding, packingOptions);
    packer.addArray(deduplicatedImages); // Start packing with input array
    const bins = packer.bins; // Get the bins
    const retPromises = [];
    for (const bin of bins) {
        retPromises.push((0, imageUtils_1.packBinAndReleaseMemory)(bin));
    }
    return Promise.all(retPromises);
}
exports.pack = pack;
function isStringArray(arr) {
    return typeof arr[0] === "string";
}
//# sourceMappingURL=packer.js.map