// ==UserScript==
// @name         LMS
// @namespace    http://tampermonkey.net/
// @version      1.24
// @description  Extracts and prints lab sheet information from 3Shape LMS
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

    // Move updateButtonState outside of addPrintButton
    const updateButtonState = () => {
        const button = document.getElementById('lab-sheet-button');
        const username = GM_getValue('username2', '');
        const isJonathan = username.toLowerCase() === 'jonathan';

        // Get the appropriate buttons based on user
        const viewLabelsButton = document.getElementById('view-labels-button');
        const viewWorkTicketButton = document.getElementById('view-work-ticket-button');
        const generateLabelButton = document.getElementById('generate-label-button');
        const generateWorkTicketButton = document.getElementById('generate-work-ticket-button');

        if (!button) return;

        // Determine which buttons exist based on user type
        const hasViewButtons = isJonathan && viewLabelsButton && viewWorkTicketButton;
        const hasGenerateButtons = !isJonathan && generateLabelButton && generateWorkTicketButton;

        if (cachedPDFs.isGenerating) {
            button.textContent = 'Waiting...';
            button.style.background = '#cccccc';
            button.style.cursor = 'not-allowed';
            button.onclick = null;

            if (hasViewButtons) {
                viewLabelsButton.style.background = '#cccccc';
                viewLabelsButton.style.cursor = 'not-allowed';
                viewLabelsButton.onclick = null;

                viewWorkTicketButton.style.background = '#cccccc';
                viewWorkTicketButton.style.cursor = 'not-allowed';
                viewWorkTicketButton.onclick = null;
            }

            if (hasGenerateButtons) {
                generateLabelButton.textContent = 'Waiting...';
                generateLabelButton.style.background = '#cccccc';
                generateLabelButton.style.cursor = 'not-allowed';
                generateLabelButton.onclick = null;

                generateWorkTicketButton.textContent = 'Waiting...';
                generateWorkTicketButton.style.background = '#cccccc';
                generateWorkTicketButton.style.cursor = 'not-allowed';
                generateWorkTicketButton.onclick = null;
            }
        } else if (cachedData && !cachedPDFs.workTicket && !cachedPDFs.label) {
            button.textContent = 'Generate PDF';
            button.style.background = '#4a4a4a';
            button.style.cursor = 'pointer';
            button.onclick = generatePDFs;

            if (hasViewButtons) {
                viewLabelsButton.textContent = 'View Label';
                viewLabelsButton.style.background = '#4a4a4a';
                viewLabelsButton.style.cursor = 'pointer';
                viewLabelsButton.onclick = viewLabels;

                viewWorkTicketButton.textContent = 'View Work Ticket';
                viewWorkTicketButton.style.background = '#4a4a4a';
                viewWorkTicketButton.style.cursor = 'pointer';
                viewWorkTicketButton.onclick = viewWorkTicket;
            }

            if (hasGenerateButtons) {
                generateLabelButton.textContent = 'Generate Label';
                generateLabelButton.style.background = '#4a4a4a';
                generateLabelButton.style.cursor = 'pointer';
                generateLabelButton.onclick = generateAndDownloadLabel;

                generateWorkTicketButton.textContent = 'Generate Work Ticket';
                generateWorkTicketButton.style.background = '#4a4a4a';
                generateWorkTicketButton.style.cursor = 'pointer';
                generateWorkTicketButton.onclick = generateAndDownloadWorkTicket;
            }
        } else if (cachedData && (cachedPDFs.workTicket || cachedPDFs.label)) {
            button.textContent = 'Download';
            button.style.background = '#4a4a4a';
            button.style.cursor = 'pointer';
            button.onclick = downloadPDFs;

            if (hasViewButtons) {
                viewLabelsButton.textContent = 'View Label';
                viewLabelsButton.style.background = '#4a4a4a';
                viewLabelsButton.style.cursor = 'pointer';
                viewLabelsButton.onclick = viewLabels;

                viewWorkTicketButton.textContent = 'View Work Ticket';
                viewWorkTicketButton.style.background = '#4a4a4a';
                viewWorkTicketButton.style.cursor = 'pointer';
                viewWorkTicketButton.onclick = viewWorkTicket;
            }

            if (hasGenerateButtons) {
                // If label is already generated, show download button
                if (cachedPDFs.label) {
                    generateLabelButton.textContent = 'Download Label';
                    generateLabelButton.style.background = '#4a4a4a';
                    generateLabelButton.style.cursor = 'pointer';
                    generateLabelButton.onclick = downloadLabelOnly;
                } else {
                    generateLabelButton.textContent = 'Generate Label';
                    generateLabelButton.style.background = '#4a4a4a';
                    generateLabelButton.style.cursor = 'pointer';
                    generateLabelButton.onclick = generateAndDownloadLabel;
                }

                // If work ticket is already generated, show download button
                if (cachedPDFs.workTicket) {
                    generateWorkTicketButton.textContent = 'Download Work Ticket';
                    generateWorkTicketButton.style.background = '#4a4a4a';
                    generateWorkTicketButton.style.cursor = 'pointer';
                    generateWorkTicketButton.onclick = downloadWorkTicketOnly;
                } else {
                    generateWorkTicketButton.textContent = 'Generate Work Ticket';
                    generateWorkTicketButton.style.background = '#4a4a4a';
                    generateWorkTicketButton.style.cursor = 'pointer';
                    generateWorkTicketButton.onclick = generateAndDownloadWorkTicket;
                }
            }
        } else if (isFetchingData) {
            button.textContent = 'Fetching...';
            button.style.background = '#cccccc';
            button.style.cursor = 'not-allowed';
            button.onclick = null;

            if (hasViewButtons) {
                viewLabelsButton.textContent = 'Fetching...';
                viewLabelsButton.style.background = '#cccccc';
                viewLabelsButton.style.cursor = 'not-allowed';
                viewLabelsButton.onclick = null;

                viewWorkTicketButton.textContent = 'Fetching...';
                viewWorkTicketButton.style.background = '#cccccc';
                viewWorkTicketButton.style.cursor = 'not-allowed';
                viewWorkTicketButton.onclick = null;
            }

            if (hasGenerateButtons) {
                generateLabelButton.textContent = 'Fetching...';
                generateLabelButton.style.background = '#cccccc';
                generateLabelButton.style.cursor = 'not-allowed';
                generateLabelButton.onclick = null;

                generateWorkTicketButton.textContent = 'Fetching...';
                generateWorkTicketButton.style.background = '#cccccc';
                generateWorkTicketButton.style.cursor = 'not-allowed';
                generateWorkTicketButton.onclick = null;
            }
        } else {
            button.textContent = 'Retry Data';
            button.style.background = '#4a4a4a';
            button.style.cursor = 'pointer';
            button.onclick = prefetchData;

            if (hasViewButtons) {
                viewLabelsButton.textContent = 'Retry Data';
                viewLabelsButton.style.background = '#4a4a4a';
                viewLabelsButton.style.cursor = 'pointer';
                viewLabelsButton.onclick = prefetchData;

                viewWorkTicketButton.textContent = 'Retry Data';
                viewWorkTicketButton.style.background = '#4a4a4a';
                viewWorkTicketButton.style.cursor = 'pointer';
                viewWorkTicketButton.onclick = prefetchData;
            }

            if (hasGenerateButtons) {
                generateLabelButton.textContent = 'Retry Data';
                generateLabelButton.style.background = '#4a4a4a';
                generateLabelButton.style.cursor = 'pointer';
                generateLabelButton.onclick = prefetchData;

                generateWorkTicketButton.textContent = 'Retry Data';
                generateWorkTicketButton.style.background = '#4a4a4a';
                generateWorkTicketButton.style.cursor = 'pointer';
                generateWorkTicketButton.onclick = prefetchData;
            }
        }
    };

    // Modify addPrintButton to conditionally create buttons
    function addPrintButton() {
        // Get the username and check if it's Jonathan
        const username = GM_getValue('username2', '');
        const isJonathan = username.toLowerCase() === 'jonathan';

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

        // Add observer to watch for changes in cached data
        const checkDataInterval = setInterval(() => {
            updateButtonState();
            if (cachedData && cachedPDFs.workTicket && cachedPDFs.label) {
                clearInterval(checkDataInterval);
            }
        }, 100);

        document.body.appendChild(button);
        document.body.appendChild(checkboxContainer);

        if (isJonathan) {
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

            document.body.appendChild(viewLabelsButton);
            document.body.appendChild(viewWorkTicketButton);
        } else {
            // Create generate label button for non-Jonathan users
            const generateLabelButton = document.createElement('button');
            generateLabelButton.id = 'generate-label-button';
            generateLabelButton.textContent = 'Generate Label';
            generateLabelButton.style.cssText = `
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

            // Create generate work ticket button for non-Jonathan users
            const generateWorkTicketButton = document.createElement('button');
            generateWorkTicketButton.id = 'generate-work-ticket-button';
            generateWorkTicketButton.textContent = 'Generate Work Ticket';
            generateWorkTicketButton.style.cssText = `
                position: fixed;
                width: 170px;
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

            document.body.appendChild(generateLabelButton);
            document.body.appendChild(generateWorkTicketButton);
        }

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
        const response = await fetch("https://api.sheety.co/6565224fa65a11082d88012dd5762961/maskingTapeItemRules/sheet1/");
        const data = await response.json();
        return data.sheet1.reduce((acc, item) => {
            acc[item.product] = item.use;
            return acc;
        }, {});
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

            // Add remake/adjustment indicator
            let remakeStatus = '';
            if (caseData.remakeCategory === 1) {
                remakeStatus = '[R]';
            } else if (caseData.remakeCategory === 2) {
                remakeStatus = '[A]';
            }

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
                courierInfo,
                remakeStatus
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
                rest: `${months[date.getMonth()]} (${days[date.getDay()]})`
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
            max-width: 400px;
            margin: 0 auto;
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
            font-size: 11px;
            font-weight: bold;
            margin-bottom: 0;
        }
        .courier-text, .pan-label {
            font-size: 11px;
            font-weight: bold;
            margin-bottom: 5px;
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
            padding: 8px;
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
        }
        .info-value {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 10px;
            display: flex;
        }
        .patient-name {
            flex-grow: 1;
        }
        .remake-status {
            color: red;
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

    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <div class="info-section" style="flex: 1; margin-right: 10px;">
            <div class="info-label">Doctor</div>
            <div class="info-value">${data.doctorName}</div>
        </div>
        
        <div class="right-info-container">
            <div class="due-date-box">
                <div class="due-date-day">${dueDateTime.day}</div>
                <div class="due-date-rest">${dueDateTime.rest}</div>
            </div>
        </div>
    </div>

    <div class="info-section" style="margin-bottom: 10px;">
        <div class="info-label">Patient</div>
        <div class="info-value">
            <div class="patient-name">${data.patientName}</div>
            ${data.remakeStatus ? `<div class="remake-status">${data.remakeStatus}</div>` : ''}
        </div>
    </div>

    <div class="info-section" style="margin-bottom: 10px;">
        <div class="phone-label">Phone</div>
        <div class="phone-value">${data.phone}</div>
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
                    .split(/[,&]/)
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

    // Add a flag to track if we're already fetching data
    let isFetchingData = false;

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

    // Modify the prefetchData function to use the flag
    const prefetchData = async () => {
        if (isFetchingData) {
            console.log("Already fetching data, skipping duplicate request");
            return;
        }

        try {
            isFetchingData = true;
            updateButtonState(); // This will show "Fetching..." state

            // Fetch data
            cachedData = await getData();
            console.log("Data prefetched successfully", cachedData);

            // Only auto-download if checkbox is checked
            const autoDownload = GM_getValue('auto-download', true);
            if (autoDownload) {
                generatePDFs();
            }

        } catch (e) {
            console.error('Error prefetching data:', e);
            showError('Failed to load data: ' + e.message);
            // Clear cached data on error
            cachedData = null;
            cachedPDFs = {
                workTicket: null,
                label: null,
                isGenerating: false
            };
        } finally {
            isFetchingData = false;
            updateButtonState(); // This will show either success state or "Retry Data"
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
                        right: '4mm',
                        bottom: '2mm',
                        left: '4mm'
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

    // Add this function to check for username
    const checkUsername = () => {
        let username = GM_getValue('username', '');
        if (!username) {
            username = prompt('Please enter your username:');
            if (username) {
                GM_setValue('username', username);
            }
        }
        return username;
    };

    // Modify the initializeScript function to check username
    const initializeScript = () => {
        // Check username first
        checkUsername();

        if (window.location.pathname.match(/\/ui\/CaseRecord\//i)) {
            // We're already on a CaseRecord page, initialize normally
            const button = addPrintButton();

            // Check if caseMain is already present
            const caseMainPresent = document.getElementById('caseMain');

            // Only prefetch data directly if caseMain is already present
            if (caseMainPresent) {
                prefetchData();
            }

            document.addEventListener('keydown', handleKeyboardShortcut);

            // Add mutation observer to detect case data changes
            setupCaseChangeObserver();
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

                    // Add mutation observer to detect case data changes
                    setupCaseChangeObserver();
                }
            }, 500);
        }
    };

    // Add a global variable to track our observer
    let caseChangeObserver = null;

    const setupCaseChangeObserver = () => {
        console.log("Setting up case change observer");

        // First, disconnect any existing observer to prevent duplicates
        if (caseChangeObserver) {
            console.log("Disconnecting existing observer");
            caseChangeObserver.disconnect();
            caseChangeObserver = null;
        }

        // Function to check for caseMain section
        const checkForCaseMain = () => {
            const caseMainSection = document.getElementById('caseMain');
            return !!caseMainSection;
        };

        // Function to check for billing iframe
        const checkForBillingIframe = () => {
            const iframe = document.querySelector('.popup-modal-content iframe[src*="/pages/admin/"]');
            return !!iframe;
        };

        // Function to update button visibility
        const updateButtonVisibility = (shouldHide) => {
            const username = GM_getValue('username', '');
            const isJonathan = username.toLowerCase() === 'jonathan';

            const buttons = [
                document.getElementById('lab-sheet-button'),
                document.getElementById('auto-download-checkbox')?.parentElement
            ];

            // Add the appropriate buttons based on user type
            if (isJonathan) {
                const viewLabelsButton = document.getElementById('view-labels-button');
                const viewWorkTicketButton = document.getElementById('view-work-ticket-button');
                if (viewLabelsButton) buttons.push(viewLabelsButton);
                if (viewWorkTicketButton) buttons.push(viewWorkTicketButton);
            } else {
                const generateLabelButton = document.getElementById('generate-label-button');
                const generateWorkTicketButton = document.getElementById('generate-work-ticket-button');
                if (generateLabelButton) buttons.push(generateLabelButton);
                if (generateWorkTicketButton) buttons.push(generateWorkTicketButton);
            }

            buttons.forEach(button => {
                if (button) {
                    button.style.display = shouldHide ? 'none' : '';
                }
            });
        };

        // Initial state - check if caseMain is already present
        let caseMainWasPresent = checkForCaseMain();
        console.log("Initial caseMain presence:", caseMainWasPresent);

        // Create a mutation observer to watch for DOM changes
        caseChangeObserver = new MutationObserver((mutations) => {
            // Check current states
            const caseMainIsPresent = checkForCaseMain();
            const billingIframePresent = checkForBillingIframe();

            // Update button visibility based on billing iframe presence
            updateButtonVisibility(billingIframePresent);

            // If state changed from present to not present, clear the cache
            if (caseMainWasPresent && !caseMainIsPresent) {
                console.log("Case main section disappeared, clearing cache");
                // Reset cached data
                cachedData = null;
                cachedPDFs = {
                    workTicket: null,
                    label: null,
                    isGenerating: false
                };
            }
            // If state changed from not present to present, fetch new data
            else if (!caseMainWasPresent && caseMainIsPresent) {
                console.log("Case main section appeared, fetching data");
                // Fetch new data (cache should already be cleared)
                prefetchData();
            }

            // Update state for next check
            caseMainWasPresent = caseMainIsPresent;
        });

        // Start observing the document body for changes
        caseChangeObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Initial check for billing iframe
        updateButtonVisibility(checkForBillingIframe());
    };

    // Also update the cleanup when the script is unloaded or the page changes
    const cleanupScript = () => {
        // Disconnect observer if it exists
        if (caseChangeObserver) {
            caseChangeObserver.disconnect();
            caseChangeObserver = null;
        }

        // Restore original history methods if they were modified
        if (originalPushState && originalReplaceState) {
            history.pushState = originalPushState;
            history.replaceState = originalReplaceState;
        }

        // Remove event listeners
        window.removeEventListener('popstate', handleUrlChange);
        document.removeEventListener('keydown', handleKeyboardShortcut);
    };

    // Update handleUrlChange to clean up before reinitializing
    const handleUrlChange = () => {
        if (window.location.pathname.match(/\/ui\/CaseRecord\//i)) {
            console.log("URL changed to CaseRecord, initializing script...");

            // Clean up existing observers and listeners
            cleanupScript();

            // Initialize for the new page
            const button = addPrintButton();
            prefetchData();
            document.addEventListener('keydown', handleKeyboardShortcut);
            setupCaseChangeObserver();
        }
    };

    // Add new functions for individual PDF downloads
    const downloadLabelOnly = async () => {
        try {
            if (!cachedData || !cachedPDFs.label) {
                throw new Error('Label PDF not yet loaded');
            }

            const sanitizedPatientName = cachedData.patientName.replace(/[^\w\s]/g, '');
            const labelFilename = `${sanitizedPatientName} LMS (label).pdf`;
            downloadPDF(cachedPDFs.label, labelFilename);
        } catch (e) {
            console.error('Error downloading label:', e);
            showError('Failed to download label: ' + e.message);
        }
    };

    const downloadWorkTicketOnly = async () => {
        try {
            if (!cachedData || !cachedPDFs.workTicket) {
                throw new Error('Work ticket PDF not yet loaded');
            }

            const sanitizedPatientName = cachedData.patientName.replace(/[^\w\s]/g, '');
            const workTicketFilename = `${sanitizedPatientName} LMS (work ticket).pdf`;
            downloadPDF(cachedPDFs.workTicket, workTicketFilename);
        } catch (e) {
            console.error('Error downloading work ticket:', e);
            showError('Failed to download work ticket: ' + e.message);
        }
    };

    // Add functions to generate and download individual PDFs
    const generateAndDownloadLabel = async () => {
        try {
            if (!cachedData) {
                throw new Error('Data not yet loaded');
            }

            // Set generating flag
            cachedPDFs.isGenerating = true;
            updateButtonState();

            // Generate HTML content
            const labelHTML = generateLabelHTML(cachedData);

            console.log('Generating label PDF...');
            cachedPDFs.label = await generatePDF(labelHTML, {
                width: '100mm',
                height: '61mm'
            });

            console.log('Label PDF generated and cached');

            // Clear generating flag
            cachedPDFs.isGenerating = false;
            updateButtonState();

            // Download the label
            downloadLabelOnly();
        } catch (e) {
            console.error('Error generating label PDF:', e);
            showError('Failed to generate label PDF: ' + e.message);

            // Clear generating flag
            cachedPDFs.isGenerating = false;
            updateButtonState();
        }
    };

    const generateAndDownloadWorkTicket = async () => {
        try {
            if (!cachedData) {
                throw new Error('Data not yet loaded');
            }

            // Set generating flag
            cachedPDFs.isGenerating = true;
            updateButtonState();

            // Generate HTML content
            const workTicketHTML = generatePrintHTML(cachedData);

            console.log('Generating work ticket PDF...');
            cachedPDFs.workTicket = await generatePDF(workTicketHTML, {
                width: '112mm',
                height: '297mm'
            });

            console.log('Work ticket PDF generated and cached');

            // Clear generating flag
            cachedPDFs.isGenerating = false;
            updateButtonState();

            // Download the work ticket
            downloadWorkTicketOnly();
        } catch (e) {
            console.error('Error generating work ticket PDF:', e);
            showError('Failed to generate work ticket PDF: ' + e.message);

            // Clear generating flag
            cachedPDFs.isGenerating = false;
            updateButtonState();
        }
    };

    // Start the initialization process
    initializeScript();
})(); 