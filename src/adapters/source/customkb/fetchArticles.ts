import fs from "fs";
import path from "path";

export async function fetchArticles() {
  const dir = path.join(process.cwd(), "knowledge_articles");

  // ✅ Only read .md files now
  const files = fs.readdirSync(dir).filter(file => file.endsWith(".md"));

  return files.map(file => {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, "utf-8");

    // ✅ Extract ID
    const idMatch = content.match(/ID:\s*(.*)/);

    // ✅ Extract TITLE
    const titleMatch = content.match(/TITLE:\s*(.+)/i);

    const id = idMatch ? idMatch[1].trim() : file;
    const title = titleMatch ? titleMatch[1].trim() : file;

    // ✅ Remove metadata (ID + TITLE) to get body
    const body = content
      .replace(/ID:.*\n/, "")
      .replace(/TITLE:.*\n/, "")
      .trim();

    return {
      id,
      title,
      content: `<p>${body}</p>`   // ✅ convert to HTML
    };
  });
}
