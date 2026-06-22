import fs from "fs";
import path from "path";

export async function fetchArticles() {
  const dir = path.join(process.cwd(), "knowledge_articles");

  const files = fs.readdirSync(dir);

  return files.map(file => {
    const content = fs.readFileSync(path.join(dir, file), "utf-8");
    return JSON.parse(content);
  });
}
