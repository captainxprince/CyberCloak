const express = require('express');
const app = express();
const path = require('path');
const { exec } = require('child_process');

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

// Endpoint to handle website blocking
app.post('/block-website', (req, res) => {
    const { website } = req.body;
    
    // First ensure the script is executable
    exec('chmod +x src/scripts/iptables.sh', (chmodError) => {
        if (chmodError) {
            res.status(500).json({ error: `Failed to set permissions: ${chmodError.message}` });
            return;
        }
        
        // Then execute the blocking command
        exec(`sudo bash src/scripts/iptables.sh block_website "${website}"`, (error, stdout, stderr) => {
            if (error) {
                res.status(500).json({ error: `Failed to block website: ${error.message}` });
                return;
            }
            
            // Save the rules after successful blocking
            exec('sudo iptables-save > /etc/iptables/rules.v4', (saveError) => {
                if (saveError) {
                    res.status(500).json({ error: `Failed to save rules: ${saveError.message}` });
                    return;
                }
                res.json({ 
                    message: `Successfully blocked ${website}`, 
                    output: stdout 
                });
            });
        });
    });
});

// Endpoint to handle IP filtering
app.post('/filter-ip', (req, res) => {
    const { ip, action } = req.body;
    exec(`sudo bash src/scripts/iptables.sh filter_ip "${ip}" "${action}"`, (error, stdout, stderr) => {
        if (error) {
            res.status(500).json({ error: `Failed to filter IP: ${error.message}` });
            return;
        }
        res.json({ message: `Successfully applied ${action} rule for ${ip}`, output: stdout });
    });
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));