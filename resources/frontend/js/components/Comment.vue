<template>
    <div class="smartcomments-side-panel">
        <div class="smartcomments-commentgroup">
            <comment-actions @close="$emit('close')"></comment-actions>
            <comment-body :comment="comment"></comment-body>
            <reply-list :replies="comment.replies"></reply-list>
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
    emits: ['close'],
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
