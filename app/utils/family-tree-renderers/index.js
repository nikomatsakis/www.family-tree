import DebugRenderer from './debug-renderer';
import TextRenderer from './text-renderer';

/**
 * Factory function to create renderer instances
 * @param {string} type - The renderer type ('debug' or 'text')
 * @param {Object} options - Options to pass to the renderer constructor
 * @returns {BaseRenderer} Renderer instance
 */
export function createRenderer(type, options = {}) {
  switch (type) {
    case 'debug':
      return new DebugRenderer(options);
    case 'text':
      return new TextRenderer(options);
    default:
      throw new Error(`Unknown renderer type: ${type}`);
  }
}

/**
 * Get available renderer types
 * @returns {Array<string>} Array of available renderer type names
 */
export function getAvailableRenderers() {
  return ['text', 'debug'];
}

/**
 * Get human-readable names for renderer types
 * @returns {Object} Map of type to display name
 */
export function getRendererDisplayNames() {
  return {
    text: 'ASCII Text',
    debug: 'Debug',
  };
}

export { DebugRenderer, TextRenderer };
