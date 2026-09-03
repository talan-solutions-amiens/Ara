import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  CopyObjectCommand
} from "@aws-sdk/client-s3";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class FileStorageService {
  private readonly s3Client: S3Client;

  constructor(private readonly config: ConfigService) {
    this.s3Client = new S3Client({
      region: config.get("S3_REGION"),
      endpoint: config.get("S3_ENDPOINT"),
      // Les magasins auto-hébergés (Garage) n'ont pas de DNS *.bucket :
      // le nom du bucket doit passer par le chemin, pas par le nom d'hôte.
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.get("AWS_ACCESS_KEY_ID"),
        secretAccessKey: config.get("AWS_SECRET_ACCESS_KEY")
      }
    });
  }

  async uploadFile(buffer: Buffer, contentType: string, key: string) {
    const command = new PutObjectCommand({
      Bucket: this.config.get<string>("S3_BUCKET"),
      Key: key,
      Body: buffer,
      ContentType: contentType
    });
    await this.s3Client.send(command);
  }

  /**
   * Reads a stored file. The bucket is private: only the backend can read it,
   * and it is served to clients by `UploadsController`.
   */
  async getFile(key: string) {
    const command = new GetObjectCommand({
      Bucket: this.config.get<string>("S3_BUCKET"),
      Key: key
    });

    return await this.s3Client.send(command);
  }

  async deleteStoredFile(key: string) {
    const command = new DeleteObjectCommand({
      Bucket: this.config.get<string>("S3_BUCKET"),
      Key: key
    });

    await this.s3Client.send(command);
  }

  async deleteMultipleFiles(...keys: string[]) {
    const command = new DeleteObjectsCommand({
      Bucket: this.config.get<string>("S3_BUCKET"),
      Delete: {
        Objects: keys.map((Key) => ({ Key }))
      }
    });

    await this.s3Client.send(command);
  }

  async duplicateMultipleFiles(
    duplications: { originalKey: string; destinationKey: string }[]
  ) {
    await Promise.all(
      duplications
        .map(
          (d) =>
            new CopyObjectCommand({
              Bucket: this.config.get<string>("S3_BUCKET"),
              CopySource: encodeURIComponent(
                `/${this.config.get<string>("S3_BUCKET")}/${d.originalKey}`
              ),
              Key: d.destinationKey
            })
        )
        .map((command) => this.s3Client.send(command))
    );
  }
}
