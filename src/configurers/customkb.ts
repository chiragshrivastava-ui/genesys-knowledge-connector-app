import { pipe } from "../pipe";
import { fetchArticles } from "../adapters/source/customkb/fetchArticles";

export default function customkbConfigurer() {

  pipe.addStep(async (context: any) => {

    const articles = await fetchArticles();

    const docs = articles.map(article => ({
      externalId: article.id,
      title: article.title,
      content: {
        body: article.content
      }
    }));

    context.documents = docs;

    return context;
  });
}
