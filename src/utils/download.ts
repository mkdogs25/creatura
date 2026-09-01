/** Triggers a browser download for text content. */
export function downloadTextFile(filename: string, contents: string, mime = 'application/json'): void {
  const blob = new Blob([contents], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke on the next tick so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Opens a file picker and resolves with the chosen file's text, or null. */
export function pickTextFile(accept = 'application/json,.json'): Promise<{ name: string; text: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      try {
        resolve({ name: file.name, text: await file.text() });
      } catch {
        resolve(null);
      }
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

/** Opens a file picker for one or more text files — used for markdown note import. */
export function pickTextFiles(
  accept = '.md,.markdown,.mdown,.txt,text/markdown,text/plain',
): Promise<Array<{ name: string; text: string }>> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = true;
    input.onchange = async () => {
      const files = input.files ? Array.from(input.files) : [];
      if (files.length === 0) {
        resolve([]);
        return;
      }
      const read = await Promise.allSettled(
        files.map(async (file) => ({ name: file.name, text: await file.text() })),
      );
      resolve(
        read
          .filter((result): result is PromiseFulfilledResult<{ name: string; text: string }> =>
            result.status === 'fulfilled',
          )
          .map((result) => result.value),
      );
    };
    input.oncancel = () => resolve([]);
    input.click();
  });
}

/** Reads an image file as a data URL, for map backgrounds. */
export function pickImageAsDataUrl(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
