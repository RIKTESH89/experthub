// Public descriptions shared by the landing and pricing pages. No commercial guarantees.
export const publicPricingTiers = [
  {
    name: "Free access",
    price: "Free",
    description: "Explore public content and available free expert plans",
    features: ["Browse expert profiles", "Read public posts", "Expert-specific trial question allowance without an active subscription", "Available free plans vary by expert"],
    cta: "Explore Experts",
    popular: false,
    href: "/login",
    period: undefined,
  },
  {
    name: "Paid access",
    price: "Varies",
    period: "per expert",
    description: "Review the expert’s plan and checkout amount",
    features: ["Expert-configured paid plan price", "Plan-dependent access to exclusive content", "AI conversations with available source references", "Paid access requires verified payment confirmation"],
    cta: "View Expert Plans",
    popular: true,
    href: "/login",
  },
  {
    name: "For experts",
    price: "Apply",
    description: "Submit an application for review",
    features: ["Provide content and AI voice settings", "Manage a knowledge base", "Configure available subscription plans", "Review subscriber and engagement information"],
    cta: "Apply as Expert",
    href: "/#apply-expert",
    popular: false,
    period: undefined,
  },
];
