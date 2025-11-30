/**
 * Load clinical references from clinical_reference/ into Supabase
 * 
 * PURPOSE: These references serve as STRUCTURE EXAMPLES for AI generation
 * - NOT for copying data about specific compounds
 * - Used to show AI: section structure, formatting, length, style
 * - Universal examples that work for ANY compound
 * 
 * This script:
 * 1. Reads markdown files from clinical_reference/
 * 2. Chunks them into sections
 * 3. Generates embeddings using Azure OpenAI
 * 4. Stores in drug_reference_chunks as STRUCTURE EXAMPLES
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT!
const azureKey = process.env.AZURE_OPENAI_API_KEY!
const embeddingDeployment = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME || 'text-embedding-ada-002'

const supabase = createClient(supabaseUrl, supabaseKey)

interface ReferenceChunk {
  compound_name?: string
  disease_name?: string
  document_type: string
  section_id: string
  content: string
  source: string
  metadata: Record<string, any>
  embedding: number[]
}

/**
 * Generate embedding using Azure OpenAI
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const url = `${azureEndpoint}/openai/deployments/${embeddingDeployment}/embeddings?api-version=2023-05-15`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': azureKey,
    },
    body: JSON.stringify({ input: text }),
  })

  if (!response.ok) {
    throw new Error(`Failed to generate embedding: ${await response.text()}`)
  }

  const data = await response.json()
  return data.data[0].embedding
}

/**
 * Parse markdown file into sections
 */
function parseMarkdownSections(content: string, filename: string): Array<{
  heading: string
  content: string
  level: number
}> {
  const lines = content.split('\n')
  const sections: Array<{ heading: string; content: string; level: number }> = []
  
  let currentSection: { heading: string; content: string; level: number } | null = null
  
  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    
    if (headingMatch) {
      // Save previous section
      if (currentSection && currentSection.content.trim()) {
        sections.push(currentSection)
      }
      
      // Start new section
      currentSection = {
        heading: headingMatch[2],
        content: '',
        level: headingMatch[1].length,
      }
    } else if (currentSection) {
      currentSection.content += line + '\n'
    }
  }
  
  // Save last section
  if (currentSection && currentSection.content.trim()) {
    sections.push(currentSection)
  }
  
  return sections
}

/**
 * Extract compound name from filename
 */
function extractCompoundName(filename: string): string | null {
  // Examples: bcd-063_CSR.md, protocol_sitaglipin.md, ICF_ozeltamivir.md
  const patterns = [
    /^([a-z0-9-]+)_/i,  // bcd-063_CSR -> bcd-063
    /_([a-z]+)\.md$/i,  // protocol_sitaglipin.md -> sitaglipin
  ]
  
  for (const pattern of patterns) {
    const match = filename.match(pattern)
    if (match) {
      return match[1].replace(/-/g, ' ')
    }
  }
  
  return null
}

/**
 * Determine document type from filename
 */
function getDocumentType(filename: string): string {
  if (filename.includes('CSR') || filename.includes('csr')) return 'CSR'
  if (filename.includes('protocol')) return 'Protocol'
  if (filename.includes('IB') || filename.includes('ib')) return 'IB'
  if (filename.includes('ICF') || filename.includes('icf')) return 'ICF'
  if (filename.includes('synopsis')) return 'Synopsis'
  if (filename.includes('summary')) return 'Summary'
  return 'Other'
}

/**
 * Load references from clinical_reference/ directory
 */
async function loadReferences() {
  const referenceDir = join(process.cwd(), 'clinical_reference')
  const files = readdirSync(referenceDir).filter(f => f.endsWith('.md'))
  
  console.log(`📁 Found ${files.length} reference files`)
  
  let totalChunks = 0
  
  for (const file of files) {
    console.log(`\n📄 Processing: ${file}`)
    
    const filepath = join(referenceDir, file)
    const content = readFileSync(filepath, 'utf-8')
    
    const compoundName = extractCompoundName(file)
    const documentType = getDocumentType(file)
    
    console.log(`   Compound: ${compoundName || 'Unknown'}`)
    console.log(`   Type: ${documentType}`)
    
    // Parse into sections
    const sections = parseMarkdownSections(content, file)
    console.log(`   Sections: ${sections.length}`)
    
    // Process each section
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i]
      
      // Skip very short sections
      if (section.content.length < 100) continue
      
      // Generate embedding
      const embeddingText = `${section.heading}\n${section.content.substring(0, 2000)}`
      const embedding = await generateEmbedding(embeddingText)
      
      // Prepare chunk as STRUCTURE EXAMPLE (not compound-specific)
      const chunk: ReferenceChunk = {
        compound_name: 'STRUCTURE_EXAMPLE',  // Universal marker, not specific compound
        document_type: documentType,
        section_id: section.heading.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        content: section.content.trim(),
        source: 'clinical_reference',
        metadata: {
          filename: file,
          original_compound: compoundName || 'unknown',  // For reference only
          heading: section.heading,
          level: section.level,
          index: i,
          purpose: 'structure_example',  // Key: this is for structure, not data
          usage: 'Show AI section structure, formatting, length, and style',
        },
        embedding,
      }
      
      // Insert into drug_reference_chunks as structure example
      const { error } = await supabase
        .from('drug_reference_chunks')
        .insert(chunk)
      
      if (error) {
        console.error(`   ❌ Error inserting reference: ${error.message}`)
      } else {
        totalChunks++
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    console.log(`   ✅ Processed ${sections.length} sections`)
  }
  
  console.log(`\n✅ Total chunks loaded: ${totalChunks}`)
}

// Run
loadReferences()
  .then(() => {
    console.log('\n🎉 Reference loading complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })
