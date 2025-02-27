// ==UserScript==
// @name         LMS
// @namespace    http://tampermonkey.net/
// @version      1.15
// @description  Extracts and prints lab sheet information from 3Shape
// @author       You
// @match        https://lms.3shape.com/ui/CaseRecord/*
// @match        https://lms.3shape.com/ui/caseRecord/*
// @match        https://lms.3shape.com/ui/CaseEntry
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      lms.3shape.com
// @connect      api.doppio.sh
// @require      https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js
// @require      https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js
// @require      file:///Users/oralart/Repos/oralart-print-tool/lms.user.js
// @grant        GM_cookie
// @grant        GM_download
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==


(function () {
    'use strict';

    console.log(`Version 1.15`);
    // Add print button to the page
    function addPrintButton() {
        const button = document.createElement('button');
        button.id = 'lab-sheet-button';
        button.textContent = 'Fetching...';
        button.style.cssText = `
            position: fixed;
            width: 140px;
            top: 41px;
            right: 32px;
            z-index: 10000;
            padding: 8px 16px;
            background: #cccccc;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: not-allowed;
            transition: all 0.3s ease;
        `;

        // Create view labels button
        const viewLabelsButton = document.createElement('button');
        viewLabelsButton.id = 'view-labels-button';
        viewLabelsButton.textContent = 'View Label';
        viewLabelsButton.style.cssText = `
            position: fixed;
            width: 140px;
            top: 41px;
            right: 182px;
            z-index: 10000;
            padding: 8px 16px;
            background: #cccccc;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: not-allowed;
            transition: all 0.3s ease;
        `;

        // Create view work ticket button
        const viewWorkTicketButton = document.createElement('button');
        viewWorkTicketButton.id = 'view-work-ticket-button';
        viewWorkTicketButton.textContent = 'View Work Ticket';
        viewWorkTicketButton.style.cssText = `
            position: fixed;
            width: 140px;
            top: 41px;
            right: 332px;
            z-index: 10000;
            padding: 8px 16px;
            background: #cccccc;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: not-allowed;
            transition: all 0.3s ease;
        `;

        // Create auto-download checkbox
        const checkboxContainer = document.createElement('div');
        checkboxContainer.style.cssText = `
            position: fixed;
            top: 80px;
            right: 32px;
            z-index: 10000;
            display: flex;
            align-items: center;
            font-size: 12px;
            color: #4a4a4a;
        `;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'auto-download-checkbox';
        checkbox.checked = GM_getValue('auto-download', true); // Default to true
        checkbox.style.marginRight = '5px';

        checkbox.addEventListener('change', function () {
            GM_setValue('auto-download', this.checked);
        });

        const label = document.createElement('label');
        label.htmlFor = 'auto-download-checkbox';
        label.textContent = 'Auto-download';

        checkboxContainer.appendChild(checkbox);
        checkboxContainer.appendChild(label);

        // Only add click listener when data is ready
        const updateButtonState = () => {
            if (cachedPDFs.isGenerating) {
                button.textContent = 'Waiting...';
                button.style.background = '#cccccc';
                button.style.cursor = 'not-allowed';
                button.onclick = null;

                viewLabelsButton.style.background = '#cccccc';
                viewLabelsButton.style.cursor = 'not-allowed';
                viewLabelsButton.onclick = null;

                viewWorkTicketButton.style.background = '#cccccc';
                viewWorkTicketButton.style.cursor = 'not-allowed';
                viewWorkTicketButton.onclick = null;
            } else if (cachedData && !cachedPDFs.workTicket && !cachedPDFs.label) {
                button.textContent = 'Generate PDF';
                button.style.background = '#4a4a4a';
                button.style.cursor = 'pointer';
                button.onclick = generatePDFs;

                viewLabelsButton.textContent = 'View Label';
                viewLabelsButton.style.background = '#4a4a4a';
                viewLabelsButton.style.cursor = 'pointer';
                viewLabelsButton.onclick = viewLabels;

                viewWorkTicketButton.textContent = 'View Work Ticket';
                viewWorkTicketButton.style.background = '#4a4a4a';
                viewWorkTicketButton.style.cursor = 'pointer';
                viewWorkTicketButton.onclick = viewWorkTicket;
            } else if (cachedData && (cachedPDFs.workTicket || cachedPDFs.label)) {
                button.textContent = 'Download';
                button.style.background = '#4a4a4a';
                button.style.cursor = 'pointer';
                button.onclick = downloadPDFs;

                viewLabelsButton.textContent = 'View Label';
                viewLabelsButton.style.background = '#4a4a4a';
                viewLabelsButton.style.cursor = 'pointer';
                viewLabelsButton.onclick = viewLabels;

                viewWorkTicketButton.textContent = 'View Work Ticket';
                viewWorkTicketButton.style.background = '#4a4a4a';
                viewWorkTicketButton.style.cursor = 'pointer';
                viewWorkTicketButton.onclick = viewWorkTicket;
            } else {
                button.textContent = 'Fetching...';
                button.style.background = '#cccccc';
                button.style.cursor = 'not-allowed';
                button.onclick = null;

                viewLabelsButton.style.background = '#cccccc';
                viewLabelsButton.style.cursor = 'not-allowed';
                viewLabelsButton.onclick = null;

                viewWorkTicketButton.style.background = '#cccccc';
                viewWorkTicketButton.style.cursor = 'not-allowed';
                viewWorkTicketButton.onclick = null;
            }
        };

        // Add observer to watch for changes in cached data
        const checkDataInterval = setInterval(() => {
            updateButtonState();
            if (cachedData && cachedPDFs.workTicket && cachedPDFs.label) {
                clearInterval(checkDataInterval);
            }
        }, 100);

        document.body.appendChild(button);
        document.body.appendChild(viewLabelsButton);
        document.body.appendChild(viewWorkTicketButton);
        document.body.appendChild(checkboxContainer);
        return button;
    }

    // Fetch with authentication
    const fetchWithAuth = async (url) => {
        const authToken = getAuthToken();
        if (!authToken) {
            throw new Error('Authentication token not found');
        }

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                headers: {
                    "accept": "application/json",
                    "authorization": `Bearer ${authToken}`,
                    "content-type": "application/json"
                },
                withCredentials: true,
                onload: function (response) {
                    if (response.status === 200) {
                        resolve(JSON.parse(response.responseText));
                    } else {
                        reject(new Error(`API call failed: ${url}`));
                    }
                },
                onerror: function (error) {
                    reject(error);
                }
            });
        });
    };

    const getAuthToken = () => {
        const cookies = document.cookie.split(';');
        const authCookie = cookies.find(cookie => cookie.trim().startsWith('identity_jat='));
        return authCookie ? authCookie.split('=')[1].trim() : null;
    };

    // Rest of your existing functions remain the same
    const formatAPIDate = (isoDate) => {
        if (!isoDate) return 'N/A';
        const date = new Date(isoDate);
        return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
    };

    const getCaseId = () => {
        const matches = window.location.pathname.match(/CaseRecord\/(\d+)/i);
        if (matches) {
            return matches[1];
        }
        throw new Error('Could not find case ID in URL');
    };

    // Add this new function for fetching client data and extracting courier info
    const fetchClientCourierInfo = async (clientId) => {
        const cookies = await new Promise((resolve) => {
            GM_cookie.list({ domain: 'lms.3shape.com' }, (cookies) => {
                resolve(cookies);
            });
        });

        const cookieString = cookies
            .map(cookie => `${cookie.name}=${cookie.value}`)
            .join('; ');

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: `https://lms.3shape.com/pages/admin/client_management/client_list.asp?cmd=view&style=popup&allowEdit=true&id=${clientId}`,
                headers: {
                    "Accept": "text/html",
                    "Cookie": cookieString
                },
                onload: function (response) {
                    if (response.status === 200) {
                        // Create a temporary DOM element to parse the HTML
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(response.responseText, "text/html");

                        // Find the courier cell by looking for the label first
                        const courierLabel = Array.from(doc.querySelectorAll('.tab_tbl_label'))
                            .find(el => el.textContent.trim() === 'Default Courier');

                        if (courierLabel) {
                            // Get the next cell which contains the courier info
                            const courierCell = courierLabel.nextElementSibling;
                            const courierInfo = courierCell ? courierCell.textContent.trim() : '';
                            resolve(courierInfo);
                        } else {
                            resolve(''); // Courier info not found
                        }
                    } else {
                        reject(new Error(`Failed to fetch client data: ${response.status}`));
                    }
                },
                onerror: function (error) {
                    reject(error);
                }
            });
        });
    };

    const fetchProductLookup = async () => {
        try {
            const response = await fetch("https://api.sheety.co/6565224fa65a11082d88012dd5762961/maskingTapeItemRules/sheet1");
            const data = await response.json();
            return data.sheet1.reduce((acc, item) => {
                acc[item.product] = item.use;
                return acc;
            }, {});
        } catch (error) {
            console.error('Error fetching product lookup:', error);
            return {};
        }
    };

    // Modify the getData function
    const getData = async () => {
        try {
            const caseId = getCaseId();
            const authToken = getAuthToken();

            // First get the case data to extract clientId
            const caseData = await fetchWithAuth(`https://lms.3shape.com/backend/case/caseInfo/${caseId}`);
            const [productionData, itemsData, preferencesData, courierInfo, productLookup] = await Promise.all([
                fetchWithAuth(`https://lms.3shape.com/backend/manufacture/productionLog/${caseId}?limit=100&offset=0`),
                fetchWithAuth(`https://lms.3shape.com/backend/case/record/caseItem/${caseId}`),
                fetchWithAuth(`https://lms.3shape.com/backend/doctor/case-preferences/${caseId}?limit=100`),
                fetchClientCourierInfo(caseData.clientId),
                fetchProductLookup()
            ]);

            // Format case items data with type lookup
            const caseItems = itemsData.data.map(item => ({
                type: productLookup[item.Item] || "",
                toothNum: item.ToothNum,
                item: item.Item,
                shade: item.Shade || ''
            }));

            // Format production log data
            const productionLog = productionData.data.map(task => ({
                date: formatAPIDate(task.deadline),
                rawDate: task.deadline,
                step: task.taskName,
                tech: task.assigned_technician || '',
                completedTech: task.completed_technician || '',
                completedDate: formatAPIDate(task.completedOn)
            }));

            // Format doctor preferences
            const doctorPreferences = preferencesData.map(pref =>
                pref.value.split('\n')
            ).flat();

            return {
                patientName: `${caseData.patientLastName}, ${caseData.patientFirstName}`.trim(),
                panNum: caseData.panNum,
                barcode: caseData.barcode,
                clientInfo: caseData.clientName,
                doctorName: `${caseData.doctorLastName}, ${caseData.doctorFirstName}`.trim(),
                phone: caseData.clientPhone,
                caseItems,
                comments: caseData.specialInstruction || '',
                productionLog,
                dueDate: formatAPIDate(caseData.dueDate),
                shipDate: formatAPIDate(caseData.shipDate),
                doctorPreferences,
                courierInfo
            };
        } catch (e) {
            console.error('Error in getData:', e);
            throw e;
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr || dateStr === 'N/A') return '';
        const [day, month] = dateStr.split('/').map(Number);
        const date = new Date(new Date().getFullYear(), month - 1, day);
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        return `${months[date.getMonth()]} ${day}${getOrdinalSuffix(day)}`;
    };

    const getOrdinalSuffix = (day) => {
        if (day > 3 && day < 21) return 'th';
        switch (day % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
        }
    };

    const generatePrintHTML = (data) => {
        // Format due date for the black box
        const formatDueDate = (dateStr) => {
            if (!dateStr || dateStr === 'N/A') return { day: '', rest: '' };
            const [day, month] = dateStr.split('/').map(Number);
            const date = new Date(new Date().getFullYear(), month - 1, day);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            return {
                day: String(day).padStart(2, '0'),
                rest: `${months[date.getMonth()]} ${date.getFullYear()} (${days[date.getDay()]})`
            };
        };

        const dueDateTime = formatDueDate(data.dueDate);

        // Generate barcode SVG directly
        const tempSvg = document.createElement('svg');
        JsBarcode(tempSvg, data.barcode, {
            format: "CODE128",
            width: 2,
            height: 25,
            displayValue: false
        });
        const barcodeSvg = tempSvg.outerHTML;

        return `
<!DOCTYPE html>
<html>
<head>
    <title>Lab Sheet - ${data.patientName}</title>
    <style>
        body { 
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            line-height: 1.4;
        }
        .header-container {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            align-items: start;
            position: relative;
        }
        .header-section {
            text-align: left;
        }
        .header-section.center {
            text-align: center;
        }
        .header-section.right {
            text-align: right;
        }
        .company-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 0;
        }
        .courier-text, .pan-label {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
            white-space: nowrap;
        }
        .barcode-number {
            font-weight: bold;
            font-size: 26px;
        }
        .pan-container {
            display: flex;
            flex-direction: column;
        }
        .pan-number {
            font-size: 26px;
            font-weight: bold;
        }
        .due-date-box {
            background: #000;
            color: #fff;
            padding: 15px;
            text-align: center;
            width: 115px;
            z-index: 1;
        }
        .due-date-day {
            font-size: 54px;
            font-weight: bold;
            line-height: 1;
            margin-bottom: 6px;
        }
        .due-date-rest {
            font-size: 16px;
            line-height: 1.2;
        }
        .info-label {
            font-size: 12px;
            color: #666;
            margin-bottom: 2px;
        }
        .info-value {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .details-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        .details-table th {
            border-bottom: 2px solid #000;
            padding: 6px 8px;
            text-align: left;
            font-weight: bold;
            border-top: none;
            font-size: min(100cqw, 14px);
            white-space: nowrap;
        }
        .details-table td {
            padding: 6px 8px;
            text-align: left;
            font-size: 14px;
            border-bottom: 1px solid #e0e0e0;
        }
        .schedule-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
        }
        .schedule-table tr {
            border-bottom: 1px solid #e0e0e0;
        }
        .schedule-table td {
            padding: 4px 8px;
            vertical-align: top;
            line-height: 1;
        }
        @media print {
            @page { margin: 0.5cm; }
            body { print-color-adjust: exact; }
        }
        .comments-box {
            margin-bottom: 20px;
        }
        .comments-box h3 {
            margin-bottom: 0;
        }
        .comments-content {
            border-top: 2px solid #000;
            padding-top: 10px;
            font-weight: bold;
        }
        .doctor-preferences {
            margin-bottom: 20px;
        }
        .doctor-preferences h3 {
            margin-bottom: 0;
            padding: 0;
        }
        .doctor-preferences > div {
            border-top: 2px solid #000;
            padding: 10px 0;
        }
        .schedule-table th {
            text-align: left;
            padding: 6px 8px;
            font-weight: bold;
            border-bottom: 2px solid #000;
        }
        .phone-label {
            color: #666;
            font-size: 12px;
            margin-bottom: 2px;
        }
        .phone-value {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .production-schedule h3 {
            display: none;
        }
        .schedule-table thead tr th {
            border-bottom: 2px solid #000;
            border-top: none;
        }
        .schedule-table td:first-child {
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="header-container">
        <div class="header-section">
            <div class="company-name">${data.clientInfo}</div>
            ${barcodeSvg}
        </div>
        <div class="header-section center">
            <div class="courier-text">${data.courierInfo || 'No Courier Specified'}</div>
            <div class="barcode-number">${data.barcode}</div>
        </div>
        <div class="header-section right">
            <div class="pan-container">
                <div class="pan-label">Pan #</div>
                <div class="pan-number">${data.panNum}</div>
            </div>
        </div>
    </div>

    <div style="display: flex">
        <div class="left-info-container" style="flex: 1; margin-right: 5px;">
            <div class="info-section">
                <div class="info-label">Doctor</div>
                <div class="info-value">${data.doctorName}</div>
            </div>

            <div class="info-section">
                <div class="info-label">Patient</div>
                <div class="info-value">${data.patientName}</div>
            </div>

            <div class="info-section">
                <div class="phone-label">Phone</div>
                <div class="phone-value">${data.phone}</div>
            </div>
        </div>

        <div class="right-info-container" style="display: flex; flex-direction: column; ">
            <div>
                <div class="due-date-box">
                    <div class="due-date-day">${dueDateTime.day}</div>
                    <div class="due-date-rest">${dueDateTime.rest}</div>
                </div>
            </div>
        </div>
    </div>

    <div>Total Units: ${data.caseItems.length}</div>

    <table class="details-table">
        <thead>
            <tr>
                <th>Tooth #</th>
                <th>Description</th>
                <th>Shade</th>
            </tr>
        </thead>
        <tbody>
            ${data.caseItems.map(item => `
                <tr>
                    <td>${item.toothNum}</td>
                    <td>${item.item}</td>
                    <td>${item.shade}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="comments-box">
        <h3>Comments</h3>
        <div class="comments-content">${data.comments}</div>
    </div>

    <div class="doctor-preferences">
        <h3>Doctor Preferences</h3>
        <div>
            ${data.doctorPreferences.map(pref => `<div>${pref}</div>`).join('')}
        </div>
    </div>

    <div class="production-schedule">
        <h3>Production Schedule</h3>
        <table class="schedule-table">
            <thead>
                <tr>
                    <th style="width: 80px">Deadline</th>
                    <th>Step</th>
                </tr>
            </thead>
            <tbody>
                ${data.productionLog.map(log => `
                    <tr>
                        <td>${formatDate(log.date)}</td>
                        <td>${log.step}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
</body>
</html>
`;
    };

    const generateLabelHTML = (data) => {
        // Group items by type and count teeth, excluding "hide" type
        const typeGroups = data.caseItems.reduce((acc, item) => {
            if (item.type && item.type.toLowerCase() !== 'hide') {
                const type = item.type;
                // Split tooth numbers by comma and count them
                const teethCount = item.toothNum
                    .split(',')
                    .length;

                acc[type] = (acc[type] || 0) + teethCount;
            }
            return acc;
        }, {});

        // Format the groups into strings like "3x Zir\n2x Emax"
        const typeText = Object.entries(typeGroups)
            .map(([type, count]) => `${count}ˣ${type}`)
            .join('\n');

        let formattedDate = { dayAndDate: '', month: '' };
        const porcelainStep = data.productionLog.find(log => log.step.toLowerCase().includes('porcelain'));

        const formatDate = (isoDate) => {
            if (!isoDate) return { dayAndDate: '', month: '' };
            const dateOnly = isoDate.split('T')[0];
            const date = dayjs(dateOnly);
            return {
                dayAndDate: date.format('ddd DD'),
                month: date.format('MMM')
            };
        };

        // Function to subtract one working day (skipping weekends)
        const subtractWorkingDay = (date) => {
            // Start by subtracting one day
            let result = dayjs(date).subtract(1, 'day');

            // If it's a weekend (Saturday = 6, Sunday = 0), subtract more days
            const dayOfWeek = result.day();
            if (dayOfWeek === 0) { // Sunday
                result = result.subtract(2, 'day'); // Go back to Friday
            } else if (dayOfWeek === 6) { // Saturday
                result = result.subtract(1, 'day'); // Go back to Friday
            }

            return result.toISOString();
        };

        if (porcelainStep && porcelainStep.rawDate) {
            formattedDate = formatDate(porcelainStep.rawDate);
        } else if (data.productionLog.length > 0) {
            formattedDate = formatDate(subtractWorkingDay(data.productionLog[data.productionLog.length - 1].rawDate));
        }

        // Generate barcode SVG directly
        const tempSvg = document.createElement('svg');
        JsBarcode(tempSvg, data.barcode, {
            format: "CODE128",
            width: 2,
            height: 20,
            displayValue: false,
            fontSize: 16,
            margin: 0
        });
        const barcodeSvg = tempSvg.outerHTML;

        return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            margin: 0;
            padding: 10px;
            font-family: monospace;
        }
        .container {
            display: flex;
            width: 100%;
            align-items: start;
            font-size: 28px;
            margin-bottom: 10px;
        }
        .left { 
            text-align: left;
            word-break: normal;
            white-space: pre-line;
            line-height: 1.2;
        }
        .center { 
            text-align: center;
            white-space: nowrap;
            font-weight: bold;
        }
        .center .day-date {
        }
        .center .month {
            font-size: 20px;
            display: block;
            line-height: 1;
        }
        .right { 
            text-align: right;
            white-space: nowrap;
        }
        .spacer {
            flex-grow: 1;
        }
        .barcode-container {
            width: 100%;
            text-align: center;
            margin-top: 5px;
        }
        .barcode-container svg {
            width: 100%;
            height: auto;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="left">${typeText || 'N/A'}</div>
        <div class="spacer"></div>
        <div class="center">
            <div class="day-date">${formattedDate.dayAndDate}</div>
            <div class="month">${formattedDate.month}</div>
        </div>
        <div class="spacer"></div>
        <div class="right">${data.panNum}</div>
    </div>
    <div class="barcode-container">
        ${barcodeSvg}
    </div>
</body>
</html>
`;
    };

    // Keep the downloadPDF function as is
    const downloadPDF = (pdfResponse, filename) => {
        const blob = new Blob([pdfResponse.response], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Add variables to store all prefetched data
    let cachedData = null;
    let cachedPDFs = {
        workTicket: null,
        label: null,
        isGenerating: false  // New property to track PDF generation status
    };

    // Add storage handling at the start of your script
    const getStoredApiKey = () => {
        const apiKey = GM_getValue('doppio-apiKey', '');
        if (!apiKey) {
            const userKey = prompt('Please enter your API key for the PDF service:');
            if (userKey) {
                GM_setValue('doppio-apiKey', userKey);
                return userKey;
            }
        }
        return apiKey;
    };

    // Modify the printLabSheet function to handle downloads only
    const downloadPDFs = async () => {
        try {
            if (!cachedData || !cachedPDFs.workTicket || !cachedPDFs.label) {
                throw new Error('Data or PDFs not yet loaded');
            }

            // Use patient name instead of pan number for filenames
            const sanitizedPatientName = cachedData.patientName.replace(/[^\w\s]/g, '');
            const workTicketFilename = `${sanitizedPatientName} LMS (work ticket).pdf`;
            const labelFilename = `${sanitizedPatientName} LMS (label).pdf`;

            downloadPDF(cachedPDFs.workTicket, workTicketFilename);
            downloadPDF(cachedPDFs.label, labelFilename);

        } catch (e) {
            console.error('Error in downloadPDFs:', e);
            showError('Failed to download PDFs: ' + e.message);
        }
    };

    // Add a new function to generate PDFs when button is clicked
    const generatePDFs = async () => {
        try {
            if (!cachedData) {
                throw new Error('Data not yet loaded');
            }

            // Set generating flag
            cachedPDFs.isGenerating = true;

            // Button state will be updated by the interval

            // Generate HTML content
            const workTicketHTML = generatePrintHTML(cachedData);
            const labelHTML = generateLabelHTML(cachedData);

            try {
                // Generate both PDFs in parallel
                console.log('Generating PDFs...');
                [cachedPDFs.workTicket, cachedPDFs.label] = await Promise.all([
                    generatePDF(workTicketHTML, {
                        width: '112mm',
                        height: '297mm'
                    }),
                    generatePDF(labelHTML, {
                        width: '100mm',
                        height: '61mm'
                    })
                ]);

                console.log('PDFs generated and cached');

                // Clear generating flag
                cachedPDFs.isGenerating = false;

                // Automatically download PDFs once generated
                downloadPDFs();

                // Button state will be updated by the interval

            } catch (pdfError) {
                console.error('PDF generation error:', pdfError);
                showError('Failed to generate PDFs: ' + pdfError.message);

                // Clear generating flag
                cachedPDFs.isGenerating = false;

                // Button state will be updated by the interval
            }
        } catch (e) {
            console.error('Error generating PDFs:', e);
            showError('Failed to generate PDFs: ' + e.message);

            // Clear generating flag
            cachedPDFs.isGenerating = false;
        }
    };

    // Modify the prefetchData function to check navigation source
    const prefetchData = async () => {
        try {
            // Fetch data first
            cachedData = await getData();
            console.log("Data prefetched successfully", cachedData);

            // Only auto-download if checkbox is checked
            const autoDownload = GM_getValue('auto-download', true);
            if (autoDownload) {
                generatePDFs();
            }

            // Update button state (will be handled by the interval in addPrintButton)
        } catch (e) {
            console.error('Error prefetching data:', e);
            showError('Failed to load data: ' + e.message);
        }
    };

    const openPreviewWindow = (html) => {
        const newWindow = window.open();
        newWindow.document.write(html);
        newWindow.document.close();
    };

    // Modified generatePDF function to accept custom dimensions
    const generatePDF = async (htmlContent, dimensions = {
        width: '112mm',
        height: '297mm'
    }) => {
        // UTF-8 safe base64 encoding
        const utf8ToBase64 = (str) => {
            return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
                function toSolidBytes(match, p1) {
                    return String.fromCharCode('0x' + p1);
                }));
        };

        const encodedHTML = utf8ToBase64(htmlContent);
        const payload = {
            page: {
                pdf: {
                    width: dimensions.width,
                    height: dimensions.height,
                    margin: {
                        top: '2mm',
                        right: '2mm',
                        bottom: '2mm',
                        left: '2mm'
                    },
                    printBackground: true
                },
                setContent: {
                    html: encodedHTML
                }
            }
        };

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: 'https://api.doppio.sh/v1/render/pdf/direct',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getStoredApiKey()}`
                },
                data: JSON.stringify(payload),
                responseType: 'blob',
                onload: function (response) {
                    if (response.status === 200) {
                        resolve(response);
                    } else {
                        reject(new Error('Failed to generate PDF'));
                    }
                },
                onerror: function (error) {
                    reject(error);
                }
            });
        });
    };

    const showError = (message) => {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #ff4444;
            color: white;
            padding: 10px 20px;
            border-radius: 4px;
            z-index: 10001;
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
    };

    // Add keyboard shortcut handler
    const handleKeyboardShortcut = (e) => {
        // Check for Control/Command + P
        if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault(); // Prevent default print dialog
            printLabSheet();
        }
    };

    // Add a new function to view labels in a new tab
    const viewLabels = () => {
        try {
            if (!cachedData) {
                throw new Error('Data not yet loaded');
            }

            // Generate HTML and open in new tab
            const labelHTML = generateLabelHTML(cachedData);
            openPreviewWindow(labelHTML);
        } catch (e) {
            console.error('Error viewing labels:', e);
            showError('Failed to view labels: ' + e.message);
        }
    };

    // Add a new function to view work ticket in a new tab
    const viewWorkTicket = () => {
        try {
            if (!cachedData) {
                throw new Error('Data not yet loaded');
            }

            // Generate HTML and open in new tab
            const workTicketHTML = generatePrintHTML(cachedData);
            openPreviewWindow(workTicketHTML);
        } catch (e) {
            console.error('Error viewing work ticket:', e);
            showError('Failed to view work ticket: ' + e.message);
        }
    };

    // Store original history methods
    let originalPushState;
    let originalReplaceState;

    // Check if we're on a CaseRecord page or need to wait for redirection
    const initializeScript = () => {
        if (window.location.pathname.match(/\/ui\/CaseRecord\//i)) {
            // We're already on a CaseRecord page, initialize normally
            const button = addPrintButton();
            prefetchData();
            document.addEventListener('keydown', handleKeyboardShortcut);
        } else if (window.location.pathname.match(/\/ui\/CaseEntry/i)) {
            // We're on CaseEntry, set up an observer to detect URL changes
            console.log("On CaseEntry page, waiting for redirection to CaseRecord...");

            // Use history API to detect navigation changes
            originalPushState = history.pushState;
            originalReplaceState = history.replaceState;

            history.pushState = function () {
                originalPushState.apply(this, arguments);
                handleUrlChange();
            };

            history.replaceState = function () {
                originalReplaceState.apply(this, arguments);
                handleUrlChange();
            };

            // Also listen for popstate events (back/forward navigation)
            window.addEventListener('popstate', handleUrlChange);

            // Check periodically for URL changes that might not trigger the above events
            const urlCheckInterval = setInterval(() => {
                if (window.location.pathname.match(/\/ui\/CaseRecord\//i)) {
                    clearInterval(urlCheckInterval);
                    console.log("Detected navigation to CaseRecord, initializing script...");
                    const button = addPrintButton();
                    prefetchData();
                    document.addEventListener('keydown', handleKeyboardShortcut);
                }
            }, 500);
        }
    };

    const handleUrlChange = () => {
        if (window.location.pathname.match(/\/ui\/CaseRecord\//i)) {
            console.log("URL changed to CaseRecord, initializing script...");
            const button = addPrintButton();
            prefetchData();
            document.addEventListener('keydown', handleKeyboardShortcut);

            // Remove event listeners to avoid multiple initializations
            window.removeEventListener('popstate', handleUrlChange);

            // Restore original history methods if they were modified
            if (originalPushState && originalReplaceState) {
                history.pushState = originalPushState;
                history.replaceState = originalReplaceState;
            }
        }
    };

    // Start the initialization process
    initializeScript();
})(); 