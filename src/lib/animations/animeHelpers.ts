import { animate, remove } from 'animejs';

type AnimationTarget = HTMLElement | null | undefined;
type AnimeInstance = ReturnType<typeof animate>;

/**
 * Simple, reusable animation helpers for small UI transitions.
 * Do: animate opacity/transform only; respect prefers-reduced-motion; clean up.
 * Don't: query global DOM, animate huge lists, or block unmount.
 */
export const canAnimate = () => {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return false;
  }
  return true;
};

export const withOnFinish = (animation: AnimeInstance | undefined, onFinish: () => void) => {
  if (!animation) {
    onFinish();
    return;
  }
  animation.finished.then(onFinish).catch(() => onFinish());
};

export const fadeScaleIn = (target: AnimationTarget, duration = 200) => {
  if (!target) return undefined;
  if (!canAnimate()) {
    target.style.opacity = '1';
    target.style.transform = 'scale(1)';
    return undefined;
  }
  return animate({
    targets: target,
    opacity: [0, 1],
    scale: [0.96, 1],
    easing: 'easeOutQuad',
    duration,
  });
};

export const fadeScaleOut = (target: AnimationTarget, duration = 200) => {
  if (!target) return undefined;
  if (!canAnimate()) {
    target.style.opacity = '0';
    target.style.transform = 'scale(0.96)';
    return undefined;
  }
  return animate({
    targets: target,
    opacity: [1, 0],
    scale: [1, 0.96],
    easing: 'easeInQuad',
    duration,
  });
};

export const fadeIn = (target: AnimationTarget, duration = 200) => {
  if (!target) return undefined;
  if (!canAnimate()) {
    target.style.opacity = '1';
    return undefined;
  }
  return animate({
    targets: target,
    opacity: [0, 1],
    easing: 'easeOutQuad',
    duration,
  });
};

export const fadeOut = (target: AnimationTarget, duration = 200) => {
  if (!target) return undefined;
  if (!canAnimate()) {
    target.style.opacity = '0';
    return undefined;
  }
  return animate({
    targets: target,
    opacity: [1, 0],
    easing: 'easeInQuad',
    duration,
  });
};

export const slideFadeInUp = (target: AnimationTarget, duration = 200) => {
  if (!target) return undefined;
  if (!canAnimate()) {
    target.style.opacity = '1';
    target.style.transform = 'translateY(0px)';
    return undefined;
  }
  return animate({
    targets: target,
    translateY: [8, 0],
    opacity: [0, 1],
    easing: 'easeOutQuad',
    duration,
  });
};

export const slideFadeOutDown = (target: AnimationTarget, duration = 200) => {
  if (!target) return undefined;
  if (!canAnimate()) {
    target.style.opacity = '0';
    target.style.transform = 'translateY(8px)';
    return undefined;
  }
  return animate({
    targets: target,
    translateY: [0, 8],
    opacity: [1, 0],
    easing: 'easeInQuad',
    duration,
  });
};

export const cancelAnimation = (target?: HTMLElement | null) => {
  if (!target) return;
  if (typeof window === 'undefined') return;
  remove(target);
};
