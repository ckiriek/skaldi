import { DocumentOrchestrator } from '../lib/services/document-orchestrator'

async function testOrchestrator() {
  console.log('🧪 Testing DocumentOrchestrator directly...\n')
  
  const orchestrator = new DocumentOrchestrator()
  
  const result = await orchestrator.generateDocument({
    projectId: '3d1c2098-2f60-40ff-addf-5b8073430f59',
    documentType: 'IB',
    userId: 'test-user-id'
  })
  
  console.log('\n📊 Result:')
  console.log('   Success:', result.success)
  console.log('   Sections:', Object.keys(result.sections).length)
  console.log('   Errors:', result.errors?.length || 0)
  
  if (result.errors && result.errors.length > 0) {
    console.log('\n❌ Errors:')
    result.errors.forEach(err => {
      console.log(`   - ${err.section}: ${err.error}`)
    })
  }
  
  if (result.success) {
    console.log('\n✅ Generation successful!')
    console.log('   Document ID:', result.documentId)
  }
}

testOrchestrator().catch(err => {
  console.error('\n❌ Test failed:', err)
  console.error('   Stack:', err.stack)
})
