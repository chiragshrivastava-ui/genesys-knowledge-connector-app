import { fetchArticles } from "../adapters/source/customkb/fetchArticles";

export default async function customkbConfigurer() {
  const articles = await fetchArticles();

  return articles.map((article) => ({
    externalId: article.externalId,   // ✅ FIXED
    title: article.title,
    content: {
      body: article.content.body
    }
  }));
}
