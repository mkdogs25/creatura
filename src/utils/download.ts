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

export interface PickedFolderFile {
  /** Path within the chosen folder, subfolders included — e.g. "Lore/Tides.md". */
  relativePath: string;
  text: string;
}

/**
 * Opens a directory picker and returns every markdown file inside it —
 * subfolders included — for building a whole project from an uploaded folder.
 *
 * `webkitdirectory`/`directory` are non-standard but supported by every
 * current browser for exactly this purpose; there is no standard equivalent.
 * Each selected file's `webkitRelativePath` is what preserves the folder
 * structure, so the caller can rebuild it as real Creatura folders.
 */
export function pickMarkdownFolder(): Promise<{
  rootName: string;
  files: PickedFolderFile[];
}> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.setAttribute('webkitdirectory', '');
    input.setAttribute('directory', '');
    input.onchange = async () => {
      const all = input.files ? Array.from(input.files) : [];
      if (all.length === 0) {
        resolve({ rootName: '', files: [] });
        return;
      }
      const relativePathOf = (file: File) =>
        (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;

      const markdown = all.filter((file) => /\.(md|markdown|mdown)$/i.test(file.name));
      const read = await Promise.allSettled(
        markdown.map(async (file) => ({ relativePath: relativePathOf(file), text: await file.text() })),
      );
      const files = read
        .filter((result): result is PromiseFulfilledResult<PickedFolderFile> => result.status === 'fulfilled')
        .map((result) => result.value);

      // The first path segment is the folder the user actually picked; every
      // file shares it, even if none of them happened to be markdown.
      const rootName = relativePathOf(all[0]).split('/')[0] || 'Imported folder';
      resolve({ rootName, files });
    };
    input.oncancel = () => resolve({ rootName: '', files: [] });
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
