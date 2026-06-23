import customkbConfigurer from "./configurers/customkb";
const fetch = require("node-fetch");

async function main() {
  try {
    console.log("🚀 Starting connector...");

    const documents = await customkbConfigurer();

    console.log(`✅ Documents fetched: ${documents.length}`);

    // ✅ Step 1: Get OAuth token
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

    console.log("✅ Authenticated with Genesys");

    // ✅ Step 2: Push each document
    for (const doc of documents) {

      const response = await fetch(
        `${process.env.GENESYS_BASE_URL}/api/v2/knowledge/knowledgebases/${process.env.GENESYS_KNOWLEDGE_BASE_ID}/documents`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            name: doc.title,
            title: doc.title,
            externalId: doc.externalId,
            visible: true,
            language: "en-US",
            variations: [
              {
                name: doc.title,
                type: "Article",
                state: "published",
                body: {
                  content: doc.content.body
                }
              }
            ]
          }),
        }
      );

      const responseText = await response.text();

      console.log(`📦 RESPONSE for "${doc.title}":`);
      console.log(responseText);

      if (!response.ok) {
        console.error(`❌ Failed for ${doc.title} - Status: ${response.status}`);
        continue;
      }

      console.log(`✅ Successfully sent: ${doc.title}`);

      // ✅ ✅ PUBLISH STEP (FINAL FIX)
      try {
        const result = JSON.parse(responseText);

        await fetch(
          `${process.env.GENESYS_BASE_URL}/api/v2/knowledge/knowledgebases/${process.env.GENESYS_KNOWLEDGE_BASE_ID}/documents/${result.id}/publish`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        console.log(`✅ Published: ${doc.title}`);
      } catch (err) {
        console.error(`⚠️ Publish failed for ${doc.title}`, err);
      }
    }

    console.log("✅ Process completed");

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
