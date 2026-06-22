import { pipe } from "../pipe.js";
import { fetchArticles } from "../adapters/source/customkb/fetchArticles.js";
import { transformToGenesysFormat } from "../processors/transformToGenesysFormat.js";

export default function customkbConfigurer() {
  pipe.addStep(async (context) => {
    // STEP 1: Fetch articles from Git repo
    const articles = await fetchArticles();

    // STEP 2: Transform them to Genesys format
    const transformed = articles.map(article =>
      transformToGenesysFormat(article)
    );

    // Attach to pipeline context
    context.documents = transformed;

    return context;
  });
}
