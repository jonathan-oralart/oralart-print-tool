// ==UserScript==
// @name         Meddit 2
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  try to take over the world!
// @author       You
// @match        https://www.meditlink.com/inbox/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=meditlink.com
// @require      file:///Users/oralart/Repos/oralart-print-tool/meddit.user.js
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      api.doppio.sh
// @grant        GM_download
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
    'use strict';

    console.log("Meddit 0.2");

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
                    scale: 0.68
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

    // Function to process the printable content
    const processPrintableContent = async (contentDiv) => {
        try {
            console.log("Processing content for PDF generation");

            // Get the element with all styles inlined
            const htmlContent = getElementWithStyles('#printable-body');

            // Open a preview in a new tab
            const previewWindow = window.open();
            //
            // previewWindow.document.write(`
            const htmlFull = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Print Preview</title>
                    <style>
                        body { 
                            font-family: Arial, sans-serif;
                            padding: 20px;
                        }
                        .preview-header {
                            background: #f0f0f0;
                            padding: 10px;
                            margin-bottom: 20px;
                            border-radius: 4px;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                        }
                        @media print {
                            .preview-header {
                                display: none;
                            }
                        }
                        .preview-header button {
                            padding: 8px 16px;
                            background: #4285f4;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                        }
                        .preview-header button:hover {
                            background: #3367d6;
                        }
                        
                        /* General styles */
body {
  font-family: Arial, sans-serif;
  line-height: 1.5;
  color: #333;
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

/* Header styles */
.case-information {
  width: 100%;
}

.header-case-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 10px;
  margin-bottom: 20px;
}

.header-case-info-title {
  font-size: 24px;
  font-weight: bold;
  margin: 0;
  color: #333;
}

.header-case-info-title::before {
  content: "Medit Link - ";
}

.logo-meditlink {
  height: 30px;
}

/* Main information styles */
.main-case-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.text-info {
  flex: 1;
}

.info-list {
  list-style-type: none;
  padding: 0;
  margin: 0 0 20px 0;
}

.list-item {
  display: flex;
  margin-bottom: 8px;
}

.item-label {
  font-weight: bold;
  min-width: 120px;
}

.item-value {
  flex: 1;
}

h2 {
  font-size: 18px;
  margin: 20px 0 10px 0;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 5px;
}

/* Form information styles */
.form-info-wrapper {
  margin-top: 20px;
}

.input-field label {
  display: block;
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 10px;
}

.form-info-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}

.form-info-table th, 
.form-info-table td {
  padding: 8px;
  text-align: left;
  border: 1px solid #e0e0e0;
}

.form-info-table-header {
  background-color: #f5f5f5;
}

.text-center {
  text-align: center;
}

.tooth-number-header {
  width: 60px;
}

/* Memo section */
.memo {
  margin-top: 20px;
}

.memo h2 {
  font-size: 16px;
  margin-bottom: 10px;
}

.memo-content {
  border: 1px solid #e0e0e0;
  padding: 15px;
  border-radius: 4px;
  background-color: #f9f9f9;
}

/* Footer styles */
.case-information-footer {
  margin-top: 30px;
  border-top: 1px solid #e0e0e0;
  padding-top: 15px;
  text-align: center;
  font-size: 12px;
  color: #777;
}

.link-url {
  margin-bottom: 5px;
}

.link-url a {
  color: #007bff;
  text-decoration: none;
}

.copyright {
  font-size: 11px;
}

/* Form Information section header */
.form-information-header {
  font-size: 16px;
  font-weight: bold;
  margin: 20px 0 10px 0;
}

/* Additional styling for the table */
.form-info-table th {
  background-color: #f8f9fa;
  font-weight: bold;
}

/* Styling specifically for memo section */
.memo-box {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 15px;
  margin-top: 10px;
  background-color: #f9f9f9;
  line-height: 1.6;
}

.memo-info-container {
    white-space: pre-line;
    font-size: 18px;
    font-family: sans-serif;
}
                    </style>
                </head>
                <body>
                    <div class="preview-header">
                        <h2>Print Preview</h2>
                        <button id="continue-print">Continue with PDF Generation</button>
                    </div>
                    <div id="preview-content">
                        ${htmlContent}
                    </div>
                    <script>
                        document.getElementById('continue-print').addEventListener('click', function() {
                            window.opener.postMessage('continue-pdf-generation', '*');
                        });
                    </script>
                </body>
                </html>
            `;
            previewWindow.document.write(htmlFull);
            previewWindow.document.close();

            // Listen for the message from the preview window
            const generatePdfPromise = new Promise((resolve) => {
                window.addEventListener('message', async function messageHandler(event) {
                    if (event.data === 'continue-pdf-generation') {
                        window.removeEventListener('message', messageHandler);

                        try {
                            // Generate PDF
                            const pdfResponse = await generatePDF(htmlFull);
                            console.log("PDF generated successfully");

                            // Create a temporary DOM parser
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(htmlFull, 'text/html');

                            // Get the patient name from the parsed HTML
                            const patientName = [...doc.querySelectorAll(".list-item")]
                                .map(x => x.innerText)
                                .filter(x => x.startsWith("Patient Name"))?.[0]
                                ?.split(":").at(-1).trim() || 'Unknown';

                            // Use the patient name in the download filename
                            const blob = new Blob([pdfResponse.response], { type: 'application/pdf' });
                            const link = document.createElement('a');
                            link.href = window.URL.createObjectURL(blob);
                            link.download = `${patientName} Medit.pdf`;
                            link.click();

                            resolve();
                        } catch (error) {
                            console.error("Error generating PDF:", error);
                            resolve(); // Resolve anyway to prevent hanging
                        }
                    }
                });
            });

            // Also allow automatic generation if the user closes the preview
            previewWindow.addEventListener('beforeunload', () => {
                generatePdfPromise.then(() => {
                    console.log("Preview window closed");
                });
            });

        } catch (error) {
            console.error("Error processing printable content:", error);
        }
    };

    /**
     * Gets an element with optimized inline styles
     * @param {string} selector - CSS selector for the element to process
     * @param {Object} options - Configuration options
     * @param {boolean} options.simplifyStyles - Whether to simplify and optimize styles (default: true)
     * @param {boolean} options.removeDefaults - Whether to remove default/initial styles (default: true)
     * @param {Array<string>} options.keepProperties - Array of CSS properties to always keep
     * @param {Array<string>} options.removeProperties - Array of CSS properties to always remove
     * @return {string} - HTML string with inline styles
     */
    function getElementWithStyles(selector, options = {}) {
        // Default options
        const config = {
            simplifyStyles: options.simplifyStyles !== false,
            removeDefaults: options.removeDefaults !== false,
            keepProperties: options.keepProperties || [
                'display', 'position', 'color', 'background-color',
                'font-family', 'font-size', 'font-weight', 'width',
                'height', 'margin', 'padding', 'border'
            ],
            removeProperties: options.removeProperties || [
                // Properties that likely don't need to be preserved
                '-webkit-tap-highlight-color', '-webkit-text-fill-color',
                'animation-composition', 'animation-delay', 'animation-direction',
                'animation-duration', 'animation-iteration-count', 'animation-play-state',
                'animation-timing-function', 'backface-visibility',
                'position-try-order', 'position-visibility', 'container-type',
                'math-depth', 'math-shift', 'math-style', 'field-sizing',
                'interpolate-size', 'offset-position', 'offset-rotate', 'unicode-bidi',
                'color-interpolation', 'color-interpolation-filters', 'fill-opacity',
                'fill-rule', 'flood-color', 'flood-opacity', 'lighting-color',
                'perspective-origin', 'ruby-align', 'ruby-position', 'scroll-timeline-axis',
                'scrollbar-color', 'scrollbar-width', 'stop-color', 'stop-opacity',
                'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-opacity',
                'stroke-width', 'text-anchor', 'text-emphasis-color', 'text-emphasis-position',
                'view-timeline-axis', 'caption-side', 'empty-cells', 'zoom', 'clip-rule',
                'image-orientation', 'mask-clip', 'mask-composite', 'mask-mode', 'mask-origin',
                'mask-repeat', 'mask-type', 'paint-order', 'text-spacing-trim', 'transform-style',
                'border-image-repeat', 'border-image-slice', 'border-image-width',
                'transition-delay', 'transition-duration', 'transition-property', 'transition-timing-function'
            ]
        };

        const element = document.querySelector(selector);

        element.style = '';

        element.querySelectorAll('img').forEach(img => img.remove());


        if (!element) {
            console.error('Element not found');
            return '';
        }

        // Clone the element
        const clone = element.cloneNode(true);

        // Create a temporary container to get the HTML
        const container = document.createElement('div');
        container.appendChild(clone);

        // Output to console
        const htmlString = container.innerHTML;
        console.log("Processed HTML with styles");

        return htmlString;
    }

    // Function to create a floating button
    const createFloatingButton = () => {
        // Create button styles
        GM_addStyle(`
            #meddit-print-button {
                position: fixed;
                top: 20px;
                left: 20px;
                background-color: #4285f4;
                color: white;
                border: none;
                border-radius: 50%;
                width: 60px;
                height: 60px;
                font-size: 24px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                cursor: pointer;
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
            }
            #meddit-print-button:hover {
                background-color: #3367d6;
                transform: scale(1.05);
                box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
            }
            #meddit-print-button:active {
                transform: scale(0.95);
            }
        `);

        // Create the button
        const button = document.createElement('button');
        button.id = 'meddit-print-button';
        button.innerHTML = '🖨️';
        button.title = 'Generate PDF';

        // Add click event
        button.addEventListener('click', () => {
            console.log("Print button clicked, looking for printable-body...");
            const printableBody = document.getElementById('printable-body');

            if (printableBody) {
                console.log("Found printable-body element, processing...");
                processPrintableContent(printableBody);
            } else {
                console.error("Could not find printable-body element");
                alert("Could not find the printable content. Please make sure you're on the correct page.");
            }
        });

        // Add to document
        document.body.appendChild(button);
        console.log("Floating print button added");
    };

    // Start by adding the floating button when the page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createFloatingButton);
    } else {
        createFloatingButton();
    }
})();