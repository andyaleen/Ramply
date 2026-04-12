import { DocumentReview } from '@/components/company/DocumentReview'

interface DocumentReviewPageProps {
  params: Promise<{ documentId: string }>
}

export default async function DocumentReviewPage({ params }: DocumentReviewPageProps) {
  const { documentId } = await params
  return <DocumentReview documentId={documentId} />
}
