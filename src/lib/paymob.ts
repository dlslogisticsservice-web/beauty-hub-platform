// Client-side Paymob helpers have been removed.
// All Paymob API calls now run server-side in `src/lib/paymob.functions.ts`
// so that the merchant API key is never bundled into the browser.
//
// This stub remains only to preserve imports during transition; nothing here
// touches secrets. Whether payment is configured is determined by the server.
export {};
