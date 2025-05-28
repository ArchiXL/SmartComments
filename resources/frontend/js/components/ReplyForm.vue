<template>
    <div class="smartcomments-reply-form">
        <div class="smartcomments-reply-form-header">
            <p>Reageren</p>
        </div>
        <div class="smartcomments-reply-form-body">
            <textarea 
                class="smartcomments-reply-form-body-textarea" 
                v-model="reply" 
                placeholder="Typ hier je bericht..."
                @focus="onFocus"
                @blur="onBlur"
                @input="onInput"
                :aria-label="'Reactie op ' + comment.author"
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
                    Annuleren
                </button>
                <button 
                    class="smartcomments-reply-form-submit" 
                    @click="submitReply"
                    :disabled="!canSubmit"
                    type="submit"
                >
                    Reactie plaatsen
                </button>
            </div>
        </div>
    </div>
</template>

<script>
const { defineComponent } = require('vue');

module.exports = defineComponent({
    name: 'ReplyForm',
    data() {
        return {
            reply: '',
            isFocused: false,
            hasContent: false,
            isSubmitting: false,
        }
    },
    props: {
        comment: {
            type: Object,
            required: true,
        },
    },
    emits: ['reply-submitted'],
    computed: {
        showActions() {
            return this.isFocused || this.hasContent;
        },
        canSubmit() {
            return this.reply.trim().length > 0 && !this.isSubmitting;
        }
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
                if (this.comment.reply && typeof this.comment.reply === 'function') {
                    const success = await this.comment.reply(this.reply);
                    
                    if (success) {
                        // Create reply data for the event
                        const replyData = {
                            text: this.reply,
                            author: mw.config.get('wgUserName'),
                            datetime: new Date().toISOString()
                        };

                        // Emit the reply-submitted event
                        this.$emit('reply-submitted', replyData);

                        // Reset form
                        this.reply = '';
                        this.hasContent = false;
                        this.isFocused = false;
                        
                        console.log('Reply submitted successfully');
                    } else {
                        console.error('Failed to submit reply');
                        // Could show user feedback here
                    }
                } else {
                    console.error('Comment object does not have a reply method');
                }
            } catch (error) {
                console.error('Error submitting reply:', error);
            } finally {
                this.isSubmitting = false;
            }
        },
        cancelReply() {
            this.reply = '';
            this.hasContent = false;
            this.isFocused = false;
            this.$refs.textarea.blur();
        }
    }
});
</script>

<style lang="less">
.smartcomments-reply-form {
    margin-left: -3px;
    padding: .5em 1em 1em;
    padding-left: ~"calc(1em + 3px)";
    background: #f9f9f9;
    border-top: 1px solid #ccc;
    border-left: 1px solid #ccc;
    font-size: .85em;

    &-footer {
        transition: all 0.2s ease-in-out;
    }

    &-actions {
        display: flex;
        gap: 0.5em;
        justify-content: flex-end;
        align-items: center;
    }

    textarea {
        border: 1px solid #a2a9b1;
        border-radius: 2px;
        padding: 5px 8px;
        font-family: inherit;
        resize: vertical;
        margin-bottom: .5em;
        height: 2.2em;
        min-height: 2.2em;
        transition: height 0.2s ease-in-out;
        width: 100%;
        box-sizing: border-box;
        
        &:focus {
            height: 75px;
            min-height: 75px;
            outline: 2px solid #36c;
            outline-offset: -1px;
        }
    }

    button {
        border: 1px solid #a2a9b1;
        border-radius: 2px;
        padding: .5em 1em;
        font-weight: bold;
        cursor: pointer;
        font-size: .9em;
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