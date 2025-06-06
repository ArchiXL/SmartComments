/**
 * Hover Effects Composable
 * Manages hover visual effects for selection targets
 * Restores missing hover functionality after refactoring
 */
const { SELECTION_CLASSES } = require('../../utils/constants.js');
const { isSelectionEnabled } = require('../selection/shared/SelectionUtils.js');

function useHoverEffects() {
    let isInitialized = false;
    const hoveredElements = new Set();

    /**
     * Initialize hover effects by binding event listeners
     */
    function initializeHoverEffects() {
        if (isInitialized) {
            return;
        }

        try {
            // Bind dynamic block hover effects
            bindDynamicBlockHoverEffects();

            // Bind SVG hover effects
            bindSVGHoverEffects();

            isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize hover effects:', error);
        }
    }

    /**
     * Bind hover effects for dynamic blocks
     */
    function bindDynamicBlockHoverEffects() {
        // Use event delegation for dynamic content
        document.addEventListener('mouseover', handleDynamicBlockMouseOver, true);
        document.addEventListener('mouseout', handleDynamicBlockMouseOut, true);
    }

    /**
     * Bind hover effects for SVG elements
     */
    function bindSVGHoverEffects() {
        // Use event delegation for dynamic content
        document.addEventListener('mouseover', handleSVGMouseOver, true);
        document.addEventListener('mouseout', handleSVGMouseOut, true);
    }

    /**
     * Handle dynamic block mouse over
     * @param {Event} event - Mouse over event
     */
    function handleDynamicBlockMouseOver(event) {
        if (!isSelectionEnabled()) return;

        const target = event.target;
        const dynamicBlock = target.closest(`.${SELECTION_CLASSES.DYNAMIC_BLOCK}`);

        if (!dynamicBlock) return;

        // Skip if already has a comment highlight
        if (dynamicBlock.parentElement &&
            dynamicBlock.parentElement.className.includes('smartcomment-hl-')) {
            return;
        }

        // Add hover class
        dynamicBlock.classList.add('hover');
        hoveredElements.add(dynamicBlock);
    }

    /**
     * Handle dynamic block mouse out
     * @param {Event} event - Mouse out event
     */
    function handleDynamicBlockMouseOut(event) {
        if (!isSelectionEnabled()) return;

        const target = event.target;
        const dynamicBlock = target.closest(`.${SELECTION_CLASSES.DYNAMIC_BLOCK}`);

        if (!dynamicBlock) return;

        // Remove hover class
        dynamicBlock.classList.remove('hover');
        hoveredElements.delete(dynamicBlock);
    }

    /**
     * Handle SVG element mouse over
     * @param {Event} event - Mouse over event
     */
    function handleSVGMouseOver(event) {
        if (!isSelectionEnabled()) return;

        const target = event.target;

        // Check if this is an SVG link
        let svgLink = null;
        if (target.tagName === 'a' && target.closest('svg')) {
            svgLink = target;
        } else {
            svgLink = target.closest('svg a');
        }

        if (!svgLink) return;

        // Skip if already has a comment highlight - fix: use classList.contains()
        if (svgLink.classList.contains('smartcomment-hl-') ||
            Array.from(svgLink.classList).some(cls => cls.startsWith('smartcomment-hl-'))) {
            return;
        }

        // Add hover class for SVG styling
        svgLink.classList.add('sc-svg-hover');
        hoveredElements.add(svgLink);

        // Apply visual hover effects
        applySVGHoverEffects(svgLink);
    }

    /**
     * Handle SVG element mouse out
     * @param {Event} event - Mouse out event
     */
    function handleSVGMouseOut(event) {
        if (!isSelectionEnabled()) return;

        const target = event.target;

        // Check if this is an SVG link
        let svgLink = null;
        if (target.tagName === 'a' && target.closest('svg')) {
            svgLink = target;
        } else {
            svgLink = target.closest('svg a');
        }

        if (!svgLink) return;

        // Remove hover class
        svgLink.classList.remove('sc-svg-hover');
        hoveredElements.delete(svgLink);

        // Remove visual hover effects
        removeSVGHoverEffects(svgLink);
    }

    /**
     * Apply visual hover effects to SVG elements
     * @param {Element} svgLink - SVG link element
     */
    function applySVGHoverEffects(svgLink) {
        try {
            // Store original styles for restoration
            if (!svgLink.dataset.originalStyles) {
                const originalStyles = {};

                // Store styles for shapes
                const shapes = svgLink.querySelectorAll('rect, path, circle, polygon, ellipse');
                shapes.forEach((shape, index) => {
                    originalStyles[`shape_${index}`] = {
                        fill: shape.style.fill || shape.getAttribute('fill'),
                        stroke: shape.style.stroke || shape.getAttribute('stroke'),
                        strokeWidth: shape.style.strokeWidth || shape.getAttribute('stroke-width')
                    };
                });

                svgLink.dataset.originalStyles = JSON.stringify(originalStyles);
            }

            // Apply hover styles via CSS classes (defined in SmartComments.vue)
            // The CSS will handle the visual changes
        } catch (error) {
            console.warn('Failed to apply SVG hover effects:', error);
        }
    }

    /**
     * Remove visual hover effects from SVG elements
     * @param {Element} svgLink - SVG link element
     */
    function removeSVGHoverEffects(svgLink) {
        try {
            // CSS classes handle the restoration automatically
            // Just clean up the stored data
            if (svgLink.dataset.originalStyles) {
                delete svgLink.dataset.originalStyles;
            }
        } catch (error) {
            console.warn('Failed to remove SVG hover effects:', error);
        }
    }

    /**
     * Clear all hover effects
     */
    function clearAllHoverEffects() {
        hoveredElements.forEach(element => {
            if (element.classList.contains(SELECTION_CLASSES.DYNAMIC_BLOCK)) {
                element.classList.remove('hover');
            } else if (element.closest('svg')) {
                element.classList.remove('sc-svg-hover');
                removeSVGHoverEffects(element);
            }
        });
        hoveredElements.clear();
    }

    /**
     * Destroy hover effects by removing event listeners
     */
    function destroyHoverEffects() {
        if (!isInitialized) return;

        try {
            // Remove event listeners
            document.removeEventListener('mouseover', handleDynamicBlockMouseOver, true);
            document.removeEventListener('mouseout', handleDynamicBlockMouseOut, true);
            document.removeEventListener('mouseover', handleSVGMouseOver, true);
            document.removeEventListener('mouseout', handleSVGMouseOut, true);

            // Clear any active hover effects
            clearAllHoverEffects();

            isInitialized = false;
        } catch (error) {
            console.error('Failed to destroy hover effects:', error);
        }
    }

    /**
     * Get hover statistics
     * @returns {Object} - Hover statistics
     */
    function getHoverStats() {
        return {
            isInitialized,
            activeHovers: hoveredElements.size,
            hoveredElements: Array.from(hoveredElements).map(el => ({
                tagName: el.tagName,
                classes: Array.from(el.classList),
                type: el.closest('svg') ? 'svg' : 'dynamic-block'
            }))
        };
    }

    return {
        initializeHoverEffects,
        destroyHoverEffects,
        clearAllHoverEffects,
        getHoverStats,

        // State getters
        get isInitialized() { return isInitialized; },
        get hoveredElementsCount() { return hoveredElements.size; }
    };
}

module.exports = { useHoverEffects }; 