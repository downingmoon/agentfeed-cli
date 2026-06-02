import { randomUUID } from 'node:crypto';
import { access, chmod, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

export async function pathExists(path: string): Promise<boolean> {
  try { await access(path); return true; } catch { return false; }
}

export async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

export async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

export async function writeTextFileAtomic(path: string, contents: string, options: { mode?: number } = {}): Promise<void> {
  await ensureDir(dirname(path));
  const tempPath = join(dirname(path), `.${basename(path)}.${process.pid}.${randomUUID()}.tmp`);
  try {
    await writeFile(tempPath, contents, { encoding: 'utf8', mode: options.mode });
    if (options.mode !== undefined) {
      try { await chmod(tempPath, options.mode); } catch { /* best-effort on non-POSIX filesystems */ }
    }
    await rename(tempPath, path);
    if (options.mode !== undefined) {
      try { await chmod(path, options.mode); } catch { /* best-effort on non-POSIX filesystems */ }
    }
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

export async function writeJson(path: string, value: unknown, options: { mode?: number } = {}): Promise<void> {
  await writeTextFileAtomic(path, `${JSON.stringify(value, null, 2)}\n`, options);
}
