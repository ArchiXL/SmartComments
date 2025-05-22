<template>
    <div class="smartcomments">
        <HighlightOverlay v-if="isEnabled" v-highlight="{ anchors: highlightedAnchors, onClick: openThread }" />
        <Comment 
            v-if="currentThread" 
            :comment="currentThread" 
            @close="currentThread = null" 
            @delete="deleteComment($event)"
            @complete="completeComment($event)"
            @view="viewPage($event)"
        />
    </div>
</template>

<script>
const { defineComponent, ref, computed } = require('vue');
const useSmartCommentsSetup = require('./composables/useSmartCommentsSetup.js');
const useComments = require('./composables/useComments.js');
const { highlightDirective } = require('./directives/highlightDirective.js');
const Comment = require('./components/Comment.vue');
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
    data() {
        return {
            currentThread: null,
            enabled: false,
        };
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

        const deleteComment = async (comment) => {
            console.log('Delete comment', comment);
        };

        const completeComment = async (comment) => {
            console.log('Complete comment', comment);
        };

        const viewPage = async (comment) => {
            console.log('View page', comment);
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
            deleteComment,
            completeComment,
            viewPage,
        };
    },
});
</script>