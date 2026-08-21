import { createApp } from "vue";
import { createPinia } from "pinia";
import SmartCommentsComponent from "./SmartComments.vue";
import { initializeScreenshotTargetManager } from "./utils/screenshotTargetManager.js";
import { smartCommentsEvents } from "./utils/smartCommentsEvents.js";

// Import Rangy modules and make it globally available
import rangy from "rangy/lib/rangy-core";
import "rangy/lib/rangy-classapplier";
import "rangy/lib/rangy-highlighter";
import "rangy/lib/rangy-serializer";
import "rangy/lib/rangy-textrange";

// Make rangy globally available
window.rangy = rangy;

// Initialize rangy
rangy.init();

// Initialize screenshot target manager
initializeScreenshotTargetManager();

// Make SmartComments event manager globally available for special page
window.SmartCommentsEventManager = smartCommentsEvents;

async function initializeSmartCommentsApp() {
  const appElement = document.getElementById("smartcomments-app");

  if (!appElement) {
    mw.log.error("SmartComments: Mount element #smartcomments-app not found.");
    return;
  }

  try {
    // Create Pinia instance
    const pinia = createPinia();

    // Create and configure Vue app
    const app = createApp(SmartCommentsComponent);

    // Use Pinia
    app.use(pinia);

    const { useAppStateStore } = await import("./store/appStateStore.js");
    const store = useAppStateStore();

    // Check if we're on the SmartComments SpecialPage
    const isSpecialPage = mw.config.get("wgCanonicalSpecialPageName") === "SmartComments";

    if (isSpecialPage) {
      // SpecialPage mode: view-only, always enabled for comment viewing
      await store.initializeSpecialPageState();
    } else {
      // Regular page mode: full functionality with toggle
      await store.initializeState();

      // Set initial state based on URL parameter
      const initialIsEnabled = mw.util.getParamValue("scenabled") === "1";
      if (initialIsEnabled) {
        store.enableAppState();
      } else {
        store.disableAppState();
      }
    }

    // Mount the app after store initialization so mounted hooks see loaded rights.
    app.mount(appElement);
  } catch (error) {
    mw.log.error("SmartComments: Failed to initialize:", error);
  }
}

// Use MediaWiki's resource loader to ensure dependencies are loaded
mw.loader.using(["mediawiki.util"]).then(() => {
  initializeSmartCommentsApp();
});
