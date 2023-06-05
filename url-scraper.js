javascript: (() => {
    /* Get URN from client Hub page */
    let clientUrn = document.querySelector('.p-g5-urn');
    /* Get the domain type. This is important to determine how the final URLs are constructed */
    let domainType = document.querySelector('.p-g5-domain-type');
    /* Get the vertical of the client */
    let clientVertical = document.querySelector('.p-g5-vertical');
    /* Create locations.json URL */
    let locationsJsonUrl = 'https://hub.g5marketingcloud.com/admin/clients/' + clientUrn.innerText + '/locations.json';

    /* Sanitize domain function. Removes special characters in a domain path, and removes special characters at the end of a domain path if present */
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
                internalName: jsonData[i].internal_branded_name,
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
                    let liveUrlsObj = {
                        name: fullLocationData[j].name,
                        internalName: fullLocationData[j].internalName,
                        url: 'https://' + fullLocationData[j].naked_domain
                    };
                    liveUrls.push(liveUrlsObj);
                }
            }
            console.log(liveUrls);
        } else if (domainType.innerText === 'SingleDomainClient') {
            for (let k = 0; k < fullLocationData.length; k++) {
                if (fullLocationData[k].corporate) {
                    let liveUrlsObj = {
                        name: fullLocationData[k].name,
                        internalName: fullLocationData[k].internalName,
                        url: 'https://' + singleDomainDomain
                    };
                    liveUrls.unshift(liveUrlsObj);
                } else {
                    let liveUrlsObj = {
                        name: fullLocationData[k].name,
                        internalName: fullLocationData[k].internalName,
                        url: sanitizeDomain('https://' + singleDomainDomain + '/' + fullLocationData[k].vertical + '/' + fullLocationData[k].state + '/' + fullLocationData[k].city + '/' + fullLocationData[k].custom_slug)
                    };
                    liveUrls.push(liveUrlsObj);
                }
            }
        } else {
            console.error(`URL CONSTRUCTION FAILED - Unable to locate domain type of: ${domainType.innerText}`);
        }

        /* Build static URLs using the previously built live URLs */
        for (let l = 0; l < liveUrls.length; l++) {
            let dotSplitLiveUrl = liveUrls[l].url.split('.').pop();
            let tld = dotSplitLiveUrl.split('/')[0];
            let nonSecureLiveUrl = liveUrls[l].url.replace('https', 'http');
            let staticUrlsObj = {
                name: liveUrls[l].name,
                internalName: fullLocationData[l].internalName,
                url: sanitizeDomain(nonSecureLiveUrl.replace(tld, tld + '.g5static.com'))
            };
            staticUrls.push(staticUrlsObj);
        }

        /* Build staging URLs using the previously built live URLs */
        for (let m = 0; m < staticUrls.length; m++) {
            let mainDomain = staticUrls[m].url.split('.')[1];
            let nonSecureStatic = staticUrls[m].url.replace('https', 'http');
            let stagingUrlsObj = {
                name: liveUrls[m].name,
                internalName: fullLocationData[m].internalName,
                url: sanitizeDomain(nonSecureStatic.replace(mainDomain, mainDomain + '-staging'))
            };
            stagingUrls.push(stagingUrlsObj);
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
                --primary-clr-lighten: #DCEBF4;
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
            .url-cell a {
                line-break: anywhere;
            }
            a {
                color: var(--primary-clr);
            }
            a:hover {
                color: var(--primary-clr-lighten);
            }
            table {
                border-radius: 15px;
            }
            table td, table th {
                border: 1px solid #fff;
                padding: 0.5em;
                margin: 0;
            }
            table th {
                font-size: 1.25em;
            }
            button {
                height: fit-content;
                background: transparent;
                border: 1px solid #fff;
                color: #fff;
                border-radius: 4px;
                padding: 0.25em;
                display: inline;
                margin-left: 1em;
                transition: all 0.5s ease-in-out;
                user-select: none;
                -moz-user-select: none;
                -khtml-user-select: none;
                -webkit-user-select: none;
                -o-user-select: none;
            }
            button:hover {
                background: var(--primary-clr);
                border: 1px solid #fff;
                color: #111;
                transition: all 0.5s ease-in-out;
            }
            .urlContainer {
                width: fit-content;
                margin: 0 auto;
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
            .url-cell {
                display: flex;
                justify-content: space-between;
            }
          </style>
        </head>
        <body>
            <h1>URL Gatherer</h1>
            <div class="urlContainer">
                <table>
                    <tr class="header">
                        <th class="table-header">Name</th>
                        <th class="table-header">Internal Name</th>
                        <th class="table-header">Live Urls<button onclick="copyAllLiveUrls()">Copy All</button></th>
                        <th class="table-header">Static Urls<button onclick="copyAllStaticUrls()">Copy All</button></th>
                        <th class="table-header">Staging Urls<button onclick="copyAllStagingUrls()">Copy All</button></th>
                    </tr>`;
        for (let i = 0; i < liveUrls.length; i++) {
            htmlContent += `<tr>
                            <td>${liveUrls[i].name}</td>
                            <td>${liveUrls[i].internalName}</td>
                            <td><div class="url-cell"><a target="_blank" href="${liveUrls[i].url}">${liveUrls[i].url}</a><button onclick="copyToClipboard('${liveUrls[i].url}')">Copy</button></td></div>
                            <td><div class="url-cell"><a target="_blank" href="${staticUrls[i].url}">${staticUrls[i].url}</a><button onclick="copyToClipboard('${staticUrls[i].url}')">Copy</button></td></div>
                            <td><div class="url-cell"><a target="_blank" href="${stagingUrls[i].url}">${stagingUrls[i].url}</a><button onclick="copyToClipboard('${stagingUrls[i].url}')">Copy</button></td></div>
                        </tr>`;
        }
        htmlContent += `</table>
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
        for (let i = 0; i < liveUrls.length; i++) {
            htmlContent += "'" + liveUrls[i].url + "',";
        }
        htmlContent += `];
            copyToClipboard(liveUrlArr.join('\\n'));
        }

        function copyAllStaticUrls() {
            let staticUrlArr = [`;
        for (let i = 0; i < staticUrls.length; i++) {
            htmlContent += "'" + staticUrls[i].url + "',";
        }
        htmlContent += `];
            let staticUrlArrStr = staticUrlArr.join().replace(',', '\\n');
            copyToClipboard(staticUrlArr.join('\\n'));
        }

        function copyAllStagingUrls() {
            let stagingUrlArr = [`;
        for (let i = 0; i < stagingUrls.length; i++) {
            htmlContent += "'" + stagingUrls[i].url + "',";
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
