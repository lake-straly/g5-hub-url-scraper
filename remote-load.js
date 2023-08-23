javascript:(function() {
    var rawFileUrl = 'https://raw.githubusercontent.com/lake-straly/g5-hub-url-scraper/staging-branch/url-scraper.js';
    var randomVersion = Math.floor(Math.random() * 1000000);
    rawFileUrl += '?v=' + randomVersion;
    fetch(rawFileUrl)
        .then(response => response.text())
        .then(code => {
            eval(code);
        })
        .catch(error => console.error('Error fetching code:', error));
})();
