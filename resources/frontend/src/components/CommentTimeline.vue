<template>
  <div
    v-if="isEnabled && positionedComments.length > 0"
    class="sic-timeline-container"
    :style="containerStyle"
  >
    <div
      v-for="comment in positionedComments"
      :key="comment.id || comment.data_id"
      class="sic-timeline-item"
      :class="{
        broken: comment.isBroken,
        'sic-timeline-item-hasreplies':
          comment.hasReplies === 'true' ||
          comment.hasReplies === true ||
          (comment.replies && comment.replies.length > 0),
      }"
      :style="comment.itemStyle"
      :data-selection="comment.posimg"
      :data-comment-id="comment.data_id"
      @click="handleCommentClick(comment)"
      @mouseover="handleMouseOver(comment, $event)"
      @mouseout="handleMouseOut(comment)"
    >
      <span class="oo-ui-iconElement-icon oo-ui-icon-speechBubbles"></span>
    </div>

    <!-- Hover preview for broken comments -->
    <div
      v-if="brokenCommentHover.visible"
      class="sic-timeline-item-hover"
      :style="brokenCommentHover.style"
    >
      <h2>{{ brokenCommentMessage }}</h2>
      <img
        v-if="brokenCommentHover.selection"
        :src="brokenCommentHover.selection"
        width="500"
        alt="Comment selection preview"
      />
    </div>

    <!-- Sticky indicator badge for broken comments -->
    <div
      class="sic-broken-indicator"
      :class="{ visible: showBrokenIndicator }"
      @click="scrollToBrokenComments"
    >
      <span class="sic-broken-icon">⚠️</span>
      <span class="sic-broken-text">
        {{ brokenIndicatorText }}
      </span>
      <span class="sic-broken-arrow">↓</span>
    </div>
  </div>
</template>

<script>
import {
  defineComponent,
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from "vue";
import useCommentsStore from "../store/commentsStore.js";
import { useAppStateStore } from "../store/appStateStore.js";
import useMessages from "../composables/core/useMessages.js";

export default defineComponent({
  name: "CommentTimeline",
  setup() {
    const commentsStore = useCommentsStore();
    const appStateStore = useAppStateStore();
    const { messages, msgWithFallback } = useMessages();

    // Reactive data
    const positions = ref([]);
    const scrollPosition = ref(0);
    const brokenCommentHover = ref({
      visible: false,
      style: {},
      selection: null,
    });

    // Initialize component
    onMounted(() => {
      // Add window resize listener to recalculate positions
      window.addEventListener("resize", handleResize);
      window.addEventListener("scroll", handleScroll);
    });

    onBeforeUnmount(() => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
    });

    // Handle window resize and scroll events
    const handleResize = () => {
      // Force reactivity update by clearing and resetting positions
      positions.value = [];
    };

    const handleScroll = () => {
      // Hide broken comment hover on scroll
      if (brokenCommentHover.value.visible) {
        brokenCommentHover.value.visible = false;
      }

      // Update scroll position to trigger reactive updates
      scrollPosition.value = window.scrollY;

      // Force reactivity update to reposition broken comments at bottom of viewport
      positions.value = [];
    };

    // Helper functions
    const getCommentId = (comment) => comment.data_id || comment.id;
    
    const findHighlightElement = (commentId) => {
      return document.querySelector(`.smartcomment-hl-${commentId}`);
    };
    
    const getContentHeight = () => {
      const contentElement = document.getElementById('content');
      return contentElement?.scrollHeight || document.body.scrollHeight;
    };
    
    const calculateBottomPosition = () => getContentHeight() - 150;
    
    const isCommentBroken = (comment) => {
      const commentId = getCommentId(comment);
      return !findHighlightElement(commentId);
    };

    // Computed properties
    const isEnabled = computed(() => appStateStore.isEnabled);

    const comments = computed(() => {
      if (!Array.isArray(commentsStore.comments)) {
        console.warn("CommentTimeline: commentsStore.comments is not an array:", commentsStore.comments);
        return [];
      }
      return commentsStore.comments.filter(
        (comment) => comment && comment.status !== "completed",
      );
    });

    const brokenCommentMessage = computed(() => messages.unlocalizedComment());

    const brokenComments = computed(() => {
      if (!comments.value?.length) return [];
      return comments.value.filter(isCommentBroken);
    });

    const brokenCommentCount = computed(() => brokenComments.value.length);

    const brokenIndicatorText = computed(() => {
      const count = brokenCommentCount.value;
      if (count === 0) return '';
      
      const baseMessage = msgWithFallback(
        'sic-broken-comments-below',
        `${count} broken comment${count > 1 ? 's' : ''} below`
      );
      
      return baseMessage.replace('$1', count.toString());
    });

    const containerStyle = computed(() => {
      const bodyElement = document.querySelector(".mw-body") || document.querySelector("body");
      if (!bodyElement) {
        console.warn("CommentTimeline: Could not find body element");
        return { top: "0px" };
      }

      const rect = bodyElement.getBoundingClientRect();
      const topOffset = -rect.top - 80;
      return { top: `${topOffset}px` };
    });

    const showBrokenIndicator = computed(() => {
      if (brokenCommentCount.value === 0) return false;
      
      // Ensure we react to scroll changes
      scrollPosition.value;
      
      const viewportHeight = window.innerHeight;
      const scrollTop = window.scrollY;
      const viewportBottom = scrollTop + viewportHeight;
      
      const contentElement = document.getElementById('content');
      if (!contentElement) return false;
      
      const bottomBasePosition = calculateBottomPosition();
      return bottomBasePosition > (viewportBottom - 100);
    });

    // Comment positioning functions
    const separateCommentsByType = (comments) => {
      const normalComments = [];
      const brokenCommentsArray = [];
      
      comments.forEach((comment) => {
        const commentId = getCommentId(comment);
        const highlightElement = findHighlightElement(commentId);

        if (highlightElement) {
          const rect = highlightElement.getBoundingClientRect();
          const positionTop = rect.top + window.scrollY;
          normalComments.push({
            ...comment,
            isBroken: false,
            positionTop,
          });
        } else {
          brokenCommentsArray.push({
            ...comment,
            isBroken: true,
          });
        }
      });
      
      return { normalComments, brokenCommentsArray };
    };
    
    const processNormalComments = (normalComments) => {
      const processedComments = [];
      const usedPositions = [];
      
      normalComments.forEach((comment) => {
        let adjustedPosition = comment.positionTop;
        while (usedPositions.includes(adjustedPosition)) {
          adjustedPosition += 10;
        }
        usedPositions.push(adjustedPosition);

        processedComments.push({
          ...comment,
          itemStyle: {
            top: `${adjustedPosition}px`,
            right: "0px",
            position: "absolute",
          },
        });
      });
      
      return processedComments;
    };
    
    const processBrokenComments = (brokenCommentsArray) => {
      const processedComments = [];
      const bottomBasePosition = calculateBottomPosition();

      brokenCommentsArray.forEach((comment, index) => {
        const bottomPosition = bottomBasePosition - index * 10;

        processedComments.push({
          ...comment,
          itemStyle: {
            top: `${bottomPosition}px`,
            right: "0px",
            position: "absolute",
          },
        });
      });
      
      return processedComments;
    };

    const positionedComments = computed(() => {
      if (!comments.value?.length) return [];
      
      const { normalComments, brokenCommentsArray } = separateCommentsByType(comments.value);
      const processedNormal = processNormalComments(normalComments);
      const processedBroken = processBrokenComments(brokenCommentsArray);
      
      return [...processedNormal, ...processedBroken];
    });

    // Click handlers
    const handleBrokenCommentClick = (comment) => {
      const timelineItem = document.querySelector(
        `.sic-timeline-item[data-selection="${comment.posimg}"]`,
      );
      if (timelineItem) {
        const rect = timelineItem.getBoundingClientRect();
        const position = {
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          bottom: rect.bottom + window.scrollY,
          right: rect.right + window.scrollX,
          width: rect.width,
          height: rect.height,
        };
        commentsStore.openCommentDialog(comment, position);
      }
    };
    
    const handleNormalCommentClick = (highlightElement) => {
      highlightElement.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          view: window,
        }),
      );
    };

    const handleCommentClick = (comment) => {
      const commentId = getCommentId(comment);
      const highlightElement = findHighlightElement(commentId);

      if (comment.isBroken) {
        handleBrokenCommentClick(comment);
      } else if (highlightElement) {
        handleNormalCommentClick(highlightElement);
      }
    };

    // Hover handlers
    const showBrokenCommentHover = (comment, event) => {
      brokenCommentHover.value = {
        visible: true,
        selection: comment.posimg,
        style: {
          position: "absolute",
          right: "30px",
          top: `${event.pageY - 50}px`,
          border: "2px solid #ff000050",
          background: "white",
          padding: "10px",
          borderRadius: "5px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          zIndex: 1000,
        },
      };
    };

    const handleMouseOver = (comment, event) => {
      const commentId = getCommentId(comment);
      const highlightElement = findHighlightElement(commentId);

      if (highlightElement) {
        highlightElement.classList.add("active");
      }

      if (comment.isBroken && comment.posimg) {
        showBrokenCommentHover(comment, event);
      }
    };

    const handleMouseOut = (comment) => {
      const commentId = getCommentId(comment);
      const highlightElement = findHighlightElement(commentId);

      if (highlightElement) {
        highlightElement.classList.remove("active");
      }

      if (comment.isBroken) {
        brokenCommentHover.value.visible = false;
      }
    };

    const scrollToBrokenComments = () => {
      const bottomBasePosition = calculateBottomPosition();
      
      window.scrollTo({
        top: bottomBasePosition - window.innerHeight + 100,
        behavior: 'smooth'
      });
    };

    return {
      isEnabled,
      comments,
      positionedComments,
      containerStyle,
      brokenCommentHover,
      brokenCommentMessage,
      brokenCommentCount,
      brokenIndicatorText,
      showBrokenIndicator,
      handleCommentClick,
      handleMouseOver,
      handleMouseOut,
      scrollToBrokenComments,
    };
  },
});
</script>

<style lang="less">
.sic-timeline-container {
  pointer-events: none;
  z-index: 1;

  .sic-timeline-item {
    width: 24px;
    height: 24px;
    background: #ffffe0;
    border: 1px solid rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    pointer-events: auto;
    transition: all 0.2s ease;
    z-index: 2;
    border-radius: 2px;

    .oo-ui-iconElement-icon {
      width: 18px;
      height: 18px;
      min-width: 18px;
      min-height: 18px;
      padding-top: 5px;
      pointer-events: none;
      opacity: 0.6;
    }

    &:hover {
      background: #b4f3ff;
      border-color: rgba(0, 0, 0, 0.7);
      z-index: 3;
    }

    &.broken {
      background: #ffe0e0 !important;
      border-color: #d33 !important;

      &:hover {
        background: #ffb4b4 !important;
        border-color: #a00 !important;
      }
    }

    &.sic-timeline-item-hasreplies {
      background: #90ee90;
      border-color: #27ae60;

      &:hover {
        background: #7de67d;
      }
    }
  }
}

.sic-timeline-item-hover {
  background: #fff;
  border: 1px solid #a2a9b1;
  padding: 10px;
  box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.2);
  max-width: 520px;
  z-index: 1001;
  pointer-events: auto;

  h2 {
    margin: 0 0 10px 0;
    font-size: 14px;
    color: #333;
    border-bottom: 1px solid #eee;
    padding-bottom: 5px;
  }

  img {
    max-width: 100%;
    height: auto;
    border: 1px solid #ccc;
  }
}

.sic-broken-indicator {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: #f9eded;
  border: 2px solid #d33;
  border-radius: 8px;
  padding: 8px 12px;
  display: none;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  pointer-events: auto;
  z-index: 1002;
  font-size: 13px;
  font-weight: 500;
  color: #a00;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;

  &.visible {
    display: flex;
  }

  &:hover {
    border-color: #a00;
    background: #ffecec;
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  }

  .sic-broken-icon {
    font-size: 16px;
    line-height: 1;
  }

  .sic-broken-text {
    max-width: 200px;
  }

  .sic-broken-arrow {
    font-size: 14px;
    font-weight: bold;
    animation: bounce 2s infinite;
  }
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-3px);
  }
  60% {
    transform: translateY(-2px);
  }
}
</style>
