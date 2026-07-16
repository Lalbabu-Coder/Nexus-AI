import { initializeApp, cert } from "firebase-admin/app";

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (error) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT env variable:", error);
  }
}

if (!serviceAccount) {
  try {
    const { default: localServiceAccount } = await import("../serviceAccount.json", {
      with: { type: "json" }
    });
    serviceAccount = localServiceAccount;
  } catch (error) {
    console.error("Failed to load local serviceAccount.json file:", error);
  }
}

export const app = initializeApp({
  credential: cert(serviceAccount),
});