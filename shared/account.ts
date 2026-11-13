import { z } from 'zod';
export const accountCsrfSchema = z.object({ csrfToken: z.string().min(1).max(256) });
export const accountStatusSchema = z
  .object({
    enabled: z.boolean(),
    origin: z
      .url()
      .nullable()
      .refine((value) => {
        if (value === null) return true;
        const url = new URL(value);
        return (
          !url.username &&
          !url.password &&
          !url.search &&
          !url.hash &&
          url.pathname === '/' &&
          (url.protocol === 'https:' ||
            (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))
        );
      }),
  })
  .refine((value) => !value.enabled || value.origin !== null);
export const profileEditSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3)
      .max(30)
      .regex(/^[a-zA-Z0-9_]+$/),
    displayName: z.string().trim().min(1).max(80),
  })
  .strict();
export const accountSessionSchema = z.object({
  user: z.object({
    id: z.string().min(1),
    username: z.string(),
    name: z.string().nullable(),
    email: z.email(),
  }),
  expires: z.iso.datetime({ offset: true }),
});
export type AccountSession = z.infer<typeof accountSessionSchema>;
