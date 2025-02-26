// ==UserScript==
// @name         Itero Print
// @namespace    http://tampermonkey.net/
// @version      0.5
// @description  Interact with blob content
// @match        https://bff.cloud.myitero.com/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
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

    // Add notification UI with a more resilient approach
    let notificationBar = null;

    // Add styles once
    GM_addStyle(`
        #itero-notification-bar {
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            z-index: 99999; /* Very high z-index */
            font-family: Arial, sans-serif;
            font-size: 14px;
            max-width: 300px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            transition: opacity 0.3s;
            opacity: 0;
            pointer-events: none; /* Prevent interaction */
        }
    `);

    // Function to ensure notification bar exists
    const ensureNotificationBar = () => {
        if (!notificationBar || !document.body.contains(notificationBar)) {
            // Create new notification bar if it doesn't exist or was removed
            notificationBar = document.createElement('div');
            notificationBar.id = 'itero-notification-bar';
            document.body.appendChild(notificationBar);
            console.log('Created new notification bar');
        }
        return notificationBar;
    };

    // Function to show notification
    const showNotification = (message) => {
        console.log("Showing notification:", message);
        const bar = ensureNotificationBar();
        bar.textContent = message;
        bar.style.opacity = '1';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (bar && document.body.contains(bar)) {
                bar.style.opacity = '0';
            }
        }, 5000);
    };

    // Create an observer to ensure our notification bar stays in the DOM
    const bodyObserver = new MutationObserver(() => {
        ensureNotificationBar();
    });

    // Start observing the body for changes
    bodyObserver.observe(document.body, { childList: true });

    // Test notification
    setTimeout(() => {
        showNotification('Itero Print script loaded');
    }, 1000);

    // document.addEventListener('DOMContentLoaded', () => { // Find the print app with retry logic
    const findPrintApp = async () => {
        for (let attempts = 0; attempts < 100; attempts++) {
            const printApp = document.querySelector('eup-print-rx-app');
            if (printApp) {
                console.log('1. Found print app:', printApp);
                showNotification('1. Found print app');
                watchForIframe(printApp);
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        console.log('Gave up finding print app after 10 seconds');
        showNotification('Failed: Could not find print app');
    };

    // Watch for iframe being added to the print app
    const watchForIframe = (printApp) => {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.tagName === 'IFRAME') {
                        console.log('2. Found iframe:');
                        showNotification('2. Found iframe');
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
                showNotification('3. Iframe body loaded with content');
                const iframeContent = iframe.contentDocument.documentElement.outerHTML;
                console.log("4. iframeContent");
                showNotification('4. Processing iframe content');

                // Extract patient name from the iframe content
                let patientName = "[Can't find patient name]";
                try {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(iframeContent, 'text/html');
                    const patientElement = doc.querySelector('.title-patient-fullname .title-prop-description');
                    if (patientElement) {
                        patientName = patientElement.textContent.trim();
                        // Convert "Lastname, Firstname" to "Firstname Lastname"
                        const nameParts = patientName.split(',');
                        if (nameParts.length === 2) {
                            patientName = `${nameParts[1].trim()} ${nameParts[0].trim()}`;
                        }
                        console.log('Extracted patient name:', patientName);
                        showNotification(`Found patient: ${patientName}`);
                    }
                } catch (error) {
                    console.error('Error extracting patient name:', error);
                }

                // Store the content for later use
                const contentToProcess = {
                    html: iframeContent,
                    processed: false,
                    processing: false,
                    attempts: 0,
                    maxAttempts: 10,
                    patientName: patientName // Store the patient name
                };

                // Start the retry mechanism
                startPdfRetryMechanism(contentToProcess);

                return;
            }
            await new Promise(resolve => setTimeout(resolve, 1));
        }
    };

    // Retry mechanism to handle PDF generation
    const startPdfRetryMechanism = (contentToProcess) => {
        const retryInterval = setInterval(async () => {
            // If already processed or max attempts reached, stop retrying
            if (contentToProcess.processed || contentToProcess.attempts >= contentToProcess.maxAttempts) {
                clearInterval(retryInterval);
                return;
            }

            // Skip if we're currently processing
            if (contentToProcess.processing) {
                return;
            }

            contentToProcess.attempts++;
            contentToProcess.processing = true;
            console.log(`Attempt ${contentToProcess.attempts} to generate PDF...`);
            showNotification(`Generating PDF (attempt ${contentToProcess.attempts})`);

            try {
                const pdfResponse = await generatePDF(contentToProcess.html);

                // Double-check we haven't already processed this in another attempt
                if (!contentToProcess.processed) {
                    console.log('5. pdfResponse');
                    showNotification('5. PDF generated successfully');

                    // Use the patient name in the filename
                    const filename = `${contentToProcess.patientName} iTero.pdf`;
                    downloadPDF(pdfResponse, filename);

                    console.log(`6. Downloaded PDF as "${filename}"`);
                    showNotification(`6. Downloaded PDF for ${contentToProcess.patientName}`);

                    // Mark as processed to stop retries
                    contentToProcess.processed = true;
                    clearInterval(retryInterval);
                }
            } catch (error) {
                console.error(`Error generating PDF (attempt ${contentToProcess.attempts}):`, error);
                showNotification(`Error: PDF generation failed (attempt ${contentToProcess.attempts})`);
                // We'll retry on the next interval
            } finally {
                contentToProcess.processing = false;
            }
        }, 2000); // Check every 2 seconds
    };

    findPrintApp();
    // });

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