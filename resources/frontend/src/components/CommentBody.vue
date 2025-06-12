<template>
  <div class="smartcomments-comment-body">
    <comment-message :comment="comment"/>
  </div>
</template>

<script>
import {defineComponent} from "vue";

import CommentMessage from "./CommentMessage.vue";

export default defineComponent( {
  name: "CommentBody",
  components: {
    CommentMessage,
  },
  props: {
    comment: {
      type: Object,
      required: true,
    },
  },
} );
</script>
