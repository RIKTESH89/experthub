import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";

export function GoogleRecovery({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="space-y-3 text-center">
        <h1 className="text-xl">Sign in with Google</h1>
        <CardDescription>
          Your Google account handles sign-in. You don&apos;t need an ExpertHub password.
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button asChild className="w-full"><Link href="/login">Back to Sign In</Link></Button>
      </CardFooter>
    </Card>
  );
}
