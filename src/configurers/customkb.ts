import { pipe } from "../pipe";
import { fetchArticles } from "../adapters/source/customkb/fetchArticles.ts";

export default function customkbConfigurer() {
  pipe.addStep(async (context: any) => {

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
