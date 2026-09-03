import type { Request, Response } from "express";
import type { Readable } from "node:stream";
import { Controller, Get, NotFoundException, Req, Res, StreamableFile } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";

import { FileStorageService } from "./file-storage.service";

/**
 * Serves the files stored in the object storage.
 *
 * This route is deliberately kept outside of the `/api` global prefix (see the
 * `exclude` option in `main.ts`): the rich text saved in database references
 * uploaded images as `<img src="/uploads/…">`, so the path must not change.
 *
 * The bucket itself is private. Reads go through the backend, which is the only
 * holder of the storage credentials.
 */
@ApiExcludeController()
@Controller("uploads")
export class UploadsController {
  constructor(private readonly fileStorageService: FileStorageService) {}

  @Get("*")
  async serveStoredFile(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<StreamableFile> {
    const key = decodeStorageKey(req.path);

    if (!key) {
      throw new NotFoundException();
    }

    const storedFile = await this.fileStorageService
      .getFile(key)
      .catch(() => null);

    if (!storedFile?.Body) {
      throw new NotFoundException();
    }

    res.set({
      "Content-Type": storedFile.ContentType ?? "application/octet-stream",
      // The files are private to the audit they belong to: no shared cache.
      "Cache-Control": "private, max-age=3600"
    });

    if (storedFile.ContentLength !== undefined) {
      res.set({ "Content-Length": String(storedFile.ContentLength) });
    }

    return new StreamableFile(storedFile.Body as Readable);
  }
}

/**
 * Turns the request path into a storage key, or returns null when the path
 * cannot be decoded (malformed percent-encoding) or escapes the prefix.
 */
function decodeStorageKey(path: string): string | null {
  if (!path.startsWith("/uploads/")) {
    return null;
  }

  try {
    const key = decodeURIComponent(path.slice("/uploads/".length));
    return key.includes("..") ? null : key || null;
  } catch {
    return null;
  }
}
