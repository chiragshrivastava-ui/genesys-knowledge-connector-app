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

    console.log("✅ Authenticated with Genesys");

    // ✅ STEP 2: Create + Publish
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

      console.log(`✅ Created: ${doc.title}`);

      // ✅ ✅ STEP 3: Publish VARIATION (THIS IS THE REAL FIX)
      try {
        const result = JSON.parse(responseText);

        const documentId = result.id;
        const variationId = result.variations?.[0]?.id;

        if (!variationId) {
          console.error(`❌ No variationId found for ${doc.title}`);
          continue;
        }

        await fetch(
          `${process.env.GENESYS_BASE_URL}/api/v2/knowledge/knowledgebases/${process.env.GENESYS_KNOWLEDGE_BASE_ID}/documents/${documentId}/variations/${variationId}/publish`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        console.log(`✅ Published: ${doc.title}`);

      } catch (publishError) {
        console.error(`⚠️ Publish failed for ${doc.title}`, publishError);
      }
    }

    console.log("✅ Process completed ✅");

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
