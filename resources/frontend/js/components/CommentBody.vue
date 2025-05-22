<template>
    <div class="smartcomments-comment-body">
        <comment-message :comment="comment" />
    </div>
</template>

<script>
const { defineComponent } = require('vue');

const CommentMessage = require('./CommentMessage.vue');

module.exports = defineComponent({
    name: 'CommentBody',
    components: {
        CommentMessage,
    },
    props: {
        comment: {
            type: Object,
            required: true,
        },
    },
    data() {
        return {
            comment: this.comment,
        }
    },
    created() {
        console.log('CommentBody created', this.comment);
    }
});
</script>