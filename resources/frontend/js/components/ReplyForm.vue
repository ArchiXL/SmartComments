<template>
    <div class="smartcomments-reply-form">
        <div class="smartcomments-reply-form-header">
            <p>Reageren</p>
        </div>
        <div class="smartcomments-reply-form-body">
            <textarea class="smartcomments-reply-form-body-textarea" v-model="reply" placeholder="Typ hier je bericht..."></textarea>
        </div>
        <div class="smartcomments-reply-form-footer">
            <button class="smartcomments-reply-form-footer-button" @click="submitReply">Reactie plaatsen</button>
        </div>
    </div>
</template>

<script>
const { defineComponent } = require('vue');

module.exports = defineComponent({
    name: 'ReplyForm',
    data() {
        return {
            reply: '',
        }
    },
    props: {
        comment: {
            type: Object,
            required: true,
        },
    },
    methods: {
        submitReply() {
            this.comment.reply(this.reply);
        }
    }
});
</script>

<style lang="less">
.smartcomments-reply-form {
    padding: .5em 1em 1em;
    background: #f9f9f9;
    border-top: 1px solid #ccc;
    font-size: .85em;

    textarea {
        border: 1px solid #a2a9b1;
        border-radius: 2px;
        padding: 5px 8px;
        font-family: inherit;
        resize: vertical;
        margin-bottom: .5em;
        min-height: 75px;
    }

    button {
        background-color: #f8f9fa;
        color: #202122;
        border: 1px solid #a2a9b1;
        border-radius: 2px;
        padding: .5em;
        font-weight: bold;
        cursor: pointer;

        &:hover {
            background: #fff;
        }
    }
}
</style>