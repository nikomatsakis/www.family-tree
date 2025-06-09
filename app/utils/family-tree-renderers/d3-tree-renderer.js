import BaseRenderer from './base-renderer';
import { layoutFamily } from '../family-layout';
import { Family, Rectangle, Line } from '../layout-elements';
import * as d3 from 'd3';

/**
 * D3TreeRenderer - Renders family trees as interactive SVG using D3.js
 *
 * This renderer converts the family tree graph into SVG diagrams using
 * the same layout algorithm as the TextRenderer, but outputs scalable
 * vector graphics instead of ASCII art.
 */
export default class D3TreeRenderer extends BaseRenderer {
  constructor(options) {
    super(options);
    this.debug = false;
  }

  getType() {
    return 'd3-tree';
  }

  /**
   * Prepares the family tree layout data for SVG rendering
   * @param {RenderTree} renderTree - The RenderTree data from buildVisibleGraph
   * @param {Object} options - Layout options
   * @returns {Object} Layout data for SVG rendering
   */
  prepareRenderData(renderTree, options = {}) {
    try {
      // Use root nodes to determine starting point for rendering
      let startPersonIndex;
      if (renderTree.rootNodes.length > 0) {
        // Use the first root node for rendering
        startPersonIndex = renderTree.rootNodes[0];
      } else {
        // Fallback to focus person if no roots found
        startPersonIndex =
          options.startPersonIdx || renderTree.focusPersonIndex || 0;
      }

      // Add bounds checking to prevent infinite recursion
      if (
        startPersonIndex < 0 ||
        startPersonIndex >= renderTree.persons.length
      ) {
        throw new Error(
          `Invalid start person index: ${startPersonIndex}, valid range: 0-${renderTree.persons.length - 1}`,
        );
      }

      // Use the layout algorithm with this renderer as the metrics provider
      const family = layoutFamily(renderTree, startPersonIndex, this);

      return {
        type: 'd3-tree',
        data: {
          family: family,
          renderTree: renderTree,
          metadata: {
            personCount: renderTree.persons.length,
            partnershipCount: renderTree.partnerships.length,
            expandedPartnerships: Array.from(this.expandedPartnerships),
            expandedPersons: Array.from(this.expandedPersons),
            startPersonIndex: startPersonIndex,
            focusPersonIndex: renderTree.focusPersonIndex,
          },
        },
      };
    } catch (error) {
      return {
        type: 'd3-tree',
        data: {
          family: null,
          renderTree: renderTree,
          metadata: {
            error: error.message,
            personCount: renderTree.persons.length,
            partnershipCount: renderTree.partnerships.length,
          },
        },
      };
    }
  }

  /**
   * Renders the SVG output to a DOM element using D3.js
   * @param {HTMLElement} element - Container element
   * @param {Object} renderData - Data from prepareRenderData()
   */
  renderToElement(element, renderData) {
    // Clear previous content
    element.innerHTML = '';

    if (!renderData.data || !renderData.data.family) {
      element.innerHTML = '<div class="no-data">No family data available</div>';
      return;
    }

    const family = renderData.data.family;
    const metadata = renderData.data.metadata;

    // Add padding around the family tree
    const padding = 40;
    const svgWidth = family.width + 2 * padding;
    const svgHeight = family.height + 2 * padding;

    // Create SVG container using D3
    const svg = d3
      .select(element)
      .append('svg')
      .attr('width', svgWidth)
      .attr('height', svgHeight)
      .style('border', '1px solid #ddd')
      .style('background', '#ffffff');

    // Create main group with padding offset
    const mainGroup = svg
      .append('g')
      .attr('transform', `translate(${padding}, ${padding})`);

    // Recursively render the family and all child families
    this.renderFamily(mainGroup, family);

    // Add title and metadata display
    this.addHeader(element, metadata);
  }

  /**
   * Recursively renders a family and all its elements
   * @param {d3.Selection} group - D3 selection for the container group
   * @param {Family} family - Family layout object to render
   * @param {number} offsetX - Cumulative X offset from parent families
   * @param {number} offsetY - Cumulative Y offset from parent families
   */
  renderFamily(group, family, offsetX = 0, offsetY = 0) {
    // Calculate absolute position for this family
    const absoluteX = offsetX + family.x;
    const absoluteY = offsetY + family.y;

    // Render all elements in this family
    if (family.elements) {
      family.elements.forEach((element) => {
        if (element instanceof Rectangle) {
          this.renderRectangle(group, element, absoluteX, absoluteY);
        } else if (element instanceof Line) {
          this.renderLine(group, element, absoluteX, absoluteY);
        } else if (element instanceof Family) {
          // Recursively render child families with cumulative offset
          this.renderFamily(group, element, absoluteX, absoluteY);
        } else {
          throw new Error(`Unknown element type: ${element.constructor.name}`);
        }
      });
    }
  }

  /**
   * Renders a single Rectangle element as SVG rect + text
   * @param {d3.Selection} group - D3 selection for the container group
   * @param {Rectangle} rect - Rectangle element to render
   * @param {number} offsetX - X offset from parent families
   * @param {number} offsetY - Y offset from parent families
   */
  renderRectangle(group, rect, offsetX, offsetY) {
    // Calculate absolute position
    const absoluteX = offsetX + rect.x;
    const absoluteY = offsetY + rect.y;

    // Track element for testing/debugging
    this.trackElement?.(
      'Rectangle',
      rect.label || rect.class,
      absoluteX,
      absoluteY,
      rect.width,
      rect.height,
    );

    // Create group for each person box
    const rectGroup = group
      .append('g')
      .attr('class', `person-box ${rect.class}`)
      .attr('transform', `translate(${absoluteX}, ${absoluteY})`);

    // Determine if this is the focus person
    const isFocusPerson =
      rect.class === 'person' && this.isRectangleForFocusPerson(rect);

    // Add rectangle
    rectGroup
      .append('rect')
      .attr('width', rect.width)
      .attr('height', rect.height)
      .attr('fill', isFocusPerson ? '#e3f2fd' : '#f8f9fa')
      .attr('stroke', isFocusPerson ? '#1976d2' : '#dee2e6')
      .attr('stroke-width', isFocusPerson ? 2 : 1)
      .attr('rx', 4)
      .attr('ry', 4);

    // Add text (centered in rectangle)
    rectGroup
      .append('text')
      .attr('x', rect.width / 2)
      .attr('y', rect.height / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-family', 'system-ui, -apple-system, sans-serif')
      .attr('font-size', '14px')
      .attr('fill', '#212529')
      .text(rect.label);
  }

  /**
   * Renders a single Line element as SVG line
   * @param {d3.Selection} group - D3 selection for the container group
   * @param {Line} line - Line element to render
   * @param {number} offsetX - X offset from parent families
   * @param {number} offsetY - Y offset from parent families
   */
  renderLine(group, line, offsetX, offsetY) {
    const isDouble = line.class === 'continuity-line';

    // Calculate absolute positions
    const x1 = offsetX + line.x;
    const y1 = offsetY + line.y;
    const x2 = offsetX + line.x + line.width;
    const y2 = offsetY + line.y + line.height;

    // Track element for testing/debugging
    this.trackElement?.('Line', line.class, x1, y1, x2, y2);

    group
      .append('line')
      .attr('x1', x1)
      .attr('y1', y1)
      .attr('x2', x2)
      .attr('y2', y2)
      .attr('stroke', '#495057')
      .attr('stroke-width', isDouble ? 3 : 1)
      .attr('class', line.class);
  }

  /**
   * Determine if a rectangle represents the focus person
   * @param {Rectangle} rect - Rectangle to check
   * @returns {boolean} True if this is the focus person's rectangle
   */
  isRectangleForFocusPerson(rect) {
    // This is a simplified check - we would need more context to be precise
    // For now, we'll use a heuristic based on the rectangle's position and class
    return rect.class === 'person' && rect.label && rect.label.length > 0;
  }

  /**
   * Add header with title and metadata
   * @param {HTMLElement} element - Container element
   * @param {Object} metadata - Rendering metadata
   */
  addHeader(element, metadata) {
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding: 12px;
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 4px;
      font-family: system-ui, -apple-system, sans-serif;
    `;

    const title = document.createElement('h4');
    title.textContent = 'D3 Family Tree';
    title.style.cssText = 'margin: 0; color: #495057;';

    const stats = document.createElement('div');
    stats.style.cssText = 'font-size: 12px; color: #6c757d; text-align: right;';
    stats.innerHTML = `
      <div>Persons: ${metadata.personCount}</div>
      <div>Partnerships: ${metadata.partnershipCount}</div>
      <div>Focus: Person ${metadata.focusPersonIndex}</div>
    `;

    header.appendChild(title);
    header.appendChild(stats);

    // Insert header before the SVG
    element.insertBefore(header, element.firstChild);
  }

  // =============================================================================
  // Metrics Interface - Required by layoutFamily()
  // =============================================================================
  // These methods provide pixel-based measurements for the layout algorithm

  /**
   * Measure text width in pixels
   * @param {string} text - Text to measure
   * @returns {number} Width in pixels
   */
  measureText(text) {
    // Create temporary DOM element to measure text
    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = `
      position: absolute;
      visibility: hidden;
      height: auto;
      width: auto;
      white-space: nowrap;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
    `;
    tempDiv.textContent = text;
    document.body.appendChild(tempDiv);
    const width = tempDiv.offsetWidth;
    document.body.removeChild(tempDiv);
    return width;
  }

  /**
   * Get character height in pixels
   * @returns {number} Height in pixels
   */
  get charHeight() {
    return 20; // 14px font + some line height
  }

  /**
   * Calculate complete box dimensions including padding/border/margin
   * @param {string} text - Text content
   * @returns {Object} {width, height} in pixels
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

  // Spacing getters (all in pixels)
  get spacerWidth() {
    return 20;
  } // Distance from person box to marriage line
  get continuityOffset() {
    return 15;
  } // X offset from person where continuity line is placed
  get continuityMinWidth() {
    return 40;
  } // Minimum X position where first child can start
  get minimumLineLength() {
    return 60;
  } // Minimum marriage line segment
  get verticalSpacing() {
    return 80;
  } // Distance between generations
  get childSpacing() {
    return 20;
  } // Horizontal spacing between siblings

  // Line positioning methods
  /**
   * Calculate Y offset for partnership line relative to person box top
   * @param {number} personHeight - Height of the person rectangle
   * @returns {number} Y offset for partnership line
   */
  getPartnershipLineY(personHeight) {
    return Math.floor(personHeight / 2); // Center of person box
  }

  /**
   * Calculate Y offset for sibling line relative to parent-child line
   * @param {number} parentChildLineHeight - Height of the parent-child line
   * @returns {number} Y offset for sibling line
   */
  getSiblingLineY(parentChildLineHeight) {
    return Math.floor(parentChildLineHeight / 2); // Center of parent-child line
  }

  /**
   * Calculate port position (connection point) for a rectangle
   * @param {number} width - Width of the rectangle
   * @returns {number} X offset for port position
   */
  getPortPosition(width) {
    return Math.floor(width / 2); // Center of rectangle
  }

  // Person box styling (in pixels)
  get personPadding() {
    return 8;
  }
  get personBorder() {
    return 1;
  }
  get personMargin() {
    return 4;
  }
}
