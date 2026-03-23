import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create Admin
  const adminPassword = await hash("admin123456", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@experthub.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@experthub.com",
      hashedPassword: adminPassword,
      role: "ADMIN",
      bio: "Platform administrator",
      headline: "ExpertHub Administrator",
    },
  });
  console.log(`Created admin: ${admin.email}`);

  // Create Experts
  const expertPassword = await hash("expert123456", 12);

  const expert1 = await prisma.user.upsert({
    where: { email: "sarah@experthub.com" },
    update: {},
    create: {
      name: "Dr. Sarah Chen",
      email: "sarah@experthub.com",
      hashedPassword: expertPassword,
      role: "EXPERT",
      bio: "AI researcher with 15 years of experience in machine learning and natural language processing. Published over 50 papers in top-tier conferences.",
      headline: "AI & Machine Learning Researcher",
      expertProfile: {
        create: {
          displayName: "Dr. Sarah Chen",
          specialty: ["Artificial Intelligence", "Machine Learning", "NLP", "Deep Learning"],
          monthlyPrice: 19.99,
          isVerified: true,
          totalSubscribers: 245,
          vectorNamespace: "expert_sarah_chen",
          twinPersonality: "I am Dr. Sarah Chen, an AI researcher. I explain complex AI concepts in accessible terms while maintaining scientific accuracy.",
          twinGreeting: "Hello! I'm Sarah's Digital Twin. I can help you understand AI, machine learning, and NLP concepts. What would you like to learn about?",
          socialLinks: {
            twitter: "https://twitter.com/drsarahchen",
            linkedin: "https://linkedin.com/in/sarahchen",
            website: "https://sarahchen.ai",
          },
        },
      },
    },
  });

  const expert2 = await prisma.user.upsert({
    where: { email: "marcus@experthub.com" },
    update: {},
    create: {
      name: "Marcus Johnson",
      email: "marcus@experthub.com",
      hashedPassword: expertPassword,
      role: "EXPERT",
      bio: "Startup founder and venture capital advisor. Built 3 successful SaaS companies. Angel investor in 20+ startups.",
      headline: "Serial Entrepreneur & VC Advisor",
      expertProfile: {
        create: {
          displayName: "Marcus Johnson",
          specialty: ["Entrepreneurship", "Venture Capital", "SaaS", "Startups"],
          monthlyPrice: 29.99,
          isVerified: true,
          totalSubscribers: 189,
          vectorNamespace: "expert_marcus_johnson",
          twinPersonality: "I am Marcus Johnson, a serial entrepreneur. I give practical, no-nonsense business advice based on real experience building companies.",
          twinGreeting: "Hey there! I'm Marcus's Digital Twin. Ask me about startups, fundraising, scaling SaaS, or anything entrepreneurship-related!",
          socialLinks: {
            twitter: "https://twitter.com/marcusjohnson",
            linkedin: "https://linkedin.com/in/marcusjohnson",
          },
        },
      },
    },
  });

  const expert3 = await prisma.user.upsert({
    where: { email: "elena@experthub.com" },
    update: {},
    create: {
      name: "Elena Rodriguez",
      email: "elena@experthub.com",
      hashedPassword: expertPassword,
      role: "EXPERT",
      bio: "Neuroscience professor and bestselling author. Specializing in cognitive psychology and behavioral science.",
      headline: "Neuroscientist & Author",
      expertProfile: {
        create: {
          displayName: "Elena Rodriguez",
          specialty: ["Neuroscience", "Psychology", "Behavioral Science", "Productivity"],
          monthlyPrice: 14.99,
          isVerified: true,
          totalSubscribers: 312,
          vectorNamespace: "expert_elena_rodriguez",
          twinPersonality: "I am Elena Rodriguez, a neuroscientist. I bridge the gap between brain science and practical applications for everyday life.",
          twinGreeting: "Hi! I'm Elena's Digital Twin. I love discussing how the brain works and how you can use neuroscience to improve your life. What's on your mind?",
          socialLinks: {
            twitter: "https://twitter.com/elenarodriguez",
            website: "https://elenarodriguez.com",
          },
        },
      },
    },
  });

  const expert4 = await prisma.user.upsert({
    where: { email: "james@experthub.com" },
    update: {},
    create: {
      name: "James Park",
      email: "james@experthub.com",
      hashedPassword: expertPassword,
      role: "EXPERT",
      bio: "Full-stack developer and open-source contributor. 10+ years building scalable web applications. Core contributor to several popular frameworks.",
      headline: "Full-Stack Developer & Open Source Advocate",
      expertProfile: {
        create: {
          displayName: "James Park",
          specialty: ["Web Development", "React", "Node.js", "System Design", "TypeScript"],
          monthlyPrice: 12.99,
          isVerified: false,
          totalSubscribers: 156,
          vectorNamespace: "expert_james_park",
          twinPersonality: "I am James Park, a full-stack developer. I give practical coding advice with real-world examples and best practices.",
          twinGreeting: "Hey! I'm James's Digital Twin. I can help with web development, React, Node.js, system design, or any coding questions!",
          socialLinks: {
            twitter: "https://twitter.com/jamespark",
            linkedin: "https://linkedin.com/in/jamespark",
          },
        },
      },
    },
  });

  // Create Subscribers
  const subscriberPassword = await hash("subscriber123", 12);

  const subscriber1 = await prisma.user.upsert({
    where: { email: "alex@example.com" },
    update: {},
    create: {
      name: "Alex Thompson",
      email: "alex@example.com",
      hashedPassword: subscriberPassword,
      role: "SUBSCRIBER",
      bio: "Software engineering student passionate about AI and web development.",
      headline: "CS Student",
    },
  });

  const subscriber2 = await prisma.user.upsert({
    where: { email: "maya@example.com" },
    update: {},
    create: {
      name: "Maya Patel",
      email: "maya@example.com",
      hashedPassword: subscriberPassword,
      role: "SUBSCRIBER",
      bio: "Product manager at a tech startup. Always learning.",
      headline: "Product Manager",
    },
  });

  // Create Tags
  const tags = await Promise.all(
    [
      "Artificial Intelligence",
      "Machine Learning",
      "Startups",
      "Entrepreneurship",
      "Web Development",
      "React",
      "Node.js",
      "Neuroscience",
      "Productivity",
      "Psychology",
      "Deep Learning",
      "SaaS",
      "Leadership",
      "TypeScript",
      "System Design",
    ].map((name) =>
      prisma.tag.upsert({
        where: { slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-") },
        update: {},
        create: {
          name,
          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          postCount: 0,
        },
      })
    )
  );

  // Create Posts for experts
  const aiTag = tags.find((t) => t.name === "Artificial Intelligence")!;
  const mlTag = tags.find((t) => t.name === "Machine Learning")!;
  const startupTag = tags.find((t) => t.name === "Startups")!;
  const saasTag = tags.find((t) => t.name === "SaaS")!;
  const webDevTag = tags.find((t) => t.name === "Web Development")!;
  const reactTag = tags.find((t) => t.name === "React")!;
  const neuroTag = tags.find((t) => t.name === "Neuroscience")!;
  const prodTag = tags.find((t) => t.name === "Productivity")!;

  // Expert 1 posts
  await prisma.post.create({
    data: {
      authorId: expert1.id,
      title: "The Future of Large Language Models",
      content:
        "Large Language Models (LLMs) have transformed the AI landscape in ways we couldn't have imagined just a few years ago. In this post, I want to share my thoughts on where this technology is headed.\n\n1. **Multimodal Understanding**: The next generation of LLMs will seamlessly process text, images, audio, and video. We're already seeing this with models that can understand and generate across modalities.\n\n2. **Reasoning and Planning**: Current models are getting better at multi-step reasoning. The gap between pattern matching and true understanding is narrowing.\n\n3. **Efficiency**: We'll see smaller, more efficient models that can run on edge devices while maintaining impressive capabilities.\n\n4. **Specialization**: Domain-specific models trained on curated datasets will outperform general-purpose models in their areas of expertise.\n\nThe key challenge remains alignment - ensuring these powerful systems remain helpful, harmless, and honest.",
      status: "PUBLISHED",
      isRagEnabled: true,
      viewCount: 1523,
      tags: {
        create: [
          { tag: { connect: { id: aiTag.id } } },
          { tag: { connect: { id: mlTag.id } } },
        ],
      },
    },
  });

  await prisma.post.create({
    data: {
      authorId: expert1.id,
      title: "Understanding Transformer Architecture",
      content:
        "The transformer architecture is the backbone of modern AI. Let me break it down into digestible concepts.\n\nAt its core, the transformer uses a mechanism called 'self-attention' that allows the model to weigh the importance of different parts of the input when processing each element.\n\nThink of it like reading a sentence - when you encounter the word 'it' in a sentence, your brain automatically connects it to what 'it' refers to. That's essentially what attention does.\n\nKey components:\n- **Embedding Layer**: Converts tokens to vectors\n- **Positional Encoding**: Adds position information\n- **Multi-Head Attention**: Multiple parallel attention computations\n- **Feed-Forward Networks**: Process attention outputs\n- **Layer Normalization**: Stabilizes training\n\nThis architecture enables parallelization during training, which is why transformers scale so well compared to RNNs.",
      status: "PUBLISHED",
      isRagEnabled: true,
      viewCount: 2341,
      tags: {
        create: [
          { tag: { connect: { id: aiTag.id } } },
          { tag: { connect: { id: mlTag.id } } },
        ],
      },
    },
  });

  // Expert 2 posts
  await prisma.post.create({
    data: {
      authorId: expert2.id,
      title: "10 Lessons from Building 3 SaaS Companies",
      content:
        "After building and scaling three SaaS companies, here are the lessons I wish I knew on day one:\n\n1. **Revenue first, features second** - Don't build features no one asked for. Talk to customers daily.\n\n2. **Hire slow, fire fast** - Your first 10 hires define your culture. Choose wisely.\n\n3. **Churn is a silent killer** - A 5% monthly churn rate means you lose half your customers every year.\n\n4. **Pricing is an art** - Most founders underprice by 3-5x. Test pricing aggressively.\n\n5. **Distribution > Product** - A great product with bad distribution loses to a good product with great distribution.\n\n6. **Cash is oxygen** - Always have 18 months of runway. Always.\n\n7. **Metrics that matter**: MRR, CAC, LTV, NPS. Everything else is vanity.\n\n8. **Build in public** - Transparency builds trust and creates organic marketing.\n\n9. **Founder market fit > Product market fit** - Build in a space you deeply understand.\n\n10. **Take care of yourself** - Burnout is real. The company can't succeed if you fail.",
      status: "PUBLISHED",
      isRagEnabled: true,
      viewCount: 3456,
      tags: {
        create: [
          { tag: { connect: { id: startupTag.id } } },
          { tag: { connect: { id: saasTag.id } } },
        ],
      },
    },
  });

  // Expert 3 posts
  await prisma.post.create({
    data: {
      authorId: expert3.id,
      title: "How Your Brain Learns: The Science of Neuroplasticity",
      content:
        "Your brain is constantly rewiring itself. This process, called neuroplasticity, is one of the most fascinating aspects of neuroscience.\n\nEvery time you learn something new, your neurons form new connections. The more you practice, the stronger these connections become - this is literally 'practice makes perfect' at the cellular level.\n\nKey insights from recent research:\n\n**Sleep is essential for learning** - During sleep, your brain replays and consolidates the day's experiences. Skipping sleep after learning something new can reduce retention by up to 40%.\n\n**Spaced repetition works** - Your brain retains information better when exposure is spread over time rather than crammed.\n\n**Exercise boosts brain function** - Physical activity increases BDNF (Brain-Derived Neurotrophic Factor), which promotes the growth of new neurons.\n\n**Stress impairs learning** - Chronic stress literally shrinks your hippocampus, the brain's learning center.\n\nThe practical takeaway? Learn in focused sessions, get enough sleep, exercise regularly, and manage your stress. Your brain will thank you.",
      status: "PUBLISHED",
      isRagEnabled: true,
      viewCount: 4567,
      tags: {
        create: [
          { tag: { connect: { id: neuroTag.id } } },
          { tag: { connect: { id: prodTag.id } } },
        ],
      },
    },
  });

  // Expert 4 posts
  await prisma.post.create({
    data: {
      authorId: expert4.id,
      title: "Modern React Patterns You Should Know in 2024",
      content:
        "React has evolved significantly. Here are the patterns that separate good React code from great React code:\n\n**1. Server Components**\nThe biggest paradigm shift. Components that run on the server, reducing client-side JavaScript. Use them for data fetching, heavy computations, and sensitive operations.\n\n**2. Compound Components**\nInstead of prop drilling, create related components that share implicit state:\n```jsx\n<Select>\n  <Select.Trigger />\n  <Select.Content>\n    <Select.Item value=\"1\">Option 1</Select.Item>\n  </Select.Content>\n</Select>\n```\n\n**3. Custom Hooks for Business Logic**\nExtract business logic into custom hooks. Your components should be thin - mostly rendering.\n\n**4. Suspense Boundaries**\nWrap async operations in Suspense for better loading states and error handling.\n\n**5. Optimistic Updates**\nUpdate the UI immediately, then sync with the server. This makes your app feel instant.\n\nThe key principle: components for UI, hooks for logic, server for data.",
      status: "PUBLISHED",
      isRagEnabled: true,
      viewCount: 2890,
      tags: {
        create: [
          { tag: { connect: { id: webDevTag.id } } },
          { tag: { connect: { id: reactTag.id } } },
        ],
      },
    },
  });

  // Create subscriptions
  const expertProfile1 = await prisma.expertProfile.findUnique({
    where: { userId: expert1.id },
  });
  const expertProfile2 = await prisma.expertProfile.findUnique({
    where: { userId: expert2.id },
  });

  if (expertProfile1) {
    await prisma.expertSubscription.upsert({
      where: {
        subscriberId_expertProfileId: {
          subscriberId: subscriber1.id,
          expertProfileId: expertProfile1.id,
        },
      },
      update: {},
      create: {
        subscriberId: subscriber1.id,
        expertProfileId: expertProfile1.id,
        status: "ACTIVE",
        price: expertProfile1.monthlyPrice,
      },
    });
  }

  if (expertProfile2) {
    await prisma.expertSubscription.upsert({
      where: {
        subscriberId_expertProfileId: {
          subscriberId: subscriber1.id,
          expertProfileId: expertProfile2.id,
        },
      },
      update: {},
      create: {
        subscriberId: subscriber1.id,
        expertProfileId: expertProfile2.id,
        status: "ACTIVE",
        price: expertProfile2.monthlyPrice,
      },
    });
  }

  // Update tag post counts
  for (const tag of tags) {
    const count = await prisma.postTag.count({
      where: { tagId: tag.id },
    });
    await prisma.tag.update({
      where: { id: tag.id },
      data: { postCount: count },
    });
  }

  console.log("Seeding completed!");
  console.log("\nTest Accounts:");
  console.log("─────────────────────────────────────");
  console.log("Admin:      admin@experthub.com / admin123456");
  console.log("Expert 1:   sarah@experthub.com / expert123456");
  console.log("Expert 2:   marcus@experthub.com / expert123456");
  console.log("Expert 3:   elena@experthub.com / expert123456");
  console.log("Expert 4:   james@experthub.com / expert123456");
  console.log("Subscriber: alex@example.com / subscriber123");
  console.log("Subscriber: maya@example.com / subscriber123");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
