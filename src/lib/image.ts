/** Downscales to <= 1024px and re-encodes as JPEG so the vision call stays small. */
export async function fileToDataUrl(file: File, maxSize = 1024, quality = 0.82): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file (JPG or PNG).");
  if (file.size > 12 * 1024 * 1024) throw new Error("That image is larger than 12 MB.");

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    const raw = await readAsDataUrl(file);
    return raw;
  }
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) return readAsDataUrl(file);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", quality);
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.readAsDataURL(file);
  });
}
