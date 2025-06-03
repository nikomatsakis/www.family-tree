import MermaidRenderer from './mermaid-renderer';
import HtmlListRenderer from './html-list-renderer';

/**
 * Factory function to create renderer instances
 * @param {string} type - The renderer type ('mermaid' or 'html-list')
 * @param {Object} options - Options to pass to the renderer constructor
 * @returns {BaseRenderer} Renderer instance
 */
export function createRenderer(type, options = {}) {
  switch (type) {
    case 'mermaid':
      return new MermaidRenderer(options);
    case 'html-list':
      return new HtmlListRenderer(options);
    default:
      throw new Error(`Unknown renderer type: ${type}`);
  }
}

/**
 * Get available renderer types
 * @returns {Array<string>} Array of available renderer type names
 */
export function getAvailableRenderers() {
  return ['mermaid', 'html-list'];
}

/**
 * Get human-readable names for renderer types
 * @returns {Object} Map of type to display name
 */
export function getRendererDisplayNames() {
  return {
    mermaid: 'Interactive Tree View',
    'html-list': 'Debug List View',
  };
}

export { MermaidRenderer, HtmlListRenderer };
