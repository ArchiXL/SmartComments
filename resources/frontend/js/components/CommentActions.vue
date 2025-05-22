<template>
    <div class="smartcomments-comment-actions">
        <div class="smartcomments-comment-actions-item" v-for="action in actions" :key="action.icon">
            <button class="smartcomments-comment-actions-item-button" @click="action.action">
                <i :class="action.icon"></i>
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
                    icon: 'fas fa-times',
                    label: 'sluiten',
                    action: () => {
                        this.$emit('close');
                    }
                },
                {
                    icon: 'fas fa-check',
                    label: 'markeren als afgehandeld',
                    action: () => {
                        this.comment.markAsHandled();
                    }
                },
                {
                    icon: 'fas fa-trash',
                    label: 'verwijderen',
                    action: () => {
                        this.comment.delete();
                    }
                },
                {
                    icon: 'fas fa-articles',
                    label: 'Paginaoverzicht bekijken',
                    action: () => {
                        this.comment.viewPage();
                    }
                }
            ]
        }
    },
    created() {
        console.log('CommentActions created');
    }
})
</script>