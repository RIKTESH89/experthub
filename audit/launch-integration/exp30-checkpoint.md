# EXP30 integration review

Source 08b5064ccca67bdcf13c9dea9ac5b1e0f8aca11c cherry-picked with provenance as 9a153a5. Copy/accessibility changes retain auth/payment/source behavior. Policies remain unrouted review drafts, with unresolved owner decisions.

Integration correction: public indexing requires explicit VERCEL_ENV=production, avoiding local NODE_ENV=production indexing. Literal IP, .local/.internal and nonstandard-port origins remain noindex. This validator checks configured origin syntax, not DNS trust; operator must confirm production domain.

Explicit SEO change requiring release review: root default noindex/nofollow now also covers public /e/[expertId], /posts/[postId], /shared/[shareId], which have no robots opt-in. Home/about/pricing alone opt in. Do not treat this as preservation of all prior public-route SEO. Shared conversation indexing must not be enabled without privacy/product approval; expert/post indexing can be separately reviewed with visibility-aware canonical metadata. Auth/dashboard/embed/offline routes safely remain noindex.
