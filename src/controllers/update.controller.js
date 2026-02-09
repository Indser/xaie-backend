/**
 * Controller for handling application updates.
 * In a real scenario, this would likely fetch from a database.
 * For now, we'll use a hardcoded version for demonstration.
 */

exports.checkUpdate = (req, res) => {
    console.log(`🚀 [UpdateCheck] Received request from ${req.ip}`);
    try {

        // Mock data for the latest version
        // In production, you would update these values whenever you release a new APK
        const updateInfo = {
            latestVersion: "1.0.1",
            buildNumber: 5,
            downloadUrl: `${req.protocol}://${req.get('host')}/apks/xaie-latest.apk`,
            releaseNotes: "• Premium Glassmorphism UI improvements\n• Bug fixes and performance enhancements\n• New World Chat feature",
            mandatory: false // Set to true if users MUST update to continues
        };


        res.status(200).json(updateInfo);
    } catch (error) {
        console.error("Error checking for updates:", error);
        res.status(500).json({ message: "Failed to check for updates" });
    }
};
