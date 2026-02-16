/**
 * Firebase Admin SDK Configuration
 * Initializes Firestore connection using service account credentials
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let db = null;
let isInitialized = false;

/**
 * Initialize Firebase Admin SDK
 * Supports service account JSON file or individual env vars
 */
function initializeFirebase() {
    if (isInitialized) return db;

    try {
        const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

        if (serviceAccountPath && fs.existsSync(path.resolve(serviceAccountPath))) {
            // Option 1: Service account JSON file
            const serviceAccount = require(path.resolve(serviceAccountPath));
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else if (process.env.FIREBASE_PROJECT_ID) {
            // Option 2: Individual environment variables
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
                })
            });
        } else {
            console.warn('[Firebase] No credentials found. Running in offline mode.');
            return null;
        }

        db = admin.firestore();
        isInitialized = true;
        console.log('[Firebase] Connected to Firestore');
        return db;
    } catch (error) {
        console.error('[Firebase] Initialization error:', error.message);
        return null;
    }
}

/**
 * Get Firestore database instance
 * @returns {FirebaseFirestore.Firestore|null}
 */
function getDb() {
    if (!isInitialized) {
        initializeFirebase();
    }
    return db;
}

module.exports = { initializeFirebase, getDb };
