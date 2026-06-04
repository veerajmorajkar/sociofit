import { api } from './api';

export interface PresignedUrlResponse {
  uploadUrl: string;
  publicUrl: string;
  expiresIn: number;
}

export type UploadFileType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'image/heic'
  | 'video/mp4'
  | 'video/quicktime';

const ALLOWED_TYPES: UploadFileType[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'video/mp4',
  'video/quicktime',
];

function mimeFromFileName(fileName: string): UploadFileType {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic')) return 'image/heic';
  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.mov')) return 'video/quicktime';
  return 'image/jpeg';
}

function resolveMimeType(fileName: string, blob: Blob, hint: UploadFileType): UploadFileType {
  if (blob.type && ALLOWED_TYPES.includes(blob.type as UploadFileType)) {
    return blob.type as UploadFileType;
  }
  if (ALLOWED_TYPES.includes(hint)) return hint;
  return mimeFromFileName(fileName);
}

export async function getPresignedUrl(
  fileName: string,
  fileType: UploadFileType,
  fileSize: number,
): Promise<PresignedUrlResponse> {
  const res = await api.post<PresignedUrlResponse>('/upload/presigned-url', {
    fileName,
    fileType,
    fileSize,
  });
  if (!res.success) throw new Error(res.error ?? 'Failed to get upload URL');
  return res.data;
}

async function readFileBlob(fileUri: string): Promise<Blob> {
  const response = await fetch(fileUri);
  if (!response.ok) {
    throw new Error('Could not read the selected file');
  }
  return response.blob();
}

/**
 * Uploads a file to R2 via the pre-signed URL.
 */
export async function uploadToR2(
  presignedUrl: string,
  blob: Blob,
  fileType: UploadFileType,
): Promise<void> {
  const uploadResponse = await fetch(presignedUrl, {
    method: 'PUT',
    body: blob,
    headers: { 'Content-Type': fileType },
  });

  if (!uploadResponse.ok) {
    const hint =
      uploadResponse.status === 403 ? ' — check R2 bucket CORS and API token permissions' : '';
    throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}${hint}`);
  }
}

/**
 * Full flow: read file, get presigned URL with real byte size, upload, return public URL.
 */
export async function uploadFile(
  fileUri: string,
  fileName: string,
  fileTypeHint: UploadFileType,
): Promise<string> {
  const blob = await readFileBlob(fileUri);
  const fileSize = blob.size;
  if (fileSize <= 0) {
    throw new Error('Selected file is empty');
  }

  const fileType = resolveMimeType(fileName, blob, fileTypeHint);
  const { uploadUrl, publicUrl } = await getPresignedUrl(fileName, fileType, fileSize);
  await uploadToR2(uploadUrl, blob, fileType);
  return publicUrl;
}
