(() => {
  if (window.SorelyaReviews) { window.SorelyaReviews.init(document); return; }
  const instances = new WeakMap();
  function mount(root) {
    if (instances.has(root)) return;
    // Decode old numeric entities as text, never as executable HTML.
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let textNode;
    while ((textNode = walker.nextNode())) {
      textNode.nodeValue = textNode.nodeValue.replace(/&(?:amp;)?#(x[0-9a-f]+|[0-9]+);/gi, (match, value) => {
        const point = value[0].toLowerCase() === 'x' ? parseInt(value.slice(1), 16) : parseInt(value, 10);
        return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff) ? String.fromCodePoint(point) : match;
      });
    }
    const track = root.querySelector('.ap-reviews__track');
    const cards = [...track.children];
    const prev = root.querySelector('.ap-reviews__prev');
    const next = root.querySelector('.ap-reviews__next');
    const position = root.querySelector('.ap-reviews__position');
    const controller = new AbortController();
    const signal = controller.signal;
    const behavior = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    function update() {
      const max = track.scrollWidth - track.clientWidth;
      prev.hidden = next.hidden = max < 3;
      prev.disabled = track.scrollLeft < 3;
      next.disabled = track.scrollLeft > max - 3;
      const gap = parseFloat(getComputedStyle(track).gap) || 0;
      const step = (cards[0]?.getBoundingClientRect().width || 1) + gap;
      position.textContent = max > 2 ? `${Math.min(cards.length, Math.round(track.scrollLeft / step) + 1)} / ${cards.length}` : '';
    }
    function move(direction) {
      const gap = parseFloat(getComputedStyle(track).gap) || 0;
      track.scrollBy({left: direction * ((cards[0]?.getBoundingClientRect().width || 0) + gap), behavior: behavior()});
    }
    prev.addEventListener('click', () => move(-1), {signal});
    next.addEventListener('click', () => move(1), {signal});
    track.addEventListener('scroll', update, {passive:true, signal});
    track.addEventListener('keydown', e => {
      if (e.target !== track) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {e.preventDefault(); move(e.key === 'ArrowLeft' ? -1 : 1);}
    }, {signal});
    root.classList.add('is-ready');
    function measure() {
      cards.forEach((card, index) => {
        const copy = card.querySelector('[data-review-copy]');
        const more = card.querySelector('.ap-reviews__more');
        if (!copy || !more) return;
        copy.id = `${track.id}-copy-${index}`;
        more.setAttribute('aria-controls', copy.id);
        const expanded = copy.classList.contains('is-expanded');
        copy.classList.add('is-long');
        copy.classList.remove('is-expanded');
        const long = copy.scrollHeight > copy.clientHeight + 2;
        copy.classList.toggle('is-long', long);
        copy.classList.toggle('is-expanded', expanded);
        more.hidden = !long;
      });
      update();
    }
    cards.forEach(card => {
      const more = card.querySelector('.ap-reviews__more');
      const copy = card.querySelector('[data-review-copy]');
      more?.addEventListener('click', () => {
        const expanded = copy.classList.toggle('is-expanded');
        more.setAttribute('aria-expanded', String(expanded));
        more.textContent = expanded ? 'Afficher moins' : 'Lire la suite';
      }, {signal});
    });
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    instances.set(root, () => {controller.abort(); observer.disconnect(); instances.delete(root);});
    measure();
    document.fonts?.ready.then(() => {if (root.isConnected) measure();});
  }
  function init(scope) { scope.querySelectorAll('[data-ap-reviews]').forEach(mount); }
  window.SorelyaReviews = {init};
  init(document);
  document.addEventListener('shopify:section:load', e => init(e.target));
  document.addEventListener('shopify:section:unload', e => e.target.querySelectorAll('[data-ap-reviews]').forEach(root => instances.get(root)?.()));
  document.addEventListener('shopify:block:select', e => {
    const card = e.target.closest('.ap-reviews__card');
    if (card) card.scrollIntoView({behavior:'auto', block:'nearest', inline:'center'});
  });
})();
