import { build } from "esbuild";
await build({
  entryPoints: ["packages/composition/src/composition.css"],
  outfile: "packages/composition/dist/composition.css",
  bundle: true,
  loader: { ".woff2": "file" },
  assetNames: "fonts/[name]-[hash]",
  minify: false,
});
console.log("Composition CSS bundled for portable HTML and offline captures");
