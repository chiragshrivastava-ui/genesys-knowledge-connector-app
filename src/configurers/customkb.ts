import { pipe } from "../pipe.js";
import { fetchArticles } from "../adapters/source/customkb/fetchArticles.js";

export default function customkbConfigurer() {
  pipe.addStep(async (context) => {

    const articles = await fetchArticles();

    const transformed = articles.map(article => ({
      externalId: article.id,
      title: article.title,
      content: {
        body: article.content
      }
    }));

    context.documents = transformed;

    return context;
  });
}
