<template>
  <div class="smartcomments-reply-form">
    <div class="smartcomments-reply-form-header">
      <p>{{ messages.replyHeader() }}</p>
    </div>
    <div class="smartcomments-reply-form-body">
      <textarea
        class="smartcomments-reply-form-body-textarea"
        :class="{ 'has-content': hasContent }"
        v-model="reply"
        :placeholder="messages.replyPlaceholder()"
        @focus="onFocus"
        @blur="onBlur"
        @input="onInput"
        :aria-label="replyAriaLabel"
        ref="textarea"
      ></textarea>
    </div>
    <div class="smartcomments-reply-form-footer" v-show="showActions">
      <div class="smartcomments-reply-form-actions">
        <button
          class="smartcomments-reply-form-cancel"
          @click="cancelReply"
          type="button"
        >
          {{ messages.cancel() }}
        </button>
        <button
          class="smartcomments-reply-form-submit"
          @click="submitReply"
          :disabled="!canSubmit"
          type="submit"
        >
          {{ messages.replySubmit() }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, computed } from "vue";
import useMessages from "../composables/core/useMessages.js";

export default defineComponent({
  name: "ReplyForm",
  data() {
    return {
      reply: "",
      isFocused: false,
      hasContent: false,
      isSubmitting: false,
    };
  },
  props: {
    comment: {
      type: Object,
      required: true,
    },
  },
  emits: ["reply-submitted"],
  setup(props) {
    const { messages, msg } = useMessages();

    const replyAriaLabel = computed(() => {
      // Create a label for screen readers
      const authorName = props.comment.author
        ? props.comment.author.replace(/<[^>]*>/g, "") // Strip HTML tags
        : "comment";
      return msg("sc-reply-aria-label", `Reply to ${authorName}`, authorName);
    });

    return {
      messages,
      replyAriaLabel,
    };
  },
  computed: {
    showActions() {
      return this.isFocused || this.hasContent || this.isSubmitting;
    },
    canSubmit() {
      return this.reply.trim().length > 0 && !this.isSubmitting;
    },
  },
  methods: {
    onFocus() {
      this.isFocused = true;
    },
    onBlur() {
      this.isFocused = false;
    },
    onInput() {
      this.hasContent = this.reply.trim().length > 0;
    },
    async submitReply() {
      if (!this.canSubmit) {
        return;
      }

      this.isSubmitting = true;

      try {
        // Use the reply method from the enhanced comment object
        if (this.comment.reply && typeof this.comment.reply === "function") {
          const success = await this.comment.reply(this.reply);

          if (success) {
            // Create reply data for the event
            const replyData = {
              text: this.reply,
              author: mw.config.get("wgUserName"),
              datetime: new Date().toISOString(),
            };

            // Emit the reply-submitted event
            this.$emit("reply-submitted", replyData);

            // Reset form
            this.reply = "";
            this.hasContent = false;
            this.isFocused = false;
          } else {
            console.error("Failed to submit reply");
          }
        } else {
          console.error("Comment object does not have a reply method");
        }
      } catch (error) {
        console.error("Error submitting reply:", error);
      } finally {
        this.isSubmitting = false;
      }
    },
    cancelReply() {
      this.reply = "";
      this.hasContent = false;
      this.isFocused = false;
      this.$refs.textarea.blur();
    },
  },
});
</script>

<style lang="less">
.smartcomments-reply-form {
  margin-left: -3px;
  padding: 8px 16px 16px;
  padding-left: ~"calc(16px + 3px)";
  background: #f9f9f9;
  border-top: 1px solid #ccc;
  border-left: 1px solid #ccc;
  font-size: 14px;

  &-footer {
    transition: all 0.2s ease-in-out;
  }

  &-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    align-items: center;
  }

  textarea {
    border: 1px solid #a2a9b1;
    border-radius: 2px;
    padding: 5px 8px;
    font-family: inherit;
    resize: vertical;
    margin-bottom: 8px;
    height: 35px;
    min-height: 35px;
    transition: height 0.2s ease-in-out;
    width: 100%;
    box-sizing: border-box;

    &:focus {
      height: 75px;
      min-height: 75px;
      outline: 2px solid #36c;
      outline-offset: -1px;
    }

    &.has-content {
      height: 75px;
      min-height: 75px;
      transition: none;
    }
  }

  button {
    border: 1px solid #a2a9b1;
    border-radius: 2px;
    padding: 8px 16px;
    font-weight: bold;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.15s ease-in-out;

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  &-cancel {
    background-color: transparent;
    color: #54595d;
    border-color: #c8ccd1;

    &:hover:not(:disabled) {
      background-color: #f8f9fa;
      border-color: #a2a9b1;
    }
  }

  &-submit {
    background-color: #36c;
    color: #fff;
    border-color: #36c;

    &:hover:not(:disabled) {
      background-color: #2a4b8d;
      border-color: #2a4b8d;
    }

    &:disabled {
      background-color: #a2a9b1;
      border-color: #a2a9b1;
    }
  }
}
</style>
