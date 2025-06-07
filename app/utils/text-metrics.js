/**
 * Text Metrics Interface
 * ======================
 *
 * Provides text measurement and spacing information for layout algorithms.
 * Enables both testing (with TextMetrics) and real rendering (with Canvas/DOM measurement).
 *
 * See architecture/visual_design.md for layout algorithm design principles.
 */

/**
 * Text measurement interface for layout calculations.
 *
 * TextMetrics provides simple character-based measurement for testing and text rendering.
 * Real implementations (CanvasMetrics, DOMMetrics) would measure actual pixel dimensions.
 */
export class TextMetrics {
  /**
   * Measure text width in layout units
   * @param {string} text - Text to measure
   * @returns {number} Width in layout units (1 unit per character for TextMetrics)
   */
  measureText(text) {
    return text.length;
  }

  /**
   * Get character height in layout units
   * @returns {number} Height in layout units (always 1 for TextMetrics)
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
    return personHeight / 2; // Center of person box
  }

  /**
   * Calculate Y offset for sibling line relative to parent-child line
   * @param {number} parentChildLineHeight - Height of the parent-child line
   * @returns {number} Y offset for sibling line
   */
  getSiblingLineY(parentChildLineHeight) {
    return parentChildLineHeight / 2; // Center of parent-child line
  }

  /**
   * Calculate port position (connection point) for a rectangle
   * @param {number} width - Width of the rectangle
   * @returns {number} X offset for port position
   */
  getPortPosition(width) {
    return width / 2; // Center of rectangle
  }

  // Person box styling (internal to metrics implementation)
  get personPadding() {
    return 1;
  }
  get personBorder() {
    return 0;
  }
  get personMargin() {
    return 0;
  }
}
