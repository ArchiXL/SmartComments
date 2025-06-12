/**
 * Screenshot Target Manager
 * Manages automatic parent class addition/removal for screenshot targeting
 */
import { SMARTCOMMENTS_CLASSES, SCREENSHOT_TARGETING } from "./constants.js";

// WeakMap to track parent elements that we've modified
const managedParents = new WeakMap();

/**
 * Check if an element should be skipped for parent targeting
 * @param {Element} element - Element to check
 * @returns {boolean} - Whether to skip this element
 */
function shouldSkipElement(element) {
	if (!element || element.nodeType !== Node.ELEMENT_NODE) {
		return true;
	}

	const tagName = element.tagName.toLowerCase();

	return (
		SCREENSHOT_TARGETING.SKIP_ELEMENTS.includes(tagName) ||
		element.closest("svg") !== null ||
		element.closest("img") !== null
	);
}

/**
 * Store original state of parent element
 * @param {Element} parent - Parent element
 */
function storeOriginalState(parent) {
	if (!managedParents.has(parent)) {
		managedParents.set(parent, {
			originalClasses: parent.className,
			hasScreenshotTarget: parent.classList.contains(
				SMARTCOMMENTS_CLASSES.SCREENSHOT_TARGET,
			),
			count: 0,
		});
	}
}

/**
 * Find the appropriate parent element for screenshot targeting
 * @param {Element} element - Element with temp highlight class
 * @returns {Element|null} - Best parent element for screenshot targeting
 */
function findScreenshotParent(element) {
	if (!element || shouldSkipElement(element)) {
		return null;
	}

	let current = element.parentElement;

	// Walk up the DOM tree to find a good parent
	while (
		current &&
		current !== document.body &&
		current !== document.documentElement
	) {
		const tagName = current.tagName.toLowerCase();

		// If we find a semantic parent, use it
		if (SCREENSHOT_TARGETING.SEMANTIC_PARENTS.includes(tagName)) {
			return current;
		}

		// If we find an element with substantial content (not just a wrapper), use it
		if (
			current.children.length > 1 ||
			(current.textContent &&
				current.textContent.trim().length >
				SCREENSHOT_TARGETING.MIN_CONTENT_LENGTH)
		) {
			return current;
		}

		current = current.parentElement;
	}

	// Fallback to immediate parent if no semantic parent found
	return element.parentElement;
}

/**
 * Add screenshot target class to parent element
 * @param {Element} element - Element with temp highlight class
 */
function addParentScreenshotTarget(element) {
	if (shouldSkipElement(element)) {
		return;
	}

	const parent = findScreenshotParent(element);
	if (
		!parent ||
		parent === document.body ||
		parent === document.documentElement
	) {
		return;
	}

	// Store original state
	storeOriginalState(parent);

	// Increment count of temp highlights in this parent
	const state = managedParents.get(parent);
	state.count++;

	// Add screenshot target class if not already present
	if (!state.hasScreenshotTarget) {
		parent.classList.add(SMARTCOMMENTS_CLASSES.SCREENSHOT_TARGET);
	}
}

/**
 * Remove screenshot target class from parent element if appropriate
 * @param {Element} element - Element that had temp highlight class
 */
function removeParentScreenshotTarget(element) {
	if (shouldSkipElement(element)) {
		return;
	}

	const parent = findScreenshotParent(element);
	if (!parent || !managedParents.has(parent)) {
		return;
	}

	const state = managedParents.get(parent);
	state.count = Math.max(0, state.count - 1);

	// Only remove if count reaches 0 and we added it originally
	if (state.count === 0 && !state.hasScreenshotTarget) {
		parent.classList.remove(SMARTCOMMENTS_CLASSES.SCREENSHOT_TARGET);
		managedParents.delete(parent);
	}
}

/**
 * Add screenshot target class to SVG element directly
 * @param {Element} svgElement - SVG element with hover class
 */
function addSVGScreenshotTarget(svgElement) {
	if (!svgElement || shouldSkipElement(svgElement)) {
		return;
	}

	// For SVG elements, we want to target the SVG element itself, not its parent
	const svgRoot = svgElement.closest("svg") || svgElement;

	if (
		!svgRoot ||
		svgRoot === document.body ||
		svgRoot === document.documentElement
	) {
		return;
	}

	// Store original state
	storeOriginalState(svgRoot);

	// Increment count of temp highlights in this SVG
	const state = managedParents.get(svgRoot);
	state.count++;

	// Add screenshot target class if not already present
	if (!state.hasScreenshotTarget) {
		svgRoot.classList.add(SMARTCOMMENTS_CLASSES.SCREENSHOT_TARGET);
	}
}

/**
 * Remove screenshot target class from SVG element
 * @param {Element} svgElement - SVG element that had hover class
 */
function removeSVGScreenshotTarget(svgElement) {
	if (!svgElement || shouldSkipElement(svgElement)) {
		return;
	}

	const svgRoot = svgElement.closest("svg") || svgElement;
	if (!svgRoot || !managedParents.has(svgRoot)) {
		return;
	}

	const state = managedParents.get(svgRoot);
	state.count = Math.max(0, state.count - 1);

	// Only remove if count reaches 0 and we added it originally
	if (state.count === 0 && !state.hasScreenshotTarget) {
		svgRoot.classList.remove(SMARTCOMMENTS_CLASSES.SCREENSHOT_TARGET);
		managedParents.delete(svgRoot);
	}
}

/**
 * Handle element mutation (addition or removal of temp highlight class)
 * @param {Element} element - The element being mutated
 * @param {string} className - The class being added/removed
 * @param {boolean} isAdding - Whether the class is being added (true) or removed (false)
 */
function handleTempHighlightChange(element, className, isAdding) {
	if (SCREENSHOT_TARGETING.TEMP_HIGHLIGHT_CLASSES.includes(className)) {
		if (isAdding) {
			addParentScreenshotTarget(element);
		} else {
			removeParentScreenshotTarget(element);
		}
	} else if (className === SMARTCOMMENTS_CLASSES.SVG_HOVER) {
		if (isAdding) {
			addSVGScreenshotTarget(element);
		} else {
			removeSVGScreenshotTarget(element);
		}
	}
}

/**
 * Get element class names as an array, handling SVG elements properly
 * @param {Element} element - Element to get classes from
 * @returns {string[]} - Array of class names
 */
function getElementClasses(element) {
	if (!element) return [];

	// Handle SVG elements where className is an SVGAnimatedString
	if (
		element.className &&
		typeof element.className === "object" &&
		element.className.baseVal
	) {
		return element.className.baseVal.split(" ").filter((cls) => cls.length > 0);
	}

	// Handle regular DOM elements
	if (typeof element.className === "string") {
		return element.className.split(" ").filter((cls) => cls.length > 0);
	}

	// Fallback using classList
	return Array.from(element.classList || []);
}

/**
 * Create a MutationObserver to watch for temp highlight class changes
 * @returns {MutationObserver} - Configured observer
 */
function createScreenshotTargetObserver() {
	return new MutationObserver((mutations) => {
		mutations.forEach((mutation) => {
			if (
				mutation.type === "attributes" &&
				mutation.attributeName === "class"
			) {
				const element = mutation.target;
				const oldClasses = mutation.oldValue
					? mutation.oldValue.split(" ").filter((cls) => cls.length > 0)
					: [];
				const newClasses = getElementClasses(element);

				// Check temp highlight classes
				SCREENSHOT_TARGETING.TEMP_HIGHLIGHT_CLASSES.forEach((tempClass) => {
					const hadClass = oldClasses.includes(tempClass);
					const hasClass = newClasses.includes(tempClass);

					if (!hadClass && hasClass) {
						// Class was added
						handleTempHighlightChange(element, tempClass, true);
					} else if (hadClass && !hasClass) {
						// Class was removed
						handleTempHighlightChange(element, tempClass, false);
					}
				});

				// Check SVG hover class
				const hadSVGHover = oldClasses.includes(
					SMARTCOMMENTS_CLASSES.SVG_HOVER,
				);
				const hasSVGHover = newClasses.includes(
					SMARTCOMMENTS_CLASSES.SVG_HOVER,
				);

				if (!hadSVGHover && hasSVGHover) {
					// SVG hover class was added
					handleTempHighlightChange(
						element,
						SMARTCOMMENTS_CLASSES.SVG_HOVER,
						true,
					);
				} else if (hadSVGHover && !hasSVGHover) {
					// SVG hover class was removed
					handleTempHighlightChange(
						element,
						SMARTCOMMENTS_CLASSES.SVG_HOVER,
						false,
					);
				}
			}
		});
	});
}

/**
 * Initialize the screenshot target management system
 * @param {Element} rootElement - Root element to observe (defaults to document body)
 */
function initializeScreenshotTargetManager(rootElement = document.body) {
	const observer = createScreenshotTargetObserver();

	observer.observe(rootElement, {
		attributes: true,
		attributeOldValue: true,
		attributeFilter: ["class"],
		subtree: true,
	});

	return observer;
}

/**
 * Manually add screenshot target to parent (for direct DOM manipulation)
 * @param {Element} element - Element with temp highlight
 */
function manuallyAddParentTarget(element) {
	handleTempHighlightChange(
		element,
		SCREENSHOT_TARGETING.TEMP_HIGHLIGHT_CLASSES[1],
		true,
	);
}

/**
 * Manually remove screenshot target from parent (for direct DOM manipulation)
 * @param {Element} element - Element that had temp highlight
 */
function manuallyRemoveParentTarget(element) {
	handleTempHighlightChange(
		element,
		SCREENSHOT_TARGETING.TEMP_HIGHLIGHT_CLASSES[1],
		false,
	);
}

/**
 * Manually add screenshot target to SVG element (for direct DOM manipulation)
 * @param {Element} svgElement - SVG element with hover
 */
function manuallySVGAddTarget(svgElement) {
	handleTempHighlightChange(svgElement, SMARTCOMMENTS_CLASSES.SVG_HOVER, true);
}

/**
 * Manually remove screenshot target from SVG element (for direct DOM manipulation)
 * @param {Element} svgElement - SVG element that had hover
 */
function manuallySVGRemoveTarget(svgElement) {
	handleTempHighlightChange(svgElement, SMARTCOMMENTS_CLASSES.SVG_HOVER, false);
}

/**
 * Cleanup all managed parents (useful for reset)
 */
function cleanupAllManagedParents() {
	// Get all parents from WeakMap by iterating through elements with temp highlight classes
	SCREENSHOT_TARGETING.TEMP_HIGHLIGHT_CLASSES.forEach((className) => {
		const elements = document.querySelectorAll(`.${className}`);
		elements.forEach((element) => {
			removeParentScreenshotTarget(element);
		});
	});
}

/**
 * Find the current screenshot target element
 * @returns {Element|null} - The current screenshot target element or null
 */
function findCurrentScreenshotTarget() {
	return document.querySelector(`.${SMARTCOMMENTS_CLASSES.SCREENSHOT_TARGET}`);
}

/**
 * Get all current screenshot target elements
 * @returns {NodeList} - All elements with screenshot target class
 */
function findAllScreenshotTargets() {
	return document.querySelectorAll(
		`.${SMARTCOMMENTS_CLASSES.SCREENSHOT_TARGET}`,
	);
}

export {
	initializeScreenshotTargetManager,
	manuallyAddParentTarget,
	manuallyRemoveParentTarget,
	manuallySVGAddTarget,
	manuallySVGRemoveTarget,
	addSVGScreenshotTarget,
	removeSVGScreenshotTarget,
	cleanupAllManagedParents,
	findCurrentScreenshotTarget,
	findAllScreenshotTargets,
};
