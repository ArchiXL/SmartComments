/**
 * Refactored highlight directive using composable structure
 */
import { useHighlightManager } from "../composables/highlights/useHighlightManager.js";

/**
 * Create a highlight manager instance
 */
const {
  applyHighlights,
  clearHighlights,
  clearAllHighlights,
  removeCommentHighlight,
} = useHighlightManager();

export const highlightDirective = {
  mounted(el, binding) {
    applyHighlights(
      document.body,
      binding.value.anchors,
      binding.value.onClick,
    );
  },
  updated(el, binding) {
    clearHighlights(
      document.body,
      binding.oldValue ? binding.oldValue.anchors : [],
    );
    applyHighlights(
      document.body,
      binding.value.anchors,
      binding.value.onClick,
    );
  },
  beforeUnmount(el, binding) {
    clearHighlights(document.body, binding.value ? binding.value.anchors : []);
  },
};

export { applyHighlights, clearAllHighlights, removeCommentHighlight };
