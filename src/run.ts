import customkbConfigurer from "./configurers/customkb";
const fetch = require("node-fetch");

async function main() {
  try {
    console.log("🚀 Starting connector...");

    const documents = await customkbConfigurer();
    console.log(`✅ Documents fetched: ${documents.length}`);

    // ✅ STEP 1: Get OAuth token
    const tokenResponse = await fetch(
      `${process.env.GENESYS_LOGIN_URL}/oauth/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization:
            "Basic " +
            Buffer.from(
              `${process.env.GENESYS_CLIENT_ID}:${process.env.GENESYS_CLIENT_SECRET}`
            ).toString("base64"),
        },
        body: "grant_type=client_credentials",
      }
    );

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    const BASE = process.env.GENESYS_BASE_URL;
    const KB = process.env.GENESYS_KNOWLEDGE_BASE_ID;

    console.log("✅ Authenticated");

    for (const doc of documents) {
      try {
        // ✅ STEP 2: CREATE DOCUMENT
        const createRes = await fetch(
          `${BASE}/api/v2/knowledge/knowledgebases/${KB}/documents`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: doc.title,
              externalId: doc.externalId,
              visible: true,
              language: "en-US"
            }),
          }
        );

        const createdDoc = await createRes.json();
        const documentId = createdDoc.id;

        console.log(`✅ Created: ${doc.title}`);

        // ✅ STEP 3: ADD CONTENT (Variation API)
        await fetch(
          `${BASE}/api/v2/knowledge/knowledgebases/${KB}/documents/${documentId}/variations`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: doc.title,
              type: "Article",
              body: {
                text: doc.content.body   // ✅ THIS FIXES EMPTY CONTENT
              }
            }),
          }
        );

        console.log(`✅ Content added: ${doc.title}`);

        // ✅ STEP 4: PUBLISH (Versions API)
        await fetch(
          `${BASE}/api/v2/knowledge/knowledgebases/${KB}/documents/${documentId}/versions`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: "{}"
          }
        );

        console.log(`✅ Published: ${doc.title}`);

      } catch (err) {
        console.error(`❌ Failed for ${doc.title}`, err);
      }
    }

    console.log("✅ Process completed");

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
``
