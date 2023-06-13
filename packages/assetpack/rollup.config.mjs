import configBuilder from "@klymene/rollup-config";
import pkg from "./package.json" assert { type: "json" };

export default configBuilder(pkg);
// export default [...configBuilder({...pkg, source:"src/workers/index.ts"}) ];
// export default [...configBuilder(pkg), ...configBuilder({...pkg, source:"src/workers/index.ts"}) ];