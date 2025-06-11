<template>
    <div class="smartcomments-reply-list">
        <div class="smartcomments-reply-list-item" v-for="reply in replies" :key="reply.id">
            <comment-message :comment="reply" />
        </div>
    </div>
</template>

<script>
import { defineComponent } from 'vue';

import CommentMessage from './CommentMessage.vue';

export default defineComponent({
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
});
</script>

<style lang="less">
.smartcomments-reply-list {
    background: #fff;
}
</style>