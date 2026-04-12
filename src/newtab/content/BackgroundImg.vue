<script setup lang="ts">
import { NSpin } from 'naive-ui'
import { localConfig } from '@/logic/store'
import { imageState, isImageLoading } from '@/logic/image'

const customOpacity = computed(() => localConfig.general.bgOpacity)

// Parallax effect: mouse moves -> background slightly shifts
const parallaxX = ref(0)
const parallaxY = ref(0)

// Dynamic parallax container expansion based on intensity
const parallaxExpansion = computed(() => {
  // Expand by 2x the intensity on each side (total 4x), intensity range ~0-30
  return localConfig.general.parallaxIntensity * 2
})

const containerStyle = computed(() => {
  const style: Record<string, any> = {}
  if (localConfig.general.isBackgroundImageEnabled) {
    style.backgroundImage = `url(${imageState.currBackgroundImageFileObjectURL})`
  }
  style['--parallax-x'] = `${parallaxX.value}px`
  style['--parallax-y'] = `${parallaxY.value}px`
  style['--parallax-expansion'] = `${parallaxExpansion.value}px`
  return style
})

let rafId: number | null = null

const handleMouseMove = (e: MouseEvent) => {
  if (!localConfig.general.isParallaxEnabled || !localConfig.general.isBackgroundImageEnabled) {
    return
  }

  // Cancel any pending frame
  if (rafId) {
    cancelAnimationFrame(rafId)
  }

  rafId = requestAnimationFrame(() => {
    const x = (e.clientX / window.innerWidth - 0.5) * 2 * localConfig.general.parallaxIntensity
    const y = (e.clientY / window.innerHeight - 0.5) * 2 * localConfig.general.parallaxIntensity
    parallaxX.value = x
    parallaxY.value = y
  })
}

// When mouse leaves, reset to center
const handleMouseLeave = () => {
  if (!localConfig.general.isParallaxEnabled || !localConfig.general.isBackgroundImageEnabled) {
    return
  }
  parallaxX.value = 0
  parallaxY.value = 0
}

// Add/remove event listeners based on parallax enabled state
const updateEventListeners = (enable: boolean) => {
  if (enable) {
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseleave', handleMouseLeave)
  } else {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseleave', handleMouseLeave)
    // Reset position when disabled
    parallaxX.value = 0
    parallaxY.value = 0
    if (rafId) {
      cancelAnimationFrame(rafId)
    }
  }
}

onMounted(() => {
  updateEventListeners(localConfig.general.isParallaxEnabled && localConfig.general.isBackgroundImageEnabled)
})

watch(
  () => localConfig.general.isParallaxEnabled && localConfig.general.isBackgroundImageEnabled,
  (shouldEnable) => {
    updateEventListeners(shouldEnable)
  },
)

const isShowLoadingSpinner = ref(false)

let loadingTimer: ReturnType<typeof setTimeout> | null = null

watch(isImageLoading, (value) => {
  if (value) {
    loadingTimer = setTimeout(() => {
      isShowLoadingSpinner.value = true
    }, 300)
  } else {
    if (loadingTimer) {
      clearTimeout(loadingTimer)
      loadingTimer = null
    }
    isShowLoadingSpinner.value = false
  }
}, { immediate: true })

onUnmounted(() => {
  updateEventListeners(false)
  if (loadingTimer) {
    clearTimeout(loadingTimer)
  }
})

</script>

<template>
  <!-- save css var -->
  <div id="background">
    <div
      id="background__container"
      :style="containerStyle"
      :class="{ 'background__container--parallax': localConfig.general.isParallaxEnabled }"
    />
    <!-- loading overlay -->
    <div
      v-if="localConfig.general.isBackgroundImageEnabled"
      class="background__loading"
      :class="{ 'background__loading--visible': isShowLoadingSpinner }"
    >
      <div class="loading__spinner">
        <NSpin
          :show="true"
          size="large"
        />
      </div>
    </div>
  </div>
</template>

<style>
#background {
  #background__container {
    z-index: 1;
    position: absolute;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
    transition: background-image 0.4s ease;
    filter: blur(v-bind(`${localConfig.general.bgBlur}px`));
    opacity: v-bind(customOpacity);
    will-change: transform;

    &.background__container--parallax {
      /* Expand by dynamic amount based on parallax intensity: intensity × 2 each side → total ×4 */
      top: calc(-1 * var(--parallax-expansion, 40px));
      left: calc(-1 * var(--parallax-expansion, 40px));
      width: calc(100vw + calc(2 * var(--parallax-expansion, 40px)));
      height: calc(100vh + calc(2 * var(--parallax-expansion, 40px)));
      transform: translate(var(--parallax-x, 0), var(--parallax-y, 0));
      transition: transform 100ms ease-out;
    }
  }

  .background__loading {
    z-index: 2;
    position: absolute;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: rgba(0, 0, 0, 0.3);
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;

    &.background__loading--visible {
      opacity: 1;
    }
  }
}
</style>
