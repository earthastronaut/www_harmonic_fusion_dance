(function () {
    const nav = document.querySelector('.site-nav');
    const toggle = document.querySelector('.site-nav-toggle');
    if (!nav || !toggle) return;

    const links = nav.querySelector('.site-nav-links');

    function setOpen(open) {
        nav.classList.toggle('is-open', open);
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }

    toggle.addEventListener('click', () => {
        setOpen(!nav.classList.contains('is-open'));
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && nav.classList.contains('is-open')) {
            setOpen(false);
            toggle.focus();
        }
    });

    document.addEventListener('click', (e) => {
        if (!nav.classList.contains('is-open')) return;
        if (!nav.contains(e.target)) setOpen(false);
    });

    if (links) {
        links.querySelectorAll('a').forEach((a) => {
            a.addEventListener('click', () => setOpen(false));
        });
    }

    const mq = window.matchMedia('(min-width: 640px)');
    function onBreakpoint(e) {
        if (e.matches) setOpen(false);
    }
    if (mq.addEventListener) mq.addEventListener('change', onBreakpoint);
    else mq.addListener(onBreakpoint);
})();
