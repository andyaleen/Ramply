import { DocumentReview } from '@/components/company/DocumentReview'

interface DocumentReviewPageProps {
  params: Promise<{ documentId: string }>
}

export default async function DocumentReviewPage({ params }: DocumentReviewPageProps) {
  const { documentId } = await params
  return (
    <div className="flex-1 min-w-0 p-4 sm:p-6 md:p-10">
      <div className="mx-auto w-full max-w-4xl">
        <DocumentReview documentId={documentId} />
      </div>
    </div>
  )
}
