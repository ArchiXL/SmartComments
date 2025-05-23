<template>
    <div class="smartcomments">
        <HighlightOverlay v-if="isEnabled" v-highlight="{ anchors: highlightedAnchors, onClick: openComment }" />
        <Comment 
            v-if="comment" 
            :comment="comment" 
            :position="commentPosition"
            @close="closeComment" 
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
        const commentPosition = ref(null);
        const comment = ref(null);
        const openComment = async (commentData, position) => {
            try {
                const comment = await getComment(commentData.data_id);
                console.log('Comment:', comment);
                if (comment) {
                    comment.value = comment;
                    commentPosition.value = position;
                } else {
                    console.error('Comment not found:', commentData.data_id);
                    comment.value = null;
                    commentPosition.value = null;
                }
            } catch (e) {
                console.error('Error fetching comment:', e);
                comment.value = null;
                commentPosition.value = null;
            }
        };

        const closeComment = () => {
            comment.value = null;
            commentPosition.value = null;
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
            comment,
            openComment,
            closeComment,
            isEnabled,
            deleteComment,
            completeComment,
            viewPage,
            commentPosition,
        };
    },
});
</script>

<style lang="less">
.smartcomments {
    *[data-tooltip] {
        position: relative;

        &:hover:after {
            content: attr(data-tooltip);
            position: absolute;
            background: rgba(0, 0, 0, 0.8);
            color: #fff;
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 12px;
            z-index: 1000;
            pointer-events: none;
            top: calc(100% + 0.5em);
            
            /* Position relative to right edge to prevent overflow */
            right: 0;
            max-width: 250px;
            white-space: normal;
            word-wrap: break-word;
            box-sizing: border-box;
        }
    }
}
</style>