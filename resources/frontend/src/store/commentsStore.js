import { defineStore } from "pinia";
import useComments from "../composables/features/useComments.js";
import { useHighlightData } from "../composables/highlights/useHighlightData.js";
import { useHighlightManager } from "../composables/highlights/useHighlightManager.js";
import { smartCommentsEvents, EVENTS } from "../utils/smartCommentsEvents.js";

export default defineStore("commentsStore", {
  state: () => ({
    comments: [],
    currentCommentId: null,
    isLoading: false,
    error: null,

    // Dialog state management
    activeComment: null,
    commentPosition: null,
    isCommentDialogVisible: false,

    // New comment dialog state
    isNewCommentDialogVisible: false,
    newCommentSelection: null,
  }),

  getters: {
    getCurrentComment: (state) => {
      return (
        state.comments.find(
          (comment) =>
            (comment.id && comment.id === state.currentCommentId) ||
            (comment.data_id && comment.data_id === state.currentCommentId),
        ) || null
      );
    },

    /**
     * Get comments sorted by their position in the document
     */
    getCommentsSortedByPosition: (state) => {
      const openComments = state.comments.filter(
        (comment) => comment.status !== "completed",
      );

      return openComments.slice().sort((a, b) => {
        const posA = state.getCommentDocumentPosition(a);
        const posB = state.getCommentDocumentPosition(b);
        return posA - posB;
      });
    },

    getCurrentCommentIndex: (state) => {
      const sortedComments = state.getCommentsSortedByPosition;
      return sortedComments.findIndex(
        (comment) =>
          (comment.id && comment.id === state.currentCommentId) ||
          (comment.data_id && comment.data_id === state.currentCommentId),
      );
    },

    hasNextComment: (state) => {
      const sortedComments = state.getCommentsSortedByPosition;
      const currentIndex = sortedComments.findIndex(
        (comment) =>
          (comment.id && comment.id === state.currentCommentId) ||
          (comment.data_id && comment.data_id === state.currentCommentId),
      );
      return currentIndex !== -1 && currentIndex < sortedComments.length - 1;
    },

    hasPreviousComment: (state) => {
      const sortedComments = state.getCommentsSortedByPosition;
      const currentIndex = sortedComments.findIndex(
        (comment) =>
          (comment.id && comment.id === state.currentCommentId) ||
          (comment.data_id && comment.data_id === state.currentCommentId),
      );
      return currentIndex > 0;
    },

    getNextComment: (state) => {
      const sortedComments = state.getCommentsSortedByPosition;
      const currentIndex = sortedComments.findIndex(
        (comment) =>
          (comment.id && comment.id === state.currentCommentId) ||
          (comment.data_id && comment.data_id === state.currentCommentId),
      );
      if (currentIndex !== -1 && currentIndex < sortedComments.length - 1) {
        return sortedComments[currentIndex + 1];
      }
      return null;
    },

    getPreviousComment: (state) => {
      const sortedComments = state.getCommentsSortedByPosition;
      const currentIndex = sortedComments.findIndex(
        (comment) =>
          (comment.id && comment.id === state.currentCommentId) ||
          (comment.data_id && comment.data_id === state.currentCommentId),
      );
      if (currentIndex > 0) {
        return sortedComments[currentIndex - 1];
      }
      return null;
    },

    /**
     * Calculate the document position of a comment based on its location
     */
    getCommentDocumentPosition: () => (comment) => {
      try {
        const commentId = comment.id || comment.data_id;

        // Try to find the highlight element first
        const highlightElement = document.querySelector(
          `.smartcomment-hl-${commentId}, [data-comment-id="${commentId}"]`,
        );

        if (highlightElement) {
          return getElementDocumentPosition(highlightElement);
        }

        // If no highlight element found, try to calculate from position data
        if (comment.parsedSelection) {
          const selection = comment.parsedSelection;

          if (
            selection.type === "text" &&
            selection.text &&
            typeof selection.index === "number"
          ) {
            // For text selections, find the text node and calculate position
            return findTextPositionInDocument(selection.text, selection.index);
          } else if (
            selection.type === "image" ||
            selection.type === "dynamic-block" ||
            selection.type === "svg"
          ) {
            // For element-based selections, try to find by selector
            const element = findElementBySelector(selection.text);
            if (element) {
              return getElementDocumentPosition(element);
            }
          }
        }

        // Fallback: return a very high number so broken comments appear last
        console.warn("Could not determine position for comment:", commentId);
        return Number.MAX_SAFE_INTEGER;
      } catch (error) {
        console.warn("Error calculating comment position:", error);
        return Number.MAX_SAFE_INTEGER;
      }
    },
  },

  actions: {
    setComments(comments) {
      this.comments = comments;
    },

    setCurrentComment(commentId) {
      this.currentCommentId = commentId;
    },

    addComment(comment) {
      this.comments.push(comment);
    },

    updateComment(commentId, updatedData) {
      const index = this.comments.findIndex(
        (comment) =>
          (comment.id && comment.id === commentId) ||
          (comment.data_id && comment.data_id === commentId),
      );
      if (index !== -1) {
        this.comments[index] = { ...this.comments[index], ...updatedData };
      }
    },

    removeComment(commentId) {
      const originalLength = this.comments.length;
      this.comments = this.comments.filter((comment) => {
        // Keep comment if neither id nor data_id matches the commentId to remove
        const idMatch = comment.id && comment.id == commentId;
        const dataIdMatch = comment.data_id && comment.data_id == commentId;
        return !idMatch && !dataIdMatch;
      });

      // Log for debugging if comment removal seems unexpected
      if (this.comments.length === originalLength) {
        console.warn(
          "CommentsStore: removeComment called but no comment was removed",
          { commentId, totalComments: originalLength },
        );
      }

      if (this.currentCommentId == commentId) {
        this.currentCommentId = null;
      }
    },

    goToNextComment() {
      const nextComment = this.getNextComment;
      if (nextComment) {
        this.currentCommentId = nextComment.id || nextComment.data_id;
        return nextComment;
      }
      return null;
    },

    goToPreviousComment() {
      const previousComment = this.getPreviousComment;
      if (previousComment) {
        this.currentCommentId = previousComment.id || previousComment.data_id;
        return previousComment;
      }
      return null;
    },

    setLoading(loading) {
      this.isLoading = loading;
    },

    setError(error) {
      this.error = error;
    },

    clearError() {
      this.error = null;
    },

    /**
     * Open a comment dialog with the specified comment and position
     */
    async openCommentDialog(commentData, position) {
      this.setLoading(true);
      this.clearError();

      try {
        const { getComment } = useComments();
        const fetchedComment = await getComment(commentData.data_id);

        if (fetchedComment) {
          this.activeComment = fetchedComment;
          this.commentPosition = position;
          this.isCommentDialogVisible = true;
          this.setCurrentComment(fetchedComment.id || fetchedComment.data_id);

          // Set active highlight
          this.setActiveHighlight(fetchedComment.data_id || fetchedComment.id);
        } else {
          this.setError("Comment not found");
          console.error(
            "CommentsStore: Comment not found:",
            commentData.data_id,
          );
        }
      } catch (error) {
        this.setError("Error fetching comment");
        console.error("CommentsStore: Error fetching comment:", error);
      } finally {
        this.setLoading(false);
      }
    },

    /**
     * Close the comment dialog
     */
    closeCommentDialog() {
      // Trigger comment group close event
      smartCommentsEvents.triggerCommentGroupClose();

      // Clear active highlight
      this.clearActiveHighlight();

      this.activeComment = null;
      this.commentPosition = null;
      this.isCommentDialogVisible = false;
      this.setCurrentComment(null);
    },

    /**
     * Navigate to next/previous comment
     */
    async navigateComment(direction) {
      const targetComment =
        direction === "next"
          ? this.goToNextComment()
          : this.goToPreviousComment();

      if (targetComment) {
        try {
          const { getComment } = useComments();
          const fetchedComment = await getComment(
            targetComment.data_id || targetComment.id,
          );

          if (fetchedComment) {
            this.activeComment = fetchedComment;

            // Ensure currentCommentId is properly set
            this.setCurrentComment(fetchedComment.id || fetchedComment.data_id);

            // Update active highlight to the new comment and scroll it into view
            this.setActiveHighlight(
              fetchedComment.data_id || fetchedComment.id,
              true,
            );

            // Keep the same position for now, could be enhanced to scroll to highlighted element
          } else {
            this.setError(`Could not fetch ${direction} comment`);
            console.error(
              "CommentsStore: Could not fetch",
              direction,
              "comment:",
              targetComment,
            );
          }
        } catch (error) {
          this.setError(`Error navigating to ${direction} comment`);
          console.error(
            "CommentsStore: Error navigating to",
            direction,
            "comment:",
            error,
          );
        }
      }
    },

    /**
     * Open new comment dialog with selection data
     */
    openNewCommentDialog(selectionData) {
      this.newCommentSelection = {
        text: selectionData.selection.text,
        index: selectionData.selection.index,
        type: selectionData.selection.type,
        image: selectionData.selection.image || null,
      };
      this.isNewCommentDialogVisible = true;
    },

    /**
     * Close new comment dialog
     */
    closeNewCommentDialog() {
      this.newCommentSelection = null;
      this.isNewCommentDialogVisible = false;
    },

    /**
     * Handle comment save completion
     */
    async handleCommentSaved(savedComment) {
      this.closeNewCommentDialog();

      // Trigger comment created event
      smartCommentsEvents.triggerCommentCreated(savedComment);

      // Emit an event that the main component can listen to for reloading highlights
      // This maintains separation - the store doesn't know about highlight management
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("smartcomments:refresh-highlights", {
            detail: { savedComment },
          }),
        );
      }
    },

    /**
     * Delete a comment
     */
    async deleteComment(comment) {
      this.setLoading(true);

      try {
        const { deleteComment } = useComments();
        const result = await deleteComment(comment.id || comment.data_id);

        if (result.success === "1" || result.success === true) {
          this.removeComment(comment.id || comment.data_id);

          // Trigger comment deleted event
          smartCommentsEvents.triggerCommentDeleted(comment);

          // Clear highlighting for the deleted comment
          const { removeCommentHighlight } = useHighlightManager();
          removeCommentHighlight(comment.id || comment.data_id);

          this.closeCommentDialog();

          // Trigger highlight refresh
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("smartcomments:refresh-highlights", {
                detail: { deletedComment: comment },
              }),
            );
          }
        } else {
          this.setError(result.message || "Failed to delete comment");
        }
      } catch (error) {
        this.setError("Error deleting comment");
        console.error("CommentsStore: Error deleting comment:", error);
      } finally {
        this.setLoading(false);
      }
    },

    /**
     * Complete a comment
     */
    async completeComment(comment) {
      this.setLoading(true);

      try {
        const { updateComment } = useComments();
        const result = await updateComment(
          comment.id || comment.data_id,
          "completed",
          "", // Send empty text when updating status
        );

        if (result.success === "1" || result.success === true) {
          this.updateComment(comment.id || comment.data_id, {
            status: "completed",
          });

          // Trigger comment completed event
          smartCommentsEvents.triggerCommentCompleted(comment);

          // Clear highlighting for the completed comment
          const { removeCommentHighlight } = useHighlightManager();
          removeCommentHighlight(comment.id || comment.data_id);

          // Trigger highlight refresh
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("smartcomments:refresh-highlights", {
                detail: { completedComment: comment },
              }),
            );
          }
          this.closeCommentDialog();
        } else {
          this.setError(result.message || "Failed to complete comment");
        }
      } catch (error) {
        this.setError("Error completing comment");
        console.error("CommentsStore: Error completing comment:", error);
      } finally {
        this.setLoading(false);
      }
    },

    /**
     * View page for comment
     */
    viewPage(comment) {
      // Navigate to the SmartComments special page
      const specialPageUrl = mw.util.getUrl("Special:SmartComments", {
        page: mw.config.get("wgPageName"),
      });

      // Open in new window/tab to keep the current page accessible
      window.open(specialPageUrl, "_blank");
    },

    /**
     * Close all dialogs (useful for global state changes)
     */
    closeAllDialogs() {
      this.closeCommentDialog();
      this.closeNewCommentDialog();
    },

    /**
     * Set active highlight for a comment
     */
    setActiveHighlight(commentId, scrollIntoView = false) {
      // First clear any existing active highlights
      this.clearActiveHighlight();

      // Find elements with the specific comment highlight class
      const specificClass = `smartcomment-hl-${commentId}`;
      const highlightElements = document.querySelectorAll(`.${specificClass}`);

      highlightElements.forEach((element) => {
        element.classList.add("active");
      });

      // Also check for elements with data-comment-id attribute
      const dataElements = document.querySelectorAll(
        `[data-comment-id="${commentId}"]`,
      );
      dataElements.forEach((element) => {
        element.classList.add("active");
      });

      // Scroll the first active element into view if requested
      if (scrollIntoView) {
        const firstActiveElement = highlightElements[0] || dataElements[0];
        if (firstActiveElement) {
          firstActiveElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }
    },

    /**
     * Clear all active highlights
     */
    clearActiveHighlight() {
      // Remove active class from all highlighted elements
      const activeElements = document.querySelectorAll(
        '[class*="smartcomment-hl-"].active, [data-comment-id].active',
      );
      activeElements.forEach((element) => {
        element.classList.remove("active");
      });
    },

    /**
     * Handle reply added to comment
     */
    handleReplyAdded(replyData) {
      // Update the active comment in the store with the new reply
      if (this.activeComment && replyData.comment) {
        const commentId = replyData.comment.id || replyData.comment.data_id;
        this.updateComment(commentId, {
          replies: replyData.comment.replies,
        });
      }

      // Trigger highlight refresh to update timeline indicators
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("smartcomments:refresh-highlights", {
            detail: {
              replyAdded: true,
              replyData,
            },
          }),
        );
      }
    },

    /**
     * Open a comment dialog by ID (for URL parameter handling)
     * @param {string|number} commentId - The comment ID to open
     */
    async openCommentDialogById(commentId) {
      if (!commentId) return;

      this.setLoading(true);
      this.clearError();

      try {
        const { getComment } = useComments();
        const fetchedComment = await getComment(commentId);

        if (fetchedComment) {
          // Find the highlight element for this comment
          const highlightElement = document.querySelector(
            `.smartcomment-hl-${commentId}`,
          );

          let position;
          if (highlightElement) {
            // Use the highlight element position
            const rect = highlightElement.getBoundingClientRect();
            position = {
              top: rect.top + window.scrollY,
              left: rect.left + window.scrollX,
              bottom: rect.bottom + window.scrollY,
              right: rect.right + window.scrollX,
              width: rect.width,
              height: rect.height,
            };
          } else {
            // Fallback position if no highlight found (broken comment)
            position = {
              top: 100,
              left: 100,
              bottom: 150,
              right: 400,
              width: 300,
              height: 50,
            };
          }

          this.activeComment = fetchedComment;
          this.commentPosition = position;
          this.isCommentDialogVisible = true;
          this.setCurrentComment(fetchedComment.id || fetchedComment.data_id);

          // Set active highlight and scroll into view
          this.setActiveHighlight(
            fetchedComment.data_id || fetchedComment.id,
            true,
          );

          // Update the comments array if this comment isn't already in it
          const existingIndex = this.comments.findIndex(
            (comment) =>
              (comment.id && comment.id === commentId) ||
              (comment.data_id && comment.data_id === commentId),
          );
          if (existingIndex === -1) {
            this.comments.push(fetchedComment);
          }
        } else {
          this.setError("Comment not found");
          console.error("CommentsStore: Comment not found for ID:", commentId);
        }
      } catch (error) {
        this.setError("Error fetching comment");
        console.error("CommentsStore: Error fetching comment by ID:", error);
      } finally {
        this.setLoading(false);
      }
    },

    /**
     * Check URL parameters and open comment if commentId or focusId is present
     */
    async checkAndOpenCommentFromUrl() {
      const urlParams = new URLSearchParams(window.location.search);
      const commentId = urlParams.get("commentId") || urlParams.get("focusId");

      if (commentId) {
        await this.openCommentDialogById(commentId);
      }
    },

    /**
     * Alias for openCommentDialogById for consistency
     * @param {string|number} commentId - The comment ID to open
     */
    async openCommentById(commentId) {
      return await this.openCommentDialogById(commentId);
    },
  },
});

/**
 * Helper function to get the document position of an element
 * @param {Element} element - The element to get position for
 * @returns {number} - The position in the document (distance from top in pixels)
 */
function getElementDocumentPosition(element) {
  if (!element) return Number.MAX_SAFE_INTEGER;

  const rect = element.getBoundingClientRect();
  const scrollY = window.scrollY || window.pageYOffset;
  return rect.top + scrollY;
}

/**
 * Helper function to find an element by selector
 * @param {string} selector - The CSS selector
 * @returns {Element|null} - The found element or null
 */
function findElementBySelector(selector) {
  if (!selector) return null;

  try {
    // Clean the selector if it's a complex selector from the backend
    let cleanSelector = selector;

    // Handle image selectors that start with "img:"
    if (selector.startsWith("img:")) {
      cleanSelector = selector.substring(4);
    }

    // Handle SVG selectors
    if (selector.startsWith("svg:")) {
      cleanSelector = selector.substring(4);
    }

    return document.querySelector(cleanSelector);
  } catch (error) {
    console.warn("Invalid selector:", selector, error);
    return null;
  }
}

/**
 * Helper function to find text position in document
 * @param {string} text - The text to find
 * @param {number} index - The index of the text occurrence
 * @returns {number} - The position in the document
 */
function findTextPositionInDocument(text, index = 0) {
  if (!text) return Number.MAX_SAFE_INTEGER;

  try {
    // Create a tree walker to find all text nodes
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false,
    );

    let currentIndex = 0;
    let node;

    while ((node = walker.nextNode())) {
      const nodeText = node.textContent || "";
      const textIndex = nodeText.indexOf(text);

      if (textIndex !== -1) {
        if (currentIndex === index) {
          // Found the correct occurrence, get its position
          const range = document.createRange();
          range.setStart(node, textIndex);
          range.setEnd(node, textIndex + text.length);

          const rect = range.getBoundingClientRect();
          const scrollY = window.scrollY || window.pageYOffset;
          return rect.top + scrollY;
        }
        currentIndex++;
      }
    }

    // If text not found, return a high value
    return Number.MAX_SAFE_INTEGER;
  } catch (error) {
    console.warn("Error finding text position:", error);
    return Number.MAX_SAFE_INTEGER;
  }
}
