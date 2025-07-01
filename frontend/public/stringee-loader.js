// Load Stringee SDK
(function() {
  const script = document.createElement('script');
  script.src = '/assets/raven/stringee/latest.sdk.bundle.min.js';
  script.async = true;
  script.onload = function() {
    console.log('Stringee SDK loaded successfully');
    window.dispatchEvent(new Event('stringee-loaded'));
  };
  script.onerror = function() {
    console.error('Failed to load Stringee SDK');
  };
  document.head.appendChild(script);
})(); 