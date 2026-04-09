import { DocumentReview } from '@/components/company/DocumentReview'

interface DocumentReviewPageProps {
  params: { documentId: string }
}

export default function DocumentReviewPage({ params }: DocumentReviewPageProps) {
  return <DocumentReview documentId={params.documentId} />
}
