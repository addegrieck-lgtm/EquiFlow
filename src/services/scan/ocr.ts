/**
 * Reconnaissance de texte (OCR) dans le navigateur avec Tesseract.js.
 * Tout est servi par l'app (public/tesseract/) : aucune image ne quitte l'appareil.
 */
import type { Worker } from 'tesseract.js';

let workerPromise: Promise<Worker> | undefined;

const asset = (p: string) => new URL(`tesseract/${p}`, document.baseURI).href;

async function getWorker(onProgress?: (p: number) => void): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker, OEM } = await import('tesseract.js');
      return createWorker('fra', OEM.LSTM_ONLY, {
        workerPath: asset('worker.min.js'),
        corePath: asset(''),
        langPath: asset('').replace(/\/$/, ''),
        workerBlobURL: false,
        gzip: true,
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') progressListener?.(m.progress);
        },
      });
    })().catch((e) => {
      workerPromise = undefined; // nouvel essai possible
      throw e;
    });
  }
  progressListener = onProgress;
  return workerPromise;
}

let progressListener: ((p: number) => void) | undefined;

export async function recognize(image: Blob, onProgress?: (p: number) => void): Promise<string> {
  const worker = await getWorker(onProgress);
  progressListener = onProgress;
  const { data } = await worker.recognize(image);
  return data.text;
}

/** Les PDF ne sont pas lus par l'OCR en V1 : seules les photos le sont. */
export const canRecognize = (mime: string) => /^image\/(jpeg|png|webp|bmp|gif)$/.test(mime);
