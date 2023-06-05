javascript: (() => {
    /* Get URN from client Hub page */
    let clientUrn = document.querySelector('.p-g5-urn');
    /* Get the domain type. This is important to determine how the final URLs are constructed */
    let domainType = document.querySelector('.p-g5-domain-type');
    /* Get the vertical of the client */
    let clientVertical = document.querySelector('.p-g5-vertical');
    /* Create locations.json URL */
    let locationsJsonUrl = 'https://hub.g5marketingcloud.com/admin/clients/' + clientUrn.innerText + '/locations.json';

    function sanitizeDomain(url) {
        const domainRegex = /^(\w+:\/\/[^\/]+)(.*)/;
        const matches = url.match(domainRegex);
        const domain = matches[1];
        let path = matches[2];
        path = path.replace(/[^A-Za-z0-9\/]+$/g, "").replace(/[^A-Za-z0-9\/]/g, "-");
        const modifiedUrl = domain + path;
        return modifiedUrl.toLowerCase();
    }

    /* Get JSON data from above built URL */
    async function getJsonData(url) {
        let fetchResult = await fetch(url);
        let json = await fetchResult.json();
        return json;
    }
    /* In order to use the data returned by fetch, we have to parse the data in an async function. */
    async function parseJsonData(domainType, clientVertical) {

        /* Determine what the vertical is */
        let clientVerticalSlug = '';
        let jsonData = await getJsonData(locationsJsonUrl);
        if (clientVertical.innerText.includes('Apartments')) {
            clientVerticalSlug = 'apartments';
        } else if (clientVertical.innerText.includes('Senior')) {
            clientVerticalSlug = 'senior-living';
        } else if (clientVertical.innerText.includes('Storage')) {
            clientVerticalSlug = 'self-storage';
        } else {
            console.error('Was not able to detect a valid vertical!');
        }

        /* If single domain, grab the domain */
        let singleDomainDomain = document.querySelector('.u-g5-domain');
        if (domainType.innerText === 'SingleDomainClient') {
            singleDomainDomain = singleDomainDomain.innerText.split('://').pop();
        }

        /* Extract data from the location JSON */
        let fullLocationData = [];
        for (let i = 0; i < jsonData.length; i++) {
            let locationDataObj = {
                name: jsonData[i].name,
                vertical: clientVerticalSlug,
                state: jsonData[i].state,
                city: jsonData[i].city,
                custom_slug: jsonData[i].custom_slug,
                naked_domain: jsonData[i].naked_domain,
                corporate: jsonData[i].corporate
            };
            fullLocationData.push(locationDataObj);
        }
        /* Determine what type of URL to build, and then build it (LIVE) */
        let liveUrls = [];
        let staticUrls = [];
        let stagingUrls = [];
        if (domainType.innerText === 'MultiDomainClient') {
            for (let j = 0; j < fullLocationData.length; j++) {
                if (fullLocationData[j].naked_domain === null || fullLocationData[j].naked_domain === '') {
                    console.log(`${fullLocationData[j].name} does not have a valid domain.`)
                } else {
                    if (fullLocationData[j].naked_domain.split('.').length <= 2) {
                        fullLocationData[j].naked_domain = 'www.' + fullLocationData[j].naked_domain;
                    }
                    liveUrls.push('https://' + fullLocationData[j].naked_domain);
                }
            }
        } else if (domainType.innerText === 'SingleDomainClient') {
            for (let k = 0; k < fullLocationData.length; k++) {
                if (fullLocationData[k].corporate) {
                    liveUrls.unshift('https://' + singleDomainDomain);
                } else {
                    liveUrls.push('https://' + singleDomainDomain + '/' + fullLocationData[k].vertical + '/' + fullLocationData[k].state + '/' + fullLocationData[k].city + '/' + fullLocationData[k].custom_slug);
                }
            }
        } else {
            console.error(`LIVE URL CONSTRUCTION FAILED - Unable to locate domain type of: ${domainType.innerText}`);
        }

        /* Build static URLs using the previously built live URLs */
        for (let l = 0; l < liveUrls.length; l++) {
            let dotSplitLiveUrl = liveUrls[l].split('.').pop();
            let tld = dotSplitLiveUrl.split('/')[0];
            let nonSecureLiveUrl = liveUrls[l].replace('https', 'http');
            staticUrls.push(nonSecureLiveUrl.replace(tld, tld + '.g5static.com'));
        }

        /* Build staging URLs using the previously built live URLs */
        for (let m = 0; m < staticUrls.length; m++) {
            let mainDomain = staticUrls[m].split('.')[1];
            let nonSecureStatic = staticUrls[m].replace('https', 'http');
            stagingUrls.push(nonSecureStatic.replace(mainDomain, mainDomain + '-staging'));
        }

        /* Lowercase all items & replace spaces with dashes */
        let lowerCaseLiveUrls = [];
        let lowerCaseStaticUrls = [];
        let lowerCaseStagingUrls = [];
        for (let i = 0; i < liveUrls.length; i++) {
            lowerCaseLiveUrls.push(sanitizeDomain(liveUrls[i]));
        }
        for (let i = 0; i < staticUrls.length; i++) {
            lowerCaseStaticUrls.push(sanitizeDomain(staticUrls[i]));
        }
        for (let i = 0; i < stagingUrls.length; i++) {
            lowerCaseStagingUrls.push(sanitizeDomain(stagingUrls[i]));
        }
        /* Open blank web page with all of the URLs collected */
        var newWindow = window.open();
        var htmlContent = `<!DOCTYPE html>
        <html>
        <head>
          <title>URLs Page</title>
          <style>
            :root {
                --primary-clr: #BBD9EC;
                --background-clr: #111;
            }
            body{
                font-family: sans-serif;
                background-color: #111;
                color: #fefefe;
            }
            h1{
                margin: 0 auto;
                text-align: center;
            }
            h2{
                max-width: 200px;
                margin-inline: auto;
                text-align: center;
                padding-bottom: 5px;
                border-bottom: 1px solid #fff;
            }
            .urlContainer {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                grid-template-rows: repeat(1, 1fr);
            }
            .urlContainer div:not(:last-child){
                border-right: 1px solid #fff;
            }
            a{
                color: #BBD9EC;
                transition: all 0.25s ease-in-out;
            }
            a:hover{
                color: #DCEBF4;
                transition: all 0.25s ease-in-out;
            }
            .urlContainer div {
                height: 100%;
            }
            li button {
                margin-left: 4px;
                margin-block: 2px;
                border-radius: 4px;
                background: transparent;
                color: #fff;
                border: 1px solid #fff;
                transition: all 0.25s ease-in-out;
            }
            li button:hover {
                color: #111;
                background-color: #BBD9EC;
                border-color: #fff;
                transition: all 0.25s ease-in-out;
            }
            h2 ~ button {
                background: transparent;
                border: 1px solid #fff;
                color: #fff;
                border-radius: 4px;
                padding: 0.25em;
                display: block;
                margin: 0 auto;
                transition: all 0.5s ease-in-out;
            }
            h2 ~ button:hover {
                background: var(--primary-clr);
                border: 1px solid #fff;
                color: #111;
                transition: all 0.5s ease-in-out;
            }
            button {
                user-select: none;
                -moz-user-select: none;
                -khtml-user-select: none;
                -webkit-user-select: none;
                -o-user-select: none;
            }
            ol {
                margin: 1em;
            }
            li {
                max-width: fit-content;
            }
            .rp_disclaimer {
                display: flex;
                justify-content: center;
            }
            div.rp_disclaimer p {
                color: #fff;
                letter-spacing: 2px;
                bottom: 5px;
                border-radius: 20px;
                border: 1px solid #fff;
                padding: 1em;
                background-color: transparent;
                font-size: 0.65em;
            }
            .credits {
                font-size: 0.45em;
                color: #fff;
            }
            @media screen and (max-width: 1635px) {
                .urlContainer {
                    grid-template-rows: repeat(3, 1fr);
                    grid-template-columns: repeat(1, 1fr);
                }
                ol {
                    display: inline-block;
                }
                .urlContainer .url-container {
                    max-width: fit-content;
                    border: 2px solid #fff;
                    border-radius: 15px;
                    margin: 0.5em auto;
                    height: unset;
                }
            }
          </style>
        </head>
        <body>
          <h1>URL Gatherer</h1>
          <div class="urlContainer">
          <div class="liveUrls url-container">
          <h2>Live URLs</h2><button onclick="copyAllLiveUrls()">Copy All</button>
          <div style="text-align: center;">
            <ol>`;
        for (let i = 0; i < lowerCaseLiveUrls.length; i++) {
            htmlContent += `<li class="url"><a target="_blank" href="${lowerCaseLiveUrls[i]}">${lowerCaseLiveUrls[i]}</a><button onclick="copyToClipboard('${lowerCaseLiveUrls[i]}')">Copy</button></li>`
        }
        htmlContent += `</ol>
          </div>
          </div>
          <div class="staticUrls url-container">
          <h2>Static URLs</h2><button onclick="copyAllStaticUrls()">Copy All</button>
          <div style="text-align: center;">
          <ol>`;
        for (let i = 0; i < lowerCaseStaticUrls.length; i++) {
            htmlContent += `<li class="url"><a target="_blank" href="${lowerCaseStaticUrls[i]}">${lowerCaseStaticUrls[i]}</a><button onclick="copyToClipboard('${lowerCaseStaticUrls[i]}')">Copy</button></li>`
        }
        htmlContent += `</ol>
          </div>
          </div>
          <div class="stagingUrls url-container">
          <h2>Staging URLs</h2><button onclick="copyAllStagingUrls()">Copy All</button>
          <div style="text-align: center;">
          <ol>`;
        for (let i = 0; i < lowerCaseStagingUrls.length; i++) {
            htmlContent += `<li class="url"><a target="_blank" href="${lowerCaseStagingUrls[i]}">${lowerCaseStagingUrls[i]}</a><button onclick="copyToClipboard('${lowerCaseStagingUrls[i]}')">Copy</button></li>`
        }
        htmlContent += `</ol>
          </div>
          </div>
        </div>
        <div class="rp_disclaimer">
            <p>REALPAGE INTERNAL USE ONLY</p>
        </div>
        <div class="credits">
            <p class="credits-header">Tool created by:</p>
            <p class="credits-name">Lake Straly</p>
            <p class="credits-name">Logan Straly</p>
        </div>
        <script type="text/javascript">
        function copyAllLiveUrls() {
            let liveUrlArr = [`;
        for (let i = 0; i < lowerCaseLiveUrls.length; i++) {
            htmlContent += "'" + lowerCaseLiveUrls[i] + "',";
        }
        htmlContent += `];
            copyToClipboard(liveUrlArr.join('\\n'));
        }

        function copyAllStaticUrls() {
            let staticUrlArr = [`;
        for (let i = 0; i < lowerCaseStaticUrls.length; i++) {
            htmlContent += "'" + lowerCaseStaticUrls[i] + "',";
        }
        htmlContent += `];
            let staticUrlArrStr = staticUrlArr.join().replace(',', '\\n');
            copyToClipboard(staticUrlArr.join('\\n'));
        }

        function copyAllStagingUrls() {
            let stagingUrlArr = [`;
        for (let i = 0; i < lowerCaseStagingUrls.length; i++) {
            htmlContent += "'" + lowerCaseStagingUrls[i] + "',";
        }
        htmlContent += `];
            let stagingUrlArrStr = stagingUrlArr.join().replace(',', '\\n');
            copyToClipboard(stagingUrlArr.join('\\n'));
        }

        function copyToClipboard(textToCopy) {
            if (navigator.clipboard && window.isSecureContext) {
                return navigator.clipboard.writeText(textToCopy);
            } else {
                let textArea = document.createElement("textarea");
                textArea.value = textToCopy;
                textArea.style.position = "fixed";
                textArea.style.left = "-999999px";
                textArea.style.top = "-999999px";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                return new Promise((res, rej) => {
                    document.execCommand('copy') ? res() : rej();
                    textArea.remove();
                });
            }
        };
        </script>
        </body>
        </html>`;
        newWindow.document.open();
        newWindow.document.write(htmlContent);
    }
    parseJsonData(domainType, clientVertical);
})();
