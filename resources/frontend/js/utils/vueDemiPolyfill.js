/**
 * VueDemi Polyfill
 * 
 * This module ensures VueDemi compatibility with Vue 3 by applying necessary polyfills
 * and fixes. It should be called before using VueDemi in the application.
 */
function applyVueDemiPolyfill() {
    if (window.Vue && window.VueDemi) {
        const vueToUse = window.Vue;
        const existingVueDemi = window.VueDemi;

        if (vueToUse.version && vueToUse.version.slice(0, 2) === "3.") {
            // If VueDemi is not Vue 3 or hasInjectionContext is undefined, copy all properties from Vue to VueDemi
            // This is a workaround to ensure VueDemi is compatible with Vue 3
            if (!existingVueDemi.isVue3 || typeof existingVueDemi.hasInjectionContext === 'undefined') {
                for (const key in vueToUse) {
                    if (Object.prototype.hasOwnProperty.call(vueToUse, key)) {
                        existingVueDemi[key] = vueToUse[key];
                    }
                }
            }
        }

        if (typeof existingVueDemi.hasInjectionContext !== 'function') {
            existingVueDemi.hasInjectionContext = () => false;
        }
    }
}

module.exports = {
    applyVueDemiPolyfill
}; 