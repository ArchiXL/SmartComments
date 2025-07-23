import { useTextHighlight } from "./useTextHighlight.js";
import { useSelectorHighlight } from "./useSelectorHighlight.js";
import { useSVGHighlight } from "./useSVGHighlight.js";
import { useHighlightListeners } from "./useHighlightListeners.js";
import { useHighlightManager } from "./useHighlightManager.js";

// Import shared utilities
import HighlightUtils from "../shared/HighlightUtils.js";
import {
  errorHandler,
  HighlightError,
  ERROR_TYPES,
  SEVERITY_LEVELS,
} from "../shared/HighlightErrorHandler.js";

export default {
  useTextHighlight,
  useSelectorHighlight,
  useSVGHighlight,
  useHighlightListeners,
  useHighlightManager,

  // Shared utilities
  HighlightUtils,
  errorHandler,
  HighlightError,
  ERROR_TYPES,
  SEVERITY_LEVELS,
};
