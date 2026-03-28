"use client";

import Link from "next/link";
import { ArrowLeft, FileDown, Globe, FileText, History } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BlogImportForm } from "@/components/knowledge/blog-import-form";
import { PdfImportForm } from "@/components/knowledge/pdf-import-form";
import { ImportHistoryTable } from "@/components/knowledge/import-history-table";
import {
  PageTransition,
  FadeIn,
} from "@/components/ui/motion";

export default function KnowledgeImportPage() {
  return (
    <PageTransition className="space-y-8">
      {/* Page Header */}
      <FadeIn direction="up" duration={0.5}>
        <div>
          <Link
            href="/expert/knowledge"
            className="cursor-pointer mb-5 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/5 dark:hover:text-blue-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Knowledge Base
          </Link>

          <div className="flex items-center gap-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1E40AF] shadow-lg shadow-blue-700/25">
              <FileDown className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                Import Content
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Import blog articles and PDF documents into your Digital Twin&apos;s knowledge base.
              </p>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Tabs */}
      <FadeIn delay={0.2} direction="up">
        <Tabs defaultValue="blog" className="space-y-6">
          <TabsList className="inline-flex h-12 w-full gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 shadow-sm  sm:w-auto">
            <TabsTrigger
              value="blog"
              className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer data-[state=active]:bg-[#1E40AF] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-blue-700/20"
            >
              <Globe className="h-4 w-4" />
              Blog Import
            </TabsTrigger>
            <TabsTrigger
              value="pdf"
              className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer data-[state=active]:bg-[#1E40AF] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-blue-700/20"
            >
              <FileText className="h-4 w-4" />
              PDF Import
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer data-[state=active]:bg-[#1E40AF] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-blue-700/20"
            >
              <History className="h-4 w-4" />
              Import History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="blog">
            <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm transition-all duration-200 hover:border-border/80 hover:shadow-md">
              <BlogImportForm />
            </div>
          </TabsContent>

          <TabsContent value="pdf">
            <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm transition-all duration-200 hover:border-border/80 hover:shadow-md">
              <PdfImportForm />
            </div>
          </TabsContent>

          <TabsContent value="history">
            <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm transition-all duration-200 hover:border-border/80 hover:shadow-md">
              <ImportHistoryTable />
            </div>
          </TabsContent>
        </Tabs>
      </FadeIn>
    </PageTransition>
  );
}
