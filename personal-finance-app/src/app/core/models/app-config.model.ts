export interface S3Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucketName: string;
}

export type StorageProvider = 'googleDrive' | 's3' | null;

export interface AppConfig {
  storageProvider: StorageProvider;
  s3Credentials: S3Credentials | null;
  currencySymbol: string;
}
