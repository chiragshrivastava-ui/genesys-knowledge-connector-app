import customkbConfigurer from "./configurers/customkb";
const fetch = require("node-fetch");

// ✅ SIMPLE NORMALIZATION (now enough)
function normalize(text: string) {
  if (!text) return "";

  return text
    .toLowerCase()
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
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

    // ✅ LOAD EXISTING DOCS
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

        // ✅ ✅ ✅ FIX: FETCH LAST VERSION WITH CONTENT
        const versionRes = await fetch(
          `${BASE}/api/v2/knowledge/knowledgebases/${KB}/documents/${documentId}/versions`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const versionData = await versionRes.json();

        let existingText = "";

        try {
          const latest = versionData.entities?.[0];
          existingText =
            latest?.body?.blocks?.[0]?.paragraph?.blocks?.[0]?.text?.text || "";
        } catch {
          existingText = "";
        }

        const newText = doc.content.body;

        const normalizedExisting = normalize(existingText);
        const normalizedNew = normalize(newText);

        console.log("🔍 Compare:");
        console.log("Existing:", normalizedExisting);
        console.log("New     :", normalizedNew);

        if (normalizedExisting === normalizedNew) {
          console.log("⏭️ No changes → SKIP ✅");
          continue;
        }

        console.log("✏️ Change detected → updating");

        // ✅ UPDATE
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

        // ✅ PUBLISH
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

    console.log("\n✅ DONE - PERFECT SYNC");

  } catch (err) {
    console.error("❌ Fatal error:", err);
  }
}

main();
