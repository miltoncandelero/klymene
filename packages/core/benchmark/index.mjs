import { makeAtlasFiles } from "../lib/index.mjs";
import { packAsync } from "free-tex-packer-core";
import glob from "tiny-glob";
import { mkdir, writeFile } from "fs/promises";
import { readFileSync } from "fs";
import { join } from "path";

// known bugs: specially sized atlas get broken
// known bugs: full path names broken in json because \ taken as escape char

async function bench() {

	const testFiles = "./test/assets/many small objects/**/*.png";

	// free tex packer crashes if output dir doesn't exist
	const outDir = "./test/output/race/freetexpacker"
	await mkdir(outDir, { recursive: true });


	const imagePaths = await glob(testFiles);

	//free tex packer format
	const freeTexImages = imagePaths.map((imagePath) => {
		return { path: imagePath, contents: readFileSync(imagePath) };
	});


	const klymeneImages = freeTexImages.map(fti => { return { file: fti.contents, filename: fti.path } })


	const klymene = async () => {
		await makeAtlasFiles(klymeneImages, {
			width: 2048,
			height: 2048,
			textureFormat: "png",
			descriptorFileName: "out",
			outputDir: "./test/output/race/klymene",
			allowRotation: true,
			extrude: 0,
			padding: 2,
			powerOfTwo: true,
			sqaure: false,
			removeFileExtension: false,
			removeFolderName: false,
		});
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
			powerOfTwo: true,
			packer: "MaxRectsPacker",
			packerMethod: "Smart",
		});
		await Promise.all(files.map(file => writeFile(join(outDir, file.name), file.buffer)))
	}

	console.time("klymene");
	await klymene()
	console.timeEnd("klymene");

	console.time("free-tex-packer");
	await freeTexPacker()
	console.timeEnd("free-tex-packer");
}

bench();