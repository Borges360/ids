// Entrada expandida e resolvida pelo contrato do IDS; Style Dictionary gera Android.
import StyleDictionary from 'style-dictionary';
import { readFile } from 'node:fs/promises';
const data = JSON.parse(await readFile(new URL('./dist/json/catalog.json', import.meta.url), 'utf8'));
const resolved = JSON.parse(await readFile(new URL('./dist/json/tokens.json', import.meta.url), 'utf8'));
const colors = Object.fromEntries(data.tokens.filter(t => t.type === 'color').map(t => [t.id.replaceAll('.', '_'), { value: resolved.dark[t.id], type: 'color' }]));
const dictionary = new StyleDictionary({ tokens: { inteiro: colors }, platforms: {
  android: { transformGroup: 'android', buildPath: new URL('./dist/android/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'), files: [{ destination: 'colors.xml', format: 'android/colors' }] }
} });
await dictionary.buildAllPlatforms();
