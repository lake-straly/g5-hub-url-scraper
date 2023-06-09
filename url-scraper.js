javascript: (() => {
    function functionStartAlert() {
        const alertDiv = document.createElement("div");
        alertDiv.setAttribute('id', 'alertDiv');
        let firstDiv = document.querySelector('body').firstElementChild;
        document.body.insertBefore(alertDiv, firstDiv);
        let alertText = document.createElement("p");
        alertText.innerHTML = "URL Scraper Bookmarklet started<br>It may take some time to finish!";
        alertDiv.appendChild(alertText);
        alertText.style.margin = '0';
        alertDiv.style.fontFamily = '"Open Sans", sans-serif';
        alertDiv.style.position = 'fixed';
        alertDiv.style.top = '2em';
        alertDiv.style.right = '1em';
        alertDiv.style.zIndex = '999';
        alertDiv.style.textAlign = 'center';
        alertDiv.style.borderRadius = '2px';
        alertDiv.style.minHeight = '48px';
        alertDiv.style.lineHeight = '1.5em';
        alertDiv.style.padding = '1.5em';
        alertDiv.style.boxShadow = '0 2px 2px 0 rgba(0, 0, 0, .14), 0 1px 5px 0 rgba(0, 0, 0, .12), 0 3px 1px -2px rgba(0, 0, 0, .2)';
        alertDiv.style.maxHeight = '150px';
        alertDiv.style.maxWidth = '400px';
        alertDiv.style.fontSize = '15px';
        alertDiv.style.backgroundColor = 'rgb(163, 190, 140)';
        alertDiv.style.cursor = 'pointer';
        alertDiv.style.opacity = '1';
        alertDiv.style.transition = 'opacity 3s';
        setTimeout(() => {
            alertDiv.style.opacity = '0';
            setTimeout(() => {
                alertDiv.remove();
            }, 3000);
        }, 10000);
        alertDiv.addEventListener('click', () => {
            alertDiv.remove();
        })
    }
    functionStartAlert();

    /* Get URN from client Hub page */
    let clientUrn = document.querySelector('.p-g5-urn');
    /* Get the domain type. This is important to determine how the final URLs are constructed */
    let domainType = document.querySelector('.p-g5-domain-type');
    /* Get the vertical of the client */
    let clientVertical = document.querySelector('.p-g5-vertical');

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

    let pageIteration = 1;
    let locationsJsonUrl = `https://hub.g5marketingcloud.com/admin/clients/${clientUrn.innerText}/locations.json?order=name_asc&page=${pageIteration}`;

    /* Get JSON data from the specified URL */
    async function getJsonData(url) {
        let fetchResult = await fetch(url);
        if (!fetchResult.ok) {
            throw new Error(`Error fetching data from ${url}: ${fetchResult.status} ${fetchResult.statusText}`);
        }
        let json = await fetchResult.json();
        return json;
    }

    /* Recursive function to fetch data, increase pageIteration, and run again */
    async function fetchAndStoreData(url, jsonData = []) {
        try {
            let json = await getJsonData(url);
            jsonData.push(...json);
            pageIteration++;
            let nextUrl = `https://hub.g5marketingcloud.com/admin/clients/${clientUrn.innerText}/locations.json?order=name_asc&page=${pageIteration}`;
            return fetchAndStoreData(nextUrl, jsonData);
        } catch (error) {
            console.error(error);
        }
        return jsonData;
    }

    /* In order to use the data returned by fetch, we have to parse the data in an async function. */
    async function parseJsonData(domainType, clientVertical) {
        /* Determine what the vertical is */
        let clientVerticalSlug = '';
        let jsonData = await fetchAndStoreData(locationsJsonUrl);
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
                status: jsonData[i].status,
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
                        status: fullLocationData[j].status,
                        url: 'https://' + fullLocationData[j].naked_domain
                    };
                    liveUrls.push(liveUrlsObj);
                }
            }
        } else if (domainType.innerText === 'SingleDomainClient') {
            for (let k = 0; k < fullLocationData.length; k++) {
                if (fullLocationData[k].corporate) {
                    let liveUrlsObj = {
                        name: fullLocationData[k].name,
                        status: fullLocationData[k].status,
                        internalName: fullLocationData[k].internalName,
                        url: 'https://' + singleDomainDomain
                    };
                    liveUrls.unshift(liveUrlsObj);
                } else {
                    let liveUrlsObj = {
                        name: fullLocationData[k].name,
                        internalName: fullLocationData[k].internalName,
                        status: fullLocationData[k].status,
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
                status: fullLocationData[l].status,
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
                status: fullLocationData[m].status,
                url: sanitizeDomain(nonSecureStatic.replace(mainDomain, mainDomain + '-staging'))
            };
            stagingUrls.push(stagingUrlsObj);
        }

        /* Open blank web page with all of the URLs collected */
        var newWindow = window.open();
        var htmlContent = `<!DOCTYPE html><html><head>
          <title>URL Scraper</title>
          <link rel="icon" type="image/x-icon" href="https://g5-assets-cld-res.cloudinary.com/image/upload/q_auto,f_auto,fl_lossy/e_colorize,co_white/v1686244719/g5/g5-c-5jqt5m1l7-g5-wis-team-cms/g5-cl-1lshjewwoa-g5-wis-team-cms-test-bed-bend-or/uploads/scraper_zjeifx.png">
          <style>
            :root {
                --primary-clr: #BBD9EC;
                --primary-clr-lighten: #DCEBF4;
                --background-clr: #111;
            }
            body {
                font-family: sans-serif;
                background-color: #111;
                color: #fefefe;
            }
            h1 {
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
                border-collapse: collapse;
                width: 100%;
            }
            table td, table th {
                border: 2px solid #fff;
                padding: 0.5em;
                margin: 0;
            }
            table th {
                font-size: 1.25em;
            }
            th button {
                margin-left: 1em;
            }
            button {
                height: fit-content;
                background: transparent;
                border: 1px solid #fff;
                color: #fff;
                border-radius: 4px;
                padding: 0.25em;
                display: inline;
                transition: all 0.25s ease-in-out;
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
                transition: all 0.25s ease-in-out;
            }
            .urlContainer {
                max-width: 95vw;
                width: 100%;
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
            .url-cell, .name-cell {
                display: flex;
                align-items: center;
            }
            .name-cell button, .url-cell button {
                margin-left: auto;
                margin-right: 0;
            }
            div.headerButton button {
                font-size: 1.1em;
                position: relative;
                margin: 0.5em 0;
                left: 50%;
                transform: translateX(-50%);
            }
            .legend {
                width: fit-content;
                position: absolute;
                top: 1em;
                left: 3vw;
            }
          </style>
        </head>
        <body>
            <h1>URL Gatherer</h1>
            <div class="headerButton">
                <button onclick="copySelectedUrls()">Copy Selected Cells</button>
            </div>
            <div class="urlContainer">
                <table>
                    <tr class="header">
                        <th class="table-header">Status</th>
                        <th class="table-header">Name</th>
                        <th class="table-header">Internal Name</th>
                        <th class="table-header">Live Urls<button onclick="copyAllLiveUrls()">Copy All</button></th>
                        <th class="table-header">Static Urls<button onclick="copyAllStaticUrls()">Copy All</button></th>
                        <th class="table-header">Staging Urls<button onclick="copyAllStagingUrls()">Copy All</button></th>
                    </tr>`;
        for (let i = 0; i < liveUrls.length; i++) {
            htmlContent += `<tr class="${liveUrls[i].status.toLowerCase()}Location">
                <td><div class="status-cell"><div class="${liveUrls[i].status.toLowerCase()}StatusCell">${liveUrls[i].status}</div></div></td>
                <td><div class="name-cell"><input class="nameCheckbox ${i}" type="checkBox" onchange="createCheckboxArray(this)" value="${liveUrls[i].name}"></input>${liveUrls[i].name}<button onclick="copyToClipboard('${liveUrls[i].name}')">Copy</button></td></div>
                <td><div class="name-cell">`;
                if (liveUrls[i].internalName !== null) {
                    if (liveUrls[i].internalName.length > 0) {
                        htmlContent += `<input class="nameCheckbox ${i}" type="checkBox" onchange="createCheckboxArray(this)" value="${liveUrls[i].internalName}"></input>${liveUrls[i].internalName}<button onclick="copyToClipboard('${liveUrls[i].internalName}')">Copy</button>`
                    }
                }
                htmlContent += `</td></div>
                <td><div class="url-cell"><input class="urlCheckbox liveUrl ${i}" type="checkBox" onchange="createCheckboxArray(this)" value="${liveUrls[i].url}"></input><a target="_blank" class="liveUrl" href="${liveUrls[i].url}">${liveUrls[i].url}</a><button onclick="copyToClipboard('${liveUrls[i].url}')">Copy</button></td></div>
                <td><div class="url-cell"><input class="urlCheckbox staticUrl ${i}" type="checkBox" onchange="createCheckboxArray(this)" value="${staticUrls[i].url}"></input><a target="_blank" class="staticUrl" href="${staticUrls[i].url}">${staticUrls[i].url}</a><button onclick="copyToClipboard('${staticUrls[i].url}')">Copy</button></td></div>
                <td><div class="url-cell"><input class="urlCheckbox stagingUrl ${i}" type="checkBox" onchange="createCheckboxArray(this)" value="${stagingUrls[i].url}"></input><a target="_blank" class="stagingUrl" href="${stagingUrls[i].url}">${stagingUrls[i].url}</a><button onclick="copyToClipboard('${stagingUrls[i].url}')">Copy</button></td></div>
            </tr>`;
        }
        htmlContent += `</table>
        </div>
        <div class="rp_disclaimer">
            <p>REALPAGE INTERNAL USE ONLY</p>
        </div>
        <div class="legend">
            <label for="liveLocationCheck">Enable: </label><input name="liveLocationCheck" id="liveLocationCheck" type="checkbox" checked></input>Live<br>
            <label for="pendingLocationCheck">Enable: </label><input name="pendingLocationCheck" id="pendingLocationCheck" type="checkbox" checked></input>Pending<br>
            <label for="deletedLocationCheck">Enable: </label><input name="deletedLocationCheck" id="deletedLocationCheck" type="checkbox"></input>Deleted
        </div>
        <div class="credits">
            <p class="credits-header">Tool created by:</p>
            <p class="credits-name">Lake Straly</p>
            <p class="credits-name">Logan Straly</p>
        </div>
        <script type="text/javascript">
        function copyAllLiveUrls() {
            let liveUrlsArr = document.querySelectorAll('a.liveUrl:not(.disabled)');
            let liveUrls = [];
            for (let i = 0; i < liveUrlsArr.length; i++) {
                liveUrls.push(liveUrlsArr[i].innerText);
            }
            copyToClipboard(liveUrls.join('\\n'));
        }

        function copyAllStaticUrls() {
            let staticUrlsArr = document.querySelectorAll('a.staticUrl:not(.disabled)');
            let staticUrls = [];
            for (let i = 0; i < staticUrlsArr.length; i++) {
                staticUrls.push(staticUrlsArr[i].innerText);
            }
            copyToClipboard(staticUrls.join('\\n'));
        }

        function copyAllStagingUrls() {
            let stagingUrlsArr = document.querySelectorAll('a.stagingUrl:not(.disabled)');
            let stagingUrls = [];
            for (let i = 0; i < stagingUrlsArr.length; i++) {
                stagingUrls.push(stagingUrlsArr[i].innerText);
            }
            copyToClipboard(stagingUrls.join('\\n'));
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

        let checkBoxUrls = [];
        function createCheckboxArray(checkBox) {
            let url = checkBox.value;
            if (checkBox.checked) {
                checkBoxUrls.push(url);
            } else {
                var index = checkBoxUrls.indexOf(url);
                if (index > -1) {
                    checkBoxUrls.splice(index, 1);
                }
            }
        }
        function copySelectedUrls() {
            copyToClipboard(checkBoxUrls.join('\\n'));
        }

        let liveLocationCheck = document.getElementById('liveLocationCheck');
        let pendingLocationCheck = document.getElementById('pendingLocationCheck');
        let deletedLocationCheck = document.getElementById('deletedLocationCheck');

        liveLocationCheck.addEventListener('click', updateLocationLinks);
        pendingLocationCheck.addEventListener('click', updateLocationLinks);
        deletedLocationCheck.addEventListener('click', updateLocationLinks);

        let liveLocationTr = document.querySelectorAll('.liveLocation');
        let pendingLocationTr = document.querySelectorAll('.pendingLocation');
        let deletedLocationTr = document.querySelectorAll('.deletedLocation');

        function updateLocationLinks() {
            if (liveLocationCheck.checked) {
                for (let i = 0; i < liveLocationTr.length; i++) {
                    liveLocationTr[i].style.display = "table-row";
                    let liveUrlCellArr = liveLocationTr[i].querySelectorAll('.url-cell');
                    for (let i = 0; i < liveUrlCellArr.length; i++) {
                        liveUrlCellArr[i].classList.remove('disabled');
                        liveUrlCellArr[i].firstElementChild.nextElementSibling.classList.remove('disabled');
                    }
                }
            } else if (!liveLocationCheck.checked) {
                for (let i = 0; i < liveLocationTr.length; i++) {
                    liveLocationTr[i].style.display = "none";
                    let liveUrlCellArr = liveLocationTr[i].querySelectorAll('.url-cell');
                    for (let i = 0; i < liveUrlCellArr.length; i++) {
                        liveUrlCellArr[i].classList.add('disabled');
                        liveUrlCellArr[i].firstElementChild.nextElementSibling.classList.add('disabled');
                    }
                }
            }
            if (pendingLocationCheck.checked) {
                for (let i = 0; i < pendingLocationTr.length; i++) {
                    pendingLocationTr[i].style.display = "table-row";
                    let pendingUrlCellArr = pendingLocationTr[i].querySelectorAll('.url-cell');
                    for (let i = 0; i < pendingUrlCellArr.length; i++) {
                        pendingUrlCellArr[i].classList.remove('disabled');
                        pendingUrlCellArr[i].firstElementChild.nextElementSibling.classList.remove('disabled');
                    }
                }
            } else if (!pendingLocationCheck.checked) {
                for (let i = 0; i < pendingLocationTr.length; i++) {
                    pendingLocationTr[i].style.display = "none";
                    let pendingUrlCellArr = pendingLocationTr[i].querySelectorAll('.url-cell');
                    for (let i = 0; i < pendingUrlCellArr.length; i++) {
                        pendingUrlCellArr[i].classList.add('disabled');
                        pendingUrlCellArr[i].firstElementChild.nextElementSibling.classList.add('disabled');
                    }
                }
            }
            if (deletedLocationCheck.checked) {
                for (let i = 0; i < deletedLocationTr.length; i++) {
                    deletedLocationTr[i].style.display = "table-row";
                    let deletedUrlCellArr = deletedLocationTr[i].querySelectorAll('.url-cell');
                    for (let i = 0; i < deletedUrlCellArr.length; i++) {
                        deletedUrlCellArr[i].classList.remove('disabled');
                        deletedUrlCellArr[i].firstElementChild.nextElementSibling.classList.remove('disabled');
                    }
                }
            } else if (!deletedLocationCheck.checked) {
                for (let i = 0; i < deletedLocationTr.length; i++) {
                    deletedLocationTr[i].style.display = "none";
                    let deletedUrlCellArr = deletedLocationTr[i].querySelectorAll('.url-cell');
                    for (let i = 0; i < deletedUrlCellArr.length; i++) {
                        deletedUrlCellArr[i].classList.add('disabled');
                        deletedUrlCellArr[i].firstElementChild.nextElementSibling.classList.add('disabled');
                    }
                }
            }
        }
        updateLocationLinks();
        </script></body></html>`;
        newWindow.document.open();
        newWindow.document.write(htmlContent);
        newWindow.document.close();
    }
    parseJsonData(domainType, clientVertical);
})();
