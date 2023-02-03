const benny = require("benny");
const { makeAtlasFiles } = require("../lib/index");
const { packAsync } = require("free-tex-packer-core");
const glob = require("tiny-glob");
const fs = require("fs");

benny.suite("klymene vs free-tex-packer", benny.add("klymene", async () => {
	await makeAtlasFiles(["./test/assets/many small objects/**/*.png"], {
		width: 4096,
		height: 4096,
		textureFormat: "png",
		descriptorFileName: "dino",
		outputDir: "./test/output/race/klymene",
	});
}), benny.add("free-tex-packer", async () => {
	// free-tex-packer doesn't support globs
	const imagePaths = await glob("./test/assets/many small objects/**/*.png");
	// free-tex-packer doesn't load it's own file...
	const images = imagePaths.map((imagePath) => {
		return { path: imagePath, contents: fs.readFileSync(imagePath) };
	});
	const files = await packAsync(images, {
		width: 4096,
		height: 4096,
		exporter: "Pixi",
		detectIdentical: true,
	});
	for (const file of files) {
		// write the file to disk
		fs.writeFileSync(file.name, file.buffer);
	}
}), benny.cycle(), benny.complete());