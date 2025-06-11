/**
 * Dynamic Block Selection Strategy
 * Handles dynamic block selections with enhanced validation and processing
 */
import BaseSelectionStrategy from './BaseSelectionStrategy.js';
import { SELECTION_CLASSES, SELECTION_PATTERNS } from '../composables/selection/shared/SelectionConstants.js';

class DynamicBlockSelectionStrategy extends BaseSelectionStrategy {
    constructor() {
        super('dynamic-block');
    }

    /**
     * Validate dynamic block selection target
     * @param {Element} target - Dynamic block element
     * @returns {boolean} - Whether target is valid dynamic block
     */
    validateTarget(target) {
        if (!target || target.nodeType !== Node.ELEMENT_NODE) {
            return false;
        }

        // Check if element has dynamic block class or is within one
        return target.classList.contains(SELECTION_CLASSES.DYNAMIC_BLOCK) ||
            target.closest(`.${SELECTION_CLASSES.DYNAMIC_BLOCK}`) !== null;
    }

    /**
     * Process dynamic block selection
     * @param {Element} target - Dynamic block element
     * @param {Event} event - Mouse event
     * @param {Object} options - Processing options
     * @returns {Promise<Object|null>} - Selection result
     */
    async processSelection(target, event, options = {}) {
        if (!await this.preProcess(target, event, options)) {
            return null;
        }

        try {
            // Get the dynamic block element
            const dynamicBlock = this.getDynamicBlockElement(target);
            if (!dynamicBlock) {
                throw new Error('No dynamic block element found');
            }

            // Validate that block is not already commented
            if (this.isAlreadyCommented(dynamicBlock)) {
                throw new Error('Dynamic block already has comments');
            }

            // Create selection data
            const selectionData = this.createDynamicBlockSelectionData(dynamicBlock);

            return await this.postProcess(selectionData, dynamicBlock, event, options);

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
     * Get the dynamic block element from target
     * @param {Element} target - Target element
     * @returns {Element|null} - Dynamic block element
     */
    getDynamicBlockElement(target) {
        // Check if target itself is a dynamic block
        if (target.classList.contains(SELECTION_CLASSES.DYNAMIC_BLOCK)) {
            return target;
        }

        // Find closest dynamic block
        return target.closest(`.${SELECTION_CLASSES.DYNAMIC_BLOCK}`);
    }

    /**
     * Check if dynamic block already has comments
     * @param {Element} dynamicBlock - Dynamic block element
     * @returns {boolean} - Whether block is already commented
     */
    isAlreadyCommented(dynamicBlock) {
        // Check for highlight classes in the block's HTML
        return dynamicBlock.outerHTML.includes(SELECTION_CLASSES.PERMANENT_HIGHLIGHT);
    }

    /**
     * Create dynamic block selection data structure
     * @param {Element} dynamicBlock - Dynamic block element
     * @returns {Object} - Dynamic block selection data
     */
    createDynamicBlockSelectionData(dynamicBlock) {
        // Determine selection text based on block type
        let selectionText = this.determineSelectionText(dynamicBlock);

        // Get block metadata
        const metadata = this.extractBlockMetadata(dynamicBlock);

        return {
            ...this.createBaseSelectionData(selectionText, dynamicBlock, -1),
            blockType: this.getBlockType(dynamicBlock),
            blockHash: dynamicBlock.dataset.hash || null,
            metadata: metadata
        };
    }

    /**
     * Determine appropriate selection text for the block
     * @param {Element} dynamicBlock - Dynamic block element
     * @returns {string} - Selection text
     */
    determineSelectionText(dynamicBlock) {
        // For image blocks, use the data-hash if available
        if (dynamicBlock.classList.contains(SELECTION_CLASSES.IMAGE_BLOCK) &&
            dynamicBlock.dataset.hash) {
            return dynamicBlock.dataset.hash;
        }

        // For other blocks, use a truncated version of outerHTML
        const outerHTML = dynamicBlock.outerHTML;

        // Truncate if too long to prevent unwieldy selection text
        if (outerHTML.length > 500) {
            const truncated = outerHTML.substring(0, 500) + '...';
            return this.sanitizeHTML(truncated);
        }

        return this.sanitizeHTML(outerHTML);
    }

    /**
     * Sanitize HTML content for safe display
     * @param {string} html - HTML content
     * @returns {string} - Sanitized HTML
     */
    sanitizeHTML(html) {
        // Basic sanitization - remove script tags and dangerous attributes
        return html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .trim();
    }

    /**
     * Get block type from element
     * @param {Element} dynamicBlock - Dynamic block element
     * @returns {string} - Block type
     */
    getBlockType(dynamicBlock) {
        if (dynamicBlock.classList.contains(SELECTION_CLASSES.IMAGE_BLOCK)) {
            return 'image';
        }

        if (dynamicBlock.dataset.type) {
            return dynamicBlock.dataset.type;
        }

        // Infer type from content
        if (dynamicBlock.querySelector('img')) {
            return 'image';
        }

        if (dynamicBlock.querySelector('table')) {
            return 'table';
        }

        if (dynamicBlock.querySelector('video')) {
            return 'video';
        }

        if (dynamicBlock.querySelector('iframe')) {
            return 'iframe';
        }

        return 'generic';
    }

    /**
     * Extract metadata from dynamic block
     * @param {Element} dynamicBlock - Dynamic block element
     * @returns {Object} - Block metadata
     */
    extractBlockMetadata(dynamicBlock) {
        const metadata = {
            classes: Array.from(dynamicBlock.classList),
            datasets: { ...dynamicBlock.dataset },
            dimensions: {
                width: dynamicBlock.offsetWidth,
                height: dynamicBlock.offsetHeight
            },
            position: dynamicBlock.getBoundingClientRect(),
            childCount: dynamicBlock.children.length
        };

        // Add type-specific metadata
        const blockType = this.getBlockType(dynamicBlock);
        switch (blockType) {
            case 'image':
                metadata.image = this.extractImageMetadata(dynamicBlock);
                break;
            case 'table':
                metadata.table = this.extractTableMetadata(dynamicBlock);
                break;
            case 'video':
                metadata.video = this.extractVideoMetadata(dynamicBlock);
                break;
            case 'iframe':
                metadata.iframe = this.extractIframeMetadata(dynamicBlock);
                break;
        }

        return metadata;
    }

    /**
     * Extract image-specific metadata
     * @param {Element} dynamicBlock - Dynamic block containing image
     * @returns {Object} - Image metadata
     */
    extractImageMetadata(dynamicBlock) {
        const img = dynamicBlock.querySelector('img');
        if (!img) return {};

        return {
            src: img.src,
            alt: img.alt,
            title: img.title,
            width: img.width || img.naturalWidth,
            height: img.height || img.naturalHeight,
            aspectRatio: img.naturalWidth && img.naturalHeight
                ? (img.naturalWidth / img.naturalHeight).toFixed(2)
                : null
        };
    }

    /**
     * Extract table-specific metadata
     * @param {Element} dynamicBlock - Dynamic block containing table
     * @returns {Object} - Table metadata
     */
    extractTableMetadata(dynamicBlock) {
        const table = dynamicBlock.querySelector('table');
        if (!table) return {};

        return {
            rows: table.rows.length,
            columns: table.rows[0] ? table.rows[0].cells.length : 0,
            hasHeader: table.querySelector('thead, th') !== null,
            hasCaption: table.querySelector('caption') !== null
        };
    }

    /**
     * Extract video-specific metadata
     * @param {Element} dynamicBlock - Dynamic block containing video
     * @returns {Object} - Video metadata
     */
    extractVideoMetadata(dynamicBlock) {
        const video = dynamicBlock.querySelector('video');
        if (!video) return {};

        return {
            src: video.src || (video.querySelector('source') ? video.querySelector('source').src : ''),
            duration: video.duration,
            width: video.videoWidth || video.width,
            height: video.videoHeight || video.height,
            controls: video.controls,
            autoplay: video.autoplay,
            loop: video.loop,
            muted: video.muted
        };
    }

    /**
     * Extract iframe-specific metadata
     * @param {Element} dynamicBlock - Dynamic block containing iframe
     * @returns {Object} - Iframe metadata
     */
    extractIframeMetadata(dynamicBlock) {
        const iframe = dynamicBlock.querySelector('iframe');
        if (!iframe) return {};

        return {
            src: iframe.src,
            width: iframe.width || iframe.offsetWidth,
            height: iframe.height || iframe.offsetHeight,
            title: iframe.title,
            sandbox: iframe.sandbox.toString(),
            loading: iframe.loading
        };
    }

    /**
     * Prepare screenshot parameters for dynamic blocks
     * @param {Element} target - Dynamic block element
     * @param {Event} event - Mouse event
     * @param {Object} selectionData - Selection data
     * @returns {Object} - Screenshot parameters
     */
    prepareScreenshotParams(target, event, selectionData) {
        const positionData = this.screenshot.calculatePositionData(target, event);

        return {
            ...positionData,
            text: selectionData.text,
            element: target
        };
    }

    /**
     * Get all dynamic blocks in content
     * @returns {NodeList} - All dynamic block elements
     */
    getAllDynamicBlocks() {
        return document.querySelectorAll(`.${SELECTION_CLASSES.DYNAMIC_BLOCK}`);
    }

    /**
     * Get statistics about dynamic blocks
     * @returns {Object} - Dynamic block statistics
     */
    getBlockStatistics() {
        const blocks = this.getAllDynamicBlocks();
        const stats = {
            total: blocks.length,
            byType: {},
            commented: 0,
            uncommented: 0
        };

        blocks.forEach(block => {
            const blockType = this.getBlockType(block);
            stats.byType[blockType] = (stats.byType[blockType] || 0) + 1;

            if (this.isAlreadyCommented(block)) {
                stats.commented++;
            } else {
                stats.uncommented++;
            }
        });

        return stats;
    }
}

export { DynamicBlockSelectionStrategy }; 