/**
 * Text Renderer
 * =============
 *
 * Provides text measurement, spacing information, and rendering capabilities for family tree layouts.
 * Converts Family layout structures to ASCII diagrams using TextCanvas.
 *
 * See architecture/visual_design.md for layout algorithm design principles.
 */

/**
 * Text-based renderer for family tree layouts.
 *
 * TextRenderer provides character-based measurement and ASCII rendering.
 * Real implementations (CanvasRenderer, DOMRenderer) would use actual pixel dimensions.
 */
export class TextRenderer {
  /**
   * Measure text width in layout units
   * @param {string} text - Text to measure
   * @returns {number} Width in layout units (1 unit per character for TextRenderer)
   */
  measureText(text) {
    return text.length;
  }

  /**
   * Get character height in layout units
   * @returns {number} Height in layout units (always 1 for TextRenderer)
   */
  get charHeight() {
    return 1;
  }

  /**
   * Calculate complete box dimensions including padding/border/margin
   * @param {string} text - Text content
   * @returns {Object} {width, height} in layout units
   */
  measureBox(text) {
    // Button controls get rendered as [+] or [-] (3 characters wide)
    if (text === '+' || text === '−') {
      return {
        width: 3, // [+] or [-] is 3 characters wide
        height: 1,
      };
    }

    const textWidth = this.measureText(text);
    const textHeight = this.charHeight;

    return {
      width:
        textWidth +
        2 * (this.personPadding + this.personBorder + this.personMargin),
      height:
        textHeight +
        2 * (this.personPadding + this.personBorder + this.personMargin),
    };
  }

  // Spacing getters (all relative to text size)
  get spacerWidth() {
    return 1;
  } // S: distance from person box to marriage line
  get continuityOffset() {
    return 1;
  } // X offset from person where continuity line is placed
  get continuityMinWidth() {
    return 2;
  } // Minimum X position where first child can start
  get minimumLineLength() {
    return 3;
  } // LINE_MIN: minimum marriage line segment
  get verticalSpacing() {
    return 3;
  } // distance between generations
  get childSpacing() {
    return 1;
  } // horizontal spacing between siblings

  // Line positioning methods
  /**
   * Calculate Y offset for partnership line relative to person box top
   * @param {number} personHeight - Height of the person rectangle
   * @returns {number} Y offset for partnership line
   */
  getPartnershipLineY(personHeight) {
    return Math.floor(personHeight / 2); // Center of person box (integer for text rendering)
  }

  /**
   * Calculate Y offset for sibling line relative to parent-child line
   * @param {number} parentChildLineHeight - Height of the parent-child line
   * @returns {number} Y offset for sibling line
   */
  getSiblingLineY(parentChildLineHeight) {
    return Math.floor(parentChildLineHeight / 2); // Center of parent-child line (integer for text rendering)
  }

  /**
   * Calculate port position (connection point) for a rectangle
   * @param {number} width - Width of the rectangle
   * @returns {number} X offset for port position
   */
  getPortPosition(width) {
    return Math.floor(width / 2); // Center of rectangle (integer for text rendering)
  }

  // Person box styling (internal to renderer implementation)
  get personPadding() {
    return 1;
  }
  get personBorder() {
    return 0;
  }
  get personMargin() {
    return 0;
  }

  /**
   * Calculate position for buttons on marriage lines
   * @param {number} junctionX - X coordinate of marriage line junction
   * @param {number} lineY - Y coordinate of marriage line
   * @returns {Object} {x, y} coordinates for button placement
   */
  getButtonPosition(junctionX, lineY) {
    // Text renderer requires integer coordinates for canvas compatibility
    // For 3-character buttons like [+], center them properly
    return {
      x: junctionX - 1,
      y: lineY, // Place button directly on the line for text rendering
    };
  }

  /**
   * Render a Family layout to a TextCanvas
   * @param {TextCanvas} canvas - Canvas to draw on
   * @param {Family} family - Family to render
   * @param {{x: number, y: number}} offset - Offset position
   */
  render(canvas, family, offset = { x: 0, y: 0 }) {
    // Render each element in the family
    for (const element of family.elements) {
      const x = offset.x + element.x;
      const y = offset.y + element.y;

      if (element.constructor.name === 'Rectangle') {
        this.#renderRectangle(canvas, element, x, y);
      } else if (element.constructor.name === 'Line') {
        this.#renderLine(canvas, element, x, y);
      } else if (element.constructor.name === 'Family') {
        // Recursively render child family
        this.render(canvas, element, { x, y });
      }
    }
  }

  /**
   * Render a rectangle (person box or placeholder)
   */
  #renderRectangle(canvas, rect, x, y) {
    const isButton =
      rect.class === 'expansion-placeholder' ||
      rect.class === 'collapse-button';

    if (isButton) {
      // Render buttons as [+] or [-] without box borders
      const buttonText = `[${rect.label}]`;
      canvas.addText(x, y, buttonText);
    } else {
      // Draw the box for person rectangles
      canvas.drawBox(x, y, rect.width, rect.height);

      // Add text with padding offset
      const textX = x + this.personPadding;
      const textY = y + this.personPadding;
      canvas.addText(textX, textY, rect.label);
    }
  }

  /**
   * Render a line based on its semantic class
   */
  #renderLine(canvas, line, x, y) {
    const style = line.class === 'continuity-line' ? 'double' : 'single';

    if (line.width > 0 && line.height === 0) {
      // Horizontal line
      canvas.drawHorizontalLine(x, y, line.width, style);
    } else if (line.width === 0 && line.height > 0) {
      // Vertical line
      canvas.drawVerticalLine(x, y, line.height, style);
    }
  }
}
