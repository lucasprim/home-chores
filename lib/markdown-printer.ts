/**
 * Markdown to ESC/POS converter for thermal printer
 *
 * Supports a simple subset of markdown:
 * - # Heading → Double height + bold
 * - ## Subheading → Bold
 * - **bold** → Bold text
 * - __underline__ → Underlined text
 * - *italic* or _italic_ → Italic (rendered as normal on thermal printer)
 * - - item → Bullet point (•)
 * - 1. item → Numbered list
 * - --- → Separator line
 * - Empty lines → Line breaks
 */

// ESC/POS commands
const ESC = '\x1B'
const GS = '\x1D'

const CMD = {
  BOLD_ON: `${ESC}E\x01`,
  BOLD_OFF: `${ESC}E\x00`,
  UNDERLINE_ON: `${ESC}-\x01`,
  UNDERLINE_OFF: `${ESC}-\x00`,
  DOUBLE_HEIGHT_ON: `${GS}!\x10`,
  DOUBLE_HEIGHT_OFF: `${GS}!\x00`,
  ALIGN_CENTER: `${ESC}a\x01`,
  ALIGN_LEFT: `${ESC}a\x00`,
}

const SEPARATOR_LINE = '------------------------------------------------'

interface MarkdownLine {
  type: 'h1' | 'h2' | 'bullet' | 'numbered' | 'separator' | 'text' | 'empty'
  content: string
  number?: number
}

function parseLine(line: string): MarkdownLine {
  const trimmed = line.trim()

  // Empty line
  if (trimmed === '') {
    return { type: 'empty', content: '' }
  }

  // Separator: ---
  if (/^-{3,}$/.test(trimmed)) {
    return { type: 'separator', content: '' }
  }

  // H1: # Heading
  if (trimmed.startsWith('# ')) {
    return { type: 'h1', content: trimmed.slice(2).trim() }
  }

  // H2: ## Subheading
  if (trimmed.startsWith('## ')) {
    return { type: 'h2', content: trimmed.slice(3).trim() }
  }

  // Bullet: - item
  if (/^[-*]\s+/.test(trimmed)) {
    return { type: 'bullet', content: trimmed.replace(/^[-*]\s+/, '').trim() }
  }

  // Numbered: 1. item
  const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/)
  if (numberedMatch) {
    return {
      type: 'numbered',
      content: numberedMatch[2]!.trim(),
      number: parseInt(numberedMatch[1]!, 10),
    }
  }

  // Regular text
  return { type: 'text', content: trimmed }
}

/**
 * Process inline formatting markers in a string for ESC/POS
 * Order matters: process longer patterns first to avoid conflicts
 */
function processInlineFormatting(text: string): string {
  let result = text

  // Bold: **text**
  result = result.replace(/\*\*([^*]+)\*\*/g, `${CMD.BOLD_ON}$1${CMD.BOLD_OFF}`)

  // Underline: __text__
  result = result.replace(/__([^_]+)__/g, `${CMD.UNDERLINE_ON}$1${CMD.UNDERLINE_OFF}`)

  // Italic: *text* or _text_ (thermal printers don't support italic, just remove markers)
  result = result.replace(/\*([^*]+)\*/g, '$1')
  result = result.replace(/_([^_]+)_/g, '$1')

  return result
}

/**
 * Convert markdown content to ESC/POS formatted lines
 */
export function markdownToEscPos(markdown: string): string[] {
  const lines = markdown.split('\n')
  const output: string[] = []

  for (const line of lines) {
    const parsed = parseLine(line)

    switch (parsed.type) {
      case 'h1':
        output.push(CMD.ALIGN_CENTER)
        output.push(CMD.DOUBLE_HEIGHT_ON)
        output.push(CMD.BOLD_ON)
        output.push(`${processInlineFormatting(parsed.content)}\n`)
        output.push(CMD.BOLD_OFF)
        output.push(CMD.DOUBLE_HEIGHT_OFF)
        output.push(CMD.ALIGN_LEFT)
        break

      case 'h2':
        output.push(CMD.BOLD_ON)
        output.push(`${processInlineFormatting(parsed.content)}\n`)
        output.push(CMD.BOLD_OFF)
        break

      case 'bullet':
        output.push(`  * ${processInlineFormatting(parsed.content)}\n`)
        break

      case 'numbered':
        output.push(`  ${parsed.number}. ${processInlineFormatting(parsed.content)}\n`)
        break

      case 'separator':
        output.push(`${SEPARATOR_LINE}\n`)
        break

      case 'empty':
        output.push('\n')
        break

      case 'text':
        output.push(`${processInlineFormatting(parsed.content)}\n`)
        break
    }
  }

  return output
}

/**
 * Process inline formatting for plain text preview
 * - Bold: **text** → [TEXT] (brackets + uppercase)
 * - Underline: __text__ → _text_ (single underscores)
 * - Italic: *text* or _text_ → text (just remove markers)
 */
function processInlineFormattingPreview(text: string): string {
  let result = text

  // Bold: **text** → [TEXT] (brackets + uppercase to indicate bold)
  result = result.replace(/\*\*([^*]+)\*\*/g, (_, content) => `[${content.toUpperCase()}]`)

  // Underline: __text__ → _text_ (single underscores)
  result = result.replace(/__([^_]+)__/g, '_$1_')

  // Italic: *text* or _text_ → text (remove markers)
  result = result.replace(/\*([^*]+)\*/g, '$1')
  result = result.replace(/_([^_]+)_/g, '$1')

  return result
}

/**
 * Convert markdown to plain text for preview
 */
export function markdownToPlainText(markdown: string): string {
  const lines = markdown.split('\n')
  const output: string[] = []

  for (const line of lines) {
    const parsed = parseLine(line)

    switch (parsed.type) {
      case 'h1':
        output.push(`=== ${processInlineFormattingPreview(parsed.content).toUpperCase()} ===`)
        break

      case 'h2':
        output.push(`[${processInlineFormattingPreview(parsed.content)}]`)
        break

      case 'bullet':
        output.push(`  * ${processInlineFormattingPreview(parsed.content)}`)
        break

      case 'numbered':
        output.push(`  ${parsed.number}. ${processInlineFormattingPreview(parsed.content)}`)
        break

      case 'separator':
        output.push(SEPARATOR_LINE)
        break

      case 'empty':
        output.push('')
        break

      case 'text':
        output.push(processInlineFormattingPreview(parsed.content))
        break
    }
  }

  return output.join('\n')
}
