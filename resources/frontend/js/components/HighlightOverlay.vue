<template>
  <div class="highlight-overlay">
    <!-- This component doesn't render anything itself, it's a logical container for the directive -->
  </div>
</template>

<script>
const { defineComponent } = require('vue');

module.exports = defineComponent({
  name: 'HighlightOverlay',
});
</script>

<style>
.highlight-overlay {
  /* Styles if needed for the overlay container itself */
  /* For example, if it needs to be positioned over the content */
  position: relative; 
  /* or position: absolute; top:0; left:0; width: 100%; height: 100%; pointer-events: none; */
  /* z-index: 10; */ /* Ensure it's above text content but below UI elements like modals */
}

*[class^='smartcomment-hl-'] {
    cursor: pointer;
    text-decoration: none !important;
    color: #000;
    background: #ffffe0;
    /*blue=#e0ffff; green=#e0ffe0; red=#ffe0e0; yellow=#ffffe0*/
    padding: 0 2px;
    z-index: 2 !important;
    box-shadow: 0 0 1px #000;

    &.active {
        background: #b4f3ff;
    }

    &.image {
        .sc-dynamic-block {
            &:before {
                background: #ffffe0bf;
                content: " ";
                width: 100%;
                height: 100%;
                position: absolute;

                &:hover {
                    background: lightyellow;
                }
            }
        }
    }
}
</style> 