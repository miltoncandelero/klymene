"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const packer_1 = require("./packer");
console.log("hello world");
(0, packer_1.makeAtlas)(["./**/dino/*.png"], {
    textureFormat: ["webp", "avif", "png"],
}).then(() => console.log("done"));
//# sourceMappingURL=index.js.map