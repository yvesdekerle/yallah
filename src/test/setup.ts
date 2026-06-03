import '@testing-library/jest-dom/vitest'

// jsdom implements neither pointer capture nor element scrolling. The app calls
// these directly (every real browser supports them), so provide no-op stubs
// here — keeping the production source free of test-only `?.` guards.
Element.prototype.setPointerCapture = function () {}
Element.prototype.scrollTo = function () {}
