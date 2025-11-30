/**
 * Integration Test Script
 * 
 * Tests the complete data integration pipeline:
 * 1. Data Aggregator
 * 2. Context Builder
 * 3. Token Budget Calculator
 * 4. Section Generator
 * 5. Document Orchestrator
 * 
 * Usage: tsx scripts/test-integration.ts
 */

import { DataAggregator } from '../lib/services/data-aggregator'
import { ContextBuilder } from '../lib/services/context-builder'
import { TokenBudgetCalculator } from '../lib/services/token-budget'
import { SectionGenerator } from '../lib/services/section-generator'
import { DocumentOrchestrator } from '../lib/services/document-orchestrator'

// Test configurations
const TEST_CASES = [
  {
    name: 'Metformin - IB Clinical Studies',
    projectId: 'test-metformin',
    documentType: 'IB',
    sectionId: 'ib_clinical_studies',
    expectedSources: ['Knowledge Graph', 'ClinicalTrials.gov', 'FAERS', 'FDA Labels', 'PubMed'],
    expectedMinTokens: 10000
  },
  {
    name: 'Sitagliptin - Protocol Synopsis',
    projectId: 'test-sitagliptin',
    documentType: 'Protocol',
    sectionId: 'protocol_synopsis',
    expectedSources: ['Knowledge Graph', 'ClinicalTrials.gov'],
    expectedMinTokens: 1500
  },
  {
    name: 'Imipenem - IB Safety',
    projectId: 'test-imipenem',
    documentType: 'IB',
    sectionId: 'ib_safety',
    expectedSources: ['Knowledge Graph', 'FAERS', 'FDA Labels'],
    expectedMinTokens: 8000
  }
]

async function testDataAggregator() {
  console.log('\n🧪 TEST 1: Data Aggregator')
  console.log('=' .repeat(60))
  
  const aggregator = new DataAggregator()
  
  for (const testCase of TEST_CASES) {
    console.log(`\n📊 Testing: ${testCase.name}`)
    
    try {
      const startTime = Date.now()
      
      const data = await aggregator.aggregateForSection(
        testCase.projectId,
        testCase.documentType,
        testCase.sectionId
      )
      
      const duration = Date.now() - startTime
      
      // Validate results
      const hasKG = data.knowledgeGraph && Object.keys(data.knowledgeGraph).length > 1
      const hasTrials = data.clinicalTrials.totalStudies > 0
      const hasSafety = data.safetyData.faersReports.length > 0
      const hasLabels = data.fdaLabels.labels.length > 0
      const hasLit = data.literature.pubmedArticles.length > 0
      
      console.log(`   ✅ Duration: ${duration}ms`)
      console.log(`   📦 Knowledge Graph: ${hasKG ? 'YES' : 'NO'}`)
      console.log(`   📦 Clinical Trials: ${data.clinicalTrials.totalStudies} studies`)
      console.log(`   📦 Safety Reports: ${data.safetyData.faersReports.length} reports`)
      console.log(`   📦 FDA Labels: ${data.fdaLabels.labels.length} labels`)
      console.log(`   📦 Literature: ${data.literature.pubmedArticles.length} articles`)
      console.log(`   📦 RAG References: ${data.ragReferences.structuralExamples.length} examples`)
      console.log(`   📊 Data Quality:`)
      console.log(`      - KG: ${data.metadata.dataQuality.knowledgeGraph}%`)
      console.log(`      - Trials: ${data.metadata.dataQuality.clinicalTrials}%`)
      console.log(`      - Safety: ${data.metadata.dataQuality.safetyData}%`)
      console.log(`      - Labels: ${data.metadata.dataQuality.fdaLabels}%`)
      console.log(`      - Literature: ${data.metadata.dataQuality.literature}%`)
      
    } catch (error) {
      console.error(`   ❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

async function testContextBuilder() {
  console.log('\n🧪 TEST 2: Context Builder')
  console.log('=' .repeat(60))
  
  const aggregator = new DataAggregator()
  const builder = new ContextBuilder()
  
  for (const testCase of TEST_CASES) {
    console.log(`\n📊 Testing: ${testCase.name}`)
    
    try {
      const data = await aggregator.aggregateForSection(
        testCase.projectId,
        testCase.documentType,
        testCase.sectionId
      )
      
      const startTime = Date.now()
      
      const context = builder.buildContext(data, {
        maxTokens: 10000,
        prioritySources: testCase.expectedSources,
        includeFullText: false,
        includeMetadata: true,
        sectionId: testCase.sectionId,
        documentType: testCase.documentType
      })
      
      const duration = Date.now() - startTime
      
      console.log(`   ✅ Duration: ${duration}ms`)
      console.log(`   📝 Context tokens: ${context.tokenCount}`)
      console.log(`   📦 Sources used: ${context.sourcesUsed.join(', ')}`)
      console.log(`   📑 Sections included: ${context.sectionsIncluded.join(', ')}`)
      console.log(`   📏 Context length: ${context.text.length} chars`)
      
      // Validate
      if (context.tokenCount > 10000) {
        console.log(`   ⚠️  WARNING: Context exceeds token limit!`)
      }
      
      if (context.sourcesUsed.length === 0) {
        console.log(`   ⚠️  WARNING: No sources used!`)
      }
      
    } catch (error) {
      console.error(`   ❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

async function testTokenBudgetCalculator() {
  console.log('\n🧪 TEST 3: Token Budget Calculator')
  console.log('=' .repeat(60))
  
  const calculator = new TokenBudgetCalculator()
  
  for (const testCase of TEST_CASES) {
    console.log(`\n📊 Testing: ${testCase.name}`)
    
    try {
      const config = calculator.getSectionConfig(testCase.documentType, testCase.sectionId)
      const budget = calculator.calculateBudget(testCase.documentType, testCase.sectionId)
      
      if (!config) {
        console.log(`   ⚠️  No config found for ${testCase.documentType}/${testCase.sectionId}`)
        continue
      }
      
      console.log(`   ✅ Section Config:`)
      console.log(`      - Title: ${config.sectionTitle}`)
      console.log(`      - Target pages: ${config.targetPages}`)
      console.log(`      - Target tokens: ${config.targetTokens}`)
      console.log(`      - Reasoning effort: ${config.reasoning_effort}`)
      console.log(`      - Verbosity: ${config.verbosity}`)
      console.log(`   💰 Token Budget:`)
      console.log(`      - Total: ${budget.total}`)
      console.log(`      - Prompt: ${budget.prompt}`)
      console.log(`      - Completion: ${budget.completion}`)
      console.log(`   📊 Context allocation:`)
      console.log(`      - KG: ${budget.context.knowledgeGraph}`)
      console.log(`      - Trials: ${budget.context.clinicalTrials}`)
      console.log(`      - Safety: ${budget.context.safetyData}`)
      console.log(`      - Labels: ${budget.context.fdaLabels}`)
      console.log(`      - Literature: ${budget.context.literature}`)
      
    } catch (error) {
      console.error(`   ❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

async function testSectionGenerator() {
  console.log('\n🧪 TEST 4: Section Generator (Full Integration)')
  console.log('=' .repeat(60))
  
  const generator = new SectionGenerator()
  
  for (const testCase of TEST_CASES) {
    console.log(`\n📊 Testing: ${testCase.name}`)
    
    try {
      const startTime = Date.now()
      
      const promptPackage = await generator.generateSectionWithFullData(
        testCase.projectId,
        testCase.documentType,
        testCase.sectionId
      )
      
      const duration = Date.now() - startTime
      
      console.log(`   ✅ Duration: ${duration}ms`)
      console.log(`   📦 System prompt: ${promptPackage.systemPrompt.length} chars`)
      console.log(`   📦 User prompt: ${promptPackage.userPrompt.length} chars`)
      console.log(`   ⚙️  Config:`)
      console.log(`      - max_completion_tokens: ${promptPackage.config.max_completion_tokens}`)
      console.log(`      - reasoning_effort: ${promptPackage.config.reasoning_effort}`)
      console.log(`      - verbosity: ${promptPackage.config.verbosity}`)
      console.log(`   📊 Metadata:`)
      console.log(`      - Sources: ${promptPackage.metadata.sourcesUsed.join(', ')}`)
      console.log(`      - Token budget: ${promptPackage.metadata.tokenBudget.total}`)
      
      // Validate expected sources
      const missingSources = testCase.expectedSources.filter(
        source => !promptPackage.metadata.sourcesUsed.includes(source)
      )
      
      if (missingSources.length > 0) {
        console.log(`   ⚠️  WARNING: Missing expected sources: ${missingSources.join(', ')}`)
      }
      
      // Check if prompt is reasonable
      const totalPromptLength = promptPackage.systemPrompt.length + promptPackage.userPrompt.length
      const estimatedTokens = Math.ceil(totalPromptLength / 4)
      
      console.log(`   📏 Estimated prompt tokens: ${estimatedTokens}`)
      
      if (estimatedTokens < testCase.expectedMinTokens) {
        console.log(`   ⚠️  WARNING: Prompt seems too short (expected min ${testCase.expectedMinTokens})`)
      }
      
    } catch (error) {
      console.error(`   ❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

async function testDocumentSizeCalculations() {
  console.log('\n🧪 TEST 5: Document Size Calculations')
  console.log('=' .repeat(60))
  
  const calculator = new TokenBudgetCalculator()
  
  const documentTypes = ['IB', 'Protocol', 'CSR', 'ICF']
  
  for (const docType of documentTypes) {
    console.log(`\n📊 ${docType}:`)
    
    try {
      const size = calculator.calculateDocumentSize(docType)
      
      console.log(`   📄 Total pages: ${size.totalPages}`)
      console.log(`   🔢 Total tokens: ${size.totalTokens.toLocaleString()}`)
      console.log(`   📑 Sections: ${size.sections}`)
      console.log(`   ⏱️  Est. generation time: ${Math.ceil(size.totalTokens / 1000)} minutes`)
      
    } catch (error) {
      console.error(`   ❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

async function runAllTests() {
  console.log('\n🚀 STARTING INTEGRATION TESTS')
  console.log('=' .repeat(60))
  console.log('Testing complete data integration pipeline...\n')
  
  const startTime = Date.now()
  
  try {
    await testDataAggregator()
    await testContextBuilder()
    await testTokenBudgetCalculator()
    await testSectionGenerator()
    await testDocumentSizeCalculations()
    
    const totalDuration = Date.now() - startTime
    
    console.log('\n' + '=' .repeat(60))
    console.log('✅ ALL TESTS COMPLETED')
    console.log(`⏱️  Total duration: ${(totalDuration / 1000).toFixed(2)}s`)
    console.log('=' .repeat(60))
    
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED')
    console.error(error)
    process.exit(1)
  }
}

// Run tests
runAllTests().catch(console.error)
