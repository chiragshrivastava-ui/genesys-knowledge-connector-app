import fs from "fs";
import path from "path";

export async function fetchArticles() {
  const dir = path.join(process.cwd(), "knowledge_articles");

  const files = fs.readdirSync(dir).filter(file => file.endsWith(".md"));

  return files.map(file => {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, "utf-8");

    const lines = content.split(/\r?\n/);

    let id: string | null = null;
    let title: string | null = null;

    // ✅ Extract ID and TITLE
    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.toUpperCase().startsWith("ID:")) {
        id = trimmed.substring(3).trim();
      }

      if (trimmed.toUpperCase().startsWith("TITLE:")) {
        title = trimmed.substring(6).trim();
      }
    }

    // ✅ Extract body (everything after TITLE line)
    const bodyStartIndex = lines.findIndex(line =>
      line.trim().toUpperCase().startsWith("TITLE:")
    );

    const body =
      bodyStartIndex !== -1
        ? lines.slice(bodyStartIndex + 1).join("\n").trim()
        : "";

    const article = {
      id,
      title,
      
const htmlBody = body
  .replace(/^## (.*$)/gm, "<h2>$1</h2>")
  .replace(/^- (.*$)/gm, "<li>$1</li>")
  .replace(/\n/g, "<br>");

const article = {
  id,
  title,
  content: htmlBody   // ✅ IMPORTANT: plain string (not <pre>, not wrapped)
    };

    console.log("✅ PARSED ARTICLE:", JSON.stringify(article, null, 2));

    return article;
  });
}
``
