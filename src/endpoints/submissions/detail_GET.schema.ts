import { z } from "zod";
import superjson from "superjson";
import type { SubmissionDetail } from "../../helpers/pintasTypes";

export const schema = z.object({ id: z.number().int().positive() });

export type InputType = z.infer<typeof schema>;
export type OutputType = { submission: SubmissionDetail };

export const getSubmissionDetail = async (
  params: InputType,
  init?: RequestInit
): Promise<OutputType> => {
  const validated = schema.parse(params);
  const result = await fetch(`/_api/submissions/detail?id=${validated.id}`, {
    method: "GET",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};