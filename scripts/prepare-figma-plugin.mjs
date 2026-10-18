import { readFile, mkdir, cp, writeFile } from 'node:fs/promises';
const id = process.argv[2];
if (!id || !/^\d+$/.test(id)) throw new Error('Informe o ID atribuído pelo Figma ao criar um novo plugin de desenvolvimento.');
const manifest = JSON.parse(await readFile('packages/figma-plugin/manifest.json', 'utf8'));
await mkdir('artifacts/figma-plugin', { recursive: true });
for (const file of ['code.js','ui.html']) await cp(`packages/figma-plugin/${file}`, `artifacts/figma-plugin/${file}`);
await writeFile('artifacts/figma-plugin/manifest.json', JSON.stringify({ ...manifest, id }, null, 2) + '\n');
console.log('Importe artifacts/figma-plugin/manifest.json no Figma.');
