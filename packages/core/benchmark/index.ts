import benny from "benny";
import { makeAtlasFiles } from "../src";
import { packAsync } from "free-tex-packer-core";
import glob from "tiny-glob";
import fs from "fs";

benny.suite(
	"klymene vs free-tex-packer",

	benny.add("klymene", async () => {
		await makeAtlasFiles(["./test/assets/dino/*/*.png"], {
			width: 2048,
			height: 2048,
			textureFormat: "png",
			descriptorFileName: "dino",
			outputDir: "./test/output/race/klymene",
		});
	}),

	benny.add("free-tex-packer", async () => {
		// free-tex-packer doesn't support globs
		const imagePaths = await glob("./test/assets/dino/*/*.png");

		// free-tex-packer doesn't load it's own file...
		const images = imagePaths.map((imagePath) => {
			return { path: imagePath, contents: fs.readFileSync(imagePath) };
		});

		const files = await packAsync(images, {
			width: 2048,
			height: 2048,
			exporter: "Pixi" as any,
			detectIdentical: true,
		});
		for (const file of files) {
			// write the file to disk
			fs.writeFileSync(file.name, file.buffer);
		}
	}),

	benny.cycle(),
	benny.complete()
);
