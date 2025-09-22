const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

// Cached settings instance
let cachedSettings = null;

// Environment variable to settings field mapping
const ENV_TO_SETTINGS_MAP = {
    'SERVER_PROTOCOL': 'server_protocol',
    'SERVER_HOST': 'server_host',
    'SERVER_PORT': 'server_port',
};

// Create settings from environment variables and/or defaults
async function createSettingsFromEnvironment() {
    const protocol = process.env.SERVER_PROTOCOL || 'http';
    const host = process.env.SERVER_HOST || 'localhost';
    const port = parseInt(process.env.SERVER_PORT, 10) || 3001;
    const serverUrl = `${protocol}://${host}:${port}`.toLowerCase();

    const settings = await prisma.settings.create({
        data: {
            id: uuidv4(),
            server_url: serverUrl,
            server_protocol: protocol,
            server_host: host,
            server_port: port,
            update_interval: 60,
            auto_update: false,
            signup_enabled: false,
            updated_at: new Date()
        }
    });

    console.log('Created settings');
    return settings;
}

// Sync environment variables with existing settings
async function syncEnvironmentToSettings(currentSettings) {
    const updates = {};
    let hasChanges = false;

    // Check each environment variable mapping
    for (const [envVar, settingsField] of Object.entries(ENV_TO_SETTINGS_MAP)) {
        if (process.env[envVar]) {
            const envValue = process.env[envVar];
            const currentValue = currentSettings[settingsField];

            // Convert environment value to appropriate type
            let convertedValue = envValue;
            if (settingsField === 'server_port') {
                convertedValue = parseInt(envValue, 10);
            }

            // Only update if values differ
            if (currentValue !== convertedValue) {
                updates[settingsField] = convertedValue;
                hasChanges = true;
                console.log(`Environment variable ${envVar} (${envValue}) differs from settings ${settingsField} (${currentValue}), updating...`);
            }
        }
    }

    // Construct server_url from components if any components were updated
    const protocol = updates.server_protocol || currentSettings.server_protocol;
    const host = updates.server_host || currentSettings.server_host;
    const port = updates.server_port || currentSettings.server_port;
    const constructedServerUrl = `${protocol}://${host}:${port}`.toLowerCase();

    // Update server_url if it differs from the constructed value
    if (currentSettings.server_url !== constructedServerUrl) {
        updates.server_url = constructedServerUrl;
        hasChanges = true;
        console.log(`Updating server_url to: ${constructedServerUrl}`);
    }

    // Update settings if there are changes
    if (hasChanges) {
        const updatedSettings = await prisma.settings.update({
            where: { id: currentSettings.id },
            data: {
                ...updates,
                updated_at: new Date()
            }
        });
        console.log(`Synced ${Object.keys(updates).length} environment variables to settings`);
        return updatedSettings;
    }

    return currentSettings;
}

// Initialise settings - create from environment or sync existing
async function initSettings() {
    if (cachedSettings) {
        return cachedSettings;
    }

    try {
        let settings = await prisma.settings.findFirst({
            orderBy: { updated_at: 'desc' }
        });

        if (!settings) {
            // No settings exist, create from environment variables and defaults
            settings = await createSettingsFromEnvironment();
        } else {
            // Settings exist, sync with environment variables
            settings = await syncEnvironmentToSettings(settings);
        }

        // Cache the initialised settings
        cachedSettings = settings;
        return settings;
    } catch (error) {
        console.error('Failed to initialise settings:', error);
        throw error;
    }
}

// Get current settings (returns cached if available)
async function getSettings() {
    return cachedSettings || await initSettings();
}

// Update settings and refresh cache
async function updateSettings(id, updateData) {
    try {
        const updatedSettings = await prisma.settings.update({
            where: { id },
            data: {
                ...updateData,
                updated_at: new Date()
            }
        });

        // Reconstruct server_url from components
        const serverUrl = `${updatedSettings.server_protocol}://${updatedSettings.server_host}:${updatedSettings.server_port}`.toLowerCase();
        if (updatedSettings.server_url !== serverUrl) {
            updatedSettings.server_url = serverUrl;
            await prisma.settings.update({
                where: { id },
                data: { server_url: serverUrl }
            });
        }

        // Update cache
        cachedSettings = updatedSettings;
        return updatedSettings;
    } catch (error) {
        console.error('Failed to update settings:', error);
        throw error;
    }
}

// Invalidate cache (useful for testing or manual refresh)
function invalidateCache() {
    cachedSettings = null;
}

module.exports = {
    initSettings,
    getSettings,
    updateSettings,
    invalidateCache,
    syncEnvironmentToSettings // Export for startup use
};
