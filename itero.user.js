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

    console.log('Itero Print');

    document.addEventListener('DOMContentLoaded', () => {
        let attempts = 0;
        const maxAttempts = 100; // 10 seconds / 100ms = 100 attempts

        const findPrintApp = () => {
            const printApp = document.querySelector('eup-print-rx-app');
            if (printApp) {
                console.log('Found print app:', printApp);
                // Add mutation observer for the print app
                const observer = new MutationObserver((mutations) => {
                    for (const mutation of mutations) {
                        for (const node of mutation.addedNodes) {
                            if (node.tagName === 'IFRAME') {
                                console.log('Found iframe:', node);

                                // Wait for iframe content to load
                                const checkIframeContent = () => {
                                    const body = node.contentDocument?.body;
                                    if (body && body.children.length > 0) {
                                        console.log('Iframe body loaded with content');
                                        const iframeContent = node.contentDocument.documentElement.outerHTML;
                                        console.log("iframeContent", iframeContent);
                                        generatePDF(iframeContent)
                                            .then(pdfResponse => {
                                                downloadPDF(pdfResponse, 'itero_print.pdf');
                                            })
                                            .catch(error => {
                                                console.error('Error generating PDF:', error);
                                            });
                                    } else {
                                        setTimeout(checkIframeContent, 1);
                                    }
                                };

                                checkIframeContent();
                            }
                        }
                    }
                });

                observer.observe(printApp, { childList: true, subtree: true });
                return;
            }

            attempts++;
            if (attempts >= maxAttempts) {
                console.log('Gave up finding print app after 10 seconds');
                return;
            }

            setTimeout(findPrintApp, 100);
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