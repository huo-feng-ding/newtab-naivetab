<script setup lang="ts">
import { localConfig, localState } from '@/logic/store'
import { imageState, isImageLoading } from '@/logic/image'

const currAppearanceCode = localState.value.currAppearanceCode

// 视差效果：鼠标移动时背景轻微偏移
const parallaxX = ref(0)
const parallaxY = ref(0)

// 视差容器动态扩展幅度
const parallaxExpansion = computed(() => {
  return localConfig.general.parallaxIntensity * 2
})

const containerStyle = computed(() => {
  const style: Record<string, string> = {}
  if (localConfig.general.isBackgroundImageEnabled) {
    style.backgroundImage = `url(${imageState.currBackgroundImageFileObjectURL})`
  }
  style['--nt-parallax-x'] = `${parallaxX.value}px`
  style['--nt-parallax-y'] = `${parallaxY.value}px`
  style['--nt-parallax-expansion'] = `${parallaxExpansion.value}px`
  style.filter = `blur(${localConfig.general.bgBlur}px)`
  style.opacity = `${localConfig.general.bgOpacity}`
  return style
})

let rafId: number | null = null

const handleMouseMove = (e: MouseEvent) => {
  if (!localConfig.general.isParallaxEnabled || !localConfig.general.isBackgroundImageEnabled) {
    return
  }

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

const handleMouseLeave = () => {
  if (!localConfig.general.isParallaxEnabled || !localConfig.general.isBackgroundImageEnabled) {
    return
  }
  parallaxX.value = 0
  parallaxY.value = 0
}

const updateEventListeners = (enable: boolean) => {
  if (enable) {
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseleave', handleMouseLeave)
  } else {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseleave', handleMouseLeave)
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

onUnmounted(() => {
  updateEventListeners(false)
  if (loadingTimer) {
    clearTimeout(loadingTimer)
  }
})

// 渐变占位背景
const gradientBg = computed(() => {
  if (currAppearanceCode === 1) {
    return 'radial-gradient(ellipse at 50% 40%, #1a1a2e 0%, #0f0f1a 100%)'
  }
  return 'radial-gradient(ellipse at 50% 40%, #e8ecf1 0%, #d0d5dc 100%)'
})

const isShowLoadingSpinner = ref(false)

let loadingTimer: ReturnType<typeof setTimeout> | null = null

watch(isImageLoading, (value) => {
  if (value) {
    const hasBase64Fallback = imageState.currBackgroundImageFileObjectURL.startsWith('data:')
    if (hasBase64Fallback) {
      return
    }
    loadingTimer = setTimeout(() => {
      isShowLoadingSpinner.value = true
    }, 500)
  } else {
    if (loadingTimer) {
      clearTimeout(loadingTimer)
      loadingTimer = null
    }
    isShowLoadingSpinner.value = false
  }
}, { immediate: true })

</script>

<template>
  <!-- 存储 css 变量 -->
  <div
    id="background"
    :style="{ background: gradientBg }"
  >
    <!-- 视差效果容器 -->
    <div
      id="background__container"
      :style="containerStyle"
      :class="{ 'background__container--parallax': localConfig.general.isParallaxEnabled }"
    />
    <!-- loading 指示器 -->
    <div
      v-if="localConfig.general.isBackgroundImageEnabled"
      class="background__loading"
      :class="{ 'background__loading--visible': isShowLoadingSpinner }"
    >
      <div class="loading__dots">
        <span class="loading__dot" />
        <span class="loading__dot loading__dot--delay-1" />
        <span class="loading__dot loading__dot--delay-2" />
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
    will-change: filter, opacity, transform;

    &.background__container--parallax {
      top: calc(-1 * var(--nt-parallax-expansion, 40px));
      left: calc(-1 * var(--nt-parallax-expansion, 40px));
      width: calc(100vw + calc(2 * var(--nt-parallax-expansion, 40px)));
      height: calc(100vh + calc(2 * var(--nt-parallax-expansion, 40px)));
      transform: translate(var(--nt-parallax-x, 0), var(--nt-parallax-y, 0));
      transition: transform 100ms ease-out;
    }
  }

  .background__loading {
    z-index: 15;
    position: absolute;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    opacity: 0;
    transition: opacity 0.4s ease;
    pointer-events: none;

    &.background__loading--visible {
      opacity: 1;
    }
  }

  .loading__dots {
    display: flex;
    gap: 20px;
  }

  .loading__dot {
    display: block;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.8);
    box-shadow:
      0 0 8px 2px rgba(255, 255, 255, 0.7),
      0 0 24px 6px rgba(255, 255, 255, 0.35),
      0 0 48px 12px rgba(255, 255, 255, 0.15);
    animation: loading-pulse 1.2s ease-in-out infinite;

    &.loading__dot--delay-1 {
      animation-delay: 0.15s;
    }

    &.loading__dot--delay-2 {
      animation-delay: 0.3s;
    }
  }

}

@keyframes loading-pulse {
  0%, 80%, 100% {
    transform: scale(0.5);
    opacity: 0.5;
  }
  40% {
    transform: scale(1.1);
    opacity: 1;
  }
}
</style>
