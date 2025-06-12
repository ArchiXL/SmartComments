<template>
  <div class="smartcomments-comment-actions">
    <div
        class="smartcomments-comment-actions-item"
        v-for="action in filteredActions"
        :key="action.icon"
        :class="`align-${action.align}`"
        :style="action.style"
    >
      <!-- Simple action button without sub-items -->
      <button
          v-if="!action.items"
          class="smartcomments-comment-actions-item-button"
          @click="action.action"
          :data-tooltip="action.label"
      >
        <span class="oo-ui-iconElement-icon" :class="action.icon"></span>
        <span
            class="smartcomments-visually-hidden"
            v-html="action.label"
        ></span>
      </button>

      <!-- Dropdown action button with sub-items -->
      <div
          v-else
          class="smartcomments-dropdown"
          :class="{ 'is-open': dropdownStates[action.icon] }"
      >
        <button
            class="smartcomments-comment-actions-item-button smartcomments-dropdown-toggle"
            @click="toggleDropdown(action.icon)"
            :data-tooltip="action.label"
        >
          <span class="oo-ui-iconElement-icon" :class="action.icon"></span>
          <span
              class="smartcomments-visually-hidden"
              v-html="action.label"
          ></span>
        </button>

        <div
            class="smartcomments-dropdown-menu"
            v-if="dropdownStates[action.icon]"
        >
          <button
              v-for="subItem in action.items"
              :key="subItem.icon"
              class="smartcomments-dropdown-item"
              @click="handleSubItemClick(subItem, action.icon)"
              :style="subItem.style"
          >
            <span class="oo-ui-iconElement-icon" :class="subItem.icon"></span>
            <span v-html="subItem.label"></span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {defineComponent, computed, ref} from "vue";
import useUserStore from "../store/userStore.js";
import useCommentsStore from "../store/commentsStore.js";
import useMessages from "../composables/core/useMessages.js";

export default defineComponent( {
  name: "CommentActions",
  props: {
    comment: {
      type: Object,
      required: true,
    },
  },
  setup( props, {emit} ) {
    const userStore = useUserStore();
    const commentsStore = useCommentsStore();
    const {messages} = useMessages();

    const actions = computed( () => [
      {
        icon: "oo-ui-icon-arrowPrevious",
        label: messages.previousComment(),
        align: "left",
        action: () => {
          emit( "previous" );
        },
        when: () => {
          return commentsStore.hasPreviousComment;
        },
      },
      {
        icon: "oo-ui-icon-arrowNext",
        label: messages.nextComment(),
        align: "left",
        action: () => {
          emit( "next" );
        },
        when: () => {
          return commentsStore.hasNextComment;
        },
      },
      {
        icon: "oo-ui-icon-ellipsis",
        label: messages.actions(),
        align: "right",
        items: [
          {
            icon: "oo-ui-icon-check",
            label: messages.markComplete(),
            style: "",
            action: () => {
              emit( "complete", props.comment );
            },
          },
          {
            icon: "oo-ui-icon-trash",
            label: messages.markDelete(),
            style: "",
            action: () => {
              emit( "delete", props.comment );
            },
          },
          {
            icon: "oo-ui-icon-articles",
            label: messages.viewOverview(),
            style: "",
            action: () => {
              emit( "view", props.comment );
            },
          },
        ],
        when: () => {
          return userStore.canManageComments;
        },
      },
      {
        icon: "oo-ui-icon-close",
        label: messages.close(),
        align: "right",
        action: () => {
          emit( "close" );
        },
        when: () => {
          return true;
        },
      },
    ] );

    const filteredActions = computed( () => {
      return actions.value.filter( ( action ) => action.when() );
    } );

    const dropdownStates = ref( {} );

    const toggleDropdown = ( icon ) => {
      dropdownStates.value[ icon ] = !dropdownStates.value[ icon ];
    };

    const handleSubItemClick = ( subItem, icon ) => {
      subItem.action();
      dropdownStates.value[ icon ] = false;
    };

    return {
      filteredActions,
      dropdownStates,
      toggleDropdown,
      handleSubItemClick,
    };
  },
} );
</script>

<style lang="less">
.smartcomments-comment-actions {
  display: flex;
  align-items: center;
  padding: 8px 8px 0;

  .smartcomments-comment-actions-item {
    &.align-left {
      order: -1;
    }

    &.align-right {
      order: 1;
      margin-left: auto;

      & + .align-right {
        margin-left: 0;
      }
    }
  }

  span.oo-ui-iconElement-icon {
    width: 14px;
    height: 14px;
    min-width: 14px;
    min-height: 14px;
    position: relative;
  }

  button {
    background: transparent;
    cursor: pointer;
    position: relative;
    padding: 8px;
    display: flex;
    border: none;

    &:hover {
      background: #e0e0e0;
    }
  }

  .smartcomments-dropdown {
    position: relative;
    display: inline-block;

    .smartcomments-dropdown-menu {
      position: absolute;
      top: 100%;
      right: 0;
      background: white;
      border: 1px solid #c8ccd1;
      border-radius: 2px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      min-width: 200px;
      z-index: 1000;

      .smartcomments-dropdown-item {
        display: flex;
        align-items: center;
        width: 100%;
        padding: 8px 8px;
        text-align: left;
        background: transparent;
        border: none;
        cursor: pointer;
        font-size: 13px;

        &:hover {
          background: #e0e0e0;
        }

        span.oo-ui-iconElement-icon {
          margin-right: 4px;
        }
      }
    }
  }
}
</style>
