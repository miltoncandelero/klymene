import { makeAtlas } from "./packer";

import jsonhash from "./templates/jsonhash.hbs";

console.log(jsonhash);

console.log("hello world");

makeAtlas(["./test/assets/dino/*/*.png"], {
	textureFormat: ["webp", "avif", "png"],
	descriptorFileName: "dino",
	outputDir: "./test/output/dino",
}).then(() => console.log("done"));
