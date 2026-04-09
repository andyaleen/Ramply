import type { OcrInput, OcrResult, OcrProvider } from './types'
import { processWithGoogleDocumentAi } from './google-document-ai'

/** Resolve which OCR provider to use based on env settings. */
function resolveProvider(): OcrProvider {
  const configured = process.env.OCR_PROVIDER?.trim()
  if (!configured || configured === 'google_document_ai') {
    return 'google_document_ai'
  }

  throw new Error(`Unsupported OCR provider: ${configured}`)
}

/** Run OCR with the configured provider. */
export async function runOcr(input: OcrInput): Promise<OcrResult> {
  const provider = resolveProvider()
  if (provider === 'google_document_ai') {
    return processWithGoogleDocumentAi(input)
  }

  throw new Error(`Provider not implemented: ${provider}`)
}
