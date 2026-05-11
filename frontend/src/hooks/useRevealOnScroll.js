import { useEffect } from 'react';

/* Toggles `is-visible` on every element with `[data-reveal]` once it enters
   the viewport. One observer per page mount. Stagger via CSS transition-delay
   per element (set inline in the JSX). */

export default function useRevealOnScroll(deps = []) {
    useEffect(() => {
        const targets = document.querySelectorAll('[data-reveal]:not(.is-visible)');
        if (targets.length === 0) return undefined;

        if (typeof IntersectionObserver === 'undefined') {
            targets.forEach((el) => el.classList.add('is-visible'));
            return undefined;
        }

        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduced) {
            targets.forEach((el) => el.classList.add('is-visible'));
            return undefined;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { rootMargin: '0px 0px -50px 0px', threshold: 0.05 });

        targets.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    // deps lets callers re-run after data loads
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}
