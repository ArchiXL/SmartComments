<template>
  <div class="smartcomments-message">
    <div class="smartcomments-message-header">
      <div
          class="smartcomments-message-header-author"
          v-html="comment.author"
      ></div>
      <div
          class="smartcomments-message-header-date"
          v-html="comment.datetime"
      ></div>
    </div>
    <div class="smartcomments-message-body" v-html="commentText"></div>
  </div>
</template>

<script>
import {defineComponent} from "vue";

function unescapeHtml( html ) {
  if ( typeof html !== "string" ) {
    return html;
  }
  const textarea = document.createElement( "textarea" );
  textarea.innerHTML = html;
  return textarea.value;
}

export default defineComponent( {
  name: "CommentMessage",
  props: {
    comment: {
      type: Object,
      required: true,
    },
  },
  computed: {
    commentText() {
      if ( this.comment && typeof this.comment.text === "string" ) {
        return unescapeHtml( this.comment.text );
      }
      return "";
    },
  },
} );
</script>

<style lang="less">
.smartcomments-message {
  padding: 8px 16px;
  border-bottom: 1px dotted #ccc;
  font-size: 14px;

  .smartcomments-message-header {
    display: flex;
    padding: 8px 0;
    align-items: center;

    .smartcomments-message-header-author {
      flex-grow: 1;

      a {
        font-weight: bold;
        color: #0070ff;
        cursor: pointer;
      }
    }

    .smartcomments-message-header-date {
      text-align: right;
      color: #999;
      font-size: 14px;
    }
  }
}
</style>
