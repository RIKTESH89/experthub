"use client";

import { PublicExpertProfileView } from "@/components/public-studio/expert-profile-view";
import styles from "@/components/public-studio/reading.module.css";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface ExpertPublicProfile {
  id: string;
  name: string;
  image: string | null;
  bio: string | null;
  headline: string | null;
  displayName: string;
  specialty: string[];
  socialLinks: { twitter?: string; linkedin?: string; website?: string } | null;
  monthlyPrice: number;
  isVerified: boolean;
  subscriberCount: number;
  postCount: number;
  twinGreeting: string | null;
}

export default function PublicExpertProfilePage() {
  const params = useParams();
  const expertId = params.expertId as string;
  const [expert, setExpert] = useState<ExpertPublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchExpert() {
      try {
        const res = await fetch(`/api/public/experts/${expertId}`);
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        setExpert(await res.json());
      } catch {
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    }
    fetchExpert();
  }, [expertId]);

  if (isLoading) {
    return (
      <div className={`${styles.page} ${styles.profile}`}>
        <div className="mx-auto max-w-2xl px-4 py-16">
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !expert) {
    return (
      <div className={`${styles.page} ${styles.state}`}>
        <div className="text-center">
          <h1 className="text-2xl font-bold">Expert Not Found</h1>
          <p className="mt-2 text-muted-foreground">This profile doesn&apos;t exist or has been removed.</p>
          <Button className="mt-6" asChild>
            <Link href="/">Go to ExpertHub</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <PublicExpertProfileView expert={expert} />;
}
