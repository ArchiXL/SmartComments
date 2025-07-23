<template>
  <div v-if="show" class="smartcomments-image-modal" @click="$emit('close')">
    <div class="smartcomments-image-modal-content" @click.stop>
      <button class="smartcomments-image-modal-close" @click="$emit('close')">&times;</button>
      <img 
        :src="imageSrc" 
        :alt="imageAlt" 
        class="smartcomments-image-modal-image"
        @error="handleImageError"
      />
    </div>
  </div>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "ImageModal",
  props: {
    show: {
      type: Boolean,
      default: false,
    },
    imageSrc: {
      type: String,
      required: true,
    },
    imageAlt: {
      type: String,
      default: "Image",
    },
  },
  emits: ["close"],
  setup(props, { emit }) {
    const handleImageError = (event) => {
      console.warn("Failed to load modal image:", event.target.src);
      emit('close');
    };

    return {
      handleImageError,
    };
  },
});
</script>

<style lang="less" scoped>
.smartcomments-image-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  cursor: pointer;

  .smartcomments-image-modal-content {
    position: relative;
    max-width: 90%;
    max-height: 90%;
    cursor: default;

    .smartcomments-image-modal-close {
      position: absolute;
      top: -40px;
      right: 0;
      background: none;
      border: none;
      font-size: 30px;
      color: white;
      cursor: pointer;
      padding: 5px 10px;
      border-radius: 50%;
      transition: background-color 0.2s ease;

      &:hover {
        background-color: rgba(255, 255, 255, 0.2);
      }
    }

    .smartcomments-image-modal-image {
      max-width: 100%;
      max-height: 100%;
      border-radius: 8px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }
  }
}
</style>