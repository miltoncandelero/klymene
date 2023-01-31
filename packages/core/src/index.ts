import { makeAtlas } from "./packer";

console.log("hello world");

makeAtlas(["./**/dino/*.png"], {
	textureFormat: ["webp", "avif", "png"],
}).then(() => console.log("done"));
