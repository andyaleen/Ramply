import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export interface DocumentInfo {
  file_path: string
  file_name: string
  document_type?: string
}

/**
 * Robustly downloads a document from Supabase storage
 * Handles different storage path scenarios and provides fallback search
 */
export async function downloadDocument(doc: DocumentInfo): Promise<void> {
  const supabase = createClient()

  try {
  console.log("📁 Attempting to download file from path:", doc.file_path);

    // First, try the direct download with the stored path
    let downloadError: Error | null = null
    let data: Blob | null = null

    try {
      const result = await supabase.storage
        .from('documents')
        .download(doc.file_path)

      if (result.error) {
        downloadError = result.error

      } else {
        data = result.data
      }
    } catch (error) {
      console.log("============",error);
      
      downloadError = error instanceof Error ? error : new Error(String(error))
    }

    // If direct download failed, try to find the actual file path
    if (downloadError || !data) {
      console.log('❌ Direct download failed:', downloadError?.message)
      console.log('🔍 Attempting to find file with search...')

      const actualPath = await findActualFilePath(doc)
      console.log('✅ Found actual path:', actualPath)

      const result = await supabase.storage
        .from('documents')
        .download(actualPath)

      if (result.error) throw result.error
      data = result.data
    }

    if (!data) {
      throw new Error('No file data received')
    }

    // Create download link
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = doc.file_name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    console.log('✅ Download completed:', doc.file_name)
    toast.success(`Downloaded ${doc.file_name}`)

  } catch (error) {
    console.error('❌ Download failed:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    toast.error(`Failed to download ${doc.file_name}: ${errorMessage}`)
    throw error
  }
}

/**
 * Searches for the actual file path in storage when the stored path doesn't work
 */
async function findActualFilePath(doc: DocumentInfo): Promise<string> {
  const supabase = createClient()

  console.log('🔍 Searching for actual file path for:', doc.file_name)
  console.log('🔍 Document type:', doc.document_type)
  console.log('🔍 Stored file path:', doc.file_path)

  // Extract the base filename without extension for better matching
  const baseFileName = doc.file_name.replace(/\.[^/.]+$/, '') // Remove extension
  const documentType = doc.document_type?.toLowerCase() || ''

  console.log('🔍 Searching with patterns:', { baseFileName, documentType })

  // List all files in storage to find the correct path
  const { data: listData, error: listError } = await supabase.storage
    .from('documents')
    .list('', {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' }
    })

  if (listError || !listData) {
    console.error('❌ Failed to list storage contents:', listError)
    throw new Error('Could not access storage')
  }

  console.log('📁 Found storage items:', listData.length)
  console.log('📁 Storage structure:', listData.map(item => ({ name: item.name, isFolder: !item.name.includes('.') })))

  // Search through folders recursively
  for (const item of listData) {
    if (item.name && !item.name.includes('.')) { // This is likely a folder
      console.log('📂 Exploring folder:', item.name)
      // List folder contents
      const { data: folderData } = await supabase.storage
        .from('documents')
        .list(item.name, { limit: 1000 })
      if (folderData) {
        console.log(`📂 Found ${folderData.length} items in folder ${item.name}:`, folderData.map(f => f.name))

        for (const subItem of folderData) {
          if (subItem.name && !subItem.name.includes('.')) { // Subfolder
            console.log('📂 Exploring subfolder:', `${item.name}/${subItem.name}`)

            const { data: subFolderData } = await supabase.storage
              .from('documents')
              .list(`${item.name}/${subItem.name}`, { limit: 1000 })
            if (subFolderData) {
              console.log(`📂 Found ${subFolderData.length} files in subfolder ${item.name}/${subItem.name}:`, subFolderData.map(f => f.name))
              for (const file of subFolderData) {
                console.log('🔍 Checking file:', file.name, 'against patterns')

                if (isFileMatch(file.name, baseFileName, documentType)) {
                  const foundPath = `${item.name}/${subItem.name}/${file.name}`
                  console.log('✅ Found matching file:', foundPath)
                  return foundPath
                }
              }
            }
          } else {
            // File directly in folder
            console.log('🔍 Checking folder file:', subItem.name, 'against patterns')

            if (isFileMatch(subItem.name, baseFileName, documentType)) {
              const foundPath = `${item.name}/${subItem.name}`
              console.log('✅ Found matching file in folder:', foundPath)
              return foundPath
            }
          }
        }
      }
    } else {
      // File in root
      console.log('🔍 Checking root file:', item.name, 'against patterns')

      if (isFileMatch(item.name, baseFileName, documentType)) {
        console.log('✅ Found matching file in root:', item.name)
        return item.name
      }
    }
  }

  console.log('❌ No matching file found. Search summary:')
  console.log('  - Searched for base filename:', baseFileName)
  console.log('  - Searched for document type:', documentType)
  console.log('  - Total storage items checked:', listData.length)

  throw new Error(`File not found in storage: ${doc.file_name}`)
}

/**
 * Checks if a file name matches the expected patterns
 */
function isFileMatch(fileName: string, baseFileName: string, documentType: string): boolean {
  const lowerFileName = fileName.toLowerCase()
  const lowerBaseName = baseFileName.toLowerCase()
  const lowerDocType = documentType.toLowerCase()

  console.log('🔍 Checking match for:', { fileName: lowerFileName, baseName: lowerBaseName, docType: lowerDocType })

  // Check for document type match
  const matchesDocType = Boolean(documentType && lowerFileName.includes(lowerDocType))

  // Check for base filename match
  const matchesBaseName = Boolean(baseFileName && lowerFileName.includes(lowerBaseName))

  // Check for partial matches (useful for timestamped files)
  const matchesPartial = Boolean(baseFileName && baseFileName.length > 3 &&
    lowerFileName.includes(lowerBaseName.substring(0, Math.min(lowerBaseName.length, 8))))

  // Special handling for common words that might appear in different contexts
  const specialMatches = Boolean(
    (lowerBaseName.includes('overview') && lowerFileName.includes('overview')) ||
    (lowerBaseName.includes('bank') && lowerFileName.includes('bank')) ||
    (lowerBaseName.includes('tax') && lowerFileName.includes('tax')) ||
    (lowerBaseName.includes('insurance') && lowerFileName.includes('insurance'))
  )

  const result = matchesDocType || matchesBaseName || matchesPartial || specialMatches

  console.log('🔍 Match result:', {
    matchesDocType,
    matchesBaseName,
    matchesPartial,
    specialMatches,
    overall: result
  })

  return result
}
