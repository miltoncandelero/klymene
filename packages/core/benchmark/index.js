const { makeAtlasFiles } = require("../lib/index");
const { packAsync } = require("free-tex-packer-core");
const glob = require("tiny-glob");
const fs = require("fs/promises");
const fssync = require("fs");
const path = require("path");

// known bugs: specially sized atlas get broken
// known bugs: full path names broken in json because \ taken as escape char

const testFiles = "./test/assets/big objects/**/*.png";
const klymene = async () => {
	await makeAtlasFiles([testFiles], {
		width: 2048,
		height: 2048,
		textureFormat: "png",
		descriptorFileName: "out",
		outputDir: "./test/output/race/klymene",
	});
}

const freeTexPacker = async () => {
	// free tex packer doesn't support creating it's own output
	const outDir = "./test/output/race/freetexpacker"
	await fs.mkdir(outDir, { recursive: true });

	// free-tex-packer doesn't support globs
	const imagePaths = await glob(testFiles);
	// free-tex-packer doesn't load it's own file...
	const images = imagePaths.map((imagePath) => {
		return { path: imagePath, contents: fssync.readFileSync(imagePath) };
	});
	const files = await packAsync(images, {
		width: 2048,
		height: 2048,
		exporter: "Pixi",
		detectIdentical: true,
		allowRotation:true
	});
	await Promise.all(files.map(file => fs.writeFile(path.join(outDir, file.name), file.buffer)))
}

console.time("klymene");
klymene().then(() => {
	console.timeEnd("klymene");
	console.time("free-tex-packer");
	freeTexPacker().then(() => {
		console.timeEnd("free-tex-packer");
	});
});