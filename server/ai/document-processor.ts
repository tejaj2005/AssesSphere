// pdf-parse v2 exposes a PDFParse class (the v1 default-function API is gone).
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';

export interface ProcessedDocument {
  text: string;
  fileName: string;
  fileType: string;
  pageCount?: number;
  wordCount: number;
  isImage: boolean;
  base64?: string;
  mimeType?: string;
}

const IMAGE_TYPES = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_CHARS = 120000;

export async function processUploadedFile(
  filePath: string,
  originalName: string
): Promise<ProcessedDocument> {
  const ext = path.extname(originalName).toLowerCase();

  if (IMAGE_TYPES.includes(ext)) {
    const buffer = fs.readFileSync(filePath);
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };
    return {
      text: '',
      fileName: originalName,
      fileType: ext,
      wordCount: 0,
      isImage: true,
      base64: buffer.toString('base64'),
      mimeType: mimeMap[ext],
    };
  }

  let text = '';
  let pageCount: number | undefined;

  if (ext === '.pdf') {
    const buffer = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const data = await parser.getText();
      text = data.text;
      pageCount = data.total;
    } finally {
      await parser.destroy();
    }
  } else if (ext === '.docx' || ext === '.doc') {
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
  } else if (ext === '.txt') {
    text = fs.readFileSync(filePath, 'utf-8');
  } else {
    throw new Error(`Unsupported file type: ${ext}`);
  }

  if (text.length > MAX_CHARS) {
    text = text.substring(0, MAX_CHARS) + '\n\n[Document truncated — first 120,000 characters analyzed]';
  }

  return {
    text,
    fileName: originalName,
    fileType: ext,
    pageCount,
    wordCount: text.split(/\s+/).filter(Boolean).length,
    isImage: false,
  };
}

export function cleanupTempFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch { /* non-fatal */ }
}
