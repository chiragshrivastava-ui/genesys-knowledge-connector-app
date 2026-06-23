import customkbConfigurer from "./configurers/customkb";

async function main() {
  try {
    console.log("🚀 Starting connector...");

    const documents = await customkbConfigurer();

    if (!documents || documents.length === 0) {
      console.log("⚠️ No articles found");
      return;
    }

    console.log(`✅ Documents fetched: ${documents.length}`);

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
