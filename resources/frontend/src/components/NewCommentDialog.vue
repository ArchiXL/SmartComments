<template>
  <!-- Backdrop overlay -->
  <div
    class="smartcomments-dialog-overlay"
    v-if="isVisible"
    @click="handleBackdropClick"
  >
    <div
      class="smartcomments-new-comment-dialog"
      :style="dialogStyle"
      @click.stop
    >
      <div class="smartcomments-new-comment-content">
        <!-- Header -->
        <div class="smartcomments-dialog-header">
          <span class="smartcomments-dialog-title">{{ title }}</span>
          <button
            class="smartcomments-dialog-close"
            @click="handleCancel"
            :data-tooltip="messages.close()"
          >
            <span class="oo-ui-iconElement-icon oo-ui-icon-close"></span>
          </button>
        </div>

        <!-- Selected content preview -->
        <div class="smartcomments-selected-content" v-if="selectionData">
          <div class="smartcomments-selected-text">
            <strong>{{ t("selectedText") }}:</strong>
            <div class="smartcomments-selection-preview">
              {{ selectionData.text }}
            </div>
          </div>
          <img
            v-if="selectionData.image"
            class="smartcomments-selected-image"
            :src="selectionData.image"
            :alt="t('selectedImage')"
          />
        </div>

        <!-- Comment input -->
        <div class="smartcomments-comment-input-wrapper">
          <label
            for="smartcomments-comment-input"
            class="smartcomments-input-label"
          >
            {{ messages.commentInput() }}
          </label>
          <textarea
            id="smartcomments-comment-input"
            v-model="commentText"
            class="smartcomments-comment-input"
            :placeholder="t('commentPlaceholder')"
            rows="4"
            ref="commentInput"
            @keydown="handleKeydown"
          ></textarea>
          <div v-if="error" class="smartcomments-error-message">
            {{ error }}
          </div>
        </div>

        <!-- Actions -->
        <div class="smartcomments-dialog-actions">
          <button
            class="smartcomments-button smartcomments-button-cancel"
            @click="handleCancel"
            :disabled="isSaving"
          >
            {{ messages.cancel() }}
          </button>
          <button
            class="smartcomments-button smartcomments-button-save"
            @click="handleSave"
            :disabled="!canSave || isSaving"
          >
            <span v-if="isSaving">{{ t("saving") }}</span>
            <span v-else>{{ messages.save() }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {
  defineComponent,
  ref,
  computed,
  nextTick,
  onMounted,
  onUnmounted,
} from "vue";
import useComments from "../composables/features/useComments.js";
import useMessages from "../composables/core/useMessages.js";

export default defineComponent({
  name: "NewCommentDialog",
  props: {
    isVisible: {
      type: Boolean,
      default: false,
    },
    selectionData: {
      type: Object,
      default: null,
    },
    title: {
      type: String,
      default: "",
    },
  },
  emits: ["close", "save", "cancel"],
  setup(props, { emit }) {
    const commentText = ref("");
    const error = ref("");
    const isSaving = ref(false);
    const commentInput = ref(null);

    const { saveComment } = useComments();
    const { messages, msg } = useMessages();

    // Computed title with fallback
    const computedTitle = computed(() => {
      return props.title || messages.newCommentTitle();
    });

    // Translation helper function for inline use
    const t = (key) => {
      const translations = {
        selectedText: msg("sc-selected-text", "Selected text"),
        selectedImage: msg("sc-selected-image", "Selected image"),
        commentPlaceholder: msg(
          "sc-comment-placeholder",
          "Enter your comment...",
        ),
        saving: msg("sc-saving", "Saving..."),
      };
      return translations[key] || key;
    };

    const canSave = computed(() => {
      return commentText.value.trim().length > 0;
    });

    const dialogStyle = computed(() => {
      return {
        // Always center the dialog
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    });

    const handleCancel = () => {
      commentText.value = "";
      error.value = "";
      emit("cancel");
      emit("close");
    };

    const handleSave = async () => {
      if (!canSave.value) {
        error.value = messages.errorEmpty();
        return;
      }

      isSaving.value = true;
      error.value = "";

      try {
        const result = await saveComment(
          commentText.value,
          props.selectionData,
        );

        if (result.success === "1" || result.success === true) {
          // Success
          emit("save", {
            text: commentText.value,
            result: result,
          });

          // Reset form
          commentText.value = "";

          // Show success message
          if (window.mw && window.mw.notify) {
            window.mw.notify(messages.commentAdded(), { type: "success" });
          }

          emit("close");
        } else {
          // Error
          error.value = result.message || messages.apiError();
        }
      } catch (err) {
        error.value = messages.apiError();
        console.error("Error saving comment:", err);
      } finally {
        isSaving.value = false;
      }
    };

    const handleKeydown = (event) => {
      if (event.key === "Escape") {
        handleCancel();
      } else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        handleSave();
      }
    };

    // Global escape key handler
    const handleGlobalKeydown = (event) => {
      if (event.key === "Escape" && props.isVisible) {
        handleCancel();
      }
    };

    // Body class management for preventing scroll
    const manageBodyClass = () => {
      if (props.isVisible) {
        document.body.classList.add("smartcomments-dialog-open");
      } else {
        document.body.classList.remove("smartcomments-dialog-open");
      }
    };

    // Focus the input when dialog becomes visible
    const focusInput = async () => {
      if (props.isVisible && commentInput.value) {
        await nextTick();
        commentInput.value.focus();
      }
    };

    onMounted(() => {
      document.addEventListener("keydown", handleGlobalKeydown);
    });

    onUnmounted(() => {
      document.removeEventListener("keydown", handleGlobalKeydown);
      document.body.classList.remove("smartcomments-dialog-open");
    });

    const handleBackdropClick = () => {
      handleCancel();
    };

    return {
      commentText,
      error,
      isSaving,
      commentInput,
      canSave,
      dialogStyle,
      handleCancel,
      handleSave,
      handleKeydown,
      focusInput,
      handleBackdropClick,
      manageBodyClass,
      messages,
      t,
      title: computedTitle,
    };
  },
  watch: {
    isVisible: {
      handler(newValue) {
        this.manageBodyClass();
        if (newValue) {
          this.focusInput();
        }
      },
      immediate: true,
    },
  },
});
</script>

<style lang="less">
/* Backdrop overlay */
.smartcomments-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}

.smartcomments-new-comment-dialog {
  background: #fff;
  border: 1px solid #a2a9b1;
  border-radius: 4px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  min-width: 400px;
  max-width: 70%;
  max-height: 80vh;
  overflow-y: auto;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Lato",
    "Helvetica", "Arial", sans-serif;
  font-size: 14px;
  animation: fadeInScale 0.2s ease-out;

  .smartcomments-new-comment-content {
    padding: 0;
  }

  .smartcomments-dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid #a2a9b1;
    background: #f8f9fa;

    .smartcomments-dialog-title {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #222;
    }

    .smartcomments-dialog-close {
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 4px;
      border-radius: 2px;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
        background: #e4e6ea;
      }

      &:focus {
        outline: 2px solid #36c;
        outline-offset: 1px;
      }

      .oo-ui-iconElement-icon {
        width: 20px;
        height: 20px;
        background-size: contain;
        position: relative;
      }
    }
  }

  .smartcomments-selected-content {
    background: #f8f9fa;
    text-align: center;

    .smartcomments-selected-text {
      padding: 16px;
      margin-bottom: 12px;
      display: none;

      strong {
        display: block;
        margin-bottom: 4px;
        color: #222;
      }

      .smartcomments-selection-preview {
        padding: 8px 12px;
        background: #fff;
        border: 1px solid #a2a9b1;
        border-radius: 2px;
        font-style: italic;
        color: #555;
        max-height: 60px;
        overflow-y: auto;
        margin: 0 auto;
      }
    }

    .smartcomments-selected-image {
      max-width: 100%;
      max-height: 150px;
      border-bottom: 1px solid #eaecf0;
      margin: 0 auto;
    }
  }

  .smartcomments-comment-input-wrapper {
    padding: 16px;

    .smartcomments-input-label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #222;
    }

    .smartcomments-comment-input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #a2a9b1;
      border-radius: 2px;
      font-family: inherit;
      font-size: 14px;
      line-height: 1.4;
      resize: vertical;
      min-height: 80px;
      box-sizing: border-box;

      &:focus {
        outline: none;
        border-color: #36c;
        box-shadow: inset 0 0 0 1px #36c;
      }

      &::placeholder {
        color: #72777d;
      }
    }

    .smartcomments-error-message {
      margin-top: 8px;
      padding: 8px 12px;
      background: #fee7e6;
      border: 1px solid #d33;
      border-radius: 2px;
      color: #d33;
      font-size: 13px;
    }
  }

  .smartcomments-dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid #a2a9b1;
    background: #f8f9fa;

    .smartcomments-button {
      padding: 8px 16px;
      border: 1px solid #a2a9b1;
      border-radius: 2px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.1s ease;

      &:focus {
        outline: 2px solid #36c;
        outline-offset: 1px;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &.smartcomments-button-cancel {
        background: #f8f9fa;
        color: #222;

        &:hover:not(:disabled) {
          background: #e4e6ea;
          border-color: #72777d;
        }
      }

      &.smartcomments-button-save {
        background: #36c;
        color: #fff;
        border-color: #36c;

        &:hover:not(:disabled) {
          background: #2a4b8d;
          border-color: #2a4b8d;
        }

        &:disabled {
          background: #c8ccd1;
          border-color: #c8ccd1;
          color: #72777d;
        }
      }
    }
  }
}

/* Animation for dialog appearance */
@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

/* Ensure proper stacking and prevent body scroll when dialog is open */
body.smartcomments-dialog-open {
  overflow: hidden;
}
</style>
