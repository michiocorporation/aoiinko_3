(() => {
  'use strict';
  document.body.classList.add('js-ready');
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const header = document.querySelector('.site-header');
  const menu = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('#site-navigation');
  const scenes = [...document.querySelectorAll('.scene')];
  const journey = document.querySelector('.journey');
  const route = document.querySelector('.journey-path');
  const routePaths = [...route.querySelectorAll('path')];
  const progressPath = route.querySelector('.path-walked');
  const traveller = route.querySelector('.path-traveller');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const motionButton = document.querySelector('.motion-toggle');
  const layers = [...document.querySelectorAll('[data-depth]')].map(element => ({element, scene: scenes.indexOf(element.closest('.scene')), depth: Number(element.dataset.depth)}));
  const sectionLinks = [...document.querySelectorAll('#site-navigation a, .journey-nav a')];
  const colors = scenes.map(scene => scene.dataset.sky.split(',').map(Number));
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  let paused = false;
  let frame = 0;
  let geometry = [];
  let pathSamples = [];
  let routeLength = 0;
  try { paused = sessionStorage.getItem('aoi-inko-walk-motion-paused') === 'true'; } catch { /* Optional preference. */ }

  menu.hidden = false;
  function closeMenu(focus = false) {
    menu.setAttribute('aria-expanded','false'); navigation.classList.remove('is-open');
    if (focus) menu.focus();
  }
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open)); navigation.classList.toggle('is-open',open);
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') closeMenu(true); });
  document.addEventListener('click', event => { if (!event.target.closest('.site-header')) closeMenu(); });
  matchMedia('(min-width: 761px)').addEventListener('change', event => { if (event.matches) closeMenu(); });

  function measure() {
    const rect = journey.getBoundingClientRect();
    geometry = scenes.map(scene => {
      const box = scene.getBoundingClientRect();
      return {top: box.top + scrollY, height: box.height};
    });
    const points = [...document.querySelectorAll('[data-route]')].map(anchor => {
      const box = anchor.getBoundingClientRect();
      return {x: box.left - rect.left, y: box.top - rect.top};
    });
    route.setAttribute('viewBox',`0 0 ${rect.width} ${rect.height}`);
    let d = `M${points[0].x},${points[0].y}`;
    points.slice(1).forEach((point,index) => {
      const previous = points[index];
      const middle = (point.y + previous.y)/2;
      const alongSameSide = Math.abs(point.x - previous.x) < 2;
      const bend = innerWidth <= 760 ? 6 : 42;
      d += alongSameSide
        ? ` C${previous.x + bend},${previous.y + (point.y - previous.y)*.32} ${point.x - bend},${previous.y + (point.y - previous.y)*.68} ${point.x},${point.y}`
        : ` C${previous.x},${middle} ${point.x},${middle} ${point.x},${point.y}`;
    });
    routePaths.forEach(path => path.setAttribute('d',d));
    routeLength = progressPath.getTotalLength();
    pathSamples = Array.from({length:321}, (_,i) => {
      const distance = routeLength * i / 320;
      const point = progressPath.getPointAtLength(distance);
      return {x:point.x, y:point.y, distance};
    });
    schedule();
  }
  function render() {
    frame = 0;
    if (!geometry.length) return;
    const stopped = paused || reduced.matches;
    const viewport = innerHeight;
    const readingY = scrollY + viewport * .4;
    header.classList.toggle('is-scrolled',scrollY > 30);
    let current = 0;
    geometry.forEach((section,index) => { if (readingY >= section.top) current = index; });
    sectionLinks.forEach(link => {
      if (link.hash === '#' + scenes[current].id) link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    });
    // Color follows the landscape; the prose itself never changes opacity here.
    const next = Math.min(current + 1, scenes.length - 1);
    const ratio = stopped ? 0 : clamp((readingY - geometry[current].top) / geometry[current].height);
    const blend = ratio * ratio * (3 - 2 * ratio);
    const color = colors[current].map((value,i) => Math.round(value + (colors[next][i] - value) * blend));
    document.body.style.setProperty('--scene-color',color.join(','));
    for (const layer of layers) {
      const section = geometry[layer.scene];
      const distance = scrollY + viewport*.5 - section.top - Math.min(section.height*.4, viewport*.7);
      const limit = innerWidth <= 760 ? 30 : 85;
      const drift = stopped ? 0 : clamp(-distance * layer.depth, -limit, limit);
      layer.element.style.setProperty('--drift',drift.toFixed(2)+'px');
    }
    if (pathSamples.length) {
      const targetY = scrollY + viewport*.63 - journey.offsetTop;
      let low=0, high=pathSamples.length-1;
      while (low<high) { const mid=(low+high)>>1; if(pathSamples[mid].y<targetY) low=mid+1; else high=mid; }
      const point = pathSamples[low];
      progressPath.style.strokeDasharray = `${routeLength} ${routeLength}`;
      progressPath.style.strokeDashoffset = String(stopped ? 0 : routeLength - point.distance);
      traveller.setAttribute('cx',String(point.x)); traveller.setAttribute('cy',String(point.y));
      traveller.style.opacity = stopped || targetY < pathSamples[0].y ? '0' : '.85';
    }
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(render); }
  function updateMotion() {
    const stopped = paused || reduced.matches;
    document.body.classList.toggle('motion-paused',stopped);
    document.body.classList.toggle('reveal-motion',!stopped && 'IntersectionObserver' in window);
    motionButton.hidden = reduced.matches;
    motionButton.setAttribute('aria-pressed',String(paused));
    motionButton.querySelector('.motion-label').textContent = paused ? '動きを再生する' : '動きを止める';
    motionButton.querySelector('.motion-icon').textContent = paused ? '▷' : 'Ⅱ';
    if (stopped) document.querySelectorAll('.reveal').forEach(element => element.classList.add('is-visible'));
    schedule();
  }
  motionButton.addEventListener('click', () => { paused=!paused; try { sessionStorage.setItem('aoi-inko-walk-motion-paused',String(paused)); } catch {} updateMotion(); });
  reduced.addEventListener('change',updateMotion);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } });
    }, {threshold:.05,rootMargin:'0px 0px -25px 0px'});
    document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
  }
  function goToSection(id, keyboard = false, instant = false) {
    const section = scenes.find(scene => scene.id === id);
    if (!section) return;
    const top = section.getBoundingClientRect().top + scrollY - header.offsetHeight;
    if (keyboard) { section.setAttribute('tabindex','-1'); section.focus({preventScroll:true}); }
    scrollTo({top:Math.max(0,top),behavior: instant || paused || reduced.matches ? 'instant' : 'smooth'});
  }
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    if (!scenes.some(scene => '#'+scene.id === link.hash)) return;
    link.addEventListener('click', event => {
      event.preventDefault(); closeMenu(); history.pushState(null,'',link.hash); goToSection(link.hash.slice(1),event.detail===0);
    });
  });
  addEventListener('popstate',()=>goToSection(location.hash.slice(1)||'hero',false,true));
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',measure,{passive:true});
  if ('ResizeObserver' in window) { const observer=new ResizeObserver(measure); scenes.forEach(scene=>observer.observe(scene)); }
  document.fonts?.ready.then(measure);
  addEventListener('load',()=>{measure();if(location.hash)goToSection(location.hash.slice(1),false,true);},{once:true});
  updateMotion(); measure();

  const config = window.AOI_INKO_CONFIG || {};
  const contactButton = document.querySelector('#contact-button');
  const contactStatus = document.querySelector('#contact-status');
  const dialog = document.querySelector('#contact-dialog');
  let hasContact = false;
  try {
    const url = new URL(config.contactUrl);
    hasContact = (url.protocol === 'https:' && !!url.hostname) || (url.protocol === 'mailto:' && /.+@.+\..+/.test(url.pathname));
    if (hasContact) contactButton.href = url.href;
  } catch { /* Contact details will be supplied later. */ }
  if (hasContact) contactStatus.hidden = true;
  else {
    contactButton.setAttribute('aria-haspopup','dialog');
    contactButton.addEventListener('click',event=>{if(typeof dialog.showModal!=='function')return;event.preventDefault();dialog.showModal();});
    dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
  }
  const gallery = document.querySelector('#publication-gallery');
  for (const item of Array.isArray(config.publications) ? config.publications : []) {
    if (!item || !item.image || !item.alt || !item.title) continue;
    let url; try {url=new URL(item.image,location.href);} catch {continue;}
    if (!['http:','https:','file:'].includes(url.protocol)) continue;
    const figure=document.createElement('figure');figure.className='gallery-entry';
    const image=document.createElement('img');image.src=url.href;image.alt=String(item.alt);image.loading='lazy';image.decoding='async';
    const caption=document.createElement('figcaption');const title=document.createElement('h3');title.textContent=String(item.title);caption.append(title);
    if(item.caption){const p=document.createElement('p');p.textContent=String(item.caption);caption.append(p);}
    if(item.haiku){const poem=document.createElement('blockquote');poem.className='haiku'+(item.vertical?' is-vertical':'');poem.textContent=String(item.haiku);caption.append(poem);}
    figure.append(image,caption);gallery.append(figure);
  }
  gallery.hidden=!gallery.childElementCount;
})();
