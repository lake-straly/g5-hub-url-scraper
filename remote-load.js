javascript:(function() {
    var rawFileUrl = 'https://raw.githubusercontent.com/lake-straly/g5-hub-url-scraper/test-branch/url-scraper.js';
    fetch(rawFileUrl)
        .then(response => response.text())
        .then(code => {
            eval(code);
        })
        .catch(error => console.error('Error fetching code:', error));
})();
