/** Extract plain text from PDF in the browser (for CV upload). */

export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/legacy/build/pdf.worker.mjs',
    import.meta.url,
  ).toString()

  const bytes = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({ data: bytes }).promise
  const parts: string[] = []

  for (let page = 1; page <= doc.numPages; page += 1) {
    const pageObj = await doc.getPage(page)
    const content = await pageObj.getTextContent()
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    parts.push(pageText)
  }

  return parts.join('\n').replace(/\s+\n/g, '\n').trim()
}

export async function extractDocumentText(file: File): Promise<string> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf')) return extractPdfText(file)
  if (name.endsWith('.txt') || name.endsWith('.md')) return await file.text()
  throw new Error('Upload PDF or TXT only (max 10MB).')
}
