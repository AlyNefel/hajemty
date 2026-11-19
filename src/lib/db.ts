import mongoose from "mongoose";

/**
 * Serverless-safe Mongoose connection. The promise is cached on globalThis so hot reloads
 * and warm lambda invocations reuse a single pool.
 */
type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const g = globalThis as unknown as { __mongoose?: Cache };
const cache: Cache = g.__mongoose ?? (g.__mongoose = { conn: null, promise: null });

export const hasDatabase = () => Boolean(process.env.MONGODB_URI);

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  mongoose.set("strictQuery", true);
  mongoose.set("sanitizeFilter", true); // blocks operator injection like { $gt: "" } from user input
  cache.promise ??= mongoose.connect(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    appName: "hajemti-web",
  });
  cache.conn = await cache.promise;
  return cache.conn;
}
