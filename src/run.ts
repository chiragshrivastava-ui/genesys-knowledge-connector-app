import customkbConfigurer from "./configurers/customkb";
import fetch from "node-fetch";

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
            externalId: doc.externalId,
            title: doc.title,
            visible: true,
            content: {
              body: doc.content.body,
            },
          }),
        }
      );

      const result = await response.json();

      console.log(`✅ Uploaded: ${doc.title}`);
    }

    console.log("✅ All articles pushed to Genesys!");

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
