// Main process build management types

import { BuildResult, BuildConfig } from '../../shared/types/Build'

export interface BuildManager {
  buildProject(config: BuildConfig): Promise<BuildResult>
  cleanProject(projectPath: string): Promise<void>
  watchProject(projectPath: string): BuildWatcher
  getBuildHistory(projectPath: string): Promise<BuildHistoryEntry[]>
}

export interface BuildWatcher {
  on(event: 'build-start' | 'build-complete' | 'build-error', callback: (data: any) => void): void
  stop(): void
}

export interface BuildHistoryEntry {
  timestamp: Date
  result: BuildResult
  config: BuildConfig
}