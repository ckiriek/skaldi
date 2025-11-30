/**
 * Update Prompts Script
 * 
 * Reads ALL_PROMPTS.md and updates all prompt locations in the codebase
 */

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

interface PromptUpdate {
  id: string
  type: string
  file: string
  sectionId?: string
  promptText: string
  lines?: string
}

/**
 * Parse ALL_PROMPTS.md to extract prompts
 */
function parsePromptsFile(content: string): PromptUpdate[] {
  const prompts: PromptUpdate[] = []
  
  // Regex to match prompt blocks
  const promptRegex = /### (PROMPT-[A-Z]+-\d+):[^\n]+\n\*\*Файл:\*\* `([^`]+)`[^\n]*\n(?:\*\*Section ID:\*\* `([^`]+)`[^\n]*\n)?(?:\*\*Строки:\*\* ([^\n]+)\n)?\n```([^`]+)```/g
  
  let match
  while ((match = promptRegex.exec(content)) !== null) {
    const [, id, file, sectionId, lines, promptText] = match
    
    prompts.push({
      id,
      type: id.split('-')[1],
      file,
      sectionId,
      lines,
      promptText: promptText.trim()
    })
  }
  
  return prompts
}

/**
 * Update JSON template file
 */
function updateTemplateFile(filePath: string, promptText: string) {
  try {
    const fullPath = join(process.cwd(), filePath)
    const content = readFileSync(fullPath, 'utf-8')
    const json = JSON.parse(content)
    
    json.prompt_text = promptText
    
    writeFileSync(fullPath, JSON.stringify(json, null, 2) + '\n')
    console.log(`✅ Updated: ${filePath}`)
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error)
  }
}

/**
 * Update TypeScript file (Edge Functions, Agents, etc)
 */
function updateTypeScriptFile(filePath: string, promptText: string, lines?: string) {
  try {
    const fullPath = join(process.cwd(), filePath)
    const content = readFileSync(fullPath, 'utf-8')
    
    // For now, just log - manual update needed for TS files
    console.log(`⚠️  Manual update needed: ${filePath}`)
    console.log(`   Lines: ${lines || 'unknown'}`)
    console.log(`   New prompt: ${promptText.substring(0, 100)}...`)
  } catch (error) {
    console.error(`❌ Error reading ${filePath}:`, error)
  }
}

/**
 * Main function
 */
async function main() {
  console.log('📝 Reading ALL_PROMPTS.md...')
  
  const promptsFile = join(process.cwd(), 'ALL_PROMPTS.md')
  const content = readFileSync(promptsFile, 'utf-8')
  
  console.log('🔍 Parsing prompts...')
  const prompts = parsePromptsFile(content)
  
  console.log(`Found ${prompts.length} prompts to update\n`)
  
  let templateUpdates = 0
  let tsUpdates = 0
  
  for (const prompt of prompts) {
    if (prompt.file.endsWith('.json')) {
      updateTemplateFile(prompt.file, prompt.promptText)
      templateUpdates++
    } else if (prompt.file.endsWith('.ts')) {
      updateTypeScriptFile(prompt.file, prompt.promptText, prompt.lines)
      tsUpdates++
    }
  }
  
  console.log(`\n✅ Summary:`)
  console.log(`   Template files updated: ${templateUpdates}`)
  console.log(`   TypeScript files (manual): ${tsUpdates}`)
  console.log(`\n🎉 Done!`)
}

main().catch(console.error)
