// ==UserScript==
// @name         Daily Roundup Print
// @namespace    http://tampermonkey.net/
// @version      1.3
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

            // Get the root element
            var rootElement = document.getElementById('root');
            if (!rootElement) {
                console.error('Root element not found, falling back to normal print');
                window.print();
                return;
            }

            // Hide the root element
            rootElement.style.display = 'none';

            // Create a temporary div for printing
            var printDiv = document.createElement('div');
            printDiv.id = 'temp-print-content';

            // Clone the print contents to avoid modifying the original
            var clonedContents = printContents.cloneNode(true);
            printDiv.appendChild(clonedContents);

            // Add print-specific styles to the temporary div
            printDiv.innerHTML = `
                <style>
                    @media print {
                        body { margin: 0; padding: 20px; }
                        * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
                        [data-testid="TableWrapper::ScrollableContainer"] { max-height: unset !important; overflow: visible !important; }
                        #temp-print-content { display: block !important; }
                    }
                    @media screen {
                        #temp-print-content { display: none; }
                    }
                </style>
            ` + printDiv.innerHTML;

            // Add the temporary div to the body
            document.body.appendChild(printDiv);

            // Print the page
            window.print();

            // Clean up: remove the temporary div and restore the root element
            setTimeout(function () {
                document.body.removeChild(printDiv);
                rootElement.style.display = '';
            }, 100);

        } catch (error) {
            console.error('Error in custom print function:', error);

            // Clean up in case of error
            var tempDiv = document.getElementById('temp-print-content');
            if (tempDiv) {
                document.body.removeChild(tempDiv);
            }
            var rootElement = document.getElementById('root');
            if (rootElement) {
                rootElement.style.display = '';
            }

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