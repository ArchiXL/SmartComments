/**
 * SVG Selection Strategy
 * Handles SVG-based selections with enhanced metadata extraction and validation
 */
import BaseSelectionStrategy from './BaseSelectionStrategy.js';
import {
    validateSelectionContent,
    createSVGHash,
    sanitizeIdString
} from '../composables/selection/shared/SelectionUtils.js';
import { SELECTION_ENUMS, getMediaWikiContentRoot } from '../utils/constants.js';
import { SELECTION_PATTERNS } from '../composables/selection/shared/SelectionConstants.js';

class SVGSelectionStrategy extends BaseSelectionStrategy {
    constructor() {
        super('svg');
    }

    /**
     * Validate SVG selection target
     * @param {Element} target - SVG element or child
     * @returns {boolean} - Whether target is valid SVG link
     */
    validateTarget(target) {
        if (!target || target.nodeType !== Node.ELEMENT_NODE) {
            return false;
        }

        // Find the SVG link element
        const svgLink = this.findSVGLink(target);
        return svgLink !== null;
    }

    /**
     * Process SVG selection
     * @param {Element} target - SVG element or child
     * @param {Event} event - Mouse event
     * @param {Object} options - Processing options
     * @returns {Promise<Object|null>} - Selection result
     */
    async processSelection(target, event, options = {}) {
        if (!await this.preProcess(target, event, options)) {
            return null;
        }

        try {
            // Find the closest SVG link
            const svgLink = this.findSVGLink(target);
            if (!svgLink) {
                throw new Error('SVG element is not within a clickable link');
            }

            // Generate unique ID and extract metadata
            const uniqueId = this.generateSVGUniqueId(svgLink);

            if (!uniqueId) {
                console.warn('SVGSelectionStrategy: uniqueId is undefined/null for svgLink:', svgLink);
                console.warn('SVGSelectionStrategy: svgLink attributes:', {
                    href: svgLink.getAttribute('href'),
                    xlinkHref: svgLink.getAttribute('xlink:href'),
                    innerHTML: svgLink.innerHTML,
                    outerHTML: svgLink.outerHTML
                });
            }

            const textContent = this.extractSVGTextContent(svgLink);
            const href = svgLink.getAttribute('xlink:href') || svgLink.getAttribute('href');
            const metadata = this.extractSVGMetadata(svgLink);

            // Validate content (allow linebreaks for SVG content)
            const validationContent = textContent || href || uniqueId;
            const validationResult = validateSelectionContent(validationContent);

            if (validationResult !== SELECTION_ENUMS.SELECTION_VALID &&
                validationResult !== SELECTION_ENUMS.INVALID_SELECTION_CONTAINS_LINEBREAKS) {

                if (!this.errorHandler.handleValidationError(validationResult, this.selectionType)) {
                    return null;
                }
            }

            // Create selection data
            const selectionData = this.createSVGSelectionData(
                uniqueId,
                textContent,
                href,
                metadata,
                svgLink
            );

            return await this.postProcess(selectionData, svgLink, event, options);

        } catch (error) {
            this.errorHandler.handleSelectionError(this.selectionType, error, {
                target,
                event,
                options
            });
            return null;
        }
    }

    /**
     * Create SVG selection data structure
     * @param {string} uniqueId - Unique SVG identifier
     * @param {string} textContent - Extracted text content
     * @param {string} href - Link href attribute
     * @param {Object} metadata - SVG metadata
     * @param {Element} svgLink - SVG link element
     * @returns {Object} - SVG selection data
     */
    createSVGSelectionData(uniqueId, textContent, href, metadata, svgLink) {
        const svgHash = createSVGHash(uniqueId, href, textContent);
        const selectionText = `${SELECTION_PATTERNS.SVG_POSITION_PREFIX}${uniqueId}]`.trim();

        // Create descriptive text for display
        const displayText = textContent ||
            (href ? `SVG Link: ${this.extractPathFromHref(href)}` : uniqueId);

        const baseData = this.createBaseSelectionData(selectionText, svgLink, -1);

        return {
            ...baseData,
            svgId: uniqueId,
            svgHash: svgHash,
            href: href,
            position: selectionText,
            textContent: displayText,
            metadata: this.enhanceMetadata(metadata, svgLink)
        };
    }

    /**
     * Generate a unique ID for SVG selection based on available data
     * @param {Element} svgLink - The SVG anchor element
     * @returns {string} - Unique identifier
     */
    generateSVGUniqueId(svgLink) {
        // Priority order for unique ID generation:
        // 1. href attribute (cleaned)
        // 2. Combination of text content and position
        // 3. Fallback hash based on element structure

        const href = svgLink.getAttribute('xlink:href') || svgLink.getAttribute('href');

        if (href) {
            const hrefId = this.generateIdFromHref(href);
            return hrefId;
        }

        const textContent = this.extractSVGTextContent(svgLink);

        if (textContent) {
            const textId = this.generateIdFromTextAndPosition(svgLink, textContent);
            return textId;
        }

        const fallbackId = this.generateFallbackId(svgLink);
        return fallbackId;
    }

    /**
     * Generate ID from href attribute
     * @param {string} href - Href attribute value
     * @returns {string} - Generated ID
     */
    generateIdFromHref(href) {
        try {
            const url = new URL(href);
            const pathSegments = url.pathname.split('/').filter(Boolean);
            const lastSegment = pathSegments[pathSegments.length - 1];

            if (lastSegment && lastSegment !== 'index.php') {
                const result = `svg-href-${sanitizeIdString(lastSegment)}`;
                return result;
            }
        } catch (e) {
            // Invalid URL, use as is but sanitized
            const result = `svg-href-${sanitizeIdString(href)}`;
            return result;
        }

        const result = `svg-href-${sanitizeIdString(href)}`;
        return result;
    }

    /**
     * Generate ID from text content and position
     * @param {Element} svgLink - SVG link element
     * @param {string} textContent - Text content
     * @returns {string} - Generated ID
     */
    generateIdFromTextAndPosition(svgLink, textContent) {
        const rect = svgLink.getBoundingClientRect();
        const positionHash = `${Math.round(rect.left)}-${Math.round(rect.top)}`;
        const cleanText = sanitizeIdString(textContent.toLowerCase());
        const result = `svg-text-${cleanText}-${positionHash}`;

        return result;
    }

    /**
     * Generate fallback ID based on element structure
     * @param {Element} svgLink - SVG link element
     * @returns {string} - Generated fallback ID
     */
    generateFallbackId(svgLink) {
        const elementInfo = {
            tagName: svgLink.tagName,
            position: svgLink.getBoundingClientRect(),
            childCount: svgLink.children.length,
            timestamp: Date.now()
        };

        const fallbackHash = btoa(JSON.stringify(elementInfo))
            .replace(/[^a-zA-Z0-9]/g, '')
            .substring(0, 16);

        const result = `svg-fallback-${fallbackHash}`;

        return result;
    }

    /**
     * Extract path from href for display
     * @param {string} href - Href attribute
     * @returns {string} - Extracted path
     */
    extractPathFromHref(href) {
        try {
            const url = new URL(href);
            return url.pathname.split('/').pop() || href;
        } catch (e) {
            return href;
        }
    }

    /**
     * Extract text content from SVG link
     * @param {Element} svgLink - The SVG anchor element
     * @returns {string} - Extracted text content
     */
    extractSVGTextContent(svgLink) {
        const textParts = [];

        // Look for title element first (most descriptive)
        const titleElement = svgLink.querySelector('title');
        if (titleElement && titleElement.textContent.trim()) {
            textParts.push(titleElement.textContent.trim());
        }

        // Look for text and tspan elements
        const textElements = svgLink.querySelectorAll('text, tspan');
        textElements.forEach(textElement => {
            const text = textElement.textContent.trim();
            if (text && !textParts.includes(text)) {
                textParts.push(text);
            }
        });

        // Look for desc element
        const descElement = svgLink.querySelector('desc');
        if (descElement && descElement.textContent.trim()) {
            const descText = descElement.textContent.trim();
            if (!textParts.includes(descText)) {
                textParts.push(descText);
            }
        }

        return textParts.join(' ');
    }

    /**
     * Extract metadata from SVG link
     * @param {Element} svgLink - The SVG anchor element
     * @returns {Object} - Extracted metadata
     */
    extractSVGMetadata(svgLink) {
        const metadata = {};

        // Extract href information
        const href = svgLink.getAttribute('xlink:href') || svgLink.getAttribute('href');
        if (href) {
            metadata.href = href;
        }

        // Extract RDF metadata if available
        const metadataElement = svgLink.querySelector('metadata rdf\\:description, metadata description');
        if (metadataElement) {
            const about = metadataElement.getAttribute('rdf:about') ||
                metadataElement.getAttribute('about');
            if (about) metadata.rdfAbout = about;
        }

        // Extract visual properties from first rect/shape
        const shape = svgLink.querySelector('rect, circle, ellipse, polygon, path');
        if (shape) {
            metadata.visual = this.extractVisualProperties(shape);
        }

        // Extract CSS classes
        const classes = svgLink.getAttribute('class');
        if (classes) {
            metadata.classes = classes.split(' ').filter(Boolean);
        }

        // Extract SVG-specific attributes
        const svgElement = svgLink.closest('svg');
        if (svgElement) {
            metadata.svg = {
                viewBox: svgElement.getAttribute('viewBox'),
                width: svgElement.getAttribute('width'),
                height: svgElement.getAttribute('height')
            };
        }

        return metadata;
    }

    /**
     * Extract visual properties from SVG shape
     * @param {Element} shape - SVG shape element
     * @returns {Object} - Visual properties
     */
    extractVisualProperties(shape) {
        const visual = {};

        // Common attributes
        ['x', 'y', 'width', 'height', 'r', 'cx', 'cy', 'fill', 'stroke', 'stroke-width'].forEach(attr => {
            const value = shape.getAttribute(attr) || shape.style[attr];
            if (value) {
                visual[attr] = value;
            }
        });

        return visual;
    }

    /**
     * Enhance metadata with additional computed information
     * @param {Object} metadata - Base metadata
     * @param {Element} svgLink - SVG link element
     * @returns {Object} - Enhanced metadata
     */
    enhanceMetadata(metadata, svgLink) {
        const enhanced = { ...metadata };

        // Add computed properties
        enhanced.computed = {
            boundingBox: svgLink.getBoundingClientRect(),
            childElementCount: svgLink.children.length,
            hasText: this.extractSVGTextContent(svgLink).length > 0,
            hasVisualElements: svgLink.querySelector('rect, circle, ellipse, polygon, path') !== null
        };

        // Add accessibility information
        enhanced.accessibility = {
            hasTitle: svgLink.querySelector('title') !== null,
            hasDesc: svgLink.querySelector('desc') !== null,
            ariaLabel: svgLink.getAttribute('aria-label'),
            role: svgLink.getAttribute('role')
        };

        return enhanced;
    }

    /**
     * Check if an element is within an SVG link
     * @param {Element} element - Element to check
     * @returns {Element|null} - The SVG link element if found, null otherwise
     */
    findSVGLink(element) {
        // Check if the element itself is an SVG link
        if (element.tagName === 'a' && element.closest('svg')) {
            return element;
        }

        // Check if the element is within an SVG link
        const svgLink = element.closest('svg a');
        return svgLink;
    }
}

export { SVGSelectionStrategy }; 