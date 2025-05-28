mw.loader.using([
    'mediawiki.user',
    'ext.smartcomments.vue-demi',
    'ext.smartcomments.pinia'
]).then(() => {
    const { createApp, h } = require('vue');
    const { createPinia } = Pinia;
    const SmartCommentsComponent = require('./SmartComments.vue');
    const useAppStateStore = require('./store/appStateStore.js');
    const useUserStore = require('./store/userStore.js');
    const { applyVueDemiPolyfill } = require('./utils/vueDemiPolyfill.js');

    applyVueDemiPolyfill();

    const pinia = createPinia();

    function mountSmartComments(element) {
        const app = createApp({
            render: () => h(SmartCommentsComponent),
        });
        app.use(pinia);

        // Initialize the store's state
        const store = useAppStateStore();
        const userStore = useUserStore();

        store.initializeState();
        userStore.fetchUserRights();

        const initialIsEnabled = window.location.href.indexOf('scenabled=1') !== -1;
        if (initialIsEnabled) {
            store.enableAppState();
        } else {
            store.disableAppState();
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
});

console.log('App.js loaded');