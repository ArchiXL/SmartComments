<template>
    <div class="smartcomments-side-panel" :style="panelStyle">
        <div class="smartcomments-commentgroup">
            <!-- Actions -->
            <comment-actions 
                @close="$emit('close')" 
                @delete="$emit('delete', $event)"
                @complete="$emit('complete', $event)" 
                @view="$emit('view', $event)"
                @next="handleNext"
                @previous="handlePrevious"
                :comment="comment"
            ></comment-actions>

            <!-- Body -->
            <comment-body :comment="comment"></comment-body>

            <!-- Replies -->
            <reply-list :replies="comment.replies"></reply-list>

            <!-- Reply form -->
            <reply-form :comment="comment"></reply-form>
        </div>
    </div>
</template>

<script>
const { defineComponent } = require('vue');
const ReplyForm = require('./ReplyForm.vue');
const ReplyList = require('./ReplyList.vue');
const CommentActions = require('./CommentActions.vue');
const CommentBody = require('./CommentBody.vue');

module.exports = defineComponent({
    name: 'Comment',
    components: {
        ReplyForm,
        ReplyList,
        CommentActions,
        CommentBody,
    },
    props: {
        comment: {
            type: Object,
            required: true,
        },
        position: {
            type: Object,
            default: null,
        },
    },
    emits: ['close', 'delete', 'complete', 'view', 'navigate'],
    computed: {
        panelStyle() {
            if (!this.position) {
                console.warn('Comment panel: No position data, using default positioning');
                return {
                    top: '0',
                };
            }
            
            // Calculate position to place the comment panel next to the highlighted element
            // We'll position it to the right of the element, or to the left if there's not enough space
            const viewportHeight = window.innerHeight;
            const panelEstimatedHeight = 200;
            
            let top;
            
            // Position vertically aligned with the top of the element
            // But ensure it doesn't go off the bottom of the viewport
            top = this.position.top;
            const maxTop = window.scrollY + viewportHeight - panelEstimatedHeight - 20;
            if (top > maxTop) {
                top = Math.max(window.scrollY + 10, maxTop);
            }
            
            return {
                top: `${top}px`,
            };
            
        },
    },
    methods: {
        handleReplySubmitted() {
            // Optionally, refresh the reply list or give user feedback
            console.log('Reply submitted for comment ID:', this.comment.id);
        },
        handleNext() {
            this.$emit('navigate', { type: 'next' });
        },
        handlePrevious() {
            this.$emit('navigate', { type: 'previous' });
        }
    },
    created() {
        console.log('Comment created', this.comment);
    }
});
</script>

<style lang="less">
.smartcomments-side-panel {
    position: absolute;
    right: 0;
    top: 0;
    width: 310px;
    overflow: hidden;
    overflow-y: auto;
    padding-left: 3em;
    z-index: 4;

    .smartcomments-commentgroup {
        background: #ffffee;
        border-left: 3px solid #f6c343;
        border-bottom: 1px solid #ccc;
        border-top: 1px solid #ccc;
    }
}
</style>