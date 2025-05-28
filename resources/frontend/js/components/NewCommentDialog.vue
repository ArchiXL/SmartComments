<template>
    <div class="smartcomments-new-comment-dialog" :style="dialogStyle" v-if="isVisible">
        <div class="smartcomments-new-comment-content">
            <!-- Header -->
            <div class="smartcomments-dialog-header">
                <span class="smartcomments-dialog-title">{{ title }}</span>
                <button 
                    class="smartcomments-dialog-close" 
                    @click="handleCancel"
                    data-tooltip="Sluiten"
                >
                    <span class="oo-ui-iconElement-icon oo-ui-icon-close"></span>
                </button>
            </div>

            <!-- Selected content preview -->
            <div class="smartcomments-selected-content" v-if="selectionData">
                <div class="smartcomments-selected-text">
                    <strong>Geselecteerde tekst:</strong>
                    <div class="smartcomments-selection-preview">{{ selectionData.text }}</div>
                </div>
                <img 
                    v-if="selectionData.image" 
                    class="smartcomments-selected-image" 
                    :src="selectionData.image" 
                    alt="Geselecteerde afbeelding"
                />
            </div>

            <!-- Comment input -->
            <div class="smartcomments-comment-input-wrapper">
                <label for="smartcomments-comment-input" class="smartcomments-input-label">
                    Nieuwe opmerking
                </label>
                <textarea
                    id="smartcomments-comment-input"
                    v-model="commentText"
                    class="smartcomments-comment-input"
                    placeholder="Voer uw opmerking in..."
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
                    Annuleren
                </button>
                <button 
                    class="smartcomments-button smartcomments-button-save" 
                    @click="handleSave"
                    :disabled="!canSave || isSaving"
                >
                    <span v-if="isSaving">Opslaan...</span>
                    <span v-else>Opslaan</span>
                </button>
            </div>
        </div>
    </div>
</template>

<script>
const { defineComponent, ref, computed, nextTick } = require('vue');
const useComments = require('../composables/useComments.js');

module.exports = defineComponent({
    name: 'NewCommentDialog',
    props: {
        isVisible: {
            type: Boolean,
            default: false
        },
        position: {
            type: Object,
            default: null
        },
        selectionData: {
            type: Object,
            default: null
        },
        title: {
            type: String,
            default: 'Nieuwe opmerking'
        }
    },
    emits: ['close', 'save', 'cancel'],
    setup(props, { emit }) {
        const commentText = ref('');
        const error = ref('');
        const isSaving = ref(false);
        const commentInput = ref(null);

        const { saveComment } = useComments();

        const canSave = computed(() => {
            return commentText.value.trim().length > 0;
        });

        const dialogStyle = computed(() => {
            if (!props.position) {
                return {
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)'
                };
            }

            // Position the dialog near the selection but ensure it's visible
            const viewport = {
                width: window.innerWidth,
                height: window.innerHeight
            };

            const dialogWidth = 400;
            const dialogHeight = 300;

            let left = props.position.x + 10;
            let top = props.position.y + 10;

            // Ensure dialog doesn't go off the right edge
            if (left + dialogWidth > viewport.width) {
                left = props.position.x - dialogWidth - 10;
            }

            // Ensure dialog doesn't go off the bottom edge
            if (top + dialogHeight > viewport.height) {
                top = props.position.y - dialogHeight - 10;
            }

            // Ensure dialog doesn't go off the left or top edges
            left = Math.max(10, left);
            top = Math.max(10, top);

            return {
                left: `${left}px`,
                top: `${top}px`
            };
        });

        const handleCancel = () => {
            commentText.value = '';
            error.value = '';
            emit('cancel');
            emit('close');
        };

        const handleSave = async () => {
            if (!canSave.value) {
                error.value = 'Voer een opmerking in';
                return;
            }

            isSaving.value = true;
            error.value = '';

            try {
                const result = await saveComment(commentText.value, props.selectionData);

                if (result.success === '1' || result.success === true) {
                    // Success
                    emit('save', {
                        text: commentText.value,
                        result: result
                    });
                    
                    // Reset form
                    commentText.value = '';
                    
                    // Show success message and refresh page
                    if (window.mw && window.mw.notify) {
                        window.mw.notify('Opmerking toegevoegd! De pagina wordt ververst...', { type: 'success' });
                    }
                    
                    setTimeout(() => {
                        const parser = new URL(window.location);
                        parser.searchParams.set('action', 'screfresh');
                        window.location = parser.href;
                    }, 2000);
                    
                    emit('close');
                } else {
                    // Error
                    error.value = result.message || 'Er is een fout opgetreden bij het opslaan';
                }
            } catch (err) {
                error.value = 'Er is een fout opgetreden bij het opslaan';
                console.error('Error saving comment:', err);
            } finally {
                isSaving.value = false;
            }
        };

        const handleKeydown = (event) => {
            if (event.key === 'Escape') {
                handleCancel();
            } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                handleSave();
            }
        };

        // Focus the input when dialog becomes visible
        const focusInput = async () => {
            if (props.isVisible && commentInput.value) {
                await nextTick();
                commentInput.value.focus();
            }
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
            focusInput
        };
    },
    watch: {
        isVisible: {
            handler(newValue) {
                if (newValue) {
                    this.focusInput();
                }
            },
            immediate: true
        }
    }
});
</script>

<style lang="less">
.smartcomments-new-comment-dialog {
    position: fixed;
    z-index: 10000;
    background: #fff;
    border: 1px solid #a2a9b1;
    border-radius: 2px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    min-width: 400px;
    max-width: 500px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Lato', 'Helvetica', 'Arial', sans-serif;
    font-size: 14px;

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

            .oo-ui-iconElement-icon {
                width: 20px;
                height: 20px;
                background-size: contain;
                position: relative;
            }
        }
    }

    .smartcomments-selected-content {
        padding: 16px;
        border-bottom: 1px solid #eaecf0;
        background: #f8f9fa;

        .smartcomments-selected-text {
            margin-bottom: 12px;

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
            }
        }

        .smartcomments-selected-image {
            max-width: 100%;
            max-height: 150px;
            border: 1px solid #a2a9b1;
            border-radius: 2px;
            display: none;
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

/* Overlay to prevent interaction with the rest of the page */
.smartcomments-dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: 9999;
}
</style> 