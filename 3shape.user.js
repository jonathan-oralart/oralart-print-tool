// ==UserScript==
// @name         3Shape Print
// @namespace    http://tampermonkey.net/
// @version      0.4
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
        width: '112mm',
        height: '297mm'
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

    // Function to extract patient name from HTML content
    const extractPatientName = (htmlContent) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');

        // Look for the table structure in the parsed document
        const tables = doc.querySelectorAll('table.tableCaseDetails');
        if (tables.length > 0) {
            // Find the row containing "Patient name:"
            const rows = tables[0].querySelectorAll('tr');
            for (const row of rows) {
                const cells = row.querySelectorAll('td');
                for (let i = 0; i < cells.length; i++) {
                    if (cells[i].textContent.trim() === 'Patient name:' && i + 1 < cells.length) {
                        const patientName = cells[i + 1].textContent.trim();
                        return patientName || 'Unknown_Patient';
                    }
                }
            }
        }

        // Fallback: try a more generic approach if the table structure isn't found
        const allCells = doc.querySelectorAll('td');
        for (let i = 0; i < allCells.length; i++) {
            if (allCells[i].textContent.trim() === 'Patient name:' && i + 1 < allCells.length) {
                const patientName = allCells[i + 1].textContent.trim();
                return patientName || 'Unknown_Patient';
            }
        }

        return 'Unknown_Patient';
    };

    // Function to clean up HTML content to match desired format
    const cleanupHtmlContent = (htmlContent) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');

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
                    <caption>Lab Comments</caption>
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

    // Modify the blob interception to generate PDF
    const originalCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = function (object) {
        const blobUrl = originalCreateObjectURL(object);
        console.log('Blob URL created:', blobUrl);

        if (object instanceof Blob) {
            const reader = new FileReader();
            reader.onload = async function () {
                const htmlContent = reader.result.toString();
                if (htmlContent.startsWith('<!DOCTYPE public>')) {
                    try {
                        // Extract patient name for the filename
                        const patientName = extractPatientName(htmlContent);
                        const filename = `${patientName} 3Shape.pdf`;

                        // Clean up the HTML content before generating PDF
                        const cleanedHtmlContent = cleanupHtmlContent(htmlContent);

                        const pdfResponse = await generatePDF(cleanedHtmlContent);
                        downloadPDF(pdfResponse, filename);
                    } catch (error) {
                        console.error('Error generating PDF:', error);
                    }
                }
            };
            reader.readAsText(object);
        }

        return blobUrl;
    };
})();