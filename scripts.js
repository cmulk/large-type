window.addEventListener('DOMContentLoaded', function () {
    "use strict";

    var WELCOME_MSG = '';

    var textDiv = document.querySelector('.text');
    var inputField = document.querySelector('.inputbox');
    var charboxTemplate = document.querySelector('#charbox-template');
    var defaultTitle = document.querySelector("title").innerText;

    function generateUUID() {
        // Try crypto.randomUUID() first, fall back to custom implementation
        try {
            if (crypto.randomUUID) {
                return crypto.randomUUID();
            }
        } catch (e) {
            // Fall back to custom implementation
        }
        
        // Fallback implementation for non-HTTPS or older browsers
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function setClientIdCookie() {
        const exists = document.cookie.split(';').some(cookie => cookie.trim().startsWith('client_id='));
        if (!exists) {
            const uuid = generateUUID();
            document.cookie = `client_id=${uuid}; max-age=31536000; path=/`;
        }
    }

    // Function to establish and manage a WebSocket connection for real-time updates
    function connectWebSocket() {
        // Determine the WebSocket protocol based on the current page's protocol
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Construct the WebSocket URL using the current host and '/ws' endpoint
        const wsUrl = `${protocol}//${window.location.host}/ws/display`;

        // Create a new WebSocket connection
        const socket = new WebSocket(wsUrl);

        // Handle incoming messages from the WebSocket
        socket.onmessage = function (event) {
            // Parse the received JSON data
            const data = JSON.parse(event.data);
            // If the message is a code update, update the display
            if (data.type === 'code_update') {
                updateFragment(data.code);
                renderText();
                console.log('Display updated via WebSocket:', data.code);
            }
        };

        // Handle WebSocket connection closure
        socket.onclose = function () {
            console.log('WebSocket connection closed, reconnecting...');
            // Attempt to reconnect after a 1-second delay
            setTimeout(connectWebSocket, 1000);
        };

        // Handle WebSocket errors
        socket.onerror = function (error) {
            console.error('WebSocket error:', error);
        };

        // Return the socket for potential further use
        return socket;
    }

    function updateFragment(text) {
        // Don't spam the browser history & strip query strings.
        window.location.replace(location.origin + location.pathname + '#' + encodeURIComponent(text));
    }

    function updateTitle(text) {
        if (!text || text === WELCOME_MSG) {
            document.title = defaultTitle;
        } else {
            document.title = text;
        }
    }

    function clearChars() {
        while (textDiv.firstChild) {
            textDiv.removeChild(textDiv.firstChild);
        }
    }

    function renderText() {
        // Return a space as typing indicator if text is empty.
        var text = decodeURIComponent(location.hash.split('#')[1] || ' ');
        var fontSize = Math.min(150 / text.length, 50);

        clearChars();

        text.split(/.*?/u).forEach(function (chr) {
            var charbox = charboxTemplate.content.cloneNode(true);
            var charElem = charbox.querySelector('.char');
            charElem.style.fontSize = fontSize + 'vw';

            if (chr !== ' ') {
                charElem.textContent = chr;
            } else {
                charElem.innerHTML = '&nbsp;';
            }

            if (chr.match(/[0-9]/i)) {
                charElem.className = 'number';
            } else if (!chr.match(/\p{L}/iu)) {
                charElem.className = 'symbol';
            }

            textDiv.appendChild(charbox);
        });

        // Ignore the placeholder space (typing indicator).
        if (text === ' ') {
            text = '';
        }

        updateTitle(text);
    }


    function enterInputMode(evt) {
        var defaultHash = '#' + encodeURIComponent(WELCOME_MSG);
        if (location.hash === defaultHash) {
            updateFragment('');
            renderText();
        }
        inputField.focus();
    }

    textDiv.addEventListener('click', enterInputMode, false);
    window.addEventListener('keypress', enterInputMode, false);
    window.addEventListener('hashchange', renderText, false);

    // if (!location.hash) {
    //     updateFragment(WELCOME_MSG);
    // }

    var urlParams = new URLSearchParams(window.location.search);
    var displayname = urlParams.get('displayname');
    if (displayname) {
        // set display_name cookie valid for 10 days
        document.cookie = "display_name=" + displayname + "; path=/; max-age=31536000";
    }
    setClientIdCookie();
    connectWebSocket();
    renderText();
});
