import { fetchArticles } from "../adapters/source/customkb/fetchArticles";

export default async function customkbConfigurer() {

  const articles = await fetchArticles();

  return articles.map(article => ({
    externalId: article.id,
    title: article.title,
    content: {
      body: article.content
    }
  }));
}
