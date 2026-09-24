/* Eugene Fusion photo carousel */
(function () {
    const root = document.querySelector('[data-carousel]');
    if (!root) return;

    const track = root.querySelector('[data-carousel-track]');
    const slides = Array.from(root.querySelectorAll('[data-carousel-slide]'));
    const prevBtn = root.querySelector('[data-carousel-prev]');
    const nextBtn = root.querySelector('[data-carousel-next]');
    const dotsWrap = root.querySelector('[data-carousel-dots]');

    if (!track || slides.length === 0) return;

    let index = 0;
    let timer = null;
    const AUTO_MS = 6000;

    function goTo(i) {
        index = (i + slides.length) % slides.length;
        track.style.transform = `translateX(-${index * 100}%)`;
        if (dotsWrap) {
            dotsWrap.querySelectorAll('button').forEach((dot, di) => {
                dot.classList.toggle('active', di === index);
                dot.setAttribute('aria-selected', di === index ? 'true' : 'false');
            });
        }
        slides.forEach((slide, si) => {
            slide.setAttribute('aria-hidden', si === index ? 'false' : 'true');
        });
    }

    function next() {
        goTo(index + 1);
    }

    function prev() {
        goTo(index - 1);
    }

    function startAuto() {
        stopAuto();
        timer = setInterval(next, AUTO_MS);
    }

    function stopAuto() {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
    }

    if (dotsWrap) {
        slides.forEach((_, i) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.setAttribute('aria-label', `Go to slide ${i + 1}`);
            btn.setAttribute('role', 'tab');
            btn.addEventListener('click', () => {
                goTo(i);
                startAuto();
            });
            dotsWrap.appendChild(btn);
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            prev();
            startAuto();
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            next();
            startAuto();
        });
    }

    root.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            prev();
            startAuto();
        } else if (e.key === 'ArrowRight') {
            next();
            startAuto();
        }
    });

    root.addEventListener('mouseenter', stopAuto);
    root.addEventListener('mouseleave', startAuto);
    root.addEventListener('focusin', stopAuto);
    root.addEventListener('focusout', (e) => {
        if (!root.contains(e.relatedTarget)) startAuto();
    });

    let touchStartX = 0;
    root.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        stopAuto();
    }, { passive: true });
    root.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].screenX - touchStartX;
        if (Math.abs(dx) > 40) {
            if (dx < 0) next();
            else prev();
        }
        startAuto();
    }, { passive: true });

    goTo(0);
    startAuto();
})();
