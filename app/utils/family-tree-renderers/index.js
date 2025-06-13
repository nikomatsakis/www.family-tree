import DebugRenderer from './debug-renderer';
import TextRenderer from './text-renderer';
import D3TreeRenderer from './d3-tree-renderer';

/**
 * Default renderer type used throughout the application
 */
export const DEFAULT_RENDERER_TYPE = 'd3-tree';

/**
 * Factory function to create renderer instances
 * @param {string} type - The renderer type ('debug', 'text', or 'd3-tree')
 * @param {Object} options - Options to pass to the renderer constructor
 * @returns {BaseRenderer} Renderer instance
 */
export function createRenderer(type, options = {}) {
  switch (type) {
    case 'debug':
      return new DebugRenderer(options);
    case 'text':
      return new TextRenderer(options);
    case 'd3-tree':
      return new D3TreeRenderer(options);
    default:
      throw new Error(`Unknown renderer type: ${type}`);
  }
}

/**
 * Get available renderer types
 * @returns {Array<string>} Array of available renderer type names
 */
export function getAvailableRenderers() {
  return ['d3-tree', 'text', 'debug'];
}

/**
 * Get human-readable names for renderer types
 * @returns {Object} Map of type to display name
 */
export function getRendererDisplayNames() {
  return {
    'd3-tree': 'D3 Tree',
    text: 'ASCII Text',
    debug: 'Debug',
  };
}

export { DebugRenderer, TextRenderer, D3TreeRenderer };
