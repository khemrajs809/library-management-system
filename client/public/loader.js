// Use MutationObserver to detect the exact moment Angular finishes rendering,
// then immediately fade out and remove the loader.
const target = document.querySelector('app-root');
const observer = new MutationObserver(function() {
  const loader = document.getElementById('appLoader');
  if (loader && target.children.length > 0) {
    loader.classList.add('fade-out');
    setTimeout(function() { loader.remove(); }, 300);
    observer.disconnect();
  }
});
observer.observe(target, { childList: true, subtree: false });
