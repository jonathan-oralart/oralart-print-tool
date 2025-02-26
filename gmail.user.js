// ==UserScript==
// @name         Print Gmail Narrow
// @namespace    http://tampermonkey.net/
// @version      1.2
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

    console.log(`Version 1.1`);
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

        // Add print-specific CSS to hide UI elements when printing
        const printStyle = document.createElement('style');
        printStyle.textContent = `
            @media print {
                #lab-sheet-button, #gmail-settings-panel {
                    display: none !important;
                }
            }
        `;
        document.head.appendChild(printStyle);
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
            // Create a deep clone of the document
            const docClone = document.documentElement.cloneNode(true);

            // Remove our UI elements from the clone
            const clonedButton = docClone.querySelector('#lab-sheet-button');
            const clonedSettingsPanel = docClone.querySelector('#gmail-settings-panel');
            if (clonedButton) clonedButton.remove();
            if (clonedSettingsPanel) clonedSettingsPanel.remove();

            // Get the modified HTML content from the clone
            const htmlContent = docClone.outerHTML;

            // Add loading state to button
            const button = document.getElementById('lab-sheet-button');
            const originalText = button.textContent;
            button.textContent = 'Generating...';
            button.style.cursor = 'not-allowed';

            try {
                const pdfResponse = await generatePDF(htmlContent);

                // Get filename from the selector
                let fileName = '[subject not found] Gmail.pdf';
                const subjectElement = document.querySelector("body > div.bodycontainer > div > table:nth-child(1) > tbody > tr > td > font:nth-child(1) > b");
                if (subjectElement && subjectElement.textContent) {
                    // Clean the subject to make it suitable for a filename
                    const cleanSubject = subjectElement.textContent
                        .trim()
                        .replace(/[\\/:*?"<>|]/g, '_') // Replace invalid filename characters
                        .substring(0, 100); // Limit length

                    fileName = `${cleanSubject} Gmail.pdf`;
                }

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
        // Use this helper function to handle UTF-8 encoding
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

    class LayoutManager {
        constructor() {
            this.settings = {
                hideAllImages: {
                    label: 'Hide All Images',
                    default: true,
                    apply: (enabled) => {
                        const images = document.querySelectorAll('.bodycontainer img');
                        this.toggleElements(images, !enabled);
                    }
                },
                removeHeader: {
                    label: 'Remove Header',
                    default: true,
                    apply: (enabled) => {
                        const headerTable = document.querySelector('.bodycontainer > table:first-child');
                        const firstHr = document.querySelector('.bodycontainer > hr:first-child');
                        this.toggleElements([headerTable, firstHr], !enabled);
                    }
                },
                hideSignatures: {
                    label: 'Hide Signatures',
                    default: true,
                    apply: (enabled) => {
                        const signatures = document.querySelectorAll('.gmail_signature img');
                        this.toggleElements(signatures, !enabled);
                    }
                },
                trimAfterRegards: {
                    label: 'Trim After Regards',
                    default: true,
                    apply: (enabled) => {
                        document.querySelectorAll('table.message').forEach(table => {
                            const elements = table.querySelectorAll('p, div');
                            let foundRegards = false;
                            let count = 0;

                            elements.forEach(el => {
                                if (foundRegards && ++count > 4) {
                                    this.toggleElement(el, !enabled);
                                }
                                // Test for various common email sign-offs
                                const signOffPatterns = [
                                    /^kind\s*regards[\s,!.]*$/i,
                                    /^best\s*regards[\s,!.]*$/i,
                                    /^regards[\s,!.]*$/i,
                                    /^best\s*wishes[\s,!.]*$/i,
                                    /^sincerely[\s,!.]*$/i,
                                    /^cheers[\s,!.]*$/i,
                                    /^thanks[\s,!.]*$/i,
                                    /^thank\s*you[\s,!.]*$/i,
                                    /^yours\s*(?:truly|sincerely)[\s,!.]*$/i
                                ];

                                if (signOffPatterns.some(pattern => pattern.test(el.textContent.trim()))) {
                                    foundRegards = true;
                                }
                            });
                        });
                    }
                },
                removeEmptyParagraphs: {
                    label: 'Remove Empty Paragraphs',
                    default: true,
                    apply: (enabled) => {
                        const emptyParagraphs = [...document.querySelectorAll(".bodycontainer p")]
                            .filter(p => p.innerText.trim() === "");
                        this.toggleElements(emptyParagraphs, !enabled);
                    }
                },
                standardizeFonts: {
                    label: 'Standardize Fonts',
                    default: true,
                    apply: (enabled) => {
                        const styleId = 'gmail-standardize-fonts';
                        let styleEl = document.getElementById(styleId);

                        if (enabled && !styleEl) {
                            styleEl = document.createElement('style');
                            styleEl.id = styleId;
                            styleEl.textContent = `
                                .bodycontainer, .bodycontainer * {
                                    font-family: arial, sans-serif !important;
                                    font-size: 14px !important;
                                    color: #000000 !important;
                                }
                            `;
                            document.head.appendChild(styleEl);
                        } else if (!enabled && styleEl) {
                            styleEl.remove();
                        }
                    }
                },
                removeQuotedTextHidden: {
                    label: 'Remove "Quoted text hidden"',
                    default: true,
                    apply: (enabled) => {
                        const quotedTextElements = [...document.querySelectorAll('.bodycontainer *')]
                            .filter(el => el.textContent.trim() === '[Quoted text hidden]');
                        this.toggleElements(quotedTextElements, !enabled);
                    }
                },
                simplifyEmailHeaders: {
                    label: 'Simplify Email Headers',
                    default: true,
                    apply: (enabled) => {
                        document.querySelectorAll('.bodycontainer table.message').forEach(table => {
                            try {
                                // Find the first cell with the sender info
                                const fromCell = table.querySelector('td:first-child > font');
                                if (!fromCell) return;

                                // Store original content before first modification
                                if (!fromCell.hasAttribute('data-original-content')) {
                                    fromCell.setAttribute('data-original-content', fromCell.textContent);
                                }

                                if (enabled) {
                                    const emailMatch = fromCell.textContent.match(/<(.+?)>/);
                                    if (emailMatch) {
                                        fromCell.textContent = 'From: ' + emailMatch[1];
                                    }
                                } else {
                                    const originalContent = fromCell.getAttribute('data-original-content');
                                    if (originalContent) {
                                        fromCell.textContent = originalContent;
                                    }
                                }

                                // Handle the "To:" line
                                const toCell = table.querySelector('font.recipient');
                                if (!toCell) return;

                                // Store original content before first modification
                                if (!toCell.hasAttribute('data-original-content')) {
                                    toCell.setAttribute('data-original-content', toCell.textContent);
                                }

                                if (enabled) {
                                    const toEmailMatch = toCell.textContent.match(/<(.+?)>/);
                                    if (toEmailMatch) {
                                        toCell.textContent = 'To: ' + toEmailMatch[1];
                                    }
                                } else {
                                    const originalContent = toCell.getAttribute('data-original-content');
                                    if (originalContent) {
                                        toCell.textContent = originalContent;
                                    }
                                }
                            } catch (error) {
                                console.error('Error processing email headers:', error);
                            }
                        });
                    }
                }
            };

            this.createSettingsPanel();
            this.applySettings();
        }

        toggleElement(element, show = null) {
            if (!element) return;
            if (show === null) show = element.style.display !== 'none';
            element.style.display = show ? '' : 'none';
        }

        toggleElements(elements, show = null) {
            if (!elements) return;
            elements.forEach(el => this.toggleElement(el, show));
        }

        createSettingsPanel() {
            const panel = document.createElement('div');
            panel.id = 'gmail-settings-panel';
            panel.style.cssText = `
                position: fixed;
                top: 90px;
                right: 32px;
                background: white;
                padding: 15px;
                border-radius: 4px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                z-index: 10000;
                width: 200px;
            `;

            const title = document.createElement('h3');
            title.textContent = 'Layout Settings';
            title.style.margin = '0 0 10px 0';
            panel.appendChild(title);

            // Add Toggle All checkbox
            const toggleAllDiv = document.createElement('div');
            toggleAllDiv.style.cssText = 'margin: 5px 0; padding-bottom: 8px; border-bottom: 1px solid #eee;';

            const toggleAllCheckbox = document.createElement('input');
            toggleAllCheckbox.type = 'checkbox';
            toggleAllCheckbox.id = 'toggle-all-settings';

            // Set initial state based on all current settings
            const allEnabled = Object.keys(this.settings).every(key =>
                GM_getValue(key, this.settings[key].default)
            );
            toggleAllCheckbox.checked = allEnabled;

            toggleAllCheckbox.addEventListener('change', () => {
                const checkboxes = panel.querySelectorAll('input[type="checkbox"]:not(#toggle-all-settings)');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = toggleAllCheckbox.checked;
                    GM_setValue(checkbox.id, toggleAllCheckbox.checked);
                });
                this.applySettings();
            });

            const toggleAllLabel = document.createElement('label');
            toggleAllLabel.htmlFor = 'toggle-all-settings';
            toggleAllLabel.textContent = 'Toggle All Settings';
            toggleAllLabel.style.marginLeft = '5px';
            toggleAllLabel.style.fontWeight = 'bold';

            toggleAllDiv.appendChild(toggleAllCheckbox);
            toggleAllDiv.appendChild(toggleAllLabel);
            panel.appendChild(toggleAllDiv);

            // Add individual settings checkboxes
            Object.entries(this.settings).forEach(([key, setting]) => {
                const div = document.createElement('div');
                div.style.margin = '5px 0';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = key;
                checkbox.checked = GM_getValue(key, setting.default);

                checkbox.addEventListener('change', () => {
                    GM_setValue(key, checkbox.checked);
                    this.applySettings();

                    // Update Toggle All checkbox state
                    const allChecked = Array.from(
                        panel.querySelectorAll('input[type="checkbox"]:not(#toggle-all-settings)')
                    ).every(cb => cb.checked);
                    toggleAllCheckbox.checked = allChecked;
                });

                const label = document.createElement('label');
                label.htmlFor = key;
                label.textContent = setting.label;
                label.style.marginLeft = '5px';

                div.appendChild(checkbox);
                div.appendChild(label);
                panel.appendChild(div);
            });

            document.body.appendChild(panel);
        }

        applySettings() {
            Object.entries(this.settings).forEach(([key, setting]) => {
                const enabled = GM_getValue(key, setting.default);
                setting.apply(enabled);
            });
        }
    }

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
                console.log('Initializing layout manager');
                window.layoutManager = new LayoutManager();
            } catch (e) {
                console.error('Error initializing layout manager:', e);
            }
        }, 2000); // 2 second delay

        // Keep the keyboard shortcut listener
        // document.addEventListener('keydown', handleKeyboardShortcut);
    } else {
    }
})(); 