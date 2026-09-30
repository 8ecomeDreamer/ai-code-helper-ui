<template>
  <div class="loading-dots">
    <div class="dot"></div>
    <div class="dot"></div>
    <div class="dot"></div>
  </div>
</template>

<script>
export default {
  name: 'LoadingDots'
}
</script>

<style scoped>
.loading-dots {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 5px;
  padding: 6px 2px;
  color: var(--c-primary, #2f5496);
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: currentColor;
  animation: bounce 1.4s infinite ease-in-out;
}

.dot:nth-child(1) {
  animation-delay: -0.32s;
}

.dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0.4);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
