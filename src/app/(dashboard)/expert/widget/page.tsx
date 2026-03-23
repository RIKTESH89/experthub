"use client";

import { useState, useEffect } from "react";
import { Code, Copy, Check, X, MessageSquare } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="hidden sm:block h-16 w-auto shrink-0">
          {/* Browser window */}
          <rect x="10" y="10" width="120" height="80" rx="6" fill="#f5f3ff" stroke="#6366f1" strokeWidth="2"/>
          {/* Browser title bar */}
          <rect x="10" y="10" width="120" height="16" rx="6" fill="#e0e7ff"/>
          <rect x="10" y="20" width="120" height="6" fill="#e0e7ff"/>
          {/* Title bar dots */}
          <circle cx="22" cy="18" r="2.5" fill="#ddd6fe"/>
          <circle cx="30" cy="18" r="2.5" fill="#ddd6fe"/>
          <circle cx="38" cy="18" r="2.5" fill="#ddd6fe"/>
          {/* URL bar */}
          <rect x="48" y="14" width="72" height="8" rx="2" fill="#f5f3ff"/>
          {/* Page content lines */}
          <line x1="18" y1="36" x2="80" y2="36" stroke="#ede9fe" strokeWidth="2" strokeLinecap="round"/>
          <line x1="18" y1="44" x2="65" y2="44" stroke="#ede9fe" strokeWidth="2" strokeLinecap="round"/>
          <line x1="18" y1="52" x2="72" y2="52" stroke="#ede9fe" strokeWidth="2" strokeLinecap="round"/>
          <rect x="18" y="58" width="50" height="20" rx="3" fill="#ede9fe" opacity="0.5"/>
          {/* Chat widget bubble */}
          <rect x="92" y="50" width="30" height="32" rx="4" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1.5"/>
          <rect x="92" y="50" width="30" height="10" rx="4" fill="#8b5cf6"/>
          <rect x="92" y="56" width="30" height="4" fill="#8b5cf6"/>
          {/* Chat bubble text lines */}
          <line x1="96" y1="68" x2="116" y2="68" stroke="#ddd6fe" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="96" y1="74" x2="112" y2="74" stroke="#ddd6fe" strokeWidth="1.5" strokeLinecap="round"/>
          {/* Chat icon on widget header */}
          <circle cx="100" cy="55" r="3" fill="#f5f3ff" opacity="0.8"/>
          {/* Floating action button */}
          <circle cx="142" cy="82" r="10" fill="#6366f1"/>
          <path d="M138 82h8M142 78v8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Embed Widget</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your Twin to any website
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Status Toggle */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Widget Status</CardTitle>
              <CardDescription>
                Enable or disable the widget on external websites
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Switch
                  checked={isEnabled}
                  onCheckedChange={setIsEnabled}
                />
                <Label>{isEnabled ? "Enabled" : "Disabled"}</Label>
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Appearance</CardTitle>
              <CardDescription>
                Customize how the widget looks on your website
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-10 w-16 cursor-pointer p-1"
                  />
                  <Input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-32"
                    placeholder="#6366f1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
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

          {/* Greeting */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Greeting Message</CardTitle>
              <CardDescription>
                The first message visitors see when they open the widget
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                placeholder="Hello! Ask me anything about my expertise."
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Free Questions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Free Questions</CardTitle>
              <CardDescription>
                How many free questions each visitor can ask before being prompted to subscribe
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                type="number"
                value={freeQuestions}
                onChange={(e) => setFreeQuestions(parseInt(e.target.value) || 0)}
                min={0}
                max={100}
                className="w-32"
              />
            </CardContent>
          </Card>

          {/* Allowed Domains */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Allowed Domains</CardTitle>
              <CardDescription>
                Restrict which domains can embed your widget. Leave empty to allow all domains.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  placeholder="example.com"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddDomain();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={handleAddDomain}>
                  Add
                </Button>
              </div>
              {allowedDomains.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {allowedDomains.map((domain) => (
                    <Badge key={domain} variant="secondary" className="gap-1">
                      {domain}
                      <button
                        onClick={() => handleRemoveDomain(domain)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Embed Code */}
          {config && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Embed Code
                </CardTitle>
                <CardDescription>
                  Copy and paste this code into your website&apos;s HTML
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="rounded-lg bg-muted p-4 text-sm overflow-x-auto">
                    <code>{config.embedCode}</code>
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute right-2 top-2"
                    onClick={handleCopyEmbed}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 mr-1" />
                    ) : (
                      <Copy className="h-4 w-4 mr-1" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {/* Preview */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-base">Preview</CardTitle>
              <CardDescription>
                How the widget will appear on your website
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative rounded-lg border border-border bg-muted/30 h-80 overflow-hidden">
                {/* Simulated page background */}
                <div className="p-4 space-y-2 opacity-30">
                  <div className="h-3 w-3/4 rounded bg-muted-foreground/20" />
                  <div className="h-3 w-1/2 rounded bg-muted-foreground/20" />
                  <div className="h-3 w-2/3 rounded bg-muted-foreground/20" />
                  <div className="h-16 w-full rounded bg-muted-foreground/10 mt-4" />
                  <div className="h-3 w-3/4 rounded bg-muted-foreground/20" />
                  <div className="h-3 w-1/2 rounded bg-muted-foreground/20" />
                </div>

                {/* Widget bubble */}
                <div
                  className="absolute bottom-3 flex h-12 w-12 items-center justify-center rounded-full shadow-lg cursor-pointer"
                  style={{
                    background: primaryColor,
                    [position === "bottom-left" ? "left" : "right"]: "12px",
                  }}
                >
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
              </div>

              {/* Mini chat preview */}
              <div className="mt-4 rounded-lg border border-border overflow-hidden">
                <div
                  className="px-3 py-2 text-white text-xs font-medium"
                  style={{ background: primaryColor }}
                >
                  AI Twin Chat
                </div>
                <div className="p-3 bg-background space-y-2">
                  <div className="text-xs text-muted-foreground bg-muted rounded-lg p-2">
                    {greeting || "Hello! Ask me anything about my expertise."}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
