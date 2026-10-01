import { NextRequest, NextResponse } from "next/server";

// Password registration is retired. Google establishes identity; admin approval establishes expert role.
export async function POST(_request: NextRequest) {
  void _request;
  return NextResponse.json({ message: "Sign in with Google. To become an expert, submit an application.", code: "REGISTRATION_RETIRED" }, { status: 410 });
}
