import { defineCollection, z } from "astro:content";

const blog = defineCollection({
    // Type-check frontmatter using a schema
    schema: z.object({
        title: z.string(),
        description: z.string(),
        pubDate: z.coerce.date(),
        updatedDate: z.coerce.date().optional(),
        coverImageCredit: z.string().optional(),
        coverImage: z.string().optional(),
        category: z.enum(["algorithm", "low-level-system", "software-design"]),
    }),
});

export const collections = { blog };
