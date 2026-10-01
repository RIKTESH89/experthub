// Installed system Arial substitutes only the Google font network fetch during offline build QA.
// The application/font configuration itself is unchanged. This is not typography acceptance.
module.exports = new Proxy({}, { get: () => "@font-face { font-family: 'DM Sans'; font-style: normal; font-weight: 400 700; src: url(/System/Library/Fonts/Supplemental/Arial.ttf) format('truetype'); }" });
