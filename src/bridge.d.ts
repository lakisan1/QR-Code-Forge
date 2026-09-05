export interface SaveExportRequest {
  defaultName: string
  mime: string
  base64?: string
  text?: string
}

export interface SaveExportResult {
  saved: boolean
  filePath?: string
  error?: string
}

export interface ForgeApi {
  saveExport(req: SaveExportRequest): Promise<SaveExportResult>
  copyImage(base64: string): Promise<boolean>
  getInfo(): Promise<{ name: string; version: string }>
}

declare global {
  interface Window {
    forge: ForgeApi
  }
}

export {}
