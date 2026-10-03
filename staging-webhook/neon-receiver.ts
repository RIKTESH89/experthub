import {waitUntil} from '@neon/functions';
import {receiverAdapter} from './host';
// Default export is Neon's native fetch handler. All operations remain disabled by env.
const handler=receiverAdapter({waitUntil});
export default handler;
