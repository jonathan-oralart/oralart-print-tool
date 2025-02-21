// ==UserScript==
// @name         Print Gmail Narrow
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Print Gmail Narrow
// @author       Jonathan de Wet
// @match        https://mail.google.com/mail/b/*
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

    console.log(`Version 1.0`);
    function addPrintButton() {
        const button = document.createElement('button');
        button.id = 'lab-sheet-button';
        button.textContent = 'Download';
        button.style.cssText = `
            position: fixed;
            width: 140px;
            top: 41px;
            right: 32px;
            z-index: 10000;
            padding: 8px 16px;
            background: #4a4a4a;
            color: white;
            border: none;
            border-radius: 4px;
        `;

        button.addEventListener('click', printGmailNarrow);
        document.body.appendChild(button);
    }

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

    // Add storage handling at the start of your script
    const getStoredApiKey = () => {
        const apiKey = GM_getValue('doppio-apiKey', '');
        console.log(apiKey);
        if (!apiKey) {
            const userKey = prompt('Please enter your API key for the PDF service:');
            if (userKey) {
                GM_setValue('doppio-apiKey', userKey);
                return userKey;
            }
        }
        return apiKey;
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

    const printGmailNarrow = async () => {
        try {
            // Get the modified HTML content
            const htmlContent = document.documentElement.outerHTML;

            // Add loading state to button
            const button = document.getElementById('lab-sheet-button');
            const originalText = button.textContent;
            button.textContent = 'Generating...';
            button.style.cursor = 'not-allowed';

            try {
                const pdfResponse = await generatePDF(htmlContent);
                const fileName = 'gmail_narrow.pdf';
                downloadPDF(pdfResponse, fileName);
            } finally {
                // Restore button state
                button.textContent = originalText;
                button.style.cursor = 'pointer';
            }
        } catch (e) {
            console.error('Error in printGmailNarrow:', e);
            showError('Failed to generate PDF: ' + e.message);
        }
    };

    const generatePDF = async (htmlContent, dimensions = {
        width: '112mm',
        height: '297mm'
    }) => {
        const encodedHTML = btoa(htmlContent);
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

    const modifyGmailLayout = () => {
        const headerTable = document.querySelector('.bodycontainer > table:first-child');
        const firstHr = document.querySelector('.bodycontainer > hr:first-child');
        const signatureImages = document.querySelectorAll('.gmail_signature img');

        // Remove header elements
        if (headerTable) {
            headerTable.remove();
        }
        if (firstHr) {
            firstHr.remove();
        }

        // Hide signature images
        signatureImages.forEach(img => {
            img.style.display = 'none';
        });

        // Remove content after "Kind regards" in each message
        document.querySelectorAll('table.message').forEach(messageTable => {
            const paragraphs = messageTable.querySelectorAll('p');
            let foundKindRegards = false;
            let count = 0;

            for (let i = 0; i < paragraphs.length; i++) {
                const p = paragraphs[i];
                const text = p.textContent.trim().toLowerCase();

                if (foundKindRegards) {
                    count++;
                    if (count > 4) {
                        p.remove();
                    }
                }

                // Case insensitive check using regex
                if (/^kind\s*regards\s*,?$/i.test(p.textContent.trim())) {
                    foundKindRegards = true;
                }
            }
        });

        // Remove empty paragraphs
        const emptyParagraphs = [...document.querySelectorAll(".bodycontainer p")].filter(p => p.innerText.trim() === "");
        emptyParagraphs.forEach(p => p.remove());

        // Add CSS to standardize font styles
        GM_addStyle(`
            .bodycontainer {
                font-family: arial, sans-serif !important;
                font-size: 14px !important;
                color: #000000 !important;
            }
            
            .bodycontainer * {
                font-size: 14px !important;
                color: #000000 !important;
            }

            .bodycontainer font[size],
            .bodycontainer span[style*="font-size"],
            .bodycontainer p[style*="font-size"] {
                font-size: 14px !important;
            }

            .bodycontainer font[color],
            .bodycontainer span[style*="color"],
            .bodycontainer p[style*="color"] {
                color: #000000 !important;
            }
        `);
    };

    const handleKeyboardShortcut = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault(); // Prevent default print dialog
            printGmailNarrow();
        }
        // Add new shortcut for re-running layout modifications
        if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
            e.preventDefault();
            console.log('Re-running layout modifications');
            try {
                modifyGmailLayout();
            } catch (e) {
                console.error('Error in modifyGmailLayout:', e);
            }
        }
    };

    // Modify the initialization code at the bottom
    if (window.top === window.self) {
        console.log('Script initialized');

        // Add button immediately
        addPrintButton();

        // Wait for Gmail to load content
        setTimeout(() => {
            try {
                console.log('Attempting to modify layout');
                modifyGmailLayout();
            } catch (e) {
                console.error('Error in modifyGmailLayout:', e);
            }
        }, 2000); // 2 second delay

        // Keep the keyboard shortcut listener
        document.addEventListener('keydown', handleKeyboardShortcut);
    } else {
    }
})(); 