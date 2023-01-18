import path from "path";
import { pack } from "./packer";

console.log("hello world");

/*
    textureName - name of output files. Default: pack-result
    suffix - the suffix used for multiple sprites. Default: -
    suffixInitialValue - the initial value of the suffix. Default: 0
    width - max single texture width. Default: 2048
    height - max single texture height. Default: 2048
    fixedSize - fix texture size. Default: false
    powerOfTwo - force power of two textures sizes. Default: false
    padding - spaces in pixels around images. Default: 0
    extrude - extrude border pixels size around images. Default: 0
    allowRotation - allow image rotation. Default: true
    detectIdentical - allow detect identical images. Default: true
    allowTrim - allow trim images. Default: true
    trimMode - trim or crop. Default: trim
    alphaThreshold - threshold alpha value. Default: 0
    removeFileExtension - remove file extensions from frame names. Default: false
    prependFolderName - prepend folder name to frame names. Default: true
    textureFormat - output file format (png or jpg). Default: png
    base64Export - export texture as base64 string to atlas meta tag. Default: false
    scale - scale size and positions in atlas. Default: 1
    scaleMethod - texture scaling method (BILINEAR, NEAREST_NEIGHBOR, BICUBIC, HERMITE, BEZIER). Default: BILINEAR
    tinify - tinify texture using TinyPNG. Default: false
    tinifyKey - TinyPNG key. Default: ""
    packer - type of packer (MaxRectsBin, MaxRectsPacker or OptimalPacker). Default: MaxRectsBin, recommended OptimalPacker
    packerMethod - name of pack method (MaxRectsBin: BestShortSideFit, BestLongSideFit, BestAreaFit, BottomLeftRule, ContactPointRule. MaxRectsPacker: Smart, Square, SmartSquare, SmartArea). Default: BestShortSideFit
    exporter - name of predefined exporter (JsonHash, JsonArray, Css, OldCss, Pixi, GodotAtlas, GodotTileset, PhaserHash, PhaserArray, Phaser3, XML, Starling, Cocos2d, Spine, Unreal, UIKit, Unity3D, Egret2D), or custom exporter (see below). Default: JsonHash
    filter - name of bitmap filter (grayscale, mask or none). Default: none
    appInfo - external app info. Required fields: url and version. Default: null

*/

const atlases = pack([
	"./test/assets/dino/Dead (1).png",
	"./test/assets/dino/Dead (2).png",
	"./test/assets/dino/Dead (3).png",
	"./test/assets/dino/Dead (4).png",
	"./test/assets/dino/Dead (5).png",
	"./test/assets/dino/Dead (6).png",
	"./test/assets/dino/Dead (7).png",
	"./test/assets/dino/Dead (8).png",
	"./test/assets/dino/Idle (1).png",
	"./test/assets/dino/Idle (10).png",
	"./test/assets/dino/Idle (2).png",
	"./test/assets/dino/Idle (3).png",
	"./test/assets/dino/Idle (4).png",
	"./test/assets/dino/Idle (5).png",
	"./test/assets/dino/Idle (6).png",
	"./test/assets/dino/Idle (7).png",
	"./test/assets/dino/Idle (8).png",
	"./test/assets/dino/Idle (9).png",
	"./test/assets/dino/Jump (1).png",
	"./test/assets/dino/Jump (10).png",
	"./test/assets/dino/Jump (11).png",
	"./test/assets/dino/Jump (12).png",
	"./test/assets/dino/Jump (2).png",
	"./test/assets/dino/Jump (3).png",
	"./test/assets/dino/Jump (4).png",
	"./test/assets/dino/Jump (5).png",
	"./test/assets/dino/Jump (6).png",
	"./test/assets/dino/Jump (7).png",
	"./test/assets/dino/Jump (8).png",
	"./test/assets/dino/Jump (9).png",
	"./test/assets/dino/Run (1).png",
	"./test/assets/dino/Run (2).png",
	"./test/assets/dino/Run (3).png",
	"./test/assets/dino/Run (4).png",
	"./test/assets/dino/Run (5).png",
	"./test/assets/dino/Run (6).png",
	"./test/assets/dino/Run (7).png",
	"./test/assets/dino/Run (8).png",
	"./test/assets/dino/Walk (1).png",
	"./test/assets/dino/Walk (10).png",
	"./test/assets/dino/Walk (2).png",
	"./test/assets/dino/Walk (3).png",
	"./test/assets/dino/Walk (4).png",
	"./test/assets/dino/Walk (5).png",
	"./test/assets/dino/Walk (6).png",
	"./test/assets/dino/Walk (7).png",
	"./test/assets/dino/Walk (8).png",
	"./test/assets/dino/Walk (9).png",
]);

// const atlases = pack([
// 	"./test/assets/colors/red.png",
// 	"./test/assets/colors/blue.png",
// 	"./test/assets/colors/green.png",
// 	"./test/assets/colors/pink.png", //
// ]);
let i = 0;
for await (const atlas of atlases) {
	await atlas.pipeline
		.toFormat("png")
		.png()
		.toFile(path.resolve(`./test/output/jaja-${i}.png`));
	console.log(atlas.rects);
	i++;
}
