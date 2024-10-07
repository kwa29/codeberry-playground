declare module 'pptx-extract' {
  export function extractText(buffer: Buffer): Promise<string>;
}