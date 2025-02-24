// ==UserScript==
// @name         Itero Print
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Interact with blob content
// @match        https://bff.cloud.myitero.com/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @require      file:///Users/oralart/Repos/oralart-print-tool/itero.user.js
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      api.doppio.sh
// @grant        GM_download
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
    'use strict';

    console.log('0. Itero Print');

    document.addEventListener('DOMContentLoaded', () => {
        // Find the print app with retry logic
        const findPrintApp = async () => {
            for (let attempts = 0; attempts < 100; attempts++) {
                const printApp = document.querySelector('eup-print-rx-app');
                if (printApp) {
                    console.log('1. Found print app:', printApp);
                    watchForIframe(printApp);
                    return;
                }
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            console.log('Gave up finding print app after 10 seconds');
        };

        // Watch for iframe being added to the print app
        const watchForIframe = (printApp) => {
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    for (const node of mutation.addedNodes) {
                        if (node.tagName === 'IFRAME') {
                            console.log('2. Found iframe:');
                            waitForIframeContent(node);
                        }
                    }
                }
            });

            observer.observe(printApp, { childList: true, subtree: true });
        };

        // Wait for iframe content to load and process it
        const waitForIframeContent = async (iframe) => {
            while (true) {
                const body = iframe.contentDocument?.body;
                if (body && body.children.length > 0) {
                    console.log('3. Iframe body loaded with content');
                    const iframeContent = iframe.contentDocument.documentElement.outerHTML;
                    console.log("4. iframeContent");

                    try {
                        const pdfResponse = await generatePDF(iframeContent);
                        console.log('5. pdfResponse');
                        downloadPDF(pdfResponse, 'itero_print.pdf');
                        console.log('6. Downloaded PDF');
                    } catch (error) {
                        console.error('Error generating PDF:', error);
                    }
                    console.log('7. Returning from PDF generation');
                    return;
                }
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        };

        findPrintApp();
    });

    // Add the generatePDF and downloadPDF functions from 3Shape script
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

    const generatePDF = async (htmlContent, dimensions = {
        width: '112mm',
        height: '297mm'
    }) => {
        const utf8_to_b64 = (str) => {
            return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
                function toSolidBytes(match, p1) {
                    return String.fromCharCode('0x' + p1);
                }));
        };

        const encodedHTML = utf8_to_b64(htmlContent);
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

        const response = await new Promise((resolve, reject) => {
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
        return response;
    };

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
})();