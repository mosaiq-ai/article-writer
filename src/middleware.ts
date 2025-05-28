import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Handle browser extension requests silently
  if (pathname === "/.identity" || pathname === "/current-url") {
    // Return empty response to browser extensions
    return new NextResponse(null, { status: 204 })
  }

  // Continue with normal request processing
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/.identity",
    "/current-url",
    // Don't run middleware on static files
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
