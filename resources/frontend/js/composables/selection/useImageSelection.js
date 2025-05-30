const {
    validateSelectionContent,
    createImageHash,
    getMediaWikiContentRoot,
    isSelectionEnabled
} = require('../../utils/selectionUtils.js');
const { SELECTION_ENUMS, SMARTCOMMENTS_CLASSES } = require('../../utils/constants.js');
const useScreenshot = require('../useScreenshot.js');

function useImageSelection() {
    // Screenshot composable instance
    const { takeScreenshot } = useScreenshot();

    /**
     * Process image selection
     * @param {Element} imgElement - The image element
     * @param {Event} event - Mouse event
     * @param {Object} options - Options including captureScreenshot
     * @returns {Object} - Selection data
     */
    async function processImageSelection(imgElement, event, options = { captureScreenshot: false }) {
        if (!isSelectionEnabled()) return null;

        const validationResult = validateSelectionContent(imgElement.outerHTML);
        if (validationResult !== SELECTION_ENUMS.SELECTION_VALID && validationResult !== SELECTION_ENUMS.INVALID_SELECTION_CONTAINS_LINEBREAKS) { // Linebreaks might be ok for outerHTML
            console.warn('Invalid image selection:', validationResult);
            return null;
        }

        const imageHash = createImageHash(imgElement.src);

        const selectionData = {
            text: imgElement.alt || `Image: ${imageHash}`,
            index: -1,
            type: 'image',
            image_hash: imageHash,
            src: imgElement.src,
            element: imgElement
        };

        if (options.captureScreenshot) {
            try {
                const screenshotDataUrl = await takeScreenshot(imgElement);
                selectionData.image = screenshotDataUrl;
            } catch (error) {
                console.error('Error taking screenshot for image selection:', error);
                selectionData.image = null;
            }
        }

        return selectionData;
    }

    /**
     * Set up image wrappers for selection (like the old ImageSelection.bindEvents)
     */
    function setupImageSelection() {
        const contentRoot = getMediaWikiContentRoot();
        if (!contentRoot) {
            console.error("Cannot setup image selection: content root not found.");
            return;
        }
        const images = contentRoot.querySelectorAll('img');

        images.forEach(img => {
            // Skip if already wrapped or if it's an image inside a comment display (e.g., a comment bubble showing an image)
            if ((img.parentElement && img.parentElement.classList.contains('sc-dynamic-block')) ||
                img.closest('.smartcomment-comment-view') ||
                img.closest('.sc-comment-component')) {
                return;
            }

            // Ensure image has a src, otherwise it might not be a meaningful image to comment on
            if (!img.src) {
                return;
            }

            const hash = createImageHash(img.src, img.width, img.height); // from selectionUtils
            const wrapper = document.createElement('div');
            wrapper.className = 'sc-dynamic-block sc-image-block';
            wrapper.dataset.hash = `img[${hash}]`;
            wrapper.dataset.type = 'image';

            if (img.parentNode) {
                img.parentNode.insertBefore(wrapper, img);
                wrapper.appendChild(img);
            } else {
                console.warn("Image has no parentNode, cannot wrap:", img);
            }
        });
    }

    return {
        processImageSelection,
        setupImageSelection
    };
}

module.exports = { useImageSelection }; 