// Pinia wrapper for MediaWiki ResourceLoader
// This ensures Pinia is available globally after loading

// The IIFE should have defined Pinia, make sure it's available on window
if (typeof Pinia !== 'undefined') {
    window.Pinia = Pinia;
} else {
    console.error('Pinia IIFE did not create the expected global Pinia object');
} 