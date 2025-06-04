import MermaidRenderer from './mermaid-renderer';
import HtmlListRenderer from './html-list-renderer';
import ListRenderer from './list-renderer';

/**
 * Factory function to create renderer instances
 * @param {string} type - The renderer type ('mermaid', 'list', or 'html-list')
 * @param {Object} options - Options to pass to the renderer constructor
 * @returns {BaseRenderer} Renderer instance
 */
export function createRenderer(type, options = {}) {
  switch (type) {
    case 'mermaid':
      return new MermaidRenderer(options);
    case 'list':
      return new ListRenderer(options);
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
  return ['mermaid', 'list', 'html-list'];
}

/**
 * Get human-readable names for renderer types
 * @returns {Object} Map of type to display name
 */
export function getRendererDisplayNames() {
  return {
    mermaid: 'Mermaid',
    list: 'List',
    'html-list': 'Debug',
  };
}

export { MermaidRenderer, HtmlListRenderer, ListRenderer };
