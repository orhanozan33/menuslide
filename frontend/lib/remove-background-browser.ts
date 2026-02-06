/**
 * Arka plan kaldırma - tarayıcıda @imgly/background-removal kullanır.
 * Vercel/serverless ortamında API kullanılamadığı için istemci tarafında çalışır.
 */
export async function removeBackgroundInBrowser(imageSrc: string): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('removeBackgroundInBrowser only runs in the browser');
  }
  const { removeBackground } = await import('@imgly/background-removal');
  const blob = await removeBackground(imageSrc, {
    model: 'isnet',
    debug: false,
    output: {
      format: 'image/png',
      quality: 0.95,
    },
  });
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Blob okunamadı'));
    reader.readAsDataURL(blob);
  });
}
