import { NextResponse } from "next/server";
import { z } from "zod";

export function validateBody<S extends z.ZodType>(
  body: unknown,
  schema: S,
): z.infer<S> | NextResponse<{ error: string }> {
  const result = schema.safeParse(body);
  if (!result.success) {
    const message = result.error.issues
      .map((i) => `${i.path.join(".") || "root"}: ${i.message}`)
      .join("; ");
    return NextResponse.json({ error: message }, { status: 400 });
  }
  return result.data;
}

export function validateParams<S extends z.ZodType>(
  params: Record<string, string | undefined>,
  schema: S,
): z.infer<S> | NextResponse<{ error: string }> {
  const result = schema.safeParse(params);
  if (!result.success) {
    const message = result.error.issues
      .map((i) => `${i.path.join(".") || "root"}: ${i.message}`)
      .join("; ");
    return NextResponse.json({ error: message }, { status: 400 });
  }
  return result.data;
}
