import { previewCanonicalOrigin } from "@/lib/preview-isolation";
export const siteConfig = {
  name: "ExpertHub",
  description: "Connect with experts, access digital twins, and learn from the best minds.",
  url: previewCanonicalOrigin() || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
};
