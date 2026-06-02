// Use MutationObserver to detect the exact moment Angular finishes rendering,
// then immediately fade out and remove the loader.
const target = document.querySelector('app-root');
const loader = document.getElementById('appLoader');

function removeLoader() {
  if (loader && !loader.classList.contains('fade-out')) {
    loader.classList.add('fade-out');
    setTimeout(function() { loader.remove(); }, 300);
  }
}

if (target && target.children.length > 0) {
  // If SSR already rendered the content, remove loader immediately
  removeLoader();
} else {
  const observer = new MutationObserver(function() {
    if (target.children.length > 0) {
      removeLoader();
      observer.disconnect();
    }
  });
  if (target) observer.observe(target, { childList: true, subtree: false });
}

