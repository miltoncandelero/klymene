import configBuilder from "@klymene/rollup-config";
import pkg from "./package.json" assert { type: "json" };

export default configBuilder(pkg);