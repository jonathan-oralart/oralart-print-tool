// ==UserScript==
// @name         LMS - Auto Login Combined
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Auto Login to 3Shape with email and password support
// @author       You
// @match        https://lms.3shape.com/3ui/
// @match        https://identity.3shape.com/Account/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @require      file:///Users/oralart/Repos/oralart-print-tool/lms-auto-login3.user.js
// @grant        GM_download
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
    'use strict';

    // Function to get email from user if not already stored
    const getEmail = () => {
        const storedEmail = GM_getValue('lmsEmail');
        if (!storedEmail) {
            const email = prompt('Please enter your LMS email address:');
            if (email) {
                GM_setValue('lmsEmail', email);
                return email;
            }
        }
        return storedEmail;
    };

    // Function to get password from user if not already stored
    const getPassword = () => {
        const storedPassword = GM_getValue('lmsPassword');
        if (!storedPassword) {
            const password = prompt('Please enter your LMS password:');
            if (password) {
                GM_setValue('lmsPassword', password);
                return password;
            }
        }
        return storedPassword;
    };

    // Helper function to wait for element with timeout
    const waitForElement = async (selector, timeout = 10000) => {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            const checkElement = () => {
                const element = document.querySelector(selector);
                const elapsed = Date.now() - startTime;

                if (element) {
                    resolve(element);
                } else if (elapsed >= timeout) {
                    reject(new Error(`Timeout waiting for element: ${selector}`));
                } else {
                    setTimeout(checkElement, 10);
                }
            };
            checkElement();
        });
    };

    // Handle initial LMS page
    const handleLMSPage = async () => {
        try {
            const signInButton = await waitForElement('#sign-in-btn');
            await new Promise(resolve => setTimeout(resolve, 2000));
            signInButton.click();
        } catch (error) {
            console.error('Failed to click sign in button:', error);
        }
    };

    // Handle identity page login
    const handleIdentityPage = async () => {
        try {
            // Wait for and fill email
            const emailInput = await waitForElement('[data-auto-qa-id="email-input"]');
            const nextButton = await waitForElement('[data-auto-qa-id="next-button"]');

            const email = getEmail();
            if (email) {
                emailInput.value = email;
                emailInput.dispatchEvent(new Event('input', { bubbles: true }));
                nextButton.click();

                // Wait for and fill password
                const passwordInput = await waitForElement('[data-auto-qa-id="password-input"]');
                const signInButton = await waitForElement('[data-auto-qa-id="sign-in-button"]');

                const password = getPassword();
                if (password) {
                    passwordInput.value = password;
                    passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
                    signInButton.click();
                }
            }
        } catch (error) {
            console.error('Login process failed:', error);
        }
    };

    // Main router based on URL
    if (window.location.href.startsWith('https://lms.3shape.com/3ui/')) {
        handleLMSPage();
    } else if (window.location.href.startsWith('https://identity.3shape.com/Account/')) {
        handleIdentityPage();
    }
})();