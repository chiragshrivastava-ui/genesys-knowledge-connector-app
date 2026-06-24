import customkbConfigurer from "./configurers/customkb";
const fetch = require("node-fetch");

// ✅ ✅ NORMALIZATION FUNCTION
function normalize(text) {
  if (!text) return "";

  return text
    .replace(/\r?\n/g, " ")   // remove new lines
    .replace(/\s+/g, " ")     // collapse spaces
    .trim();
}

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

    // ✅ FETCH EXISTING DOCUMENTS
    const existingRes = await fetch(
      `${BASE}/api/v2/knowledge/knowledgebases/${KB}/documents?pageSize=100`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
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

    // ✅ PROCESS EACH DOC
    for (const doc of docs) {
      try {
        console.log(`\n📌 Processing: ${doc.title}`);

        let documentId;

        if (existingMap.has(doc.externalId)) {
          documentId = existingMap.get(doc.externalId);
          console.log("🔁 Existing article found");
        } else {
          console.log("🆕 Creating new article");

          const createRes = await fetch(
            `${BASE}/api/v2/knowledge/knowledgebases/${KB}/documents`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
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

          const createData = await createRes.json();

          if (!createRes.ok) {
            console.error("❌ Create failed", createData);
            continue;
          }

          documentId = createData.id;
        }

        // ✅ FETCH EXISTING CONTENT
        const existingDocRes = await fetch(
          `${BASE}/api/v2/knowledge/knowledgebases/${KB}/documents/${documentId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const existingDoc = await existingDocRes.json();

        const existingText =
          existingDoc.body?.blocks?.[0]?.paragraph?.blocks?.[0]?.text?.text || "";

        const newText = doc.content.body;

        // ✅ NORMALIZED COMPARISON (FIXED)
        const normalizedExisting = normalize(existingText);
        const normalizedNew = normalize(newText);

        if (normalizedExisting === normalizedNew) {
          console.log("⏭️ No changes detected, skipping");
          continue;
        }

        console.log("✏️ Content changed, updating");

        // ✅ UPDATE CONTENT
        await fetch(
          `${BASE}/api/v2/knowledge/knowledgebases/${KB}/documents/${documentId}/variations`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
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
                            text: newText,
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            }),
          }
        );

        // ✅ PUBLISH ONLY IF UPDATED
        await fetch(
          `${BASE}/api/v2/knowledge/knowledgebases/${KB}/documents/${documentId}/versions`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ state: "Published" }),
          }
        );

        console.log("✅ Updated & Published");

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
