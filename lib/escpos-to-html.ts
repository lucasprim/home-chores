/**
 * ESC/POS to HTML converter
 *
 * Converts ESC/POS formatted strings to HTML for accurate thermal paper preview.
 * This allows previews to exactly match what the printer will output.
 */

// ESC/POS command bytes
const ESC = '\x1B'
const GS = '\x1D'

interface ParserState {
  bold: boolean
  underline: boolean
  doubleHeight: boolean
  alignment: 'left' | 'center'
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function getSpanClasses(state: ParserState): string {
  const classes: string[] = []
  if (state.bold) classes.push('bold')
  if (state.underline) classes.push('underline')
  if (state.doubleHeight) classes.push('double-height')
  return classes.join(' ')
}

function openSpans(state: ParserState): string {
  const classes = getSpanClasses(state)
  return classes ? `<span class="${classes}">` : ''
}

function closeSpans(state: ParserState): string {
  const classes = getSpanClasses(state)
  return classes ? '</span>' : ''
}

/**
 * Convert ESC/POS data to HTML
 * @param escPosData - ESC/POS formatted string or array of strings
 * @returns HTML string with thermal paper styling classes
 */
export function escPosToHtml(escPosData: string | string[]): string {
  const input = Array.isArray(escPosData) ? escPosData.join('') : escPosData

  const state: ParserState = {
    bold: false,
    underline: false,
    doubleHeight: false,
    alignment: 'left',
  }

  let html = `<div class="line ${state.alignment}">`
  let currentLineContent = ''
  let i = 0

  while (i < input.length) {
    // Check for ESC commands
    if (input[i] === ESC && i + 1 < input.length) {
      const cmd = input[i + 1]

      // ESC @ - Initialize (reset) - skip
      if (cmd === '@') {
        i += 2
        continue
      }

      // ESC t n - Set charset - skip (3 bytes total)
      if (cmd === 't' && i + 2 < input.length) {
        i += 3
        continue
      }

      // ESC E n - Bold on/off
      if (cmd === 'E' && i + 2 < input.length) {
        const n = input.charCodeAt(i + 2)
        const newBold = n !== 0

        if (newBold !== state.bold) {
          // Close current spans and reopen with new state
          if (currentLineContent) {
            html += closeSpans(state)
          }
          state.bold = newBold
          if (currentLineContent) {
            html += openSpans(state)
          }
        }
        i += 3
        continue
      }

      // ESC - n - Underline on/off
      if (cmd === '-' && i + 2 < input.length) {
        const n = input.charCodeAt(i + 2)
        const newUnderline = n !== 0

        if (newUnderline !== state.underline) {
          if (currentLineContent) {
            html += closeSpans(state)
          }
          state.underline = newUnderline
          if (currentLineContent) {
            html += openSpans(state)
          }
        }
        i += 3
        continue
      }

      // ESC a n - Alignment (0=left, 1=center)
      if (cmd === 'a' && i + 2 < input.length) {
        const n = input.charCodeAt(i + 2)
        const newAlignment = n === 1 ? 'center' : 'left'

        if (newAlignment !== state.alignment) {
          // Close current line and start new one with new alignment
          if (currentLineContent) {
            html += closeSpans(state)
          }
          html += `</div><div class="line ${newAlignment}">`
          currentLineContent = ''
          state.alignment = newAlignment
        }
        i += 3
        continue
      }

      // Unknown ESC command - skip
      i += 2
      continue
    }

    // Check for GS commands
    if (input[i] === GS && i + 1 < input.length) {
      const cmd = input[i + 1]

      // GS ! n - Character size (0x00=normal, 0x10=double height)
      if (cmd === '!' && i + 2 < input.length) {
        const n = input.charCodeAt(i + 2)
        const newDoubleHeight = (n & 0x10) !== 0

        if (newDoubleHeight !== state.doubleHeight) {
          if (currentLineContent) {
            html += closeSpans(state)
          }
          state.doubleHeight = newDoubleHeight
          if (currentLineContent) {
            html += openSpans(state)
          }
        }
        i += 3
        continue
      }

      // GS V n - Cut paper (0=full cut, 1=partial cut)
      if (cmd === 'V' && i + 2 < input.length) {
        const n = input.charCodeAt(i + 2)
        // Close current line
        if (currentLineContent) {
          html += closeSpans(state)
          currentLineContent = ''
        }
        html += `</div>`

        // Add cut line indicator
        const cutType = n === 1 ? 'partial' : 'full'
        html += `<div class="cut-line ${cutType}"></div>`

        // Start new line
        html += `<div class="line ${state.alignment}">`
        i += 3
        continue
      }

      // Unknown GS command - skip
      i += 2
      continue
    }

    // Handle newline
    if (input[i] === '\n') {
      // Close spans on current line
      if (currentLineContent) {
        html += closeSpans(state)
        currentLineContent = ''
      }
      // Close line and start new one
      html += `</div><div class="line ${state.alignment}">`
      // Open spans for new line if needed (styles persist across lines)
      i++
      continue
    }

    // Handle carriage return - skip
    if (input[i] === '\r') {
      i++
      continue
    }

    // Regular character - escape and output
    const char = input[i]!

    // If this is the first character on a line with active styles, open spans
    if (!currentLineContent && getSpanClasses(state)) {
      html += openSpans(state)
    }

    html += escapeHtml(char)
    currentLineContent += char
    i++
  }

  // Close any remaining spans
  if (currentLineContent) {
    html += closeSpans(state)
  }

  // Close final line div
  html += '</div>'

  let result = `<div class="thermal-content">${html}</div>`

  // Post-process: add divider class to lines that only contain =, -, or * characters
  result = result.replace(
    /<div class="line ([^"]*)">((?:=|-|\*){10,})<\/div>/g,
    '<div class="line $1 divider">$2</div>'
  )

  return result
}

/**
 * CSS styles for thermal paper preview
 * Use this in your component or style sheet
 */
export const thermalPaperStyles = `
.thermal-paper {
  font-family: 'Courier New', Courier, monospace;
  font-size: 12px;
  line-height: 1.4;
  background: linear-gradient(#fafafa, #f5f5f0);
  padding: 20px 12px;
  border-radius: 4px;
  max-width: 380px;
  margin: 0 auto;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  overflow: hidden;
}
.thermal-paper .thermal-content .line {
  min-height: 1.4em;
  white-space: pre-wrap;
  overflow-wrap: break-word;
}
.thermal-paper .thermal-content .line:empty {
  min-height: 1.4em;
}
.thermal-paper .thermal-content .divider {
  white-space: nowrap;
  overflow: hidden;
}
.thermal-paper .thermal-content .center {
  text-align: center;
}
.thermal-paper .thermal-content .left {
  text-align: left;
}
.thermal-paper .thermal-content .bold {
  font-weight: bold;
}
.thermal-paper .thermal-content .underline {
  text-decoration: underline;
}
.thermal-paper .thermal-content .double-height {
  font-size: 1.8em;
  line-height: 1.2;
}
.thermal-paper .thermal-content .cut-line {
  border-top: 2px dashed #ccc;
  margin: 16px 0;
  position: relative;
}
.thermal-paper .thermal-content .cut-line::after {
  content: '\\2702';
  position: absolute;
  left: 50%;
  top: -10px;
  transform: translateX(-50%);
  background: #f5f5f0;
  padding: 0 8px;
  font-size: 12px;
  color: #999;
}
.thermal-paper .thermal-content .cut-line.partial::after {
  content: '\\2702 corte parcial';
}
`
