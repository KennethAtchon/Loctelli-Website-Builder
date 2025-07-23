export interface WebsiteFile {
  name: string;
  content: string;
  type: string;
  size?: number;
  path?: string;
}

export interface Website {
  id: string;
  name: string;
  description?: string;
  type: 'static' | 'vite' | 'react' | 'other';
  files: WebsiteFile[];
  status: 'active' | 'archived' | 'processing';
  createdAt: string;
  updatedAt: string;
  userId?: string;
}

export interface WebsiteUpload {
  name: string;
  description?: string;
  files: File[];
}

export interface WebsiteMetadata {
  id: string;
  name: string;
  description?: string;
  type: string;
  fileCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileType {
  extension: string;
  mimeType: string;
  category: 'html' | 'css' | 'js' | 'image' | 'other';
  editable: boolean;
}

export const SUPPORTED_FILE_TYPES: FileType[] = [
  { extension: '.html', mimeType: 'text/html', category: 'html', editable: true },
  { extension: '.htm', mimeType: 'text/html', category: 'html', editable: true },
  { extension: '.css', mimeType: 'text/css', category: 'css', editable: true },
  { extension: '.js', mimeType: 'application/javascript', category: 'js', editable: true },
  { extension: '.ts', mimeType: 'application/typescript', category: 'js', editable: true },
  { extension: '.jsx', mimeType: 'text/jsx', category: 'js', editable: true },
  { extension: '.tsx', mimeType: 'text/tsx', category: 'js', editable: true },
  { extension: '.json', mimeType: 'application/json', category: 'other', editable: true },
  { extension: '.md', mimeType: 'text/markdown', category: 'other', editable: true },
  { extension: '.txt', mimeType: 'text/plain', category: 'other', editable: true },
  { extension: '.png', mimeType: 'image/png', category: 'image', editable: false },
  { extension: '.jpg', mimeType: 'image/jpeg', category: 'image', editable: false },
  { extension: '.jpeg', mimeType: 'image/jpeg', category: 'image', editable: false },
  { extension: '.gif', mimeType: 'image/gif', category: 'image', editable: false },
  { extension: '.svg', mimeType: 'image/svg+xml', category: 'image', editable: false },
  { extension: '.webp', mimeType: 'image/webp', category: 'image', editable: false },
];

export function getFileType(filename: string): FileType | null {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return SUPPORTED_FILE_TYPES.find(type => type.extension === extension) || null;
}

export function isEditableFile(filename: string): boolean {
  const fileType = getFileType(filename);
  return fileType?.editable || false;
}

export function getFileCategory(filename: string): string {
  const fileType = getFileType(filename);
  return fileType?.category || 'other';
} 