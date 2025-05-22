<template>
    <div class="smartcomments-comment-actions">
        <div class="smartcomments-comment-actions-item" v-for="action in actions" :key="action.icon">
            <button class="smartcomments-comment-actions-item-button" @click="action.action">
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
                    label: 'sluiten',
                    action: () => {
                        this.$emit('close');
                    }
                },
                {
                    icon: 'oo-ui-icon-check',
                    label: 'markeren als afgehandeld',
                    action: () => {
                        this.$emit('complete', this.comment);
                    }
                },
                {
                    icon: 'oo-ui-icon-trash',
                    label: 'verwijderen',
                    action: () => {
                        this.$emit('delete', this.comment);
                    }
                },
                {
                    icon: 'oo-ui-icon-articles',
                    label: 'Paginaoverzicht bekijken',
                    action: () => {
                        this.$emit('view', this.comment);
                    }
                }
            ]
        }
    },
    created() {
        console.log('CommentActions created', this.comment);
    }
})
</script>