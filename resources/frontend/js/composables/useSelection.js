const { ref, reactive } = require('vue');
const {
    initializeRangy,
    getMediaWikiContentRoot,
    validateSelectionContent,
    formatSelectionForBackend,
    isSelectionEnabled,
    createImageHash,
} = require('../utils/selectionUtils.js');

// Selection validation enums
const SELECTION_ENUMS = {
    SELECTION_VALID: 0,
    INVALID_SELECTION_ALREADY_COMMENTED: 1,
    INVALID_SELECTION_INCLUDES_DYNAMIC_CONTENT: 2,
    INVALID_SELECTION_CONTAINS_LINEBREAKS: 3,
    INVALID_SELECTION_IS_EMPTY: 4
};

function useSelection() {
    const isSelectionActive = ref(false);
    const currentSelection = ref(null);
    const lastRange = ref(null);
    const selectionPosition = reactive({ x: 0, y: 0 });
    const startPosition = reactive({ x: 0, y: 0 });
    const isCapturing = ref(false);
    const selectionImage = ref(null); // Store the screenshot

    // Initialize rangy on first use
    let rangyInitialized = false;

    /**
     * Ensures rangy is initialized
     */
    function ensureRangyInitialized() {
        if (!rangyInitialized) {
            rangyInitialized = initializeRangy();
        }
        return rangyInitialized;
    }

    /**
     * Validates the selection content
     * @param {*} wrappedSelection - rangy selection or HTML string
     * @returns {number} - validation result enum
     */
    function validateSelection(wrappedSelection) {
        const validation = validateSelectionContent(wrappedSelection);

        // Convert to old enum format
        switch (validation.code) {
            case 0: return SELECTION_ENUMS.SELECTION_VALID;
            case 1: return SELECTION_ENUMS.INVALID_SELECTION_ALREADY_COMMENTED;
            case 2: return SELECTION_ENUMS.INVALID_SELECTION_INCLUDES_DYNAMIC_CONTENT;
            case 3: return SELECTION_ENUMS.INVALID_SELECTION_CONTAINS_LINEBREAKS;
            case 4: return SELECTION_ENUMS.INVALID_SELECTION_IS_EMPTY;
            default: return SELECTION_ENUMS.INVALID_SELECTION_IS_EMPTY;
        }
    }

    /**
     * Gets the MediaWiki content root element
     * @returns {Element} - The content root element
     */
    function getContentRoot() {
        return getMediaWikiContentRoot();
    }

    /**
     * Critical word index calculation - MUST match PHP backend expectations
     * This is the most important function - it replicates the original logic exactly
     * @param {Range} selectionRange - The text selection range
     * @returns {Promise} - Promise resolving to {text, index, type}
     */
    function getTextAndIndexAsync(selectionRange) {
        return new Promise((resolve, reject) => {
            if (!ensureRangyInitialized()) {
                reject(new Error('Rangy library not available'));
                return;
            }

            const baseEl = getContentRoot();
            const selectionPos = rangy.serializeRange(selectionRange);
            const searchFor = selectionRange.toString();
            const searchForHtml = selectionRange.toHtml();
            const range = rangy.createRange();
            const searchScopeRange = rangy.createRange();
            let i = 0;

            // Set up search scope and options for text search
            searchScopeRange.selectNodeContents(baseEl);
            const options = {
                caseSensitive: true,
                withinRange: searchScopeRange
            };

            // Method for HTML selections (when selection contains markup)
            const asyncSearchHtml = () => {
                const content = getContentRoot();
                let currentNode;
                let currentText = searchFor; // Use plain text for character matching
                const iterator = document.createNodeIterator(content, NodeFilter.SHOW_TEXT);
                let found = -1;

                while ((currentNode = iterator.nextNode())) {
                    for (let j = 0; j < currentNode.data.length; j++) {
                        if (currentNode.data[j] === currentText[0]) {
                            currentText = currentText.substring(1);
                            if (currentText.length === 0) {
                                found++;
                                if (currentNode.parentNode.contains(selectionRange.endContainer)) {
                                    resolve({
                                        text: searchForHtml,
                                        index: found,
                                        type: 'text'
                                    });
                                    return;
                                }
                                currentText = searchFor; // Reset for next potential match
                            }
                        } else {
                            currentText = searchFor; // Reset on mismatch
                        }
                    }
                }

                reject(new Error('Selection not found in content'));
            };

            // Method for plain text selections (more common case)
            const asyncSearch = () => {
                if (range.findText(searchFor, options)) {
                    if (rangy.serializeRange(range) === selectionPos) {
                        resolve({
                            text: searchFor,
                            index: i,
                            type: 'text'
                        });
                        return;
                    }
                    range.collapse(false);
                    ++i;

                    // Use requestAnimationFrame to prevent blocking
                    requestAnimationFrame(asyncSearch);
                } else {
                    // Even if we don't find exact position match, return what we have
                    resolve({
                        text: searchFor,
                        index: i,
                        type: 'text'
                    });
                }
            };

            // Determine which search method to use
            if (/<[^>]*>/.test(searchForHtml)) {
                // Selection contains HTML - use HTML search method
                asyncSearchHtml();
            } else {
                // Plain text selection - use rangy search method  
                asyncSearch();
            }
        });
    }

    /**
     * Screenshot utility function (replaces SmartComments.helperFunctions.screenshot)
     * @param {string|Element} element - Element to screenshot or "default"
     * @param {Object} options - html2canvas options
     * @param {Function} callback - Callback function with canvas data URL
     */
    function screenshot(element, options, callback) {
        // Default to MediaWiki content if "default" is passed
        const targetElement = element === "default" ?
            document.getElementById('mw-content-text') :
            (typeof element === 'string' ? document.querySelector(element) : element);

        if (!targetElement) {
            console.error('Screenshot target element not found');
            callback(null);
            return;
        }

        // Use html2canvas to take screenshot
        if (typeof html2canvas !== 'undefined') {
            html2canvas(document.body, options).then(function (canvas) {
                canvas.classList.add('sic-canvas');
                const dataURL = canvas.toDataURL("image/jpeg");
                canvas.remove();
                callback(dataURL);
            }).catch(function (error) {
                console.error('Screenshot failed:', error);
                callback(null);
            });
        } else {
            console.error('html2canvas library not available');
            callback(null);
        }
    }

    /**
     * Take a screenshot of the current selection (replaces SmartComments.Selection.screenshotSelection)
     * @param {Function} callback - Callback function with canvas base64
     */
    function screenshotSelection(callback) {
        const minMaxWidth = 500;
        const minMaxHeight = 50;
        const maxChars = 45;

        let width = selectionPosition.x - startPosition.x;
        let height = selectionPosition.y - startPosition.y;
        let scale = 100;

        // Ensure minimum/maximum dimensions
        if (width < minMaxWidth || width > minMaxWidth) {
            width = minMaxWidth;
        }

        if (height < minMaxHeight || height > minMaxHeight) {
            height = minMaxHeight;
        }

        // Calculate center position
        const x = selectionPosition.x - (selectionPosition.x - startPosition.x) / 2;
        const y = selectionPosition.y - (selectionPosition.y - startPosition.y) / 2;

        // Determine scale based on text length
        if (currentSelection.value &&
            currentSelection.value.text &&
            currentSelection.value.text.length > maxChars) {
            scale = (100 * maxChars) / currentSelection.value.text.length;
        }

        const screenshotOptions = {
            x: x - width / 2,
            y: y - height / 2,
            width: minMaxWidth,
            height: minMaxHeight,
            onclone: function (clone) {
                // Style highlighted elements in the clone
                const activeItems = clone.getElementsByClassName('sc-highlight-temp');
                for (let i = 0; i < activeItems.length; i++) {
                    activeItems[i].style.background = "#ffffe0";
                    activeItems[i].style["border-top"] = "1px solid rgba(0,0,0,0.2)";
                    activeItems[i].style["border-bottom"] = "1px solid rgba(0,0,0,0.2)";
                    if (i === 0) {
                        activeItems[i].style["border-left"] = "1px solid rgba(0,0,0,0.2)";
                    }
                    if (i === activeItems.length - 1) {
                        activeItems[i].style["border-right"] = "1px solid rgba(0,0,0,0.2)";
                    }
                }

                // Remove spinner if exists
                const spinner = clone.getElementById('sic-spinner');
                if (spinner) {
                    spinner.remove();
                }

                // Remove any temporary images
                const images = clone.querySelectorAll('image');
                images.forEach(img => img.remove());

                return clone;
            }
        };

        screenshot("default", screenshotOptions, function (canvasBase64) {
            selectionImage.value = canvasBase64;
            callback(canvasBase64);
        });
    }

    /**
     * Process text selection with screenshot
     * @param {Event} event - Mouse event
     * @returns {Promise} - Promise resolving to selection data with screenshot
     */
    async function processTextSelectionWithScreenshot(event) {
        if (isSelectionActive.value) {
            return;
        }

        isSelectionActive.value = true;

        try {
            if (!ensureRangyInitialized()) {
                throw new Error('Rangy library not available');
            }

            const selection = rangy.getSelection(getContentRoot());

            if (validateSelection(selection) !== SELECTION_ENUMS.SELECTION_VALID) {
                throw new Error('Invalid selection');
            }

            const range = selection.getRangeAt(0);

            // Ensure start and end containers are in same parent (from old code)
            if (!range.endContainer.parentNode.isSameNode(range.startContainer.parentNode) &&
                !range.endContainer.parentNode.contains(range.startContainer.parentNode)) {
                range.setEnd(range.endContainer, range.endContainer.length);
            }
            if (!range.startContainer.parentNode.contains(range.endContainer.parentNode)) {
                range.setStart(range.startContainer, 0);
            }

            lastRange.value = range;
            isCapturing.value = true;

            // First get the text and index
            const result = await getTextAndIndexAsync(range);

            // Add element information for parentId determination
            result.element = range.startContainer.parentElement || range.startContainer;

            // Store selection temporarily
            currentSelection.value = result;

            // Create temporary highlight for screenshot
            const tempHighlightClass = 'sc-highlight-temp';
            if (typeof rangy !== 'undefined' && rangy.createHighlighter) {
                const highlighter = rangy.createHighlighter();
                highlighter.addClassApplier(rangy.createClassApplier(tempHighlightClass));
                highlighter.highlightSelection(tempHighlightClass);
            }

            // Take screenshot with temporary highlight
            return new Promise((resolve, reject) => {
                screenshotSelection(function (canvasBase64) {
                    // Remove temporary highlight
                    const tempHighlights = document.querySelectorAll('.' + tempHighlightClass);
                    tempHighlights.forEach(el => {
                        const parent = el.parentNode;
                        parent.insertBefore(document.createTextNode(el.textContent), el);
                        parent.removeChild(el);
                    });

                    if (canvasBase64) {
                        result.screenshot = canvasBase64;
                        result.image = canvasBase64; // Set image to screenshot for compatibility with API
                        resolve(result);
                    } else {
                        console.warn('Screenshot failed, proceeding without image');
                        result.image = ''; // Set empty image if screenshot fails
                        resolve(result);
                    }
                });
            });

        } catch (error) {
            console.error('Text selection with screenshot error:', error);
            throw error;
        } finally {
            isSelectionActive.value = false;
            isCapturing.value = false;
        }
    }

    /**
     * Process dynamic block selection
     * @param {Element} element - The dynamic block element
     * @returns {Object} - Selection data
     */
    function processDynamicBlockSelection(element) {
        const hash = element.dataset.hash;
        if (!hash) {
            throw new Error('Dynamic block missing hash');
        }

        // Check if this dynamic block contains an image
        const img = element.querySelector('img');
        const image = img ? img.src : '';

        const result = {
            text: hash,
            index: 0, // Dynamic blocks don't use index
            type: 'dynamic-block',
            element: element,
            image: image // Add image if present
        };

        currentSelection.value = result;
        return result;
    }

    /**
     * Process dynamic block selection with screenshot
     * @param {Element} element - The dynamic block element
     * @returns {Promise} - Promise resolving to selection data with screenshot
     */
    function processDynamicBlockSelectionWithScreenshot(element) {
        return new Promise((resolve, reject) => {
            const hash = element.dataset.hash;
            if (!hash) {
                reject(new Error('Dynamic block missing hash'));
                return;
            }

            // Check if this dynamic block contains an image
            const img = element.querySelector('img');
            const image = img ? img.src : '';

            const result = {
                text: hash,
                index: 0, // Dynamic blocks don't use index
                type: 'dynamic-block',
                element: element,
                image: image // Add image if present
            };

            currentSelection.value = result;

            // Add temporary highlight class for screenshot
            element.classList.add('sc-highlight-temp');

            // Take screenshot
            screenshotSelection(function (canvasBase64) {
                // Remove temporary highlight
                element.classList.remove('sc-highlight-temp');

                if (canvasBase64) {
                    result.screenshot = canvasBase64;
                    // If no image was found in the dynamic block, use the screenshot as the image
                    if (!result.image) {
                        result.image = canvasBase64;
                    }
                }

                resolve(result);
            });
        });
    }

    /**
     * Process image selection
     * @param {Element} imgElement - The image element
     * @returns {Object} - Selection data
     */
    function processImageSelection(imgElement) {
        // Generate hash like the old code
        const src = imgElement.src;
        const width = imgElement.width;
        const height = imgElement.height;
        const hash = createImageHash(src, width, height);

        const result = {
            text: `img[${hash}]`,
            index: 0, // Images don't use index
            type: 'image',
            element: imgElement,
            image: src // Add the image source
        };

        currentSelection.value = result;
        return result;
    }

    /**
     * Process image selection with screenshot
     * @param {Element} imgElement - The image element
     * @returns {Promise} - Promise resolving to selection data with screenshot
     */
    function processImageSelectionWithScreenshot(imgElement) {
        return new Promise((resolve, reject) => {
            // Generate hash like the old code
            const src = imgElement.src;
            const width = imgElement.width;
            const height = imgElement.height;
            const hash = createImageHash(src, width, height);

            const result = {
                text: `img[${hash}]`,
                index: 0, // Images don't use index
                type: 'image',
                element: imgElement,
                image: src // Add the image source
            };

            currentSelection.value = result;

            // Add temporary highlight to the image wrapper or image itself
            const wrapper = imgElement.closest('.sc-dynamic-block') || imgElement;
            wrapper.classList.add('sc-highlight-temp');

            // Take screenshot
            screenshotSelection(function (canvasBase64) {
                // Remove temporary highlight
                wrapper.classList.remove('sc-highlight-temp');

                if (canvasBase64) {
                    result.screenshot = canvasBase64;
                }

                resolve(result);
            });
        });
    }

    /**
     * Clear current selection
     */
    function clearSelection() {
        currentSelection.value = null;
        lastRange.value = null;
        isSelectionActive.value = false;
        isCapturing.value = false;
        selectionImage.value = null;

        // Clear browser selection
        if (window.getSelection) {
            window.getSelection().removeAllRanges();
        }

    }

    /**
     * Format selection data for API request (replaces the functionality from old code)
     * @param {Object} selectionData - The selection data with screenshot
     * @returns {Object} - Formatted data for API request
     */
    function formatSelectionForAPI(selectionData) {
        if (!selectionData) {
            return null;
        }

        // Determine parentId based on selection type and element
        let parentId = '';
        if (selectionData.element) {
            // Try to get ID from element or its parent
            parentId = selectionData.element.id ||
                selectionData.element.parentElement?.id ||
                '';
        }

        const formattedData = {
            text: selectionData.text,
            index: selectionData.index || 0,
            type: selectionData.type,
            screenshot: selectionData.screenshot || selectionImage.value,
            image: selectionData.image || '', // Add image field
            parentId: parentId // Add parentId field
        };

        // Add additional fields based on selection type
        if (selectionData.type === 'dynamic-block' && selectionData.element) {
            formattedData.elementData = {
                hash: selectionData.element.dataset.hash,
                type: selectionData.element.dataset.type
            };
        } else if (selectionData.type === 'image' && selectionData.element) {
            formattedData.elementData = {
                src: selectionData.element.src,
                width: selectionData.element.width,
                height: selectionData.element.height
            };
        }

        return formattedData;
    }

    /**
     * Set up image wrappers for selection (like the old ImageSelection.bindEvents)
     */
    function setupImageSelection() {
        const contentRoot = getContentRoot();
        const images = contentRoot.querySelectorAll('img');

        images.forEach(img => {
            // Skip if already wrapped
            if (img.parentElement.classList.contains('sc-dynamic-block')) {
                return;
            }

            const hash = createImageHash(img.src, img.width, img.height);
            const wrapper = document.createElement('div');
            wrapper.className = 'sc-dynamic-block sc-image-block';
            wrapper.dataset.hash = `img[${hash}]`;
            wrapper.dataset.type = 'image';

            img.parentNode.insertBefore(wrapper, img);
            wrapper.appendChild(img);
        });
    }

    return {
        // State
        isSelectionActive,
        currentSelection,
        lastRange,
        selectionPosition,
        startPosition,
        isCapturing,
        selectionImage,

        // Methods
        validateSelection,
        processTextSelectionWithScreenshot,
        processDynamicBlockSelection,
        processDynamicBlockSelectionWithScreenshot,
        processImageSelection,
        processImageSelectionWithScreenshot,
        clearSelection,
        setupImageSelection,
        getContentRoot,
        formatSelectionForBackend,
        formatSelectionForAPI,
        screenshot,
        screenshotSelection,

        // Enums
        SELECTION_ENUMS
    };
}

module.exports = { useSelection, SELECTION_ENUMS }; 