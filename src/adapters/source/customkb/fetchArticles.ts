import fs from "fs";
import path from "path";

export async function fetchArticles() {
  const dir = path.join(process.cwd(), "knowledge_articles");

  const files = fs.readdirSync(dir).filter(file => file.endsWith(".md"));

  return files.map(file => {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, "utf-8");

    const lines = content.split(/\r?\n/);

    let externalId: string | null = null;
    let title: string | null = null;

    // ✅ SAFE parsing
    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.toUpperCase().startsWith("ID:")) {
        externalId = trimmed.split(":")[1]?.trim();
      }

      if (trimmed.toUpperCase().startsWith("TITLE:")) {
        title = trimmed.split(":").slice(1).join(":").trim();
      }
    }

    const bodyStartIndex = lines.findIndex(line =>
      line.trim().toUpperCase().startsWith("TITLE:")
    );

    const body =
      bodyStartIndex !== -1
        ? lines.slice(bodyStartIndex + 1).join("\n").trim()
        : "";

    if (!title) {
      console.error(`❌ Missing TITLE in file: ${file}`);
    }

    return {
      externalId,
      title,
      content: {
        body,
      },
    };
  });
}
