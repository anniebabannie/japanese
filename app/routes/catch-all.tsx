export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Check if this is a Chrome DevTools request
  const isDevToolsRequest = 
    pathname.includes('chrome-devtools') ||
    pathname.includes('devtools') ||
    pathname.includes('inspector') ||
    pathname.includes('extension') ||
    pathname.includes('favicon') ||
    pathname.includes('.ico') ||
    pathname.includes('.png') ||
    pathname.includes('.svg') ||
    pathname.includes('.css') ||
    pathname.includes('.js') ||
    pathname.includes('__webpack_hmr') ||
    pathname.includes('hot-update') ||
    pathname.includes('sockjs-node') ||
    pathname.includes('ws') ||
    pathname.includes('websocket');
  
  if (isDevToolsRequest) {
    // Return a silent 404 for DevTools requests
    return new Response(null, { status: 404 });
  }
  
  // For other 404s, just return a 404 without logging
  return new Response(null, { status: 404 });
} 