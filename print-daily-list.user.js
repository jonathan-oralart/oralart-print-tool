// ==UserScript==
// @name         Daily Roundup Print
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Custom print functionality with Cmd+P
// @author       You
// @match        https://oralart.retool.com/apps/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Function to handle the custom print
    function customPrint() {
        try {
            var printContents = document.querySelector('[data-testid="TableWrapper::ScrollableContainer"]');
            if (!printContents) {
                console.error('Table element not found');
                window.print();
                return;
            }

            // Create a new window for printing
            var printWindow = window.open('', '_blank');

            // Get all stylesheets from the current page
            var styles = '';
            for (var i = 0; i < document.styleSheets.length; i++) {
                try {
                    var styleSheet = document.styleSheets[i];
                    if (styleSheet.href) {
                        styles += '<link rel="stylesheet" href="' + styleSheet.href + '">';
                    } else if (styleSheet.ownerNode) {
                        styles += '<style>' + styleSheet.ownerNode.innerHTML + '</style>';
                    }
                } catch (e) {
                    // Skip stylesheets that can't be accessed (CORS)
                    console.warn('Could not access stylesheet:', e);
                }
            }

            // Get the page title from dateText element
            var pageTitle = 'Print';
            var dateElement = document.querySelector('[data-testid="dateText--0"]');
            if (dateElement && dateElement.innerText) {
                pageTitle = dateElement.innerText.trim();
            }

            // Write the content to the new window
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${pageTitle}</title>
                    ${styles}
                    <style>
                        @media print {
                            body { margin: 0; padding: 20px; }
                            * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
                            [data-testid="TableWrapper::ScrollableContainer"] { max-height: unset !important; }
                        }
                    </style>
                </head>
                <body>
                    ${printContents.outerHTML}
                </body>
                </html>
            `);

            printWindow.document.close();

            // Wait for styles to load, then print and close
            setTimeout(function () {
                printWindow.focus();
                printWindow.print();
                // printWindow.close();
            }, 500);

        } catch (error) {
            console.error('Error in custom print function:', error);
            // Fallback to normal print if something goes wrong
            window.print();
        }
    }

    // Add keyboard event listener
    document.addEventListener('keydown', function (event) {
        // Check for Cmd+P (Mac) or Ctrl+P (Windows/Linux)
        if ((event.metaKey || event.ctrlKey) && event.key === 'p') {
            event.preventDefault(); // Prevent default print dialog
            customPrint();
        }
    });

})();