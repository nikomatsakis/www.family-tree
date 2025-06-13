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
      // 🎯 PURPOSE: Start from root nodes (oldest generation) for proper visual hierarchy
      // Layout algorithm renders top-down from ancestors to descendants
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
   * @param {Object} callbacks - Callback functions for user interactions
   */
  renderToElement(element, renderData, callbacks = {}) {
    console.log('🔄 D3TreeRenderer.renderToElement called', {
      hasCallbacks: !!callbacks,
      hasTogglePartnership: !!callbacks.togglePartnershipExpansion,
      expandedPartnerships: renderData.data?.metadata?.expandedPartnerships,
      timestamp: new Date().toISOString(),
    });

    // Clear previous content
    element.innerHTML = '';

    // Store render data for access in other methods
    this._currentRenderData = renderData;

    if (!renderData.data || !renderData.data.family) {
      element.innerHTML = '<div class="no-data">No family data available</div>';
      return;
    }

    const family = renderData.data.family;
    const metadata = renderData.data.metadata;

    // Add padding around the family tree
    const padding = 20;
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
    this.renderFamily(mainGroup, family, 0, 0, callbacks);

    // Add title and metadata display
    this.addHeader(element, metadata);
  }

  /**
   * Recursively renders a family and all its elements
   * @param {d3.Selection} group - D3 selection for the container group
   * @param {Family} family - Family layout object to render
   * @param {number} offsetX - Cumulative X offset from parent families
   * @param {number} offsetY - Cumulative Y offset from parent families
   * @param {Object} callbacks - Callback functions for user interactions
   */
  renderFamily(group, family, offsetX = 0, offsetY = 0, callbacks = {}) {
    // Calculate absolute position for this family
    const absoluteX = offsetX + family.x;
    const absoluteY = offsetY + family.y;

    // Render all elements in this family
    if (family.elements) {
      family.elements.forEach((element) => {
        if (element instanceof Rectangle) {
          this.renderRectangle(group, element, absoluteX, absoluteY, callbacks);
        } else if (element instanceof Line) {
          this.renderLine(group, element, absoluteX, absoluteY);
        } else if (element instanceof Family) {
          // Recursively render child families with cumulative offset
          this.renderFamily(group, element, absoluteX, absoluteY, callbacks);
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
   * @param {Object} callbacks - Callback functions for user interactions
   */
  renderRectangle(group, rect, offsetX, offsetY, callbacks = {}) {
    // Calculate absolute position
    const absoluteX = offsetX + rect.x;
    const absoluteY = offsetY + rect.y;

    console.log(
      'Rendering rectangle:',
      rect.label,
      'at',
      absoluteX,
      absoluteY,
      'class:',
      rect.class,
      'id:',
      rect.id,
    );

    // Track element for testing/debugging
    this.trackElement?.(
      'Rectangle',
      rect.label || rect.class,
      absoluteX,
      absoluteY,
      rect.width,
      rect.height,
    );

    // Determine element types based on layout-assigned classes
    const isFocusPerson =
      rect.class === 'primary-person' && this.isRectangleForFocusPerson(rect);
    const isExpansionPlaceholder = rect.class === 'expansion-placeholder';
    const isCollapseButton = rect.class === 'collapse-button';
    const isRepeatedPerson = rect.class === 'repeated-person';
    const isButton = isExpansionPlaceholder || isCollapseButton;

    // Render buttons as circles, others as rectangles
    if (isButton) {
      this.renderCircularButton(group, rect, absoluteX, absoluteY, callbacks);
      return;
    }

    // Create group for each person box
    const rectGroup = group
      .append('g')
      .attr('class', `person-box ${rect.class}`)
      .attr('transform', `translate(${absoluteX}, ${absoluteY})`);

    // Style based on element type and gender
    let fillColor, strokeColor, strokeWidth, textColor, textContent;

    // Debug gender data
    if (this.debug) {
      console.log(
        `Rectangle ${rect.label}: class=${rect.class}, gender=${rect.gender}`,
      );
    }

    if (isRepeatedPerson) {
      // Fade out repeated appearances - much lighter version of gender color
      const genderColors = this.getGenderColors(rect.gender, true); // faded=true
      fillColor = genderColors.fill;
      strokeColor = '#cccccc';
      strokeWidth = 1;
      textColor = '#bbbbbb'; // Very light text to make fading obvious
      textContent = rect.label;
    } else if (isFocusPerson) {
      // Focus person gets stronger accent version of their gender color
      const genderColors = this.getGenderColors(rect.gender, false, true); // focus=true
      fillColor = genderColors.fill;
      strokeColor = genderColors.stroke;
      strokeWidth = 2;
      textColor = '#212529';
      textContent = rect.label;
    } else {
      // Regular person gets subtle gender-based warm colors
      const genderColors = this.getGenderColors(rect.gender);
      fillColor = genderColors.fill;
      strokeColor = genderColors.stroke;
      strokeWidth = 1;
      textColor = '#212529';
      textContent = rect.label;
    }

    // Add rectangle (buttons are handled separately)
    const rectElement = rectGroup
      .append('rect')
      .attr('width', rect.width)
      .attr('height', rect.height)
      .attr('fill', fillColor)
      .attr('stroke', strokeColor)
      .attr('stroke-width', strokeWidth)
      .attr('rx', 4)
      .attr('ry', 4);

    // Add special effects for focus person
    if (isFocusPerson) {
      // Add drop shadow filter
      const defs =
        group
          .select(function () {
            return this.closest('svg');
          })
          .select('defs')
          .size() > 0
          ? group
            .select(function () {
              return this.closest('svg');
            })
            .select('defs')
          : group
            .select(function () {
              return this.closest('svg');
            })
            .append('defs');

      const filterId = 'focus-person-shadow';
      if (defs.select(`#${filterId}`).size() === 0) {
        const filter = defs
          .append('filter')
          .attr('id', filterId)
          .attr('x', '-50%')
          .attr('y', '-50%')
          .attr('width', '200%')
          .attr('height', '200%');

        filter
          .append('feDropShadow')
          .attr('dx', 2)
          .attr('dy', 2)
          .attr('stdDeviation', 3)
          .attr('flood-color', '#000000')
          .attr('flood-opacity', 0.15);
      }

      rectElement.style('filter', `url(#${filterId})`);

      // Increase stroke width even more
      rectElement.attr('stroke-width', 3);

      // Add a subtle glow effect by using a brighter stroke
      rectElement.attr('stroke', d3.color(strokeColor).brighter(0.5));
    }

    // Add text (centered in rectangle)
    rectGroup
      .append('text')
      .attr('x', rect.width / 2)
      .attr('y', rect.height / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-family', 'system-ui, -apple-system, sans-serif')
      .attr('font-size', '14px')
      .attr('font-weight', 'normal')
      .attr('fill', textColor)
      .text(textContent);

    // Add click navigation and hover effects for person boxes (not buttons)
    if (!isExpansionPlaceholder && !isCollapseButton) {
      rectGroup
        .style('cursor', 'pointer')
        .on('click', () => {
          // Navigate to person detail page using Ember callback
          if (callbacks.navigateToPerson) {
            // Use Ember's idiomatic navigation callback
            callbacks.navigateToPerson(rect.id);
          } else {
            // Fallback to direct navigation if no callback provided
            window.location.href = `/person/${encodeURIComponent(rect.id)}`;
          }
        })
        .on('mouseenter', function () {
          // Add hover effect - slightly darken and thicken border
          const rect = d3.select(this).select('rect');
          const currentStrokeWidth = isFocusPerson ? 3 : strokeWidth;
          rect
            .transition()
            .duration(150)
            .attr('stroke-width', currentStrokeWidth + 1);

          // Only apply brightness filter if not focus person (which has shadow filter)
          if (!isFocusPerson) {
            rect.style('filter', 'brightness(0.95)');
          }
        })
        .on('mouseleave', function () {
          // Remove hover effect
          const rect = d3.select(this).select('rect');
          const currentStrokeWidth = isFocusPerson ? 3 : strokeWidth;
          rect
            .transition()
            .duration(150)
            .attr('stroke-width', currentStrokeWidth);

          // Restore filter state
          if (isFocusPerson) {
            rect.style('filter', `url(#focus-person-shadow)`);
          } else {
            rect.style('filter', 'brightness(1)');
          }
        });
    }
  }

  /**
   * Renders a circular button for expansion/collapse controls
   * @param {d3.Selection} group - D3 selection for the container group
   * @param {Rectangle} rect - Rectangle element to render as a button
   * @param {number} absoluteX - Absolute X position
   * @param {number} absoluteY - Absolute Y position
   * @param {Object} callbacks - Callback functions for user interactions
   */
  renderCircularButton(group, rect, absoluteX, absoluteY, callbacks = {}) {
    const isExpansionPlaceholder = rect.class === 'expansion-placeholder';
    const buttonType = isExpansionPlaceholder ? 'expansion' : 'collapse';

    console.log(`🎯 Rendering circular ${buttonType} button`, {
      rectId: rect.id,
      rectLabel: rect.label,
      position: { x: absoluteX, y: absoluteY },
    });

    // Create group for the button
    const buttonGroup = group
      .append('g')
      .attr('class', `circular-button ${rect.class}`)
      .attr('transform', `translate(${absoluteX}, ${absoluteY})`);

    const radius = rect.width / 2; // Should be 12px based on our 24px button size
    const centerX = radius;
    const centerY = radius;

    // Button styling
    const fillColor = isExpansionPlaceholder ? '#f8f9fa' : '#e9ecef';
    const strokeColor = '#6c757d';
    const textColor = '#495057';
    const textContent = isExpansionPlaceholder ? '+' : '−';

    // Add circle background
    const circleElement = buttonGroup
      .append('circle')
      .attr('cx', centerX)
      .attr('cy', centerY)
      .attr('r', radius - 2) // Slightly smaller than the measurement to leave room for stroke
      .attr('fill', fillColor)
      .attr('stroke', strokeColor)
      .attr('stroke-width', 1.5);

    // Add text (centered)
    buttonGroup
      .append('text')
      .attr('x', centerX)
      .attr('y', centerY)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-family', 'system-ui, -apple-system, sans-serif')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('fill', textColor)
      .attr('pointer-events', 'none') // Prevent text from interfering with clicks
      .text(textContent);

    // Add click handlers and hover effects
    if (rect.id) {
      console.log(`🎯 Adding click handler for ${buttonType} button`, {
        rectId: rect.id,
        hasCallback: !!callbacks.togglePartnershipExpansion,
      });

      buttonGroup
        .style('cursor', 'pointer')
        .on('click', () => {
          console.log(`🖱️ ${buttonType} button clicked!`, {
            rectId: rect.id,
            hasCallback: !!callbacks.togglePartnershipExpansion,
          });

          // Toggle partnership expansion using Ember callback
          if (callbacks.togglePartnershipExpansion) {
            console.log(
              '📤 Calling togglePartnershipExpansion with ID:',
              rect.id,
            );
            callbacks.togglePartnershipExpansion(rect.id);
          } else {
            console.error(
              '❌ No togglePartnershipExpansion callback available!',
            );
          }
        })
        .on('mouseenter', function () {
          // Add hover effect - darken background and enlarge slightly
          circleElement
            .transition()
            .duration(150)
            .attr('fill', d3.color(fillColor).darker(0.1))
            .attr('stroke-width', 2)
            .attr('r', radius - 1); // Slightly larger on hover
        })
        .on('mouseleave', function () {
          // Remove hover effect
          circleElement
            .transition()
            .duration(150)
            .attr('fill', fillColor)
            .attr('stroke-width', 1.5)
            .attr('r', radius - 2);
        });
    }
  }

  /**
   * Renders a single Line element as SVG line
   * @param {d3.Selection} group - D3 selection for the container group
   * @param {Line} line - Line element to render
   * @param {number} offsetX - X offset from parent families
   * @param {number} offsetY - Y offset from parent families
   */
  renderLine(group, line, offsetX, offsetY) {
    const isContinuityLine = line.class === 'continuity-line';

    // Calculate absolute positions
    const x1 = offsetX + line.x;
    const y1 = offsetY + line.y;
    const x2 = offsetX + line.x + line.width;
    const y2 = offsetY + line.y + line.height;

    // Track element for testing/debugging
    this.trackElement?.('Line', line.class, x1, y1, x2, y2);

    const lineElement = group
      .append('line')
      .attr('x1', x1)
      .attr('y1', y1)
      .attr('x2', x2)
      .attr('y2', y2)
      .attr('stroke', isContinuityLine ? '#999999' : '#495057')
      .attr('stroke-width', isContinuityLine ? 2 : 1)
      .attr('class', line.class);

    // Make continuation lines dashed
    if (isContinuityLine) {
      lineElement.attr('stroke-dasharray', '5,3');
    }
  }

  /**
   * Determine if a rectangle represents the focus person
   * @param {Rectangle} rect - Rectangle to check
   * @returns {boolean} True if this is the focus person's rectangle
   */
  isRectangleForFocusPerson(rect) {
    // Get the focus person from the current render data
    const renderData = this._currentRenderData;
    if (!renderData || !renderData.data || !renderData.data.renderTree) {
      return false;
    }

    const renderTree = renderData.data.renderTree;
    const focusPerson = renderTree.getFocusPerson();

    // Compare the rectangle's ID with the focus person's ID
    return rect.id && focusPerson && rect.id === focusPerson.id;
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
    // Small circular buttons for + and - controls
    if (text === '+' || text === '−') {
      const buttonSize = 24; // Small circular button
      return {
        width: buttonSize,
        height: buttonSize,
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

  // Spacing getters (all in pixels)
  get spacerWidth() {
    return 12;
  } // Distance from person box to marriage line
  get continuityOffset() {
    return 10;
  } // X offset from person where continuity line is placed
  get continuityMinWidth() {
    return 30;
  } // Minimum X position where first child can start
  get minimumLineLength() {
    return 40;
  } // Minimum marriage line segment
  get verticalSpacing() {
    return 50;
  } // Distance between generations
  get childSpacing() {
    return 12;
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

  /**
   * Calculate position for buttons on marriage lines
   * @param {number} junctionX - X coordinate of marriage line junction
   * @param {number} lineY - Y coordinate of marriage line
   * @param {number} buttonWidth - Width of button
   * @param {number} buttonHeight - Height of button
   * @returns {Object} {x, y} coordinates for button placement
   */
  getButtonPosition(junctionX, lineY, buttonWidth, buttonHeight) {
    return {
      x: junctionX - buttonWidth / 2,
      y: lineY - buttonHeight / 2 + 1, // +1 for visual alignment with line center
    };
  }

  /**
   * Get gender-based colors for warm professional color scheme
   * @param {string} gender - Gender (male, female, unknown, etc.)
   * @param {boolean} faded - Whether this is a faded/repeated appearance
   * @param {boolean} focus - Whether this is the focus person (stronger accent)
   * @returns {Object} {fill, stroke} colors
   */
  getGenderColors(gender, faded = false, focus = false) {
    // Normalize gender string - handle null, "null", undefined, empty string
    const normalizedGender = (
      gender && gender !== 'null' ? gender : 'unknown'
    ).toLowerCase();

    if (faded) {
      // Very light versions for repeated appearances
      switch (normalizedGender) {
        case 'male':
        case 'm':
          return { fill: '#f8f9fb', stroke: '#e0e6ec' }; // Very light cool
        case 'female':
        case 'f':
          return { fill: '#fbf8f9', stroke: '#ece0e6' }; // Very light warm
        default:
          return { fill: '#f9f8f6', stroke: '#e6e3e0' }; // Very light neutral
      }
    }

    if (focus) {
      // Stronger accent colors for focus person
      switch (normalizedGender) {
        case 'male':
        case 'm':
          return { fill: '#e8f0f5', stroke: '#7a9bb8' }; // Cool slate accent
        case 'female':
        case 'f':
          return { fill: '#f5e8f0', stroke: '#b87a9b' }; // Rose accent
        default:
          return { fill: '#f4e4bc', stroke: '#d4a574' }; // Warm gold accent
      }
    }

    // Regular subtle gender colors
    switch (normalizedGender) {
      case 'male':
      case 'm':
        return { fill: '#f5f7fa', stroke: '#d1dae3' }; // Warm gray-blue tint
      case 'female':
      case 'f':
        return { fill: '#faf5f7', stroke: '#e3d1da' }; // Warm gray-rose tint
      default:
        return { fill: '#faf8f5', stroke: '#e3e0dc' }; // Warm neutral beige
    }
  }
}
