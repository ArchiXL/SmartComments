<template>
    <div class="smartcomments-side-panel">
        <div class="smartcomments-commentgroup">
            <!-- Actions -->
            <comment-actions 
                @close="$emit('close')" 
                @delete="$emit('delete', $event)"
                @complete="$emit('complete', $event)" 
                @view="$emit('view', $event)"
                :comment="comment"
            ></comment-actions>

            <!-- Body -->
            <comment-body :comment="comment"></comment-body>

            <!-- Replies -->
            <reply-list :replies="comment.replies"></reply-list>

            <!-- Reply form -->
            <reply-form></reply-form>
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
    },
    emits: ['close', 'delete', 'complete', 'view'],
    methods: {
        handleReplySubmitted() {
            // Optionally, refresh the reply list or give user feedback
            console.log('Reply submitted for comment ID:', this.comment.id);
        }
    },
    created() {
        console.log('Comment created', this.comment);
    }
});
</script>
