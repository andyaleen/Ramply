import PDFDocument from 'pdfkit'
import type { ResponseDetailViewModel } from '@/lib/response-detail-view-model'

type PdfDoc = InstanceType<typeof PDFDocument>

export type ResponsePdfBranding = {
  requesterCompanyName: string | null
  logoBuffer: Buffer | null
  logoMimeType: string | null
}

const PAGE_MARGIN = 48
const CONTENT_WIDTH = 515

/** Render a completed share response summary as a PDF buffer. */
export async function generateResponsePdf(
  viewModel: ResponseDetailViewModel,
  branding: ResponsePdfBranding
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: PAGE_MARGIN })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    let y = PAGE_MARGIN

    y = drawHeader(doc, y, branding)

    y = drawSectionHeading(doc, y, 'Request Summary')
    y = drawKeyValue(doc, y, 'Request Type', viewModel.requestType)
    y = drawKeyValue(doc, y, 'Company', viewModel.companyName)
    y = drawKeyValue(doc, y, 'Recipient Email', viewModel.recipientEmail)

    if (viewModel.requiredFields.length > 0) {
      y = ensureSpace(doc, y, 40)
      y = drawSectionHeading(doc, y, 'Required Information')
      for (const field of viewModel.requiredFields) {
        y = drawKeyValue(doc, y, field.label, field.value)
      }
    }

    if (viewModel.optionalFields.length > 0) {
      y = ensureSpace(doc, y, 40)
      y = drawSectionHeading(doc, y, 'Optional Information')
      for (const field of viewModel.optionalFields) {
        y = drawKeyValue(doc, y, field.label, field.value)
      }
    }

    if (viewModel.documents.length > 0) {
      y = ensureSpace(doc, y, 40)
      y = drawSectionHeading(doc, y, 'Shared Documents')
      for (const document of viewModel.documents) {
        y = ensureSpace(doc, y, 52)
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#0F1F18')
        doc.text(document.label, PAGE_MARGIN, y, { width: CONTENT_WIDTH })
        y = doc.y + 2

        doc.font('Helvetica').fontSize(9).fillColor('#4A5C54')
        const requirement = document.required ? 'Required' : 'Optional'
        const details = document.fileName
          ? `${requirement} • ${document.fileName}${document.uploadedAt ? ` • ${document.uploadedAt}` : ''}`
          : `${requirement} • ${document.status === 'missing' ? 'Missing' : 'Not provided'}`
        doc.text(details, PAGE_MARGIN, y, { width: CONTENT_WIDTH })
        y = doc.y + 10
      }
    }

    if (viewModel.responseDate) {
      y = ensureSpace(doc, y, 40)
      y = drawKeyValue(doc, y, 'Response Date', viewModel.responseDate)
    }

    doc.font('Helvetica').fontSize(8).fillColor('#8A9A92')
    doc.text(
      `Generated ${new Date().toLocaleString()} • Ramply`,
      PAGE_MARGIN,
      doc.page.height - PAGE_MARGIN,
      { width: CONTENT_WIDTH, align: 'center' }
    )

    doc.end()
  })
}

const LOGO_WIDTH = 120
const LOGO_HEIGHT = 48

function drawHeader(doc: PdfDoc, y: number, branding: ResponsePdfBranding): number {
  const hasLogo = Boolean(branding.logoBuffer && isEmbeddableLogo(branding.logoMimeType))
  const titleWidth = hasLogo ? CONTENT_WIDTH - LOGO_WIDTH - 8 : CONTENT_WIDTH

  doc.font('Helvetica-Bold').fontSize(18).fillColor('#0F1F18')
  doc.text('Share Request Response', PAGE_MARGIN, y, { width: titleWidth })

  let rowBottom = doc.y

  if (hasLogo && branding.logoBuffer) {
    try {
      const logoX = PAGE_MARGIN + CONTENT_WIDTH - LOGO_WIDTH
      doc.image(branding.logoBuffer, logoX, y, { fit: [LOGO_WIDTH, LOGO_HEIGHT] })
      rowBottom = Math.max(rowBottom, y + LOGO_HEIGHT)
    } catch {
      // Skip invalid or unsupported logo data.
    }
  }

  return rowBottom + 16
}

function isEmbeddableLogo(mimeType: string | null): boolean {
  return mimeType === 'image/png' || mimeType === 'image/jpeg'
}

function drawSectionHeading(doc: PdfDoc, y: number, title: string): number {
  y = ensureSpace(doc, y, 28)
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#287253')
  doc.text(title, PAGE_MARGIN, y, { width: CONTENT_WIDTH })
  return doc.y + 10
}

function drawKeyValue(doc: PdfDoc, y: number, label: string, value: string): number {
  y = ensureSpace(doc, y, 34)
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#4A5C54')
  doc.text(label, PAGE_MARGIN, y, { width: CONTENT_WIDTH })
  doc.font('Helvetica').fontSize(10).fillColor('#0F1F18')
  doc.text(value || '-', PAGE_MARGIN, doc.y + 2, { width: CONTENT_WIDTH })
  return doc.y + 8
}

function ensureSpace(doc: PdfDoc, y: number, needed: number): number {
  const bottom = doc.page.height - PAGE_MARGIN - 24
  if (y + needed > bottom) {
    doc.addPage()
    return PAGE_MARGIN
  }
  return y
}
