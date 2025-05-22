<template>
    <div class="smartcomments-message">
        <div class="smartcomments-message-header">
            <div class="smartcomments-message-header-author" v-html="comment.author"></div>
            <div class="smartcomments-message-header-date" v-html="comment.datetime"></div>
        </div>
        <div class="smartcomments-message-body" v-html="decodedCommentText"></div>
    </div>
</template>

<script>
const { defineComponent } = require('vue');

function unescapeHtml(html) {
  if (typeof html !== 'string') {
    return html;
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.documentElement.textContent;
}

module.exports = defineComponent({
    name: 'CommentMessage',
    props: {
        comment: {
            type: Object,
            required: true,
        },
    },
    computed: {
        decodedCommentText() {
            if (this.comment && typeof this.comment.text === 'string') {
                return unescapeHtml(this.comment.text);
            }
            return '';
        }
    },
    created() {
        console.log('CommentMessage created. Original comment object:', this.comment);
    }
});
</script>