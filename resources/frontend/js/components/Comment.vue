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
            <reply-list :replies="comment.replies || []"></reply-list>

            <!-- Reply form -->
            <reply-form 
                :comment="enhancedComment" 
                @reply-submitted="handleReplySubmitted"
            ></reply-form>
        </div>
    </div>
</template>

<script>
const { defineComponent, computed } = require('vue');
const ReplyForm = require('./ReplyForm.vue');
const ReplyList = require('./ReplyList.vue');
const CommentActions = require('./CommentActions.vue');
const CommentBody = require('./CommentBody.vue');
const useComments = require('../composables/useComments.js');

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
    emits: ['close', 'delete', 'complete', 'view', 'navigate', 'reply-added'],
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
        
        // Enhanced comment object with reply method
        enhancedComment() {
            return {
                ...this.comment,
                reply: this.submitReply
            };
        }
    },
    methods: {
        async submitReply(replyText) {
            if (!replyText || replyText.trim() === '') {
                console.warn('Cannot submit empty reply');
                return false;
            }

            try {
                const { saveComment } = useComments();
                
                // For replies, we need to create a fake selection with the parent comment ID
                // The API expects the parent comment ID in the 'comment' parameter
                const selectionData = {
                    text: replyText, // Use the reply text for validation
                    parentId: this.comment.id || this.comment.data_id, // This will be passed as 'comment' parameter
                    type: 'reply'
                };

                const result = await saveComment(replyText, selectionData);
                
                if (result.success === '1' || result.success === true) {
                    // Create a new reply object for immediate UI update
                    const newReply = {
                        id: result.comment || Date.now(), // Use returned comment ID or temporary one
                        text: replyText,
                        author: mw.config.get('wgUserName'),
                        datetime: mw.msg('sic-date-justnow') || 'Just now',
                        modifiedBy: mw.config.get('wgUserName'),
                        modifiedDateTime: mw.msg('sic-date-justnow') || 'Just now'
                    };

                    // Add reply to the comment's replies array
                    if (!this.comment.replies) {
                        this.comment.replies = [];
                    }
                    this.comment.replies.push(newReply);

                    // Emit event for parent component to handle
                    this.$emit('reply-added', {
                        comment: this.comment,
                        reply: newReply
                    });

                    console.log('Reply submitted successfully for comment ID:', this.comment.id || this.comment.data_id);
                    return true;
                } else {
                    console.error('Failed to submit reply:', result.message);
                    return false;
                }
            } catch (error) {
                console.error('Error submitting reply:', error);
                return false;
            }
        },
        
        handleReplySubmitted(replyData) {
            console.log('Reply submitted for comment ID:', this.comment.id || this.comment.data_id);
            
            // Trigger refresh of highlights to show updated reply count
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('smartcomments:refresh-highlights', {
                    detail: { 
                        replyAdded: true,
                        comment: this.comment,
                        reply: replyData 
                    }
                }));
            }
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