import D3TreeRenderer from './d3-tree-renderer';
import DebugRenderer from './debug-renderer';

/**
 * Factory function to create renderer instances
 * @param {string} type - The renderer type ('d3-tree' or 'debug')
 * @param {Object} options - Options to pass to the renderer constructor
 * @returns {BaseRenderer} Renderer instance
 */
export function createRenderer(type, options = {}) {
  switch (type) {
    case 'd3-tree':
      return new D3TreeRenderer(options);
    case 'debug':
      return new DebugRenderer(options);
    // Keep dtree as alias for backward compatibility
    case 'dtree':
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
  return ['d3-tree', 'debug'];
}

/**
 * Get human-readable names for renderer types
 * @returns {Object} Map of type to display name
 */
export function getRendererDisplayNames() {
  return {
    'd3-tree': 'D3 Tree',
    debug: 'Debug',
  };
}

export { D3TreeRenderer, DebugRenderer };
