import fs from "fs";
import path from "path";

export async function fetchArticles() {
  const dir = path.join(process.cwd(), "knowledge_articles");

  const files = fs.readdirSync(dir).filter(file => file.endsWith(".md"));

  return files.map(file => {
    const filePath = path.join(dir, file);
    const fileContent = fs.readFileSync(filePath, "utf-8");

    const lines = fileContent.split(/\r?\n/);

    let externalId = "";
    let title = "";

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith("ID:")) {
        externalId = trimmed.replace("ID:", "").trim();
      }

      if (trimmed.startsWith("TITLE:")) {
        title = trimmed.replace("TITLE:", "").trim();
      }
    }

    const titleIndex = lines.findIndex(l => l.startsWith("TITLE:"));

    const body =
      titleIndex !== -1
        ? lines.slice(titleIndex + 1).join("\n").trim()
        : "";

    return {
      externalId,
      title,
      content: {
        body,
      },
    };
  });
}
