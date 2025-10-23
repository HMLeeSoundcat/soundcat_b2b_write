export function parseExcelWithWorker(file: File): Promise<any[][]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./excelWorker.ts", import.meta.url), {
      type: "module",
    });

    worker.onmessage = (e: MessageEvent<{ success: boolean; rows?: any[][]; error?: string }>) => {
      const { success, rows, error } = e.data;
      if (success && rows) resolve(rows);
      else reject(new Error(error));
      worker.terminate();
    };

    worker.onerror = err => {
      reject(err);
      worker.terminate();
    };

    worker.postMessage(file);
  });
}
