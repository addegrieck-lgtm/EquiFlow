// Copie les fichiers de l'OCR (Tesseract.js) dans public/tesseract/ pour les servir depuis l'app :
// aucun CDN, fonctionnement hors ligne, compatible avec la CSP. Lancé automatiquement avant dev/build.
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nm = (...p) => join(root, 'node_modules', ...p);
const out = join(root, 'public', 'tesseract');
mkdirSync(out, { recursive: true });

const files = [
  [nm('tesseract.js', 'dist', 'worker.min.js'), 'worker.min.js'],
  // Moteur LSTM uniquement (le plus léger) ; le navigateur charge la variante adaptée au processeur.
  [nm('tesseract.js-core', 'tesseract-core-lstm.wasm.js'), 'tesseract-core-lstm.wasm.js'],
  [nm('tesseract.js-core', 'tesseract-core-simd-lstm.wasm.js'), 'tesseract-core-simd-lstm.wasm.js'],
  [nm('tesseract.js-core', 'tesseract-core-relaxedsimd-lstm.wasm.js'), 'tesseract-core-relaxedsimd-lstm.wasm.js'],
  // Modèle français compact (« best_int », ~700 Ko).
  [nm('@tesseract.js-data', 'fra', '4.0.0_best_int', 'fra.traineddata.gz'), 'fra.traineddata.gz'],
];
for (const [from, name] of files) copyFileSync(from, join(out, name));
console.log(`OCR : ${files.length} fichiers copiés dans public/tesseract/`);
