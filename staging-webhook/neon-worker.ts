import {neonWorkerAdapter} from './host';
// Deploy this entry ONLY behind Neon edge, whose X-Neon-* stripping is the trust boundary.
export default neonWorkerAdapter();
