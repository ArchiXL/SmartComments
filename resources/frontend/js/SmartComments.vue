<template>
    <div class="smartcomments">
        <HighlightOverlay v-if="isEnabled" v-highlight="{ anchors: highlightedAnchors, onClick: openThread }" />
        <Comment v-if="currentThread" :comment="currentThread" @close="currentThread = null" />
    </div>
</template>

<script>
const { defineComponent, ref, computed } = require('vue');
const useSmartCommentsSetup = require('./composables/useSmartCommentsSetup.js');
const useComments = require('./composables/useComments.js');
const { highlightDirective } = require('./directives/highlightDirective.js');
const Comment = require('./components/Comment.vue'); // Assuming Thread component will be in a components subfolder
const HighlightOverlay = require('./components/HighlightOverlay.vue');


module.exports = defineComponent({
    name: 'SmartComments',
    components: {
        Comment,
        HighlightOverlay,
    },
    directives: {
        highlight: highlightDirective,
    },
    setup() {
        const {
            highlightedAnchors,
            isLoading,
            error,
        } = useSmartCommentsSetup();

        const { getComment } = useComments();

        const currentThread = ref(null);

        const openThread = async (commentData) => {
            try {
                const comment = await getComment(commentData.data_id);
                console.log('Comment:', comment);
                if (comment) {
                    currentThread.value = comment;
                } else {
                    console.error('Comment not found:', commentData.data_id);
                    currentThread.value = null;
                }
            } catch (e) {
                console.error('Error fetching comment:', e);
                currentThread.value = null;
            }
        };

        const isEnabled = computed(() => {
            return window.location.href.indexOf( 'scenabled=1' ) !== -1;
        });

        return {
            highlightedAnchors,
            isLoading,
            error,
            currentThread,
            openThread,
            isEnabled,
        };
    },
});
</script>