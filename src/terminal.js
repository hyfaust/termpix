/**
 * Terminal - Terminal output control utilities
 * 
 * Provides ANSI escape sequence generation for terminal control.
 */

class Terminal {
  /**
   * Generate ANSI escape sequence for 24-bit foreground color
   * @param {number} r - Red (0-255)
   * @param {number} g - Green (0-255)
   * @param {number} b - Blue (0-255)
   * @returns {string} ANSI escape sequence
   */
  static foregroundColor(r, g, b) {
    return `\x1b[38;2;${r};${g};${b}m`;
  }

  /**
   * Generate ANSI escape sequence for 24-bit background color
   * @param {number} r - Red (0-255)
   * @param {number} g - Green (0-255)
   * @param {number} b - Blue (0-255)
   * @returns {string} ANSI escape sequence
   */
  static backgroundColor(r, g, b) {
    return `\x1b[48;2;${r};${g};${b}m`;
  }

  /**
   * Generate ANSI escape sequence for 256-color foreground
   * @param {number} index - Color index (0-255)
   * @returns {string} ANSI escape sequence
   */
  static foregroundColor256(index) {
    return `\x1b[38;5;${index}m`;
  }

  /**
   * Generate ANSI escape sequence for 256-color background
   * @param {number} index - Color index (0-255)
   * @returns {string} ANSI escape sequence
   */
  static backgroundColor256(index) {
    return `\x1b[48;5;${index}m`;
  }

  /**
   * Reset all terminal attributes
   * @returns {string} ANSI escape sequence
   */
  static reset() {
    return '\x1b[0m';
  }

  /**
   * Move cursor up
   * @param {number} lines - Number of lines
   * @returns {string} ANSI escape sequence
   */
  static cursorUp(lines) {
    if (lines <= 0) return '';
    return `\x1b[${lines}A`;
  }

  /**
   * Move cursor down
   * @param {number} lines - Number of lines
   * @returns {string} ANSI escape sequence
   */
  static cursorDown(lines) {
    if (lines <= 0) return '';
    return `\x1b[${lines}B`;
  }

  /**
   * Move cursor forward (right)
   * @param {number} cols - Number of columns
   * @returns {string} ANSI escape sequence
   */
  static cursorForward(cols) {
    if (cols <= 0) return '';
    return `\x1b[${cols}C`;
  }

  /**
   * Move cursor backward (left)
   * @param {number} cols - Number of columns
   * @returns {string} ANSI escape sequence
   */
  static cursorBackward(cols) {
    if (cols <= 0) return '';
    return `\x1b[${cols}D`;
  }

  /**
   * Move cursor to position
   * @param {number} row - Row (1-based)
   * @param {number} col - Column (1-based)
   * @returns {string} ANSI escape sequence
   */
  static cursorPosition(row, col) {
    return `\x1b[${row};${col}H`;
  }

  /**
   * Clear entire line
   * @returns {string} ANSI escape sequence
   */
  static clearLine() {
    return '\x1b[2K';
  }

  /**
   * Clear screen
   * @returns {string} ANSI escape sequence
   */
  static clearScreen() {
    return '\x1b[2J';
  }

  /**
   * Hide cursor
   * @returns {string} ANSI escape sequence
   */
  static hideCursor() {
    return '\x1b[?25l';
  }

  /**
   * Show cursor
   * @returns {string} ANSI escape sequence
   */
  static showCursor() {
    return '\x1b[?25h';
  }

  /**
   * Write string to stdout
   * @param {string} str - String to write
   */
  static write(str) {
    process.stdout.write(str);
  }

  /**
   * Write line to stdout
   * @param {string} str - String to write
   */
  static writeLine(str) {
    process.stdout.write(str + '\n');
  }

  /**
   * Get terminal size
   * @returns {Object} {cols, rows}
   */
  static getSize() {
    return {
      cols: process.stdout.columns || 80,
      rows: process.stdout.rows || 24
    };
  }

  /**
   * Generate iTerm2 inline image escape sequence
   * @param {Buffer} pngData - PNG image data
   * @param {number} width - Image width in pixels
   * @param {number} height - Image height in pixels
   * @returns {string} Escape sequence
   */
  static iTerm2Image(pngData, width, height) {
    const base64 = pngData.toString('base64');
    return `\x1b]1337;File=size=${pngData.length};width=${width}px;height=${height}px;inline=1:${base64}\x07`;
  }
}

module.exports = { Terminal };
