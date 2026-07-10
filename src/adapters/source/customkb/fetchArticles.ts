import fs from "fs";
import path from "path";

export async function fetchArticles() {
  const dir = path.join(process.cwd(), "knowledge_articles");

  const files = fs.readdirSync(dir).filter(file => file.endsWith(".md"));

  return files.map(file => {
    const content = fs.readFileSync(
      path.join(dir, file),
      "utf-8"
    );

    const lines = content.split(/\r?\n/);

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

    const titleIndex = lines.findIndex(line =>
      line.trim().startsWith("TITLE:")
    );

    const body =
      titleIndex !== -1
        ? lines.slice(titleIndex + 1).join("\n").trim()
        : "";

    return {
      externalId,
      title,
      content: {
        body
      }
    };
  });
}
