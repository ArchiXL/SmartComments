<template>
    <div class="smartcomments-reply-list">
        <div class="smartcomments-reply-list-item" v-for="reply in replies" :key="reply.id">
            <comment-message :comment="reply" />
        </div>
    </div>
</template>

<script>
const { defineComponent } = require('vue');

const CommentMessage = require('./CommentMessage.vue');

module.exports = defineComponent({
    name: 'ReplyList',
    components: {
        CommentMessage,
    },
    props: {
        replies: {
            type: Array,
            required: true,
        },
    },
    data() {
        return {
            replies: this.replies,
        }
    },
    created() {
        console.log('ReplyList created', this.replies);
    }
});
</script>

<style lang="less">
.smartcomments-reply-list {
    background: #fff;
}
</style>