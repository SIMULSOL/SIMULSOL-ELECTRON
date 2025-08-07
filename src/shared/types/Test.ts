// Testing related types

export interface TestConfig {
  projectPath: string
  testFiles?: string[]
  filter?: string
  verbose?: boolean
  coverage?: boolean
  parallel?: boolean
}

export interface TestResult {
  success: boolean
  tests: TestCase[]
  coverage?: CoverageReport
  duration: number
  summary: TestSummary
}

export interface TestCase {
  name: string
  file: string
  status: 'passed' | 'failed' | 'skipped'
  duration: number
  error?: string
  output?: string
}

export interface TestSummary {
  total: number
  passed: number
  failed: number
  skipped: number
  duration: number
}

export interface CoverageReport {
  lines: CoverageData
  functions: CoverageData
  branches: CoverageData
  statements: CoverageData
  files: FileCoverage[]
}

export interface CoverageData {
  total: number
  covered: number
  percentage: number
}

export interface FileCoverage {
  path: string
  lines: CoverageData
  functions: CoverageData
  branches: CoverageData
  statements: CoverageData
}

export interface TestOptions {
  filter?: string
  verbose: boolean
  coverage: boolean
  parallel: boolean
  timeout?: number
}