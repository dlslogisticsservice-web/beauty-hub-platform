import { handleError, jsonOk } from '../_helpers';

export default async function handler(req: any, res: any) {
  try {
    const configured = Boolean(process.env.PAYMOB_API_KEY && process.env.PAYMOB_IFRAME_ID);
    jsonOk(res, { configured });
  } catch (e) { handleError(res, e); }
}
