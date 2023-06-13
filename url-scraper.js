javascript: (() => {
    function functionStartAlert() {
        const alertDiv = document.createElement("div");
        alertDiv.setAttribute('id', 'alertDiv');

        let firstDiv = document.querySelector('body').firstElementChild;
        document.body.insertBefore(alertDiv, firstDiv);

        let alertText = document.createElement("p");
        alertText.innerHTML = 'Hub Scraper started<br>It may take some time!<br>This alert will disappear when it is finised.<br><div class="cssLoader"></div>';

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
        alertDiv.style.color = 'white';
        alertDiv.style.backgroundColor = 'rgb(163, 190, 140)';
        alertDiv.style.cursor = 'pointer';
        alertDiv.style.transition = 'opacity 3s ease-in-out';
        alertDiv.style.opacity = '1';

        alertDiv.addEventListener('click', () => {
            alertDiv.remove();
        });

        var css = `.cssLoader {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 2s linear infinite;
            margin-inline: auto;
            margin-top: 1em;
        }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }`,
        head = document.head || document.getElementsByTagName('head')[0],
        style = document.createElement('style');
        head.appendChild(style);
        style.type = 'text/css';
        style.appendChild(document.createTextNode(css));
    }
    functionStartAlert();

    function clearAlert() {
        let alertDiv = document.getElementById('alertDiv');
        alertDiv.style.transition = 'opacity 1s ease-in-out';
        alertDiv.style.opacity = '0';
        setTimeout(() => {
            alertDiv.remove();
        }, 3000);
    }

    /* Get URN from client Hub page */
    let clientUrn = document.querySelector('.p-g5-urn');
    /* Get the domain type. This is important to determine how the final URLs are constructed */
    let domainType = document.querySelector('.p-g5-domain-type');
    /* Get the vertical of the client */
    let clientVertical = document.querySelector('.p-g5-vertical');

    /* Sanitize domain function. Removes special characters in a domain path, and removes special characters at the end of a domain path if present */
    function sanitizeDomain(url) {
        if (url.length <= 0 || url === null || url == '' || url === undefined) {
            return 'undefined';
        } else {
            const domainRegex = /^(\w+:\/\/[^\/]+)(.*)/;
            const matches = url.match(domainRegex);
            const domain = matches[1];
            let path = matches[2];
            path = path.replace(/[^A-Za-z0-9\/]+$/g, "").replace(/[^A-Za-z0-9\/]/g, "-");
            const modifiedUrl = domain + path;
            return modifiedUrl.toLowerCase();
        }
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
                    console.log(`${fullLocationData[j].name} does not have a valid domain.`);
                    let invalidLiveUrlsObj = {
                        name: fullLocationData[j].name,
                        internalName: fullLocationData[j].internalName,
                        status: fullLocationData[j].status,
                        url: 'null'
                    };
                    liveUrls.push(invalidLiveUrlsObj);
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
            if (liveUrls[l].url == 'null') {
                let staticUrlsObj = {
                    name: liveUrls[l].name,
                    internalName: fullLocationData[l].internalName,
                    status: fullLocationData[l].status,
                    url: liveUrls[l].url
                };
                staticUrls.push(staticUrlsObj);
            } else {
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
        }

        /* Build staging URLs using the previously built live URLs */
        for (let m = 0; m < staticUrls.length; m++) {
            if (liveUrls[m].url == 'null') {
                let stagingUrlsObj = {
                    name: liveUrls[m].name,
                    internalName: fullLocationData[m].internalName,
                    status: fullLocationData[m].status,
                    url: liveUrls[m].url
                };
                stagingUrls.push(stagingUrlsObj);
            } else {
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
            td:not(:has(> div.status-cell)) {
                min-width: 19ch;
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
                margin-top: 1em;
            }
            .credits {
                font-size: 0.45em;
                color: #fff;
            }
            .url-cell, .name-cell, .undefinedDiv {
                display: flex;
                align-items: center;
            }
            .name-cell button, .url-cell button, .undefinedDiv button {
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
                top: 7px;
                left: 3vw;
            }
            th div.header-cell {
                display: flex;
                align-items: center;
                justify-content: center;
            }
            p {
                margin: 0;
                padding: 0.5em;
            }
            .stickyNavHoverDiv {
                position: fixed;
                right: 0;
                bottom: 0;
                height: 123px;
                width: 25px;
            }
            .sticky-nav {
                position: fixed;
                opacity: 0;
                display: flex;
                flex-direction: column;
                gap: 3px;
                width: 50px;
                height: 103px;
                right: 10px;
                bottom: 10px;
                background-color: var(--primary-clr);
                border-radius: 27px;
                padding: 5px;
                transform: translateX(70px);
                transition: 0.5s transform ease-in-out, 5s opacity ease-in-out;
            }
            .stickyNavHoverDiv:hover .sticky-nav {
                opacity: 1;
                right: 10px;
                transform: translateX(0px);
                transition: 0.5s transform ease-in-out;
            }
            .sticky-nav div {
                width: 46px;
                height: 46px;
                background-color: #58798D;
                border: 2px solid #fff;
                border-radius: 50%;
                text-align: center;
                line-height: 50px;
                border-radius: 50%;
                color: #fff;
                cursor: pointer;
                transition: 0.15s all ease-in-out;
            }
            .sticky-nav div:hover {
                color: #303030;
                background-color: #30a4b3;
                transition: 0.15s all ease-in-out;
            }
            .stickyNavHoverDiv .pullout-bar {
                position: absolute;
                bottom: 37.5px;
                right: 65px;
                background-color: var(--primary-clr);
                clip-path: polygon(30% 0, 100% 0, 100% 100%, 30% 100%, 0% 85%, 0% 15%);
                height: 50px;
                width: 25px;
                transform: translateX(70px);
                transition: 0.5s transform ease-in-out;
            }
            .stickyNavHoverDiv:hover .pullout-bar {
                transform: translateX(25px);
                transition: 0.5s transform ease-in-out;
            }
            .pullout-bar div {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                height: 50%;
                width: 10%;
                background-color: rgba(51, 51, 51, 0.65);
            }
            .pullout-bar div:first-of-type {
                left: 25%;
            }
          </style>
        </head>
        <body>
            <h1>URL Scraper</h1>
            <div class="headerButton">
                <button onclick="copySelectedUrls()">Copy Selected Cells</button>
            </div>
            <div class="urlContainer">
                <table>
                    <tr class="header">
                        <th class="table-header"><div class="header-cell">Status</div></th>
                        <th class="table-header"><div class="header-cell">Name<button onclick="copyAllNames()">Copy All</button></div></th>
                        <th class="table-header"><div class="header-cell">Internal Name<button onclick="copyAllInternalNames()">Copy All</button></div></th>
                        <th class="table-header"><div class="header-cell">Live Urls<button onclick="copyAllLiveUrls()">Copy All</button></div></th>
                        <th class="table-header"><div class="header-cell">Static Urls<button onclick="copyAllStaticUrls()">Copy All</button></div></th>
                        <th class="table-header"><div class="header-cell">Staging Urls<button onclick="copyAllStagingUrls()">Copy All</button></div></th>
                    </tr>`;
        for (let i = 0; i < liveUrls.length; i++) {
            if (liveUrls[i].url == 'null') {
                htmlContent += `<tr class="undefinedLocation ${liveUrls[i].status.toLowerCase()}Location">`
            } else {
                htmlContent += `<tr class="${liveUrls[i].status.toLowerCase()}Location">`
            }
            htmlContent += `<td><div class="status-cell"><div class="${liveUrls[i].status.toLowerCase()}StatusCell"><div class="info">${liveUrls[i].status}</div></div></div></td>
            <td><div class="name-cell locName"><input class="nameCheckbox ${i}" type="checkBox" onchange="createCheckboxArray(this)" value="${liveUrls[i].name}"></input><div class="info">${liveUrls[i].name}</div><button onclick="copyToClipboard('${liveUrls[i].name.replace(/'/g, "\\'")}')">Copy</button></td></div>
            <td><div class="name-cell locInternalName">`;
            if (liveUrls[i].internalName !== null && liveUrls[i].internalName.length > 0) {
                htmlContent += `<input class="nameCheckbox ${i}" type="checkBox" onchange="createCheckboxArray(this)" value="${liveUrls[i].internalName}"></input><div class="info">${liveUrls[i].internalName}</div><button onclick="copyToClipboard('${liveUrls[i].internalName.replace(/'/g, "\\'")}')">Copy</button>`
            }
            htmlContent += `</td></div>`;
            if (liveUrls[i].url == 'null') {
                htmlContent += `<td class="liveCell"><div class="undefinedDiv"><input class="nameCheckbox ${i}" type="checkBox" onchange="createCheckboxArray(this)" value="undefined"></input><p class="url-cell undefinedUrl info">undefined</p><button onclick="copyToClipboard('undefined')">Copy</button></div></td>
                <td class="staticCell"><div class="undefinedDiv"><input class="nameCheckbox ${i}" type="checkBox" onchange="createCheckboxArray(this)" value="undefined"></input><p class="url-cell undefinedUrl info">undefined</p><button onclick="copyToClipboard('undefined')">Copy</button></div></td>
                <td class="stagingCell"><div class="undefinedDiv"><input class="nameCheckbox ${i}" type="checkBox" onchange="createCheckboxArray(this)" value="undefined"></input><p class="url-cell undefinedUrl info">undefined</p><button onclick="copyToClipboard('undefined')">Copy</button></div></td>
                </tr>`;    
            } else {
                htmlContent += `<td class="liveCell"><div class="url-cell"><input class="urlCheckbox liveUrl ${i}" type="checkBox" onchange="createCheckboxArray(this)" value="${liveUrls[i].url}"></input><a target="_blank" class="info liveUrl" href="${liveUrls[i].url}">${liveUrls[i].url}</a><button onclick="copyToClipboard('${liveUrls[i].url}')">Copy</button></div></td>
                <td class="staticCell"><div class="url-cell"><input class="urlCheckbox staticUrl ${i}" type="checkBox" onchange="createCheckboxArray(this)" value="${staticUrls[i].url}"></input><a target="_blank" class="info staticUrl" href="${staticUrls[i].url}">${staticUrls[i].url}</a><button onclick="copyToClipboard('${staticUrls[i].url}')">Copy</button></div></td>
                <td class="stagingCell"><div class="url-cell"><input class="urlCheckbox stagingUrl ${i}" type="checkBox" onchange="createCheckboxArray(this)" value="${stagingUrls[i].url}"></input><a target="_blank" class="info stagingUrl" href="${stagingUrls[i].url}">${stagingUrls[i].url}</a><button onclick="copyToClipboard('${stagingUrls[i].url}')">Copy</button></div></td>
                </tr>`;
            }
        }
        htmlContent += `</table>
        </div>
        <div class="rp_disclaimer">
            <p>REALPAGE INTERNAL USE ONLY</p>
        </div>
        <div class="legend">
            <label for="liveLocationCheck">Enable: </label><input name="liveLocationCheck" id="liveLocationCheck" type="checkbox" checked></input>Live<br>
            <label for="pendingLocationCheck">Enable: </label><input name="pendingLocationCheck" id="pendingLocationCheck" type="checkbox" checked></input>Pending<br>
            <label for="deletedLocationCheck">Enable: </label><input name="deletedLocationCheck" id="deletedLocationCheck" type="checkbox"></input>Deleted<br>
            <label for="undefinedLocationCheck">Enable: </label><input name="undefinedLocationCheck" id="undefinedLocationCheck" type="checkbox"></input>Undefined Domain
        </div>
        <div class="credits">
            <p class="credits-header">Tool created by:</p>
            <p class="credits-name">Lake Straly</p>
            <p class="credits-name">Logan Straly</p>
        </div>
        <div class="stickyNavHoverDiv">
            <div class="pullout-bar"><div></div><div></div></div>
            <div class="sticky-nav">
                <div class="up-arrow">&#8593</div>
                <div class="down-arrow">&#8595</div>
            </div>
        </div>
        <script type="text/javascript">
        function copyAllNames() {
            let namesArr = document.querySelectorAll('tr:not(.disabled) .locName .info');
            let names = [];
            for (let i = 0; i < namesArr.length; i++) {
                names.push(namesArr[i].innerText);
            }
            copyToClipboard(names.join('\\n'));
        }
        function copyAllInternalNames() {
            let namesArr = document.querySelectorAll('tr:not(.disabled) .locInternalName .info');
            let names = [];
            for (let i = 0; i < namesArr.length; i++) {
                names.push(namesArr[i].innerText);
            }
            copyToClipboard(names.join('\\n'));
        }
        function copyAllLiveUrls() {
            let liveUrlsArr = document.querySelectorAll('tr:not(.disabled) .liveCell .info');
            let liveUrls = [];
            for (let i = 0; i < liveUrlsArr.length; i++) {
                liveUrls.push(liveUrlsArr[i].innerText);
            }
            copyToClipboard(liveUrls.join('\\n'));
        }
        function copyAllStaticUrls() {
            let staticUrlsArr = document.querySelectorAll('tr:not(.disabled) .staticCell .info');
            let staticUrls = [];
            for (let i = 0; i < staticUrlsArr.length; i++) {
                staticUrls.push(staticUrlsArr[i].innerText);
            }
            copyToClipboard(staticUrls.join('\\n'));
        }
        function copyAllStagingUrls() {
            let stagingUrlsArr = document.querySelectorAll('tr:not(.disabled) .stagingCell .info');
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
        let undefinedLocationCheck = document.getElementById('undefinedLocationCheck');

        liveLocationCheck.addEventListener('click', updateLocationLinks);
        pendingLocationCheck.addEventListener('click', updateLocationLinks);
        deletedLocationCheck.addEventListener('click', updateLocationLinks);
        undefinedLocationCheck.addEventListener('click', updateLocationLinks);

        let liveLocationTr = document.querySelectorAll('tr.liveLocation');
        let pendingLocationTr = document.querySelectorAll('tr.pendingLocation');
        let deletedLocationTr = document.querySelectorAll('tr.deletedLocation');
        let undefinedLocationTr = document.querySelectorAll('tr.undefinedLocation');

        function updateLocationLinks() {
            if (liveLocationCheck.checked) {
                for (let i = 0; i < liveLocationTr.length; i++) {
                    liveLocationTr[i].style.display = "table-row";
                    liveLocationTr[i].classList.remove('disabled');
                }
            } else if (!liveLocationCheck.checked) {
                for (let i = 0; i < liveLocationTr.length; i++) {
                    liveLocationTr[i].style.display = "none";
                    liveLocationTr[i].classList.add('disabled');
                }
            }
            if (pendingLocationCheck.checked) {
                for (let i = 0; i < pendingLocationTr.length; i++) {
                    pendingLocationTr[i].style.display = "table-row";
                    pendingLocationTr[i].classList.remove('disabled');
                }
            } else if (!pendingLocationCheck.checked) {
                for (let i = 0; i < pendingLocationTr.length; i++) {
                    pendingLocationTr[i].style.display = "none";
                    pendingLocationTr[i].classList.add('disabled');
                }
            }
            if (deletedLocationCheck.checked) {
                for (let i = 0; i < deletedLocationTr.length; i++) {
                    deletedLocationTr[i].style.display = "table-row";
                    deletedLocationTr[i].classList.remove('disabled');
                }
            } else if (!deletedLocationCheck.checked) {
                for (let i = 0; i < deletedLocationTr.length; i++) {
                    deletedLocationTr[i].style.display = "none";
                    deletedLocationTr[i].classList.add('disabled');
                }
            }
            if (undefinedLocationCheck.checked) {
                for (let i = 0; i < undefinedLocationTr.length; i++) {
                    undefinedLocationTr[i].style.display = "table-row";
                    undefinedLocationTr[i].classList.remove('disabled');
                }
            } else if (!undefinedLocationCheck.checked) {
                for (let i = 0; i < undefinedLocationTr.length; i++) {
                    undefinedLocationTr[i].style.display = "none";
                    undefinedLocationTr[i].classList.add('disabled');
                }
            }
        }
        updateLocationLinks();
        let stickyNavAnchors = document.querySelectorAll('.sticky-nav div');
        let stickyNavUp = document.querySelector('.sticky-nav .up-arrow');
        let stickyNavDown = document.querySelector('.sticky-nav .down-arrow');

        stickyNavAnchors.forEach((item) => {
            item.addEventListener('click', () => {
                if (item.innerText === '&#8593' || item.innerText === '↑') {
                    window.scrollTo({
                        top: 0,
                        left: 0,
                        behavior: "smooth"
                      });
                } else if (item.innerText === '&#8595' || item.innerText === '↓') {
                    window.scrollTo({
                        top: document.body.scrollHeight,
                        left: 0,
                        behavior: "smooth"
                    });
                }
            });
        });

        </script></body></html>`;
        clearAlert();
        newWindow.document.open();
        newWindow.document.write(htmlContent);
        newWindow.document.close();
    }
    parseJsonData(domainType, clientVertical);
})();
