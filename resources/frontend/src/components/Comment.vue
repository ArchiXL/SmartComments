<template>
  <div class="smartcomments-side-panel" :style="panelStyle">
    <div class="smartcomments-commentgroup">
      <!-- Actions -->
      <comment-actions
        @close="$emit('close')"
        @delete="$emit('delete', $event)"
        @complete="$emit('complete', $event)"
        @view="$emit('view', $event)"
        @next="handleNext"
        @previous="handlePrevious"
        :comment="comment"
      ></comment-actions>

      <!-- Screenshot - only show on special pages when positioning failed -->
      <div v-if="shouldShowScreenshot" class="smartcomments-screenshot tt-center" :data-tooltip="messages.CommentsShowScreenshotFullSize()">
        <img 
          :src="comment.positionImage" 
          alt="Comment screenshot" 
          class="smartcomments-screenshot-image"
          @error="handleImageError"
          @click="openImageModal"
        />
      </div>

      <!-- Image Modal -->
      <image-modal
        :show="commentsStore.isImageModalVisible"
        :image-src="comment.positionImage"
        image-alt="Comment screenshot - full size"
        @close="commentsStore.closeImageModal"
      />

      <!-- Body -->
      <comment-body :comment="comment"></comment-body>

      <!-- Replies -->
      <reply-list :replies="comment.replies || []"></reply-list>

      <!-- Reply form - conditionally show based on allowReplies prop -->
      <reply-form
        v-if="allowReplies"
        :comment="enhancedComment"
        @reply-submitted="handleReplySubmitted"
      ></reply-form>
    </div>
  </div>
</template>

<script>
import { defineComponent, computed, ref } from "vue";
import ReplyForm from "./ReplyForm.vue";
import ReplyList from "./ReplyList.vue";
import CommentActions from "./CommentActions.vue";
import CommentBody from "./CommentBody.vue";
import ImageModal from "./ImageModal.vue";
import useComments from "../composables/features/useComments.js";
import useMessages from "../composables/core/useMessages.js";
import useCommentsStore from "../store/commentsStore.js";
import { useAppStateStore } from "../store/appStateStore.js";

export default defineComponent({
  name: "Comment",
  components: {
    ReplyForm,
    ReplyList,
    CommentActions,
    CommentBody,
    ImageModal,
  },
  props: {
    comment: {
      type: Object,
      required: true,
    },
    position: {
      type: Object,
      default: null,
    },
    allowReplies: {
      type: Boolean,
      default: true,
    },
  },
  emits: ["close", "delete", "complete", "view", "navigate", "reply-added"],
  setup(props, { emit }) {
    const { messages } = useMessages();
    const commentsStore = useCommentsStore();
    const appStore = useAppStateStore();

    const openImageModal = () => {
      commentsStore.openImageModal();
    };

    // Only show screenshot on special pages when positioning failed (fallback position used)
    const shouldShowScreenshot = computed(() => {
      const isBroken = document.querySelector(
          'div.sic-timeline-item.broken[data-comment-id="' + props.comment.id + '"]'
      ) !== null;
      return appStore.isSpecialPageMode || isBroken
    });

    const panelStyle = computed(() => {
      if (!props.position) {
        console.warn(
          "Comment panel: No position data, using default positioning",
        );
        return {
          top: "0",
        };
      }

      // Calculate position to place the comment panel next to the highlighted element
      // We'll position it to the right of the element, or to the left if there's not enough space
      const viewportHeight = window.innerHeight;
      const panelEstimatedHeight = 200;

      let top;

      // Position vertically aligned with the top of the element
      // But ensure it doesn't go off the bottom of the viewport
      top = props.position.top;
      const maxTop =
        window.scrollY + viewportHeight - panelEstimatedHeight - 20;
      if (top > maxTop) {
        top = Math.max(window.scrollY + 10, maxTop);
      }

      return {
        top: `${top}px`,
      };
    });

    // Enhanced comment object with reply method
    const enhancedComment = computed(() => {
      return {
        ...props.comment,
        reply: submitReply,
      };
    });

    const submitReply = async (replyText) => {
      if (!replyText || replyText.trim() === "") {
        console.warn("Cannot submit empty reply");
        return false;
      }

      try {
        const { saveComment } = useComments();

        // For replies, we need to create a fake selection with the parent comment ID
        // The API expects the parent comment ID in the 'comment' parameter
        const selectionData = {
          text: replyText, // Use the reply text for validation
          parentId: props.comment.id || props.comment.data_id, // This will be passed as 'comment' parameter
          type: "reply",
        };

        const result = await saveComment(replyText, selectionData);

        if (result.success === "1" || result.success === true) {
          // Create a new reply object for immediate UI update
          const newReply = {
            id: result.comment || Date.now(),
            text: `<div class="sic-text"><p>${replyText}</p></div>`,
            author: `<a href="${mw.util.getUrl("User:" + mw.config.get("wgUserName"))}">${mw.config.get("wgUserName")}</a>`,
            datetime: messages.justNow(),
            modifiedBy: mw.config.get("wgUserName"),
            modifiedDateTime: messages.justNow(),
          };

          // Add reply to the comment's replies array
          if (!props.comment.replies) {
            props.comment.replies = [];
          }
          props.comment.replies.push(newReply);

          // Emit event for parent component to handle
          emit("reply-added", {
            comment: props.comment,
            reply: newReply,
          });

          return true;
        } else {
          console.error("Failed to submit reply:", result.message);
          return false;
        }
      } catch (error) {
        console.error("Error submitting reply:", error);
        return false;
      }
    };

    const handleReplySubmitted = (replyData) => {
      // Trigger refresh of highlights to show updated reply count
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("smartcomments:refresh-highlights", {
            detail: {
              replyAdded: true,
              comment: props.comment,
              reply: replyData,
            },
          }),
        );
      }
    };

    const handleNext = () => {
      emit("navigate", { direction: "next" });
    };

    const handlePrevious = () => {
      emit("navigate", { direction: "previous" });
    };

    const handleImageError = (event) => {
      console.warn("Failed to load comment screenshot:", event.target.src);
      event.target.style.display = "none";
    };

    return {
      panelStyle,
      enhancedComment,
      handleNext,
      handlePrevious,
      handleReplySubmitted,
      handleImageError,
      openImageModal,
      shouldShowScreenshot,
      commentsStore,
      messages,
    };
  },
});
</script>

<style lang="less">
.smartcomments-side-panel {
  position: absolute;
  right: 0;
  top: 0;
  width: 310px;
  overflow: hidden;
  overflow-y: auto;
  padding-left: 48px;
  z-index: 4;

  .smartcomments-commentgroup {
    background: #ffffee;
    border-left: 3px solid #f6c343;
    border-bottom: 1px solid #ccc;
    border-top: 1px solid #ccc;
  }

  .smartcomments-screenshot {
    padding: 8px 12px;
    border-bottom: 1px solid #e0e0e0;
    
    .smartcomments-screenshot-image {
      max-width: 100%;
      height: auto;
      max-height: 200px;
      border: 1px solid #ddd;
      border-radius: 4px;
      display: block;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      
      &:hover {
        transform: scale(1.05);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      }
    }
  }
}
</style>
