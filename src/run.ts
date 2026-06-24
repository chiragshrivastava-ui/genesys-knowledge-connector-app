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
    const token = tokenData.access_token;

    const BASE = process.env.GENESYS_BASE_URL;
    const KB = process.env.GENESYS_KNOWLEDGE_BASE_ID;

    console.log("✅ Authenticated");

    // ✅ STEP 1: Fetch existing documents
    const existingRes = await fetch(
      `${BASE}/api/v2/knowledge/knowledgebases/${KB}/documents?pageSize=100`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const existingData = await existingRes.json();

    const existingMap = new Map();

    for (const doc of existingData.entities || []) {
      if (doc.externalId) {
        existingMap.set(doc.externalId, doc.id);
      }
    }

    console.log("✅ Existing documents loaded:", existingMap.size);

    for (const doc of docs) {
      try {
        console.log(`\n📌 Processing: ${doc.title}`);

        let documentId;

        // ✅ CHECK DUPLICATE
        if (existingMap.has(doc.externalId)) {
          documentId = existingMap.get(doc.externalId);
          console.log("🔁 Updating existing article:", doc.title);
        } else {
          console.log("🆕 Creating new article:", doc.title);

          const createRes = await fetch(
            `${BASE}/api/v2/knowledge/knowledgebases/${KB}/documents`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                name: doc.title,
                title: doc.title,
                externalId: doc.externalId,
                visible: true,
                language: "en-US"
              })
            }
          );

          const createData = await createRes.json();

          if (!createRes.ok) {
            console.error("❌ Create failed", createData);
            continue;
          }

          documentId = createData.id;
        }

        // ✅ ALWAYS UPDATE CONTENT (variation)
        await fetch(
          `${BASE}/api/v2/knowledge/knowledgebases/${KB}/documents/${documentId}/variations`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              name: doc.title,
              type: "Article",
              language: "en-US",
              body: {
                blocks: [
                  {
                    type: "Paragraph",
                    paragraph: {
                      blocks: [
                        {
                          type: "Text",
                          text: {
                            text: doc.content.body
                          }
                        }
                      ]
                    }
                  }
                ]
              }
            })
          }
        );

        // ✅ PUBLISH
        await fetch(
          `${BASE}/api/v2/knowledge/knowledgebases/${KB}/documents/${documentId}/versions`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ state: "Published" })
          }
        );

        console.log("✅ Synced:", doc.title);

      } catch (err) {
        console.error("❌ Error:", err);
      }
    }

    console.log("\n✅ Sync completed");

  } catch (err) {
    console.error("❌ Fatal error:", err);
  }
}

main();
