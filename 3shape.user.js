// ==UserScript==
// @name         3Shape Print
// @namespace    http://tampermonkey.net/
// @version      0.10
// @description  Interact with blob content
// @match        https://portal.3shapecommunicate.com/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @require      file:///Users/oralart/Repos/oralart-print-tool/3shape.user.js
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      api.doppio.sh
// @grant        GM_download
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
    'use strict';

    const processedUrls = new Set();

    // Watch for upload-additional-files div and auto-download files
    const watchForUploadFiles = () => {
        setInterval(() => {
            const uploadDiv = document.querySelector('div.upload-additional-files');
            if (uploadDiv) {
                const currentUrl = window.location.href;
                if (processedUrls.has(currentUrl)) {
                    return; // Already processed this URL
                }

                console.log('Found upload-additional-files div, triggering downloads for url:', currentUrl);

                // Click all download buttons
                [...document.querySelectorAll("button[title='Download file']")].forEach(x => x.click());

                // Mark this URL as processed
                processedUrls.add(currentUrl);
            }
        }, 200);
    };

    // Start watching when the page loads
    watchForUploadFiles();

    // Add storage handling for API key
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

    // Add PDF generation function
    const generatePDF = async (htmlContent, dimensions = {
        height: '297mm',
        width: '210mm'
    }) => {
        // Remove image tags from HTML content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        const images = tempDiv.getElementsByTagName('img');
        while (images.length > 0) {
            images[0].remove();
        }
        const cleanedHTML = tempDiv.innerHTML;

        const utf8_to_b64 = (str) => {
            return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
                function toSolidBytes(match, p1) {
                    return String.fromCharCode('0x' + p1);
                }));
        };

        const encodedHTML = utf8_to_b64(cleanedHTML);
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
                    printBackground: true,
                    scale: 1
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

    // Function to download the generated PDF
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

    // Function to download non-HTML files with renamed filename
    const downloadFile = (blob, filename) => {
        const url = originalCreateObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Function to extract patient name from current page
    const extractPatientName = () => {
        try {
            const patientNameElement = [...document.querySelectorAll("mat-expansion-panel mat-panel-title")][0];
            if (patientNameElement && patientNameElement.innerText) {
                return patientNameElement.innerText.trim() || 'Unknown_Patient';
            }
        } catch (error) {
            console.log('Error extracting patient name:', error);
        }
        return 'Unknown_Patient';
    };

    // Function to extract collaborator data
    const extractCollaboratorData = async () => {
        try {
            // First, try to find the collaborator element
            let collaboratorElement = Array.from(document.querySelectorAll('div.title')).find(el => el.textContent.includes('Collaborator(s):'));

            if (!collaboratorElement) {
                // If not found, click the expansion button and wait
                const expansionButton = document.querySelector("[class*='mat-expansion-indicator']")
                if (expansionButton) {
                    expansionButton.click();

                    // Wait 500ms
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // Try to find the collaborator element again
                    collaboratorElement = Array.from(document.querySelectorAll('div.title')).find(el => el.textContent.includes('Collaborator(s):'));
                }
            }

            if (collaboratorElement && collaboratorElement.parentElement && collaboratorElement.parentElement.children[1]) {
                const rawCollaboratorText = collaboratorElement.parentElement.children[1].innerText;

                // Process the collaborator text: split by comma, filter out admin email, remove parentheses content
                const processedCollaborator = rawCollaboratorText
                    .split(",")
                    .filter(x => !x.includes("admin@oralart.co.nz"))[0]
                    ?.replace(/\(.*\)\s*/, "")
                    ?.trim();

                return processedCollaborator || '';
            }
        } catch (error) {
            console.log('Error extracting collaborator data:', error);
        }
        return '';
    };

    // Function to clean up HTML content to match desired format
    const cleanupHtmlContent = (htmlContent, collaboratorData = '') => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');

        // Add 3Shape div to the body
        const shapeDiv = document.createElement('div');
        shapeDiv.style.position = 'absolute';
        shapeDiv.textContent = '3Shape';
        doc.body.insertBefore(shapeDiv, doc.body.firstChild);

        // Remove the specified element
        const elementToRemove = doc.querySelector("body > table.tableMain > tbody > tr:nth-child(1) > td:nth-child(1)");
        if (elementToRemove) {
            elementToRemove.remove();
        }

        // Swap patient name and dentist name in tableCaseDetails
        const caseDetailsTable = doc.querySelector('table.tableCaseDetails');
        if (caseDetailsTable) {
            const rows = caseDetailsTable.querySelectorAll('tr');
            if (rows.length >= 2) {
                // Get the label cells
                const dentistLabelCell = rows[0].cells[0];
                const patientLabelCell = rows[1].cells[0];

                // Get the value cells
                const dentistValueCell = rows[0].cells[1];
                const patientValueCell = rows[1].cells[1];

                // Swap the content
                const tempLabelHTML = dentistLabelCell.innerHTML;
                const tempValueHTML = dentistValueCell.innerHTML;

                dentistLabelCell.innerHTML = patientLabelCell.innerHTML;
                dentistValueCell.innerHTML = patientValueCell.innerHTML;

                patientLabelCell.innerHTML = tempLabelHTML;
                patientValueCell.innerHTML = tempValueHTML;
            }

            // Remove case number and lab name columns from tableCaseDetails
            rows.forEach(row => {
                // Keep only the first two cells in each row (remove 3rd and 4th cells)
                const cells = row.querySelectorAll('td');
                if (cells.length > 2) {
                    cells[2].remove(); // Remove 3rd cell
                    if (cells.length > 3) {
                        cells[3].remove(); // Remove 4th cell
                    }
                }
            });

            // Add collaborator data as a new row if available
            if (collaboratorData) {
                const tbody = caseDetailsTable.querySelector('tbody');
                if (tbody) {
                    const collaboratorRow = document.createElement('tr');
                    collaboratorRow.innerHTML = `
                        <td class="label">Collaborator:</td>
                        <td class="underline">${collaboratorData}</td>
                    `;
                    tbody.appendChild(collaboratorRow);
                }
            }
        }

        // Remove GMT timezone information from dates
        const dateElements = doc.querySelectorAll('table.tableDates td.underline');
        dateElements.forEach(element => {
            const dateText = element.textContent;
            if (dateText.includes('(GMT')) {
                element.textContent = dateText.split(' (GMT')[0];
            }
        });

        // Add white-space: pre to the comment box
        const commentBox = doc.querySelector("body > table:nth-child(2) > tbody > tr > td > div > p");
        if (commentBox) {
            commentBox.style.whiteSpace = 'pre-line';
        }

        // Insert new comments table after tableMain
        const tableMain = doc.querySelector('table.tableMain');
        if (tableMain) {
            const newCommentsTable = document.createElement('div');
            newCommentsTable.innerHTML = `
                <table class="tableExtraComments">
                    <caption>Lab Notes</caption>
                    <tbody>
                        <tr>
                            <td>
                                <div style="border: 1px solid rgba(128, 128, 128, 1)">
                                    <p style="max-width: 1152px;height: 3rem;" class="textblock"></p>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            `;
            tableMain.parentNode.insertBefore(newCommentsTable.firstElementChild, tableMain.nextSibling);
        }

        return doc.documentElement.outerHTML;
    };

    // Modify the blob interception to generate PDF and handle file downloads
    const originalCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = function (object) {
        if (!(object instanceof Blob)) {
            return originalCreateObjectURL(object);
        }

        console.log('Blob intercepted:', object.type);

        // Handle HTML files for PDF generation
        if (object.type === 'text/html' || object.type === 'text/plain' || object.type === 'application/html') {
            const reader = new FileReader();
            reader.onload = async function () {
                const htmlContent = reader.result.toString();
                if (htmlContent.startsWith('<!DOCTYPE public>')) {
                    try {
                        const patientName = extractPatientName();
                        const collaboratorData = await extractCollaboratorData();
                        const filename = `${patientName} 3Shape.pdf`;
                        const cleanedHtmlContent = cleanupHtmlContent(htmlContent, collaboratorData);
                        const pdfResponse = await generatePDF(cleanedHtmlContent);
                        downloadPDF(pdfResponse, filename);
                    } catch (error) {
                        console.error('Error generating PDF:', error);
                    }
                }
            };
            reader.readAsText(object);
            return 'javascript:void(0);'; // Prevent original download
        }

        // Handle all other files for direct download
        let extension = 'bin';
        if (object.type) {
            // Guess extension from MIME type (the part after '/'), with overrides for special cases
            const subtypeToExt = {
                'octet-stream': 'stl',
                'sla': 'stl',
                'x-ply': 'ply',
                'plain': 'txt',
                'jpeg': 'jpg',
                'x-zip-compressed': 'zip'
            };

            const subtype = object.type.split('/')[1];
            if (subtype) {
                extension = subtypeToExt[subtype] || subtype;
            }

        }

        const patientName = extractPatientName();
        const renamedFilename = `${patientName} 3Shape.${extension}`;

        console.log(`Auto-downloading non-HTML file: ${renamedFilename}`);
        downloadFile(object, renamedFilename);

        return 'javascript:void(0);'; // Prevent original download
    };
})();