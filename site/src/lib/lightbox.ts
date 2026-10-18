/**
 * A dependency-free lightbox for the brand photo gallery. It ships as its own
 * module — `astro.config.mjs` keeps `assetsInlineLimit: 0` — so the production
 * CSP (`script-src 'self'`, no inline) serves it as a file, not an inline script.
 *
 * The overlay is built once, on first open, then reused. Focus handling mirrors
 * the listing bottom sheet (listing-controller.ts): the rest of the page goes
 * `inert` while the dialog is open, so Tab stays inside it, and focus returns to
 * the thumbnail that was clicked when it closes. Motion is left to CSS, which
 * honours `prefers-reduced-motion`.
 */

/** Wraps an index into [0, length) so prev/next loop. Pure, for the unit test. */
export function wrapIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

interface Photo {
  full: string;
  alt: string;
}

interface Labels {
  close: string;
  prev: string;
  next: string;
  /** A template carrying `{n}` and `{total}`, e.g. "{n} de {total}". */
  counter: string;
}

// Only a horizontal drag longer than this, and more sideways than vertical,
// counts as a swipe between photos.
const SWIPE_THRESHOLD = 40;

function fillCounter(template: string, n: number, total: number): string {
  return template.replace('{n}', String(n)).replace('{total}', String(total));
}

function setupGallery(figure: HTMLElement): void {
  const buttons = Array.from(figure.querySelectorAll<HTMLButtonElement>('button[data-full]'));
  const photos: Photo[] = buttons.map((button) => ({
    full: button.dataset.full ?? '',
    alt: button.querySelector('img')?.alt ?? '',
  }));
  if (photos.length === 0) return;

  const labels: Labels = {
    close: figure.dataset.labelClose ?? 'Close',
    prev: figure.dataset.labelPrev ?? 'Previous',
    next: figure.dataset.labelNext ?? 'Next',
    counter: figure.dataset.labelCounter ?? '{n} / {total}',
  };

  let overlay: HTMLDivElement | undefined;
  let image: HTMLImageElement;
  let counter: HTMLParagraphElement;
  let current = 0;
  let opener: HTMLElement | undefined;
  let inerted: HTMLElement[] = [];

  function render(): void {
    const photo = photos[current]!;
    image.src = photo.full;
    image.alt = photo.alt;
    counter.textContent = fillCounter(labels.counter, current + 1, photos.length);
    overlay!.setAttribute('aria-label', photo.alt);
  }

  function go(delta: number): void {
    current = wrapIndex(current + delta, photos.length);
    render();
  }

  function build(): HTMLDivElement {
    const root = document.createElement('div');
    root.className = 'lightbox';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'lightbox__close';
    close.setAttribute('aria-label', labels.close);
    close.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    close.addEventListener('click', hide);

    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'lightbox__nav lightbox__nav--prev';
    prev.setAttribute('aria-label', labels.prev);
    prev.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 5l-7 7 7 7"/></svg>';
    prev.addEventListener('click', () => go(-1));

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'lightbox__nav lightbox__nav--next';
    next.setAttribute('aria-label', labels.next);
    next.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>';
    next.addEventListener('click', () => go(1));

    image = document.createElement('img');
    image.className = 'lightbox__img';
    image.decoding = 'async';

    counter = document.createElement('p');
    counter.className = 'lightbox__counter';
    counter.setAttribute('aria-live', 'polite');

    // Only navigation controls when there is more than one photo.
    if (photos.length > 1) root.append(prev, next);
    root.append(close, image, counter);

    // A click on the backdrop itself (never on the image or a control) closes.
    root.addEventListener('click', (event) => {
      if (event.target === root) hide();
    });

    let startX = 0;
    let startY = 0;
    root.addEventListener('touchstart', (event) => {
      startX = event.touches[0]!.clientX;
      startY = event.touches[0]!.clientY;
    }, { passive: true });
    root.addEventListener('touchend', (event) => {
      if (photos.length < 2) return;
      const dx = event.changedTouches[0]!.clientX - startX;
      const dy = event.changedTouches[0]!.clientY - startY;
      if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
    }, { passive: true });

    return root;
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      hide();
    } else if (event.key === 'ArrowRight') {
      go(1);
    } else if (event.key === 'ArrowLeft') {
      go(-1);
    }
  }

  function show(index: number, from: HTMLElement): void {
    if (!overlay) {
      overlay = build();
      document.body.appendChild(overlay);
    }
    opener = from;
    current = wrapIndex(index, photos.length);
    render();

    // Everything else on the page goes inert, so Tab cycles inside the dialog.
    inerted = [];
    for (const node of Array.from(document.body.children)) {
      if (node !== overlay && node instanceof HTMLElement && !node.inert) {
        node.inert = true;
        inerted.push(node);
      }
    }
    document.documentElement.classList.add('lightbox-open');
    overlay.classList.add('is-open');
    document.addEventListener('keydown', onKeydown);
    overlay.querySelector<HTMLButtonElement>('.lightbox__close')?.focus();
  }

  function hide(): void {
    if (!overlay) return;
    overlay.classList.remove('is-open');
    document.documentElement.classList.remove('lightbox-open');
    document.removeEventListener('keydown', onKeydown);
    for (const node of inerted) node.inert = false;
    inerted = [];
    opener?.focus();
    opener = undefined;
  }

  buttons.forEach((button, index) => {
    button.addEventListener('click', () => show(index, button));
  });
}

/** Wires every brand photo gallery on the page. */
export function initLightbox(): void {
  for (const figure of document.querySelectorAll<HTMLElement>('[data-lightbox]')) {
    setupGallery(figure);
  }
}
