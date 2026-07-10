import customkbConfigurer from "./configurers/customkb";
const fetch = require("node-fetch");

function normalize(text: string) {
  if (!text) return "";

  return text
    .replace(/\r?\n/g, "\n")
    .replace(/\s+$/gm, "")
    .trim();
}

function extractVariationText(variationResponse: any): string {
  try {
    const blocks =
      variationResponse.entities?.[0]?.body?.blocks || [];

    let result = "";

    for (const block of blocks) {
      if (
        block.type === "Paragraph" &&
        block.paragraph &&
        block.paragraph.blocks
      ) {
        for (const inner of block.paragraph.blocks) {
          if (
            inner.type === "Text" &&
            inner.text &&
            inner.text.text
          ) {
            result += inner.text.text;
          }
        }

        result += "\n";
      }
    }

    return result.trim();
  } catch {
    return "";
  }
}

async function main() {
  try {
    console.log("🚀 Starting connector...");

    const docs = await customkbConfigurer();

    console.log(`✅ Documents fetched: ${docs.length}`);

    const tokenResponse = await fetch(
      `${process.env.GENESYS_LOGIN_URL}/oauth/token`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
          Authorization:
            "Basic " +
            Buffer.from(
              `${process.env.GENESYS_CLIENT_ID}:${process.env.GENESYS_CLIENT_SECRET}`
            ).toString("base64")
        },
        body: "grant_type=client_credentials"
      }
    );

    const tokenData = await tokenResponse.json();
    const token = tokenData.access_token;

    const BASE = process.env.GENESYS_BASE_URL;
    const KB = process.env.GENESYS_KNOWLEDGE_BASE_ID;

    console.log("✅ Authenticated");

    // Load existing documents
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

    for (const item of existingData.entities || []) {
      existingMap.set(
        item.externalId,
        item.id
      );
    }

    console.log(
      `✅ Existing documents loaded: ${existingMap.size}`
    );

    for (const doc of docs) {
      try {
        console.log(`\n📌 Processing: ${doc.title}`);

        let documentId;

        // ====================================
        // CREATE IF NOT EXISTS
        // ====================================
        if (!existingMap.has(doc.externalId)) {
          console.log("🆕 Creating new article");

          const createRes = await fetch(
            `${BASE}/api/v2/knowledge/knowledgebases/${KB}/documents`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type":
                  "application/json"
              },
              body: JSON.stringify({
                title: doc.title,
                visible: true,
                externalId: doc.externalId
              })
            }
          );

          const createdDoc = await createRes.json();

          if (!createRes.ok) {
            console.error(
              "❌ Create failed",
              createdDoc
            );
            continue;
          }

          documentId = createdDoc.id;

          console.log(
            `✅ Created: ${doc.title}`
          );
        } else {
          documentId =
            existingMap.get(doc.externalId);

          console.log(
            "🔁 Existing article found"
          );
        }

        // ====================================
        // GET LATEST VERSION
        // ====================================
        const versionRes = await fetch(
          `${BASE}/api/v2/knowledge/knowledgebases/${KB}/documents/${documentId}/versions`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const versionData =
          await versionRes.json();

        const versionId =
          versionData.entities?.[0]?.id;

        if (!versionId) {
          console.error(
            "❌ Unable to determine versionId"
          );
          continue;
        }

        // ====================================
        // GET CURRENT CONTENT
        // ====================================
        const variationRes = await fetch(
          `${BASE}/api/v2/knowledge/knowledgebases/${KB}/documents/${documentId}/versions/${versionId}/variations`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const variationData =
          await variationRes.json();

        const genesysContent =
          extractVariationText(
            variationData
          );

        const gitContent =
          doc.content.body;

        const existingText =
          normalize(genesysContent);

        const newText =
          normalize(gitContent);

        if (existingText === newText) {
          console.log(
            "⏭️ No changes detected. Skipping."
          );
          continue;
        }

        console.log(
          "✏️ Content changed. Updating."
        );

        // ====================================
        // UPDATE CONTENT
        // ====================================
        await fetch(
          `${BASE}/api/v2/knowledge/knowledgebases/${KB}/documents/${documentId}/variations`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify({
              body: {
                blocks: [
                  {
                    type: "Paragraph",
                    paragraph: {
                      blocks: [
                        {
                          type: "Text",
                          text: {
                            text: gitContent
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

        // ====================================
        // PUBLISH
        // ====================================
        await fetch(
          `${BASE}/api/v2/knowledge/knowledgebases/${KB}/documents/${documentId}/versions`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify({})
          }
        );

        console.log(
          "✅ Updated & Published"
        );

      } catch (err) {
        console.error(
          `❌ Error processing ${doc.title}`,
          err
        );
      }
    }

    console.log("\n✅ Sync Completed");

  } catch (err) {
    console.error("❌ Fatal error:", err);
  }
}

main();
