const { createApp, h } = require('vue');
const { createPinia } = Pinia;
const SmartCommentsComponent = require('./SmartComments.vue');
const useSmartCommentsStore = require('./store/smartCommentsStore.js');

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

const pinia = createPinia();

function mountSmartComments(element) {
    const app = createApp({
        render: () => h(SmartCommentsComponent),
    });
    app.use(pinia);

    // Initialize the store's state
    const store = useSmartCommentsStore();
    store.initializeState();
    const initialIsEnabled = window.location.href.indexOf('scenabled=1') !== -1;
    if (initialIsEnabled) {
        store.enableSmartComments();
    } else {
        store.disableSmartComments();
    }

    app.mount(element);
}

// Mount the app when the DOM is ready
$(() => {
    const appElement = document.getElementById('smartcomments-app');
    if (appElement) {
        mountSmartComments(appElement);
    } else {
        console.error('SmartComments: Mount element #smartcomments-app not found.');
    }
});
