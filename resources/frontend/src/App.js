import { createApp } from 'vue';
import { createPinia } from 'pinia';
import SmartCommentsComponent from './SmartComments.vue';

// Import Rangy modules and make it globally available
import rangy from 'rangy/lib/rangy-core';
import 'rangy/lib/rangy-classapplier';
import 'rangy/lib/rangy-highlighter';
import 'rangy/lib/rangy-serializer';
import 'rangy/lib/rangy-textrange';
//import 'rangy/lib/rangy-selectionsaverestore';

// Make rangy globally available
window.rangy = rangy;

// Initialize rangy
rangy.init();


// Use MediaWiki's resource loader to ensure dependencies are loaded
mw.loader.using(['mediawiki.util']).then(() => {
    const appElement = document.getElementById('smartcomments-app');

    if (!appElement) {
        mw.log.error('SmartComments: Mount element #smartcomments-app not found.');
        return;
    }

    try {
        // Create Pinia instance
        const pinia = createPinia();

        // Create and configure Vue app
        const app = createApp(SmartCommentsComponent);

        // Use Pinia
        app.use(pinia);

        // Initialize store state before mounting
        import('./store/appStateStore.js').then(({ useAppStateStore }) => {
            const store = useAppStateStore();
            store.initializeState();

            // Set initial state based on URL parameter
            const initialIsEnabled = mw.util.getParamValue('scenabled') === '1';
            if (initialIsEnabled) {
                store.enableAppState();
            } else {
                store.disableAppState();
            }

            // Mount the app
            app.mount(appElement);
        }).catch(error => {
            mw.log.error('SmartComments: Failed to load store:', error);
        });
    } catch (error) {
        mw.log.error('SmartComments: Failed to initialize:', error);
    }
});