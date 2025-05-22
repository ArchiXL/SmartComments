<template>
    <div class="smartcomments-reply-form">
        <div class="smartcomments-reply-form-header">
            <p>Reageren</p>
        </div>
        <div class="smartcomments-reply-form-body">
            <textarea class="smartcomments-reply-form-body-textarea" v-model="reply" placeholder="Typ hier je bericht..."></textarea>
        </div>
        <div class="smartcomments-reply-form-footer">
            <button class="smartcomments-reply-form-footer-button" @click="reply">Reactie plaatsen</button>
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
        thread: {
            type: Object,
            required: true,
        },
    },
    methods: {
        reply() {
            this.thread.reply(this.reply);
        }
    }
});
</script>