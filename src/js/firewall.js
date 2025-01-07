// firewall.js

// Basic packet filtering logic
document.addEventListener('DOMContentLoaded', function() {
    const blockButton = document.getElementById('block-website');
    const filterButton = document.getElementById('filter-button');
    const output = document.getElementById('output');
    const rulesBody = document.getElementById('rules-body');
    
    let rules = [];

    // Website Blocking
    blockButton.addEventListener('click', async function() {
        const website = document.getElementById('website-input').value;
        if (isValidDomain(website)) {
            try {
                const response = await fetch('/block-website', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ website })
                });
                const data = await response.json();
                
                if (response.ok) {
                    addRule(website, 'BLOCK');
                    updateRulesTable();
                    output.textContent = data.message;
                } else {
                    output.textContent = data.error;
                }
            } catch (error) {
                output.textContent = `Error: ${error.message}`;
            }
        } else {
            output.textContent = 'Invalid website address';
        }
    });

    // IP Filtering
    filterButton.addEventListener('click', async function() {
        const ipAddress = document.getElementById('ip-input').value;
        const action = document.getElementById('action-select').value;
        
        if (isValidIP(ipAddress)) {
            try {
                const response = await fetch('/filter-ip', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ ip: ipAddress, action })
                });
                const data = await response.json();
                
                if (response.ok) {
                    addRule(ipAddress, action);
                    updateRulesTable();
                    output.textContent = data.message;
                } else {
                    output.textContent = data.error;
                }
            } catch (error) {
                output.textContent = `Error: ${error.message}`;
            }
        } else {
            output.textContent = 'Invalid IP address';
        }
    });

    function isValidIP(ip) {
        const ipPattern = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return ipPattern.test(ip);
    }

    function isValidDomain(domain) {
        const domainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
        return domainPattern.test(domain);
    }

    function addRule(target, action) {
        rules.push({ target, action });
    }

    function updateRulesTable() {
        rulesBody.innerHTML = '';
        rules.forEach((rule, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${rule.target}</td>
                <td>${rule.action}</td>
                <td><button class="button" onclick="removeRule(${index})">Remove</button></td>
            `;
            rulesBody.appendChild(row);
        });
    }

    window.removeRule = function(index) {
        rules.splice(index, 1);
        updateRulesTable();
    };
});