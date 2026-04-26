<script setup lang="ts">
const props = defineProps({
  message: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['remove'])

const handleAnimationEnd = () => {
  emit('remove')
}
</script>

<template>
  <div
    class="toast__item"
    @animationend="handleAnimationEnd"
  >
    <span class="item__emoji">{{ props.message.split(' ')[0] }}</span>
    <span class="item__text">{{
      props.message.split(' ').slice(1).join(' ')
    }}</span>
  </div>
</template>

<style scoped>
.toast__item {
  margin-bottom: 6px;
  padding: 7px 16px 7px 12px;
  display: flex;
  align-items: center;
  gap: 7px;
  font-family: 'HarmonyOS Sans', system-ui;
  font-size: 13px;
  opacity: 0;
  background: rgba(20, 20, 20, 0.72);
  backdrop-filter: blur(12px);
  color: #fff;
  border-radius: var(--radius-pill);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.25),
    var(--shadow-inset);
  white-space: nowrap;
  transform: translateY(14px) scale(0.94);
  animation:
    toastIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
    toastOut 0.5s ease 2.2s forwards;

  .item__emoji {
    font-size: 1.15em;
    line-height: 1;
    animation: emojiJump 0.5s ease-in-out 2;
    flex-shrink: 0;
  }

  .item__text {
    letter-spacing: 0.2px;
  }
}

@keyframes toastIn {
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes toastOut {
  to {
    opacity: 0;
    transform: translateY(-18px) scale(0.9);
  }
}

@keyframes emojiJump {
  0%,
  100% {
    transform: translateY(0) rotate(0deg);
  }
  40% {
    transform: translateY(-5px) rotate(-8deg);
  }
  70% {
    transform: translateY(-2px) rotate(4deg);
  }
}
</style>
