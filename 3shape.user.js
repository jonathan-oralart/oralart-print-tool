// ==UserScript==
// @name         3Shape Print
// @namespace    http://tampermonkey.net/
// @version      0.3
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
                    scale: 1.15
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

                        const pdfResponse = await generatePDF(htmlContent);
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