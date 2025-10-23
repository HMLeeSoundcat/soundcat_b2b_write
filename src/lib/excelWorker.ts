import readXlsxFile from "read-excel-file/web-worker";

self.onmessage = async (e: MessageEvent<File>) => {
  const file = e.data;
  try {
    const rows = await readXlsxFile(file);
    self.postMessage({ success: true, rows });
  } catch (error) {
    self.postMessage({ success: false, error: (error as Error).message });
  }
};
