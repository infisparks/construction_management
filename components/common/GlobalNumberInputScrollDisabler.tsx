'use client';

import { useEffect } from 'react';

/**
 * Global component that disables mouse wheel scrolling from incrementing or decrementing
 * number inputs (<input type="number">) across the entire application.
 *
 * In web browsers, scrolling the mouse wheel over a focused number input inadvertently
 * changes its numeric value. Blurring the input on wheel ensures the value remains
 * intact while allowing the page/drawer/modal to scroll smoothly.
 */
export function GlobalNumberInputScrollDisabler() {
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // 1. If currently focused element is a number input, blur it
      const activeEl = document.activeElement;
      if (
        activeEl instanceof HTMLInputElement &&
        activeEl.type === 'number'
      ) {
        activeEl.blur();
      }

      // 2. If the wheel event target itself is a number input, blur it
      const target = e.target;
      if (
        target instanceof HTMLInputElement &&
        target.type === 'number'
      ) {
        target.blur();
      }
    };

    // Attach to window with passive: true so scrolling performance is optimal
    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return null;
}
