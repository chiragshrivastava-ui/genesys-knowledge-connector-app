import customkbConfigurer from "./configurers/customkb";
const fetch = require("node-fetch");

async function main() {
  try {
    console.log("🚀 Starting connector...");

    const docs = await customkbConfigurer();
    console.log(`✅ Documents fetched: ${docs.length}`);

    // ✅ AUTH
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

    for (const doc of docs) {
      try {
        console.log(`\n📌 Processing: ${doc.title}`);

        if (!doc.title) {
          console.error("❌ Title is NULL, skipping");
          continue;
        }

        // ✅ 1. CREATE DOCUMENT
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
              title: doc.title,
              externalId: doc.externalId,
              visible: true,
              language: "en-US",
            }),
          }
        );

        const createText = await createRes.text();
        console.log("📦 CREATE RESPONSE:");
        console.log(createText);

        if (!createRes.ok) {
          console.error("❌ Create failed");
          continue;
        }

        const createdDoc = JSON.parse(createText);
        const documentId = createdDoc.id;

        // ✅ 2. ADD CONTENT (VARIATION)
        const variationRes = await fetch(
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
              language: "en-US",
              body: {
                text: doc.content.body,
              },
            }),
          }
        );

        const variationText = await variationRes.text();
        console.log("📦 VARIATION RESPONSE:");
        console.log(variationText);

        if (!variationRes.ok) {
          console.error("❌ Variation failed");
          continue;
        }

        // ✅ 3. PUBLISH (VERSION)
        const publishRes = await fetch(
          `${BASE}/api/v2/knowledge/knowledgebases/${KB}/documents/${documentId}/versions`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              state: "Published",
            }),
          }
        );

        const publishText = await publishRes.text();
        console.log("📦 PUBLISH RESPONSE:");
        console.log(publishText);

        if (!publishRes.ok) {
          console.error("❌ Publish failed");
          continue;
        }

        console.log(`✅ DONE: ${doc.title}`);

      } catch (err) {
        console.error(`❌ Error for ${doc.title}`, err);
      }
    }

    console.log("\n✅ Process completed");

  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

main();
