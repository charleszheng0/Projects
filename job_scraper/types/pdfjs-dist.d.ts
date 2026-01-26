declare module "pdfjs-dist" {
  export const version: string;

  export const GlobalWorkerOptions: {
    workerSrc: string;
  };

  export function getDocument(source: { data: ArrayBuffer }): {
    promise: Promise<{
      numPages: number;
      getPage: (page: number) => Promise<{
        getTextContent: () => Promise<{
          items: unknown[];
        }>;
      }>;
    }>;
  };
}
