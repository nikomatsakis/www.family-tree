/**
 * Layout Elements
 * ===============
 *
 * Duck-typed layout elements that implement {x, y, width, height} interface.
 * Contains semantic information for rendering, not visual styling.
 *
 * See architecture/visual_design.md for T-junction layout design principles.
 */

/**
 * Rectangle element for people, buttons, and other boxes
 */
export class Rectangle {
  constructor(label, className, width, height, gender = null) {
    this.x = 0; // Position set by parent
    this.y = 0; // Position set by parent
    this.width = width; // Intrinsic size
    this.height = height; // Intrinsic size
    this.label = label; // Text content (e.g., person name, "...")
    this.class = className; // Semantic role for styling
    this.gender = gender; // Gender for color coding (male, female, unknown, etc.)
  }
}

/**
 * Line element for connections between family members
 */
export class Line {
  constructor(length, className) {
    this.x = 0; // Position set by parent
    this.y = 0; // Position set by parent
    this.class = className; // Semantic role for styling

    // Determine orientation from semantic class
    if (className === 'marriage-line' || className === 'sibling-line') {
      this.width = length;
      this.height = 0; // Horizontal line
    } else if (
      className === 'parent-child-line' ||
      className === 'continuity-line'
    ) {
      this.width = 0; // Vertical line
      this.height = length;
    } else {
      throw new Error(`Unrecognized line class: ${className}`);
    }
  }
}

/**
 * Family layout containing a person and all their marriages/children
 */
export class Family {
  constructor() {
    this.x = 0; // Position set by parent (in parent's coordinate space)
    this.y = 0; // Position set by parent (in parent's coordinate space)
    this.width = 0; // Total width of family unit (auto-expanded when elements added)
    this.height = 0; // Total height of family unit (auto-expanded when elements added)
    this.port = 0; // X coordinate where parent connects (in this family's coordinates)

    this.elements = []; // Array of Rectangle, Line, and child Family objects
  }

  /**
   * Add a layout element to this family and auto-expand bounds
   */
  addElement(element) {
    this.elements.push(element);
    this.expandBounds(element);
  }

  /**
   * Expand bounds to include the given element
   */
  expandBounds(element) {
    const rightEdge = element.x + element.width;
    const bottomEdge = element.y + element.height;

    this.width = Math.max(this.width, rightEdge);
    this.height = Math.max(this.height, bottomEdge);
  }
}
