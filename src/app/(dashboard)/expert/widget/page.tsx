"use client";

import { useState, useEffect } from "react";
import {
  Code,
  Copy,
  Check,
  X,
  MessageSquare,
  Globe,
  Palette,
  Sparkles,
  Eye,
  Zap,
  Shield,
  Plus,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PageTransition,
  FadeIn,
  StaggerContainer,
  StaggerItem,
  motion,
  AnimatePresence,
} from "@/components/ui/motion";

interface WidgetConfig {
  id: string;
  isEnabled: boolean;
  apiKey: string;
  primaryColor: string;
  position: string;
  greeting: string | null;
  freeQuestions: number;
  allowedDomains: string[];
  embedCode: string;
}

export default function ExpertWidgetPage() {
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [domainInput, setDomainInput] = useState("");

  // Form state
  const [isEnabled, setIsEnabled] = useState(true);
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
  const [position, setPosition] = useState("bottom-right");
  const [greeting, setGreeting] = useState("");
  const [freeQuestions, setFreeQuestions] = useState(2);
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch("/api/expert/widget");
        if (res.ok) {
          const data: WidgetConfig = await res.json();
          setConfig(data);
          setIsEnabled(data.isEnabled);
          setPrimaryColor(data.primaryColor);
          setPosition(data.position);
          setGreeting(data.greeting || "");
          setFreeQuestions(data.freeQuestions);
          setAllowedDomains(data.allowedDomains || []);
        }
      } catch {
        // Failed to load config
      } finally {
        setIsLoading(false);
      }
    }
    fetchConfig();
  }, []);

  async function handleSave() {
    setIsSaving(true);
    try {
      const res = await fetch("/api/expert/widget", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isEnabled,
          primaryColor,
          position,
          greeting,
          freeQuestions,
          allowedDomains,
        }),
      });
      if (res.ok) {
        const data: WidgetConfig = await res.json();
        setConfig(data);
      }
    } catch {
      // Failed to save
    } finally {
      setIsSaving(false);
    }
  }

  function handleAddDomain() {
    const domain = domainInput.trim().toLowerCase();
    if (domain && !allowedDomains.includes(domain)) {
      setAllowedDomains([...allowedDomains, domain]);
      setDomainInput("");
    }
  }

  function handleRemoveDomain(domain: string) {
    setAllowedDomains(allowedDomains.filter((d) => d !== domain));
  }

  function handleCopyEmbed() {
    if (config?.embedCode) {
      navigator.clipboard.writeText(config.embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Header */}
        <FadeIn delay={0.05}>
          <div className="relative overflow-hidden rounded-2xl border border-blue-200/60 bg-gradient-to-br from-blue-50 via-blue-50/80 to-blue-50/60 px-6 py-6 sm:px-8">
            <div className="relative flex items-center gap-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#1E40AF] shadow-lg shadow-blue-700/25">
                <Code className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                  Embed Widget
                </h2>
                <p className="mt-0.5 text-sm text-blue-700/70">
                  Add your AI Twin to any website with a single code snippet
                </p>
              </div>
            </div>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <StaggerContainer className="lg:col-span-2 space-y-6">
            {/* Status Toggle */}
            <StaggerItem>
              <Card className="relative overflow-hidden border-0 shadow-sm ring-1 ring-gray-200/60">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent pointer-events-none" />
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                      <Zap className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Widget Status</CardTitle>
                      <CardDescription className="text-xs">
                        Enable or disable the widget on external websites
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <button
                      role="switch"
                      aria-checked={isEnabled}
                      onClick={() => setIsEnabled(!isEnabled)}
                      className={`
                        relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full
                        transition-colors duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2
                        focus-visible:ring-blue-600 focus-visible:ring-offset-2
                        ${isEnabled ? "bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-inner" : "bg-gray-200"}
                      `}
                    >
                      <motion.span
                        layout
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className={`
                          pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0
                          ${isEnabled ? "translate-x-6" : "translate-x-1"}
                        `}
                      />
                    </button>
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          isEnabled
                            ? "bg-emerald-500 shadow-sm shadow-emerald-500/50"
                            : "bg-gray-300"
                        }`}
                      />
                      <Label className={`text-sm font-medium ${isEnabled ? "text-emerald-700" : "text-gray-500"}`}>
                        {isEnabled ? "Live" : "Disabled"}
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>

            {/* Appearance */}
            <StaggerItem>
              <Card className="relative overflow-hidden border-0 shadow-sm ring-1 ring-gray-200/60">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent pointer-events-none" />
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                      <Palette className="h-4 w-4 text-blue-700" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Appearance</CardTitle>
                      <CardDescription className="text-xs">
                        Customize how the widget looks on your website
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor" className="text-sm font-medium">
                      Primary Color
                    </Label>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Input
                          id="primaryColor"
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="h-10 w-14 cursor-pointer rounded-lg border-2 border-gray-200 p-1 transition-all hover:border-blue-300"
                        />
                      </div>
                      <Input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-32 font-mono text-sm"
                        placeholder="#6366f1"
                      />
                      <div
                        className="h-10 w-10 rounded-lg shadow-inner ring-1 ring-black/5"
                        style={{ backgroundColor: primaryColor }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position" className="text-sm font-medium">
                      Position
                    </Label>
                    <Select value={position} onValueChange={setPosition}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bottom-right">Bottom Right</SelectItem>
                        <SelectItem value="bottom-left">Bottom Left</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>

            {/* Greeting */}
            <StaggerItem>
              <Card className="relative overflow-hidden border-0 shadow-sm ring-1 ring-gray-200/60">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent pointer-events-none" />
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                      <Sparkles className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Greeting Message</CardTitle>
                      <CardDescription className="text-xs">
                        The first message visitors see when they open the widget
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={greeting}
                    onChange={(e) => setGreeting(e.target.value)}
                    placeholder="Hello! Ask me anything about my expertise."
                    rows={3}
                    className="resize-none transition-all focus:ring-2 focus:ring-blue-600/20"
                  />
                </CardContent>
              </Card>
            </StaggerItem>

            {/* Free Questions */}
            <StaggerItem>
              <Card className="relative overflow-hidden border-0 shadow-sm ring-1 ring-gray-200/60">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent pointer-events-none" />
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                      <MessageSquare className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Free Questions</CardTitle>
                      <CardDescription className="text-xs">
                        How many free questions each visitor can ask before being
                        prompted to subscribe
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      value={freeQuestions}
                      onChange={(e) =>
                        setFreeQuestions(parseInt(e.target.value) || 0)
                      }
                      min={0}
                      max={100}
                      className="w-28 text-center font-medium"
                    />
                    <span className="text-sm text-muted-foreground">
                      questions per visitor
                    </span>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>

            {/* Allowed Domains */}
            <StaggerItem>
              <Card className="relative overflow-hidden border-0 shadow-sm ring-1 ring-gray-200/60">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent pointer-events-none" />
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50">
                      <Shield className="h-4 w-4 text-rose-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Allowed Domains</CardTitle>
                      <CardDescription className="text-xs">
                        Restrict which domains can embed your widget. Leave empty
                        to allow all domains.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={domainInput}
                        onChange={(e) => setDomainInput(e.target.value)}
                        placeholder="example.com"
                        className="pl-9"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddDomain();
                          }
                        }}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddDomain}
                      className="cursor-pointer gap-1.5 border-blue-200 text-blue-800 hover:bg-blue-50 transition-all duration-200"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  </div>
                  <AnimatePresence>
                    {allowedDomains.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex flex-wrap gap-2"
                      >
                        {allowedDomains.map((domain) => (
                          <motion.div
                            key={domain}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Badge
                              variant="secondary"
                              className="gap-1.5 rounded-full border border-blue-200/60 bg-blue-50 px-3 py-1 text-blue-800 hover:bg-blue-100"
                            >
                              <Globe className="h-3 w-3" />
                              {domain}
                              <button
                                onClick={() => handleRemoveDomain(domain)}
                                className="ml-0.5 rounded-full p-0.5 cursor-pointer transition-colors duration-200 hover:bg-blue-200 hover:text-blue-900"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {allowedDomains.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">
                      No domain restrictions -- widget can be embedded anywhere
                    </p>
                  )}
                </CardContent>
              </Card>
            </StaggerItem>

            {/* Embed Code */}
            {config && (
              <StaggerItem>
                <Card className="relative overflow-hidden border-0 shadow-sm ring-1 ring-gray-200/60">
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent pointer-events-none" />
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                        <Code className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Embed Code</CardTitle>
                        <CardDescription className="text-xs">
                          Copy and paste this code into your website&apos;s HTML
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="group relative">
                      <pre className="rounded-xl border border-gray-200/80 bg-gradient-to-br from-gray-50 to-gray-100/80 p-4 text-sm leading-relaxed overflow-x-auto font-mono text-gray-700">
                        <code>{config.embedCode}</code>
                      </pre>
                      <motion.div
                        className="absolute right-3 top-3"
                        whileTap={{ scale: 0.9 }}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopyEmbed}
                          className={`gap-1.5 transition-all duration-300 ${
                            copied
                              ? "border-emerald-300 bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-500/10"
                              : "border-gray-200 bg-white/80  hover:border-blue-300 hover:bg-blue-50"
                          }`}
                        >
                          <AnimatePresence mode="wait">
                            {copied ? (
                              <motion.span
                                key="check"
                                initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
                                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                transition={{ duration: 0.25 }}
                                className="flex items-center gap-1"
                              >
                                <Check className="h-3.5 w-3.5" />
                                Copied!
                              </motion.span>
                            ) : (
                              <motion.span
                                key="copy"
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                transition={{ duration: 0.25 }}
                                className="flex items-center gap-1"
                              >
                                <Copy className="h-3.5 w-3.5" />
                                Copy
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </Button>
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            )}

            {/* Save Button */}
            <StaggerItem>
              <FadeIn delay={0.3}>
                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="cursor-pointer w-full bg-[#1E40AF] py-5 text-sm font-semibold shadow-lg shadow-blue-700/25 transition-all duration-200 hover:bg-[#1e3a8a] hover:shadow-xl sm:w-auto sm:px-8"
                  >
                    {isSaving ? (
                      <span className="flex items-center gap-2">
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          className="inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                        />
                        Saving...
                      </span>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </motion.div>
              </FadeIn>
            </StaggerItem>
          </StaggerContainer>

          {/* Preview */}
          <div className="lg:col-span-1">
            <FadeIn delay={0.2} direction="right">
              <div className="sticky top-6">
                <Card className="overflow-hidden border-0 shadow-lg ring-1 ring-gray-200/60">
                  <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-50/50 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                        <Eye className="h-4 w-4 text-blue-700" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Live Preview</CardTitle>
                        <CardDescription className="text-xs">
                          How the widget will appear
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    {/* Glassmorphism preview container */}
                    <div className="relative rounded-xl border border-white/20 bg-gradient-to-br from-slate-100/80 via-white/50 to-blue-50/40 p-1 shadow-inner ">
                      <div className="relative h-72 overflow-hidden rounded-lg bg-white/60">
                        {/* Simulated page background */}
                        <div className="p-4 space-y-2.5 opacity-40">
                          <div className="h-3 w-3/4 rounded-full bg-gray-300/60" />
                          <div className="h-3 w-1/2 rounded-full bg-gray-300/60" />
                          <div className="h-3 w-2/3 rounded-full bg-gray-300/60" />
                          <div className="h-14 w-full rounded-lg bg-gray-200/40 mt-3" />
                          <div className="h-3 w-3/4 rounded-full bg-gray-300/60" />
                          <div className="h-3 w-1/2 rounded-full bg-gray-300/60" />
                        </div>

                        {/* Widget bubble */}
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{
                            delay: 0.5,
                            type: "spring",
                            stiffness: 300,
                            damping: 20,
                          }}
                          className="absolute bottom-3 flex h-12 w-12 items-center justify-center rounded-full shadow-xl cursor-pointer"
                          style={{
                            background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`,
                            boxShadow: `0 4px 20px ${primaryColor}40`,
                            [position === "bottom-left" ? "left" : "right"]:
                              "12px",
                          }}
                        >
                          <MessageSquare className="h-5 w-5 text-white" />
                        </motion.div>
                      </div>
                    </div>

                    {/* Mini chat preview */}
                    <div className="mt-4 overflow-hidden rounded-xl border border-gray-200/80 shadow-sm">
                      <div
                        className="flex items-center gap-2 px-3 py-2.5 text-white text-xs font-medium"
                        style={{
                          background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)`,
                        }}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        AI Twin Chat
                      </div>
                      <div className="bg-white/80 p-3 ">
                        <div className="flex gap-2">
                          <div
                            className="h-6 w-6 shrink-0 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: `${primaryColor}20` }}
                          >
                            <Sparkles
                              className="h-3 w-3"
                              style={{ color: primaryColor }}
                            />
                          </div>
                          <div className="rounded-lg rounded-tl-none bg-gray-50 px-3 py-2 text-xs text-gray-600">
                            {greeting ||
                              "Hello! Ask me anything about my expertise."}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </FadeIn>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
