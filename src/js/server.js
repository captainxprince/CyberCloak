const express = require('express');
const app = express();
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

app.use(express.static('src'));
app.use(express.json());

// Initialize iptables when server starts
exec('chmod +x src/scripts/iptables.sh && sudo bash src/scripts/iptables.sh', (error, stdout, stderr) => {
    if (error) {
        console.error(`Error initializing iptables: ${error}`);
        return;
    }
    console.log('Iptables initialized successfully');
});

// Function to update iptables.sh and reload rules
function updateIptablesFile(newCommand, callback) {
    const filePath = 'src/scripts/iptables.sh';
    
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            callback(err);
            return;
        }

        // Find the position before the "Save the rules" section
        const saveRulesIndex = data.indexOf('# Save the rules');
        if (saveRulesIndex === -1) {
            callback(new Error('Could not find insertion point in iptables.sh'));
            return;
        }

        // Insert the new command before the "Save the rules" section
        const updatedContent = data.slice(0, saveRulesIndex) + 
                             '\n# Added by web interface\n' + 
                             newCommand + '\n\n' +
                             data.slice(saveRulesIndex);

        fs.writeFile(filePath, updatedContent, 'utf8', (writeErr) => {
            if (writeErr) {
                callback(writeErr);
                return;
            }

            // Execute the updated script
            exec('sudo bash src/scripts/iptables.sh', (execErr, stdout, stderr) => {
                callback(execErr, stdout);
            });
        });
    });
}

// Endpoint to handle website blocking
app.post('/block-website', (req, res) => {
    const { website } = req.body;
    const newCommand = `block_website "${website}"`;
    
    updateIptablesFile(newCommand, (error, stdout) => {
        if (error) {
            res.status(500).json({ error: `Failed to update rules: ${error.message}` });
            return;
        }
        res.json({ 
            message: `Successfully blocked ${website}`, 
            output: stdout 
        });
    });
});

// Endpoint to handle IP filtering
app.post('/filter-ip', (req, res) => {
    const { ip, action } = req.body;
    const newCommand = `filter_ip "${ip}" "${action}"`;
    
    updateIptablesFile(newCommand, (error, stdout) => {
        if (error) {
            res.status(500).json({ error: `Failed to update rules: ${error.message}` });
            return;
        }
        res.json({ 
            message: `Successfully applied ${action} rule for ${ip}`, 
            output: stdout 
        });
    });
});

// Add new endpoint in [src/js/server.js](src/js/server.js)
app.post('/remove-rule', (req, res) => {
    const { target, type } = req.body;
    
    // Read the iptables.sh file
    fs.readFile('src/scripts/iptables.sh', 'utf8', (err, data) => {
        if (err) {
            res.status(500).json({ error: 'Failed to read iptables.sh' });
            return;
        }

        let updatedContent;
        if (type === 'website') {
            // Remove the block_website command for the target
            const ruleToRemove = new RegExp(`\\n# Added by web interface\\nblock_website "${target}"\\n`, 'g');
            updatedContent = data.replace(ruleToRemove, '\n');
        } else if (type === 'ip') {
            // Remove the filter_ip command for the target
            const ruleToRemove = new RegExp(`\\n# Added by web interface\\nfilter_ip "${target}".*\\n`, 'g');
            updatedContent = data.replace(ruleToRemove, '\n');
        }

        // Write the updated content back to the file
        fs.writeFile('src/scripts/iptables.sh', updatedContent, 'utf8', (writeErr) => {
            if (writeErr) {
                res.status(500).json({ error: 'Failed to update iptables.sh' });
                return;
            }

            // Rerun iptables.sh to apply changes
            exec('sudo bash src/scripts/iptables.sh', (execErr, stdout) => {
                if (execErr) {
                    res.status(500).json({ error: 'Failed to apply updated rules' });
                    return;
                }
                res.json({ 
                    message: `Successfully removed rule for ${target}`,
                    output: stdout 
                });
            });
        });
    });
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));