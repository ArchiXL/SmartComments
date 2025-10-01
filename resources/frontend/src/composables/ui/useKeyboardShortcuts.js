/**
 * Composable for managing keyboard shortcuts
 */
function useKeyboardShortcuts(commentsStore) {
  /**
   * Handle keyboard shortcuts
   */
  const handleKeydown = (event) => {
    if (event.key === "Escape" && commentsStore.isCommentDialogVisible) {
      // If image modal is open, close it first
      if (commentsStore.isImageModalVisible) {
        commentsStore.closeImageModal();
      } else {
        // Otherwise close the comment dialog
        commentsStore.closeCommentDialog();
      }
    } else if (event.key === "ArrowDown" && commentsStore.hasNextComment) {
      commentsStore.navigateComment("next");
    } else if (event.key === "ArrowUp" && commentsStore.hasPreviousComment) {
      commentsStore.navigateComment("previous");
    }
  };

  /**
   * Setup keyboard event listeners
   */
  const setupKeyboardShortcuts = () => {
    document.addEventListener("keydown", handleKeydown);

    return () => {
      document.removeEventListener("keydown", handleKeydown);
    };
  };

  return {
    setupKeyboardShortcuts,
  };
}

export default useKeyboardShortcuts;
