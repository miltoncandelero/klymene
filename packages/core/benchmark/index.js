const { makeAtlasFiles } = require("../lib/index");
const { packAsync } = require("free-tex-packer-core");
const glob = require("tiny-glob");
const fs = require("fs/promises");
const fssync = require("fs");
const path = require("path");

// known bugs: specially sized atlas get broken
// known bugs: full path names broken in json because \ taken as escape char

async function bench() {

	const testFiles = "./test/assets/many small objects/**/*.png";

	// free tex packer crashes if output dir doesn't exist
	const outDir = "./test/output/race/freetexpacker"
	await fs.mkdir(outDir, { recursive: true });


	const imagePaths = await glob(testFiles);

	//free tex packer format
	const freeTexImages = imagePaths.map((imagePath) => {
		return { path: imagePath, contents: fssync.readFileSync(imagePath) };
	});


	const klymeneImages = freeTexImages.map(fti => { return { file: fti.contents, filename: fti.path } })


	const klymene = async () => {
		await makeAtlasFiles(klymeneImages, {
			width: 2048,
			height: 2048,
			allowRotation: true,
			extrude: 0,
			padding: 2,
			powerOfTwo: true,
			sqaure: false,
			removeFileExtension: false,
			removeFolderName: false,
		}, [{
			textureFormat: { id: "avif", lossless: true },
			descriptorFileName: "out##",
			outputDir: "./test/output/race/klymene",
		},
		{
			textureFormat: "png",
			descriptorFileName: "out##@0.5x",
			outputDir: "./test/output/race/klymene",
			scale: 0.5,
		},
		{
			textureFormat: "png",
			descriptorFileName: "out##@2x",
			outputDir: "./test/output/race/klymene",
			scale: 2,
		}]);
	}

	const freeTexPacker = async () => {
		const files = await packAsync(freeTexImages, {
			width: 2048,
			height: 2048,
			exporter: "Pixi",
			detectIdentical: true,
			allowRotation: true,
			allowTrim: true,
			fixedSize: false,
			extrude: 0,
			padding: 2,
			scale: 0.5,
			powerOfTwo: true,
			packer: "MaxRectsPacker",
			packerMethod: "Smart",
		});
		await Promise.all(files.map(file => fs.writeFile(path.join(outDir, file.name), file.buffer)))
	}

	console.time("klymene");
	await klymene()
	console.timeEnd("klymene");

	console.time("free-tex-packer");
	await freeTexPacker()
	console.timeEnd("free-tex-packer");
}

bench();