/**
 * Image Selection Strategy
 * Handles image-based selections with enhanced validation and processing
 */
const { BaseSelectionStrategy } = require('./BaseSelectionStrategy.js');
const {
    validateSelectionContent,
    createImageHash,
    getMediaWikiContentRoot
} = require('../composables/selection/shared/SelectionUtils.js');
const { SELECTION_ENUMS } = require('../utils/constants.js');
const { SELECTION_CLASSES, SELECTION_PATTERNS } = require('../composables/selection/shared/SelectionConstants.js');

class ImageSelectionStrategy extends BaseSelectionStrategy {
    constructor() {
        super('image');
        this.setupCompleted = false;
    }

    /**
     * Validate image selection target
     * @param {Element} target - Image element
     * @returns {boolean} - Whether target is valid image
     */
    validateTarget(target) {
        if (!target || target.nodeType !== Node.ELEMENT_NODE) {
            return false;
        }

        // Check if it's an IMG element
        if (target.tagName === 'IMG') {
            return this.isValidImageElement(target);
        }

        // Check if target contains an image
        const img = target.querySelector('img');
        return img && this.isValidImageElement(img);
    }

    /**
     * Check if image element is valid for selection
     * @param {Element} imgElement - Image element to validate
     * @returns {boolean} - Whether image is valid
     */
    isValidImageElement(imgElement) {
        // Must have a source
        if (!imgElement.src) {
            return false;
        }

        // Skip images inside comment components
        if (imgElement.closest(`.${SELECTION_CLASSES.COMMENT_VIEW}`) ||
            imgElement.closest(`.${SELECTION_CLASSES.COMMENT_COMPONENT}`)) {
            return false;
        }

        // Skip images that are already wrapped in dynamic blocks (unless clicking the wrapper)
        const dynamicBlockParent = imgElement.closest(`.${SELECTION_CLASSES.DYNAMIC_BLOCK}`);
        if (dynamicBlockParent && dynamicBlockParent !== imgElement.parentElement) {
            return false;
        }

        return true;
    }

    /**
     * Process image selection
     * @param {Element} target - Image element or container
     * @param {Event} event - Mouse event
     * @param {Object} options - Processing options
     * @returns {Promise<Object|null>} - Selection result
     */
    async processSelection(target, event, options = {}) {
        if (!await this.preProcess(target, event, options)) {
            return null;
        }

        try {
            // Get the actual image element
            const imgElement = target.tagName === 'IMG' ? target : target.querySelector('img');

            if (!imgElement) {
                throw new Error('No image element found in target');
            }

            // Validate image element specifically
            if (!this.isValidImageElement(imgElement)) {
                throw new Error('Invalid image element for selection');
            }

            // Validate selection content (allows linebreaks for outerHTML)
            const validationResult = validateSelectionContent(imgElement.outerHTML);
            if (validationResult !== SELECTION_ENUMS.SELECTION_VALID &&
                validationResult !== SELECTION_ENUMS.INVALID_SELECTION_CONTAINS_LINEBREAKS) {

                if (!this.errorHandler.handleValidationError(validationResult, this.selectionType)) {
                    return null;
                }
            }

            // Create selection data
            const selectionData = this.createImageSelectionData(imgElement);

            return await this.postProcess(selectionData, imgElement, event, options);

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
     * Create image selection data structure
     * @param {Element} imgElement - Image element
     * @returns {Object} - Image selection data
     */
    createImageSelectionData(imgElement) {
        const imageHash = createImageHash(imgElement.src, imgElement.width, imgElement.height);

        // Create descriptive text for the selection
        const altText = imgElement.alt || '';
        const title = imgElement.title || '';
        const filename = this.extractFilename(imgElement.src);

        let selectionText = altText || title || `Image: ${filename}`;
        if (imageHash) {
            selectionText = altText || `Image: ${imageHash}`;
        }

        return this.createBaseSelectionData(selectionText, imgElement, -1, {
            imageHash,
            src: imgElement.src,
            width: imgElement.width,
            height: imgElement.height,
            alt: altText,
            title: title,
            filename: filename
        });
    }

    /**
     * Create base selection data with additional image metadata
     * @param {string} text - Selection text
     * @param {Element} element - Image element
     * @param {number} index - Selection index
     * @param {Object} imageData - Additional image data
     * @returns {Object} - Enhanced selection data
     */
    createBaseSelectionData(text, element, index, imageData = {}) {
        const baseData = super.createBaseSelectionData(text, element, index);

        return {
            ...baseData,
            imageHash: imageData.imageHash,
            src: imageData.src,
            metadata: {
                width: imageData.width,
                height: imageData.height,
                alt: imageData.alt,
                title: imageData.title,
                filename: imageData.filename,
                aspectRatio: imageData.width && imageData.height
                    ? (imageData.width / imageData.height).toFixed(2)
                    : null
            }
        };
    }

    /**
     * Extract filename from image source URL
     * @param {string} src - Image source URL
     * @returns {string} - Extracted filename
     */
    extractFilename(src) {
        try {
            const url = new URL(src);
            const pathname = url.pathname;
            const filename = pathname.split('/').pop();
            return filename || 'unknown';
        } catch (error) {
            return 'unknown';
        }
    }

    /**
     * Setup image wrappers for selection (like the old ImageSelection.bindEvents)
     * Creates dynamic block wrappers around images for consistent handling
     */
    setupImageSelection() {
        if (this.setupCompleted) {
            return;
        }

        try {
            const contentRoot = getMediaWikiContentRoot();
            if (!contentRoot) {
                console.error("Cannot setup image selection: content root not found.");
                return;
            }

            const images = contentRoot.querySelectorAll('img');
            let wrappedCount = 0;

            images.forEach(img => {
                if (this.shouldWrapImage(img)) {
                    this.wrapImageInDynamicBlock(img);
                    wrappedCount++;
                }
            });

            this.setupCompleted = true;

        } catch (error) {
            console.error('Error during image selection setup:', error);
        }
    }

    /**
     * Check if image should be wrapped in dynamic block
     * @param {Element} img - Image element
     * @returns {boolean} - Whether to wrap the image
     */
    shouldWrapImage(img) {
        // Skip if already wrapped
        if (img.parentElement && img.parentElement.classList.contains(SELECTION_CLASSES.DYNAMIC_BLOCK)) {
            return false;
        }

        // Skip images inside comment components
        if (img.closest(`.${SELECTION_CLASSES.COMMENT_VIEW}`) ||
            img.closest(`.${SELECTION_CLASSES.COMMENT_COMPONENT}`)) {
            return false;
        }

        // Must have a src
        if (!img.src) {
            return false;
        }

        return true;
    }

    /**
     * Wrap image in dynamic block wrapper
     * @param {Element} img - Image element to wrap
     */
    wrapImageInDynamicBlock(img) {
        try {
            const hash = createImageHash(img.src, img.width, img.height);
            const wrapper = document.createElement('div');

            wrapper.className = SELECTION_CLASSES.DYNAMIC_BLOCK + ' ' + SELECTION_CLASSES.IMAGE_BLOCK;
            wrapper.dataset.hash = `${SELECTION_PATTERNS.IMAGE_POSITION_PREFIX}${hash}]`;
            wrapper.dataset.type = 'image';

            // Add accessibility attributes
            if (img.alt) {
                wrapper.setAttribute('aria-label', `Image: ${img.alt}`);
            }

            if (img.parentNode) {
                img.parentNode.insertBefore(wrapper, img);
                wrapper.appendChild(img);
            } else {
                console.warn("Image has no parentNode, cannot wrap:", img);
            }

        } catch (error) {
            console.error('Error wrapping image:', error, img);
        }
    }

    /**
     * Prepare screenshot parameters for image selections
     * @param {Element} target - Image element
     * @param {Event} event - Mouse event
     * @param {Object} selectionData - Selection data
     * @returns {Object} - Screenshot parameters
     */
    prepareScreenshotParams(target, event, selectionData) {
        return {
            element: target,
            selectionPosition: this.screenshot.calculatePositionData(target, event).selectionPosition,
            startPosition: this.screenshot.calculatePositionData(target, event).startPosition
        };
    }

    /**
     * Reset setup state (for testing or re-initialization)
     */
    resetSetup() {
        this.setupCompleted = false;
    }

    /**
     * Get setup status
     * @returns {boolean} - Whether setup is completed
     */
    isSetupCompleted() {
        return this.setupCompleted;
    }
}

module.exports = { ImageSelectionStrategy }; 