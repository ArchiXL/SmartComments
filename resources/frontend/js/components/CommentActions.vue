<template>
    <div class="smartcomments-comment-actions">
        <div class="smartcomments-comment-actions-item" v-for="action in actions" :key="action.icon" :style="action.style">
            <button class="smartcomments-comment-actions-item-button" @click="action.action" :data-tooltip="action.label">
                <span class="oo-ui-iconElement-icon" :class="action.icon"></span>
                <span class="smartcomments-visually-hidden" v-html="action.label"></span>
            </button>
        </div>
    </div>
</template>

<script>
const { defineComponent } = require('vue');

module.exports = defineComponent({
    name: 'CommentActions',
    props: {
        comment: {
            type: Object,
            required: true,
        },
    },
    data() {
        return {
            actions: [
                {
                    icon: 'oo-ui-icon-close',
                    label: 'Sluiten',
                    style: 'flex: 1',
                    action: () => {
                        this.$emit('close');
                    },
                
                },
                {
                    icon: 'oo-ui-icon-check',
                    label: 'Markeren als afgehandeld',
                    style: '',
                    action: () => {
                        this.$emit('complete', this.comment);
                    }
                },
                {
                    icon: 'oo-ui-icon-trash',
                    label: 'Verwijderen',
                    style: '',
                    action: () => {
                        this.$emit('delete', this.comment);
                    }
                },
                {
                    icon: 'oo-ui-icon-articles',
                    label: 'Paginaoverzicht bekijken',
                    style: '',
                    action: () => {
                        this.$emit('view', this.comment);
                    }
                }
            ]
        }
    }
})
</script>

<style lang="less">
.smartcomments-comment-actions {
    border-bottom: 1px solid #c8ccd1;
    box-shadow: 0 1px 1px 0 rgba(0, 0, 0, 0.1);
    display: flex;
    justify-content: flex-end;

    button {
        background: transparent;
        cursor: pointer;
        position: relative;
        padding: .5em;
        display: flex;
        border: none;

        &:hover {
            background: #e0e0e0;
        }

        span.oo-ui-iconElement-icon {
            width: 24px;
            height: 24px;
            position: relative;
        }
    }
}
</style>