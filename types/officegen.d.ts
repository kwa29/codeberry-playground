declare module 'officegen' {
  interface OfficeGenOptions {
    type: string;
  }

  interface Slide {
    getTexts(): { text: string }[];
  }

  interface OfficeGenInstance {
    on(event: string, callback: (err: Error) => void): void;
    load(buffer: Buffer, callback: (err: Error | null) => void): void;
    getSlides(): Slide[];
  }

  function officegen(options: string | OfficeGenOptions): OfficeGenInstance;

  export = officegen;
}