"use client";
import { Lock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TrialPaywallProps {
  isOpen: boolean;
  onClose: () => void;
  expertName: string;
  expertId: string;
  questionsUsed: number;
  questionsAllowed: number;
}

export function TrialPaywall({
  isOpen,
  onClose,
  expertName,
  expertId,
  questionsUsed,
  questionsAllowed,
}: TrialPaywallProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Free Trial Ended</DialogTitle>
          <DialogDescription className="text-center">
            You&apos;ve used all {questionsAllowed} free questions with {expertName}&apos;s Digital Twin. Subscribe to continue the conversation with unlimited access.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{questionsUsed}</span> of{" "}
            <span className="font-medium text-foreground">{questionsAllowed}</span> free questions used
          </div>
          <Button className="w-full" asChild>
            <a href={`/subscriber/experts/${expertId}`}>
              <Zap className="mr-2 h-4 w-4" />
              Subscribe Now
            </a>
          </Button>
          <Button variant="ghost" className="w-full" onClick={onClose}>
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
