// Main process test management types

import { TestResult, TestConfig } from '../../shared/types/Test'

export interface TestManager {
  runTests(config: TestConfig): Promise<TestResult>
  debugTest(testName: string, config: TestConfig): Promise<DebugSession>
  getTestHistory(projectPath: string): Promise<TestHistoryEntry[]>
  watchTests(projectPath: string): TestWatcher
}

export interface DebugSession {
  id: string
  attach(): Promise<void>
  detach(): Promise<void>
  setBreakpoint(file: string, line: number): Promise<void>
  removeBreakpoint(file: string, line: number): Promise<void>
  continue(): Promise<void>
  stepOver(): Promise<void>
  stepInto(): Promise<void>
  stepOut(): Promise<void>
  getVariables(): Promise<DebugVariable[]>
}

export interface DebugVariable {
  name: string
  value: string
  type: string
  scope: 'local' | 'global' | 'parameter'
}

export interface TestWatcher {
  on(event: 'test-start' | 'test-complete' | 'test-error', callback: (data: any) => void): void
  stop(): void
}

export interface TestHistoryEntry {
  timestamp: Date
  result: TestResult
  config: TestConfig
}