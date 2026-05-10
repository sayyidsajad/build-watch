import { NextRequest } from "next/server";

const requestTimeoutMs = 15_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "http://localhost:8082",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get("url");

  if (!target) {
    return new Response("Missing Jenkins API URL.", { status: 400, headers: corsHeaders });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(target);
  } catch {
    return new Response("Invalid Jenkins API URL.", { status: 400, headers: corsHeaders });
  }

  if (!["http:", "https:"].includes(targetUrl.protocol)) {
    return new Response("Only HTTP and HTTPS Jenkins URLs are supported.", { status: 400, headers: corsHeaders });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const headers: HeadersInit = { Accept: "application/json" };
    const authorization = request.headers.get("authorization");
    if (authorization) headers.Authorization = authorization;

    const response = await fetch(targetUrl, { headers, signal: controller.signal });
    const body = await response.arrayBuffer();

    return new Response(body, {
      status: response.status,
      headers: {
        ...corsHeaders,
        "content-type": response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "AbortError";
    return new Response(isTimeout ? "Jenkins request timed out." : "Jenkins proxy request failed.", {
      status: isTimeout ? 504 : 502,
      headers: corsHeaders,
    });
  } finally {
    clearTimeout(timeout);
  }
}
