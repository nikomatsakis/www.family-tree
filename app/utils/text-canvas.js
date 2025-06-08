/**
 * TextCanvas - Auto-growing 2D text canvas using box-drawing characters
 *
 * Uses a segment-based approach where each cell can contain either:
 * - Text: a single character
 * - Segments: directional line segments (up/down/left/right) that combine into box-drawing characters
 */

/**
 * Cell containing text character
 */
class Text {
  constructor(text) {
    this.text = text;
  }

  toChar() {
    return this.text;
  }
}

/**
 * Cell containing line segments that form box-drawing characters
 */
class Segments {
  constructor() {
    this.up = 'none'; // 'none' | 'single' | 'double'
    this.down = 'none';
    this.left = 'none';
    this.right = 'none';
  }

  toChar() {
    // Create a key from segment states
    const key = `${this.up},${this.right},${this.down},${this.left}`;

    // Look up the appropriate box-drawing character
    return BOX_CHARS[key] || '?';
  }
}

// Mapping from segment patterns to box-drawing characters
// Format: "up,right,down,left" -> character
const BOX_CHARS = {
  // Basic lines
  'none,single,none,single': '─', // Horizontal line (middle)
  'none,single,none,none': '─', // Horizontal line (right end)
  'none,none,none,single': '─', // Horizontal line (left end)
  'none,double,none,double': '═', // Double horizontal line (middle)
  'none,double,none,none': '═', // Double horizontal line (right end)
  'none,none,none,double': '═', // Double horizontal line (left end)
  'single,none,single,none': '│', // Vertical line (middle)
  'single,none,none,none': '│', // Vertical line (bottom end)
  'none,none,single,none': '│', // Vertical line (top end)
  'double,none,double,none': '║', // Double vertical line (middle)
  'double,none,none,none': '║', // Double vertical line (bottom end)
  'none,none,double,none': '║', // Double vertical line (top end)

  // Corners
  'none,single,single,none': '┌', // Top-left corner
  'none,none,single,single': '┐', // Top-right corner
  'single,single,none,none': '└', // Bottom-left corner
  'single,none,none,single': '┘', // Bottom-right corner

  // T-junctions with single lines
  'none,single,single,single': '┬', // T-junction: horizontal with vertical down
  'single,single,none,single': '┴', // T-junction: horizontal with vertical up
  'single,single,single,none': '├', // T-junction: vertical with horizontal right
  'single,none,single,single': '┤', // T-junction: vertical with horizontal left

  // T-junctions with double vertical lines
  'none,single,double,single': '╥', // T-junction: horizontal with double vertical down
  'double,single,none,single': '╨', // T-junction: horizontal with double vertical up
  'double,single,double,none': '╟', // T-junction: double vertical with horizontal right
  'double,none,double,single': '╢', // T-junction: double vertical with horizontal left

  // Cross (all directions)
  'single,single,single,single': '┼', // Cross: all single

  // Empty cell
  'none,none,none,none': ' ',
};

export class TextCanvas {
  constructor() {
    this.rows = []; // Array of arrays: rows[y][x] = Text | Segments | undefined
  }

  /**
   * Ensure grid is large enough for position
   */
  #ensureSize(x, y) {
    while (this.rows.length <= y) {
      this.rows.push([]);
    }
    while (this.rows[y].length <= x) {
      this.rows[y].push(undefined);
    }
  }

  /**
   * Get or create Segments at position
   */
  #getOrCreateSegments(x, y) {
    this.#ensureSize(x, y);
    let cell = this.rows[y][x];

    if (!cell) {
      cell = new Segments();
      this.rows[y][x] = cell;
    } else if (cell instanceof Text) {
      throw new Error(`Cannot draw line at (${x},${y}) - text already present`);
    }

    return cell;
  }

  /**
   * Add text at position
   */
  addText(x, y, text) {
    for (let i = 0; i < text.length; i++) {
      this.#ensureSize(x + i, y);
      const existing = this.rows[y][x + i];
      if (existing) {
        throw new Error(
          `Cannot place text at (${x + i},${y}) - cell already occupied`,
        );
      }
      this.rows[y][x + i] = new Text(text[i]);
    }
  }

  /**
   * Draw horizontal line
   * @param {'single' | 'double'} style - Line style (single or double)
   */
  drawHorizontalLine(x, y, length, style = 'single') {
    for (let i = 0; i < length; i++) {
      const segments = this.#getOrCreateSegments(x + i, y);

      if (i === 0) {
        // Start of line: only right segment
        segments.right = style;
      } else if (i === length - 1) {
        // End of line: only left segment
        segments.left = style;
      } else {
        // Middle of line: both left and right segments
        segments.left = style;
        segments.right = style;
      }
    }
  }

  /**
   * Draw vertical line
   * @param {'single' | 'double'} style - Line style (single or double)
   */
  drawVerticalLine(x, y, length, style = 'single') {
    for (let i = 0; i < length; i++) {
      const segments = this.#getOrCreateSegments(x, y + i);

      if (i === 0) {
        // Start of line: only down segment
        segments.down = style;
      } else if (i === length - 1) {
        // End of line: only up segment
        segments.up = style;
      } else {
        // Middle of line: both up and down segments
        segments.up = style;
        segments.down = style;
      }
    }
  }

  /**
   * Draw rectangle border using box-drawing characters
   */
  drawBox(x, y, width, height) {
    // Top edge
    this.drawHorizontalLine(x, y, width);
    // Bottom edge
    this.drawHorizontalLine(x, y + height - 1, width);
    // Left edge
    this.drawVerticalLine(x, y, height);
    // Right edge
    this.drawVerticalLine(x + width - 1, y, height);
  }

  /**
   * Render canvas as multi-line string
   */
  render() {
    return this.rows
      .map((row) => {
        let str = '';
        for (let i = 0; i < row.length; i++) {
          const cell = row[i];
          str += cell ? cell.toChar() : ' ';
        }
        return str;
      })
      .join('\n');
  }
}
