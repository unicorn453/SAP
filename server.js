const cds = require('@sap/cds');

cds.on('bootstrap', (app) => {
    const express = require('express');
    const path = require('path');

    // Increase body size limit BEFORE any routes are defined
    app.use(express.json({ limit: '100mb' }));
    app.use(express.urlencoded({ limit: '100mb', extended: true }));
    app.use(express.text({ limit: '100mb', type: '*/*' }));

    // Serve static UI assets
    app.use('/webapp', express.static(path.join(__dirname, 'webapp')));

    console.log('✅ Custom body-parser limits applied: 100MB');
});

module.exports = cds.server;
