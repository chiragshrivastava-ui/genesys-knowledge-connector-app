import customkbConfigurer from "./configurers/customkb";

async function run() {
  try {
    console.log("🔄 Starting Knowledge Connector...");

    const documents = await customkbConfigurer();

    if (!documents || documents.length === 0) {
      console.log("⚠️ No documents found");
      return;
    }

    console.log(`✅ Documents fetched: ${documents.length}`);

    console.log("✅ POC run successful (no push yet)");
    
    // NOTE: For POC, we are just printing documents
    // Later connector logic will push to Genesys
    console.log(JSON.stringify(documents, null, 2));

  } catch (error) {
    console.error("❌ Error running connector:", error);
    process.exit(1);
  }
}

run();
``
