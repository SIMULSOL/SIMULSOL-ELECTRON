import * as monaco from 'monaco-editor'

// Rust language configuration for Monaco Editor
export const rustLanguageConfig: monaco.languages.LanguageConfiguration = {
  comments: {
    lineComment: '//',
    blockComment: ['/*', '*/']
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')']
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"', notIn: ['string'] },
    { open: "'", close: "'", notIn: ['string', 'comment'] }
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" }
  ],
  folding: {
    markers: {
      start: new RegExp('^\\s*//\\s*#?region\\b'),
      end: new RegExp('^\\s*//\\s*#?endregion\\b')
    }
  }
}

// Rust tokenization rules
export const rustTokenProvider: monaco.languages.IMonarchLanguage = {
  defaultToken: '',
  tokenPostfix: '.rust',

  keywords: [
    'as', 'break', 'const', 'continue', 'crate', 'else', 'enum', 'extern',
    'false', 'fn', 'for', 'if', 'impl', 'in', 'let', 'loop', 'match', 'mod',
    'move', 'mut', 'pub', 'ref', 'return', 'self', 'Self', 'static', 'struct',
    'super', 'trait', 'true', 'type', 'unsafe', 'use', 'where', 'while',
    'async', 'await', 'dyn', 'abstract', 'become', 'box', 'do', 'final',
    'macro', 'override', 'priv', 'typeof', 'unsized', 'virtual', 'yield'
  ],

  typeKeywords: [
    'bool', 'char', 'f32', 'f64', 'i8', 'i16', 'i32', 'i64', 'i128',
    'isize', 'str', 'u8', 'u16', 'u32', 'u64', 'u128', 'usize'
  ],

  // Solana/Anchor specific keywords
  solanaKeywords: [
    'declare_id', 'program', 'account', 'instruction', 'state', 'interface',
    'msg', 'require', 'error_code', 'event', 'emit', 'seeds', 'bump',
    'space', 'init', 'mut', 'signer', 'has_one', 'constraint', 'close',
    'realloc', 'zero_copy', 'associated', 'token', 'mint', 'authority'
  ],

  operators: [
    '=', '>', '<', '!', '~', '?', ':', '==', '<=', '>=', '!=',
    '&&', '||', '++', '--', '+', '-', '*', '/', '&', '|', '^', '%',
    '<<', '>>', '>>>', '+=', '-=', '*=', '/=', '&=', '|=', '^=',
    '%=', '<<=', '>>=', '>>>='
  ],

  symbols: /[=><!~?:&|+\-*\/\^%]+/,
  escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

  tokenizer: {
    root: [
      // Identifiers and keywords
      [/[a-z_$][\w$]*/, {
        cases: {
          '@typeKeywords': 'type',
          '@keywords': 'keyword',
          '@solanaKeywords': 'keyword.solana',
          '@default': 'identifier'
        }
      }],
      [/[A-Z][\w\$]*/, 'type.identifier'],

      // Whitespace
      { include: '@whitespace' },

      // Delimiters and operators
      [/[{}()\[\]]/, '@brackets'],
      [/[<>](?!@symbols)/, '@brackets'],
      [/@symbols/, {
        cases: {
          '@operators': 'operator',
          '@default': ''
        }
      }],

      // Numbers
      [/\d*\.\d+([eE][\-+]?\d+)?[fFdD]?/, 'number.float'],
      [/0[xX][0-9a-fA-F_]*[0-9a-fA-F][Ll]?/, 'number.hex'],
      [/0[0-7_]*[0-7][Ll]?/, 'number.octal'],
      [/0[bB][0-1_]*[0-1][Ll]?/, 'number.binary'],
      [/\d+[lL]?/, 'number'],

      // Delimiter: after number because of .\d floats
      [/[;,.]/, 'delimiter'],

      // Strings
      [/"([^"\\]|\\.)*$/, 'string.invalid'],
      [/"/, 'string', '@string'],
      [/'[^\\']'/, 'string'],
      [/(')(@escapes)(')/, ['string', 'string.escape', 'string']],
      [/'/, 'string.invalid'],

      // Characters
      [/'[^\\']'/, 'string'],
      [/(')(@escapes)(')/, ['string', 'string.escape', 'string']],
      [/'/, 'string.invalid'],

      // Attributes
      [/#\[.*\]/, 'annotation'],
      [/#!\[.*\]/, 'annotation'],

      // Macros
      [/\w+!/, 'keyword.macro'],

      // Lifetimes
      [/'[a-zA-Z_][a-zA-Z0-9_]*/, 'variable.lifetime']
    ],

    whitespace: [
      [/[ \t\r\n]+/, 'white'],
      [/\/\*/, 'comment', '@comment'],
      [/\/\/.*$/, 'comment']
    ],

    comment: [
      [/[^\/*]+/, 'comment'],
      [/\/\*/, 'comment', '@push'],
      ["\\*/", 'comment', '@pop'],
      [/[\/*]/, 'comment']
    ],

    string: [
      [/[^\\"]+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/"/, 'string', '@pop']
    ]
  }
}

// Function to register Rust language with Monaco Editor
export const registerRustLanguage = () => {
  // Register the language
  monaco.languages.register({ id: 'rust' })

  // Set the language configuration
  monaco.languages.setLanguageConfiguration('rust', rustLanguageConfig)

  // Set the tokenization provider
  monaco.languages.setMonarchTokensProvider('rust', rustTokenProvider)

  // Define a custom theme for Solana/Rust development
  monaco.editor.defineTheme('solana-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword.solana', foreground: '#ff6b6b', fontStyle: 'bold' },
      { token: 'keyword.macro', foreground: '#4ecdc4' },
      { token: 'variable.lifetime', foreground: '#ffe66d' },
      { token: 'annotation', foreground: '#95e1d3' },
      { token: 'type', foreground: '#4dabf7' },
      { token: 'string', foreground: '#69db7c' },
      { token: 'number', foreground: '#ffd43b' },
      { token: 'comment', foreground: '#6c757d', fontStyle: 'italic' }
    ],
    colors: {
      'editor.background': '#1a1a1a',
      'editor.foreground': '#f8f9fa',
      'editorLineNumber.foreground': '#6c757d',
      'editorLineNumber.activeForeground': '#adb5bd',
      'editor.selectionBackground': '#495057',
      'editor.inactiveSelectionBackground': '#343a40'
    }
  })
}