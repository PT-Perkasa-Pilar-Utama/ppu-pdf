// import { Canvas } from "canvas";
// import Tesseract, { OEM, createScheduler, createWorker } from "tesseract.js";

// const DEFAULT_NUM_WORKERS = 5;
// const DEFAULT_LANG = "eng";
// const TESSERACT_EXCLUDE = [
//   "~~",
//   "-",
//   ":",
//   "©",
//   "|",
//   "—",
//   "I",
//   "ns",
//   "ne",
//   "ee",
//   "es",
//   "EE",
//   "a",
// ];

// /**
//  * Tesseract service manages tesseract calls so it can be managed using scheduler
//  */
// export class TesseractService {
//   scheduler: Tesseract.Scheduler;
//   constructor() {
//     this.scheduler = createScheduler();
//   }

//   init(
//     numOfWorkers = DEFAULT_NUM_WORKERS,
//     lang = DEFAULT_LANG,
//     params: Partial<Tesseract.WorkerParams> = {}
//   ) {
//     const workerPromises: Promise<void>[] = [];
//     for (let i = 0; i < numOfWorkers; i++) {
//       const promise = createWorker(lang, OEM.LSTM_ONLY).then((worker) => {
//         worker.setParameters(params);
//         this.scheduler.addWorker(worker);
//       });
//       workerPromises.push(promise);
//     }
//     return Promise.all(workerPromises);
//   }

//   recognize(canvas: Canvas, rectangle?: Tesseract.Rectangle) {
//     return this.scheduler.addJob("recognize", canvas.toDataURL(), {
//       rectangle,
//     });
//   }

//   isExcludedText(text: string) {
//     if (text) {
//       for (const c of TESSERACT_EXCLUDE) {
//         if (text === c) {
//           return true;
//         }
//       }
//     }

//     return false;
//   }

//   isSchedulerInitiated() {
//     return this.scheduler !== null && this.scheduler !== undefined;
//   }
// }
