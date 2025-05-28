function mountSmartComments(element) {
    // Load all dependencies when DOM is ready
    const { createApp, h } = require('vue');
    const { createPinia } = window.Pinia;
    const SmartCommentsComponent = require('./SmartComments.vue');
    const useAppStateStore = require('./store/appStateStore.js');
    const { applyVueDemiPolyfill } = require('./utils/vueDemiPolyfill.js');

    // Apply polyfill
    applyVueDemiPolyfill();

    // Create Pinia instance
    const pinia = createPinia();

    // Create and configure Vue app
    const app = createApp({
        render: () => h(SmartCommentsComponent),
    });
    app.use(pinia);

    // Initialize the store's state (this now handles userStore initialization too)
    const store = useAppStateStore();
    store.initializeState();

    // Set initial state based on URL parameter
    const initialIsEnabled = window.location.href.indexOf('scenabled=1') !== -1;
    if (initialIsEnabled) {
        store.enableAppState();
    } else {
        store.disableAppState();
    }

    app.mount(element);
}

$(() => {
    const appElement = document.getElementById('smartcomments-app');
    if (appElement) {
        mountSmartComments(appElement);
    } else {
        console.error('SmartComments: Mount element #smartcomments-app not found.');
    }
});