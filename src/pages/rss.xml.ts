import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { siteMetadata } from "@/data/siteMetadata";

export async function GET(context: any) {
  const posts = (await getCollection("blog"))
    .filter((post) => !post.data.draft)
    .sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf());

  return rss({
    title: siteMetadata.title,
    description: siteMetadata.description,
    site: context.site || siteMetadata.siteUrl,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.publishedAt,
      description: post.data.summary,
      link: `/blog/${post.id}/`,
    })),
  });
}
