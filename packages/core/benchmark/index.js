const { makeAtlasFiles } = require("../lib/index");
const { packAsync } = require("free-tex-packer-core");
const glob = require("tiny-glob");
const fs = require("fs");

const klymene = async () => {
	await makeAtlasFiles(["./test/assets/many small objects/**/*.png"], {
		width: 1024,
		height: 1024,
		textureFormat: "png",
		descriptorFileName: "out",
		outputDir: "./test/output/race/klymene",
	});
}

const freeTexPacker = async () => {
	// free-tex-packer doesn't support globs
	const imagePaths = await glob("./test/assets/many small objects/**/*.png");
	// free-tex-packer doesn't load it's own file...
	const images = imagePaths.map((imagePath) => {
		return { path: imagePath, contents: fs.readFileSync(imagePath) };
	});
	const files = await packAsync(images, {
		width: 1024,
		height: 1024,
		exporter: "Pixi",
		detectIdentical: true,
	});
	for (const file of files) {
		// write the file to disk
		fs.writeFileSync(file.name, file.buffer);
	}
}

console.time("klymene");
klymene().then(() => {
	console.timeEnd("klymene");
	console.time("free-tex-packer");
	freeTexPacker().then(() => {
		console.timeEnd("free-tex-packer");
	});
});