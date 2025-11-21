/**
 * Test Runner
 * 
 * Runs all test suites and generates report
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'

const execAsync = promisify(exec)

interface TestResult {
  suite: string
  passed: number
  failed: number
  duration_ms: number
  failures: Array<{
    test: string
    error: string
  }>
}

async function runTestSuite(suite: string, command: string): Promise<TestResult> {
  console.log(`\n📋 Running ${suite}...`)
  const startTime = Date.now()

  try {
    const { stdout, stderr } = await execAsync(command)
    
    // Parse Jest output (simplified)
    const passed = (stdout.match(/✓/g) || []).length
    const failed = (stdout.match(/✗/g) || []).length

    console.log(`   ✅ ${suite}: ${passed} passed, ${failed} failed`)

    return {
      suite,
      passed,
      failed,
      duration_ms: Date.now() - startTime,
      failures: []
    }

  } catch (error: any) {
    console.log(`   ❌ ${suite}: Failed to run`)
    
    return {
      suite,
      passed: 0,
      failed: 1,
      duration_ms: Date.now() - startTime,
      failures: [{
        test: suite,
        error: error.message
      }]
    }
  }
}

async function runAllTests() {
  console.log('🧪 PHASE D: TESTING & QA')
  console.log('=' .repeat(50))

  const results: TestResult[] = []

  // E2E Tests
  results.push(await runTestSuite(
    'E2E Tests',
    'npm test -- __tests__/e2e'
  ))

  // Unit Tests
  results.push(await runTestSuite(
    'Unit Tests',
    'npm test -- __tests__/unit'
  ))

  // API Tests
  results.push(await runTestSuite(
    'API Tests',
    'npm test -- __tests__/api'
  ))

  // Generate Report
  const totalPassed = results.reduce((sum, r) => sum + r.passed, 0)
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0)
  const totalTests = totalPassed + totalFailed
  const totalDuration = results.reduce((sum, r) => sum + r.duration_ms, 0)

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total_tests: totalTests,
      passed: totalPassed,
      failed: totalFailed,
      success_rate: totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0,
      total_duration_ms: totalDuration
    },
    suites: results,
    failures: results.flatMap(r => r.failures)
  }

  // Save JSON report
  await fs.writeFile(
    'report_phase_d.json',
    JSON.stringify(report, null, 2)
  )

  // Generate Markdown report
  const markdown = generateMarkdownReport(report)
  await fs.writeFile('report_phase_d.md', markdown)

  console.log('\n' + '='.repeat(50))
  console.log('📊 TEST SUMMARY')
  console.log('='.repeat(50))
  console.log(`Total Tests: ${totalTests}`)
  console.log(`Passed: ${totalPassed} ✅`)
  console.log(`Failed: ${totalFailed} ❌`)
  console.log(`Success Rate: ${report.summary.success_rate}%`)
  console.log(`Duration: ${Math.round(totalDuration / 1000)}s`)
  console.log('\n📄 Reports saved:')
  console.log('   - report_phase_d.json')
  console.log('   - report_phase_d.md')

  if (totalFailed > 0) {
    console.log('\n⚠️  Some tests failed. See report for details.')
    process.exit(1)
  } else {
    console.log('\n🎉 All tests passed!')
    process.exit(0)
  }
}

function generateMarkdownReport(report: any): string {
  return `# Phase D: Testing & QA Report

**Date:** ${new Date(report.timestamp).toLocaleString()}  
**Status:** ${report.summary.failed === 0 ? '✅ PASSED' : '❌ FAILED'}

---

## Summary

| Metric | Value |
|--------|-------|
| **Total Tests** | ${report.summary.total_tests} |
| **Passed** | ${report.summary.passed} ✅ |
| **Failed** | ${report.summary.failed} ❌ |
| **Success Rate** | ${report.summary.success_rate}% |
| **Duration** | ${Math.round(report.summary.total_duration_ms / 1000)}s |

---

## Test Suites

${report.suites.map((suite: any) => `
### ${suite.suite}

- **Passed:** ${suite.passed}
- **Failed:** ${suite.failed}
- **Duration:** ${Math.round(suite.duration_ms / 1000)}s
`).join('\n')}

---

## Failures

${report.failures.length === 0 ? 'No failures! 🎉' : report.failures.map((f: any) => `
### ${f.test}

\`\`\`
${f.error}
\`\`\`
`).join('\n')}

---

**Generated:** ${new Date().toISOString()}
`
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
