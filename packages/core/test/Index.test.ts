// example
import rimraf from "rimraf";
import { makeAtlasFiles } from "../src";

jest.setTimeout(20000);

beforeAll(() => {
	// just in case
	rimraf.sync("./test/output");
});
afterEach(() => {
	// delete the output folder
	// rimraf.sync("./test/output");
});

test("Stuff should work", async () => {
	await makeAtlasFiles(["./test/assets/dino/*/*.png"], {
		textureFormat: ["webp", "avif", "png"],
		descriptorFileName: "dino",
		outputDir: "./test/output/dino",
	});
	expect(1).toBe(1);
});
