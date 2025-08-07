// Renderer process editor types

import { Position, Range, Diagnostic } from '../../../shared/types/Common'

export interface CodeEditor {
  loadFile(filePath: string): Promise<void>
  saveFile(): Promise<void>
  getContent(): string
  setContent(content: string): void
  addLanguageSupport(language: LanguageSupport): void
  showDiagnostics(diagnostics: Diagnostic[]): void
  goToDefinition(position: Position): Promise<void>
  findReferences(position: Position): Promise<Reference[]>
  formatDocument(): Promise<void>
  getSelection(): Range | null
  setSelection(range: Range): void
}

export interface LanguageSupport {
  name: string
  extensions: string[]
  syntax: SyntaxDefinition
  completion: CompletionProvider
  hover: HoverProvider
  diagnostics: DiagnosticsProvider
}

export interface SyntaxDefinition {
  keywords: string[]
  operators: string[]
  builtins: string[]
  comments: CommentDefinition
  strings: StringDefinition
  numbers: NumberDefinition
}

export interface CommentDefinition {
  line: string
  block?: {
    start: string
    end: string
  }
}

export interface StringDefinition {
  quote: string
  escape: string
  multiline?: boolean
}

export interface NumberDefinition {
  integer: RegExp
  float: RegExp
  hex?: RegExp
  binary?: RegExp
}

export interface CompletionProvider {
  provideCompletions(position: Position, context: CompletionContext): Promise<CompletionItem[]>
}

export interface CompletionContext {
  triggerCharacter?: string
  triggerKind: 'invoked' | 'trigger-character' | 'incomplete'
}

export interface CompletionItem {
  label: string
  kind: CompletionItemKind
  detail?: string
  documentation?: string
  insertText: string
  sortText?: string
  filterText?: string
}

export type CompletionItemKind = 
  | 'text' | 'method' | 'function' | 'constructor' | 'field' | 'variable'
  | 'class' | 'interface' | 'module' | 'property' | 'unit' | 'value'
  | 'enum' | 'keyword' | 'snippet' | 'color' | 'file' | 'reference'

export interface HoverProvider {
  provideHover(position: Position): Promise<Hover | null>
}

export interface Hover {
  contents: string | MarkdownString
  range?: Range
}

export interface MarkdownString {
  value: string
  isTrusted?: boolean
}

export interface DiagnosticsProvider {
  provideDiagnostics(document: TextDocument): Promise<Diagnostic[]>
}

export interface TextDocument {
  uri: string
  languageId: string
  version: number
  getText(range?: Range): string
  positionAt(offset: number): Position
  offsetAt(position: Position): number
  lineCount: number
}

export interface Reference {
  uri: string
  range: Range
}