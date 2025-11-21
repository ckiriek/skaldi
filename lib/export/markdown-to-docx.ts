/**
 * Markdown to DOCX Converter
 * Converts Markdown documents to Microsoft Word format
 */

import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType } from 'docx'

interface MarkdownBlock {
  type: 'heading' | 'paragraph' | 'list' | 'table' | 'code'
  level?: number
  content: string
  items?: string[]
  rows?: string[][]
}

export function parseMarkdown(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = []
  const lines = markdown.split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i].trim()

    // Skip empty lines
    if (!line) {
      i++
      continue
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        content: headingMatch[2]
      })
      i++
      continue
    }

    // Lists
    if (line.match(/^[-*+]\s+/) || line.match(/^\d+\.\s+/)) {
      const items: string[] = []
      while (i < lines.length && (lines[i].match(/^[-*+]\s+/) || lines[i].match(/^\d+\.\s+/))) {
        const itemMatch = lines[i].match(/^[-*+\d.]+\s+(.+)$/)
        if (itemMatch) {
          items.push(itemMatch[1])
        }
        i++
      }
      blocks.push({
        type: 'list',
        content: '',
        items
      })
      continue
    }

    // Tables
    if (line.includes('|')) {
      const rows: string[][] = []
      while (i < lines.length && lines[i].includes('|')) {
        const row = lines[i]
          .split('|')
          .map(cell => cell.trim())
          .filter(cell => cell.length > 0)
        
        // Skip separator rows
        if (!row.every(cell => cell.match(/^[-:]+$/))) {
          rows.push(row)
        }
        i++
      }
      if (rows.length > 0) {
        blocks.push({
          type: 'table',
          content: '',
          rows
        })
      }
      continue
    }

    // Code blocks
    if (line.startsWith('```')) {
      const codeLines: string[] = []
      i++ // Skip opening ```
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // Skip closing ```
      blocks.push({
        type: 'code',
        content: codeLines.join('\n')
      })
      continue
    }

    // Regular paragraph
    let paragraph = line
    i++
    while (i < lines.length && lines[i].trim() && !lines[i].match(/^[#-*+\d|`]/)) {
      paragraph += ' ' + lines[i].trim()
      i++
    }
    blocks.push({
      type: 'paragraph',
      content: paragraph
    })
  }

  return blocks
}

export function createDocxFromMarkdown(markdown: string, title: string): Document {
  const blocks = parseMarkdown(markdown)
  const children: (Paragraph | Table)[] = []

  // Add title
  children.push(
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    })
  )

  // Convert blocks to DOCX elements
  for (const block of blocks) {
    switch (block.type) {
      case 'heading':
        const headingLevel = [
          HeadingLevel.HEADING_1,
          HeadingLevel.HEADING_2,
          HeadingLevel.HEADING_3,
          HeadingLevel.HEADING_4,
          HeadingLevel.HEADING_5,
          HeadingLevel.HEADING_6
        ][block.level! - 1] || HeadingLevel.HEADING_1

        children.push(
          new Paragraph({
            text: block.content,
            heading: headingLevel,
            spacing: { before: 240, after: 120 }
          })
        )
        break

      case 'paragraph':
        // Handle bold and italic
        const runs: TextRun[] = []
        let text = block.content
        
        // Simple bold/italic parsing
        const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/)
        for (const part of parts) {
          if (part.startsWith('**') && part.endsWith('**')) {
            runs.push(new TextRun({ text: part.slice(2, -2), bold: true }))
          } else if (part.startsWith('*') && part.endsWith('*')) {
            runs.push(new TextRun({ text: part.slice(1, -1), italics: true }))
          } else if (part.startsWith('`') && part.endsWith('`')) {
            runs.push(new TextRun({ text: part.slice(1, -1), font: 'Courier New' }))
          } else if (part) {
            runs.push(new TextRun(part))
          }
        }

        children.push(
          new Paragraph({
            children: runs.length > 0 ? runs : [new TextRun(block.content)],
            spacing: { after: 120 }
          })
        )
        break

      case 'list':
        if (block.items) {
          for (const item of block.items) {
            children.push(
              new Paragraph({
                text: item,
                bullet: { level: 0 },
                spacing: { after: 60 }
              })
            )
          }
        }
        break

      case 'table':
        if (block.rows && block.rows.length > 0) {
          const tableRows = block.rows.map((row, rowIndex) => 
            new TableRow({
              children: row.map(cell => 
                new TableCell({
                  children: [
                    new Paragraph({
                      text: cell,
                      ...(rowIndex === 0 ? { bold: true } : {})
                    })
                  ],
                  width: { size: 100 / row.length, type: WidthType.PERCENTAGE }
                })
              )
            })
          )

          children.push(
            new Table({
              rows: tableRows,
              width: { size: 100, type: WidthType.PERCENTAGE }
            })
          )
        }
        break

      case 'code':
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: block.content,
                font: 'Courier New'
              })
            ],
            spacing: { before: 120, after: 120 }
          })
        )
        break
    }
  }

  return new Document({
    sections: [{
      properties: {},
      children
    }]
  })
}

/**
 * Main export function for batch operations
 */
export async function markdownToDOCX(markdown: string, title: string = 'Document'): Promise<Buffer> {
  const { Packer } = await import('docx')
  const doc = createDocxFromMarkdown(markdown, title)
  return await Packer.toBuffer(doc)
}
