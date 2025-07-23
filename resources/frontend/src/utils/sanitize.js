/**
 * Centralized sanitization utilities for SmartComments
 * Consolidates HTML and text sanitization to prevent duplication
 */

import { SELECTION_LIMITS } from "../composables/selection/shared/SelectionConstants.js";

/**
 * Sanitize HTML content for validation (removes dangerous content)
 * @param {string} html - Raw HTML content
 * @returns {string} - Sanitized HTML
 */
export function sanitizeHTML(html) {
  if (typeof html !== "string") {
    return "";
  }

  // Remove script tags and dangerous attributes
  let sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/vbscript:/gi, "")
    .replace(/data:/gi, "")
    .trim();

  // Limit length for performance
  if (sanitized.length > SELECTION_LIMITS.MAX_HTML_LENGTH) {
    sanitized =
      sanitized.substring(0, SELECTION_LIMITS.MAX_HTML_LENGTH) + "...";
  }

  return sanitized;
}

/**
 * Sanitize text content (lighter version for plain text)
 * @param {string} text - Raw text
 * @returns {string} - Sanitized text
 */
export function sanitizeText(text) {
  if (typeof text !== "string") {
    return "";
  }

  // Basic HTML sanitization - remove script tags and dangerous attributes
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim();
}

/**
 * Sanitize a string for use as an ID
 * @param {string} str - Input string
 * @returns {string} - Sanitized string
 */
export function sanitizeIdString(str) {
  if (!str) return "";

  return str
    .replace(/[^a-z0-9-]/gi, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

// Legacy alias for backward compatibility
export const sanitizeHTMLForValidation = sanitizeHTML;

export default {
  sanitizeHTML,
  sanitizeText,
  sanitizeIdString,
  sanitizeHTMLForValidation,
};