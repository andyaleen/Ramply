export type OcrProvider = 'google_document_ai'

export interface OcrInput {
  fileName: string
  mimeType: string
  contentBase64: string
}

export interface OcrResult {
  provider: OcrProvider
  rawText: string
  documentJson: Record<string, unknown>
  metadata: Record<string, unknown>
}
